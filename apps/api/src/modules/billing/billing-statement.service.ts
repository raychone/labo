import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { BILLING_AUDIT_ACTIONS, BILLING_RESOURCE_TYPES } from "./billing.constants.js";
import { endOfDateOnly, getDefaultBillingRange, getMonthBillingRange, parseDateOnly, toDateOnly } from "./billing.helpers.js";
import { calculateBillingAmounts, isActiveOverdueInvoice } from "./billing.view.js";
import type { BillingRangeQueryDto, ClinicStatementQueryDto, DoctorStatementQueryDto } from "./dto/billing.dto.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

interface BillingDateRange {
  readonly from: Date;
  readonly to: Date;
}

type StatementDocumentRecord = Prisma.BillingDocumentGetPayload<{
  include: {
    lines: true;
    payments: true;
  };
}>;

type MonthRegistryPaymentRecord = Prisma.PaymentGetPayload<{
  include: {
    billingDocument: true;
    clinic: true;
  };
}>;

type MonthCloseArchiveWithClosedBy = Prisma.BillingMonthCloseArchiveGetPayload<{
  include: {
    closedBy: {
      select: {
        displayName: true;
        email: true;
        id: true;
      };
    };
  };
}>;

type MonthCloseArchiveRecord = MonthCloseArchiveWithClosedBy;
type MonthCloseArchiveDetailRecord = MonthCloseArchiveWithClosedBy;

interface MonthEndRegistryPaymentRow {
  readonly amountMinor: number;
  readonly billingDocumentId: string;
  readonly cancelledAt: string | null;
  readonly clinicName: string;
  readonly documentNumber: string | null;
  readonly id: string;
  readonly method: string;
  readonly paymentDate: string;
  readonly receiptDate: string | null;
  readonly receiptNumber: string | null;
  readonly reference: string | null;
}

interface MonthEndRegistrySnapshot {
  readonly currency: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly generatedAt: string;
  readonly paidMinor: number;
  readonly paidTotalMinor: number;
  readonly partialTotalMinor: number;
  readonly payments: readonly MonthEndRegistryPaymentRow[];
  readonly rows: readonly ReturnType<typeof toRegistryRow>[];
  readonly totalMinor: number;
  readonly unpaidTotalMinor: number;
}

interface MonthCloseArchiveSummary {
  readonly archiveId: string;
  readonly closedAt: string;
  readonly closedByDisplayName: string | null;
  readonly closedByEmail: string | null;
  readonly closedByUserId: string | null;
  readonly currency: string;
  readonly month: number;
  readonly paidMinor: number;
  readonly paidTotalMinor: number;
  readonly partialTotalMinor: number;
  readonly periodEnd: string;
  readonly periodStart: string;
  readonly reportVersion: string;
  readonly totalMinor: number;
  readonly unpaidTotalMinor: number;
  readonly year: number;
}

interface MonthCloseArchiveDetail extends MonthCloseArchiveSummary {
  readonly snapshot: MonthEndRegistrySnapshot;
}

type UninvoicedWorkRecord = Prisma.WorkOrderGetPayload<{
  include: {
    clinic: true;
    doctor: true;
    activeCycle: {
      include: {
        billingLines: {
          include: {
            billingDocument: true;
          };
        };
        executionSnapshot: true;
      };
    };
    workType: true;
  };
}>;

const STATEMENT_DOCUMENT_INCLUDE = {
  lines: true,
  payments: true,
} as const satisfies Prisma.BillingDocumentInclude;

const UNINVOICED_WORK_INCLUDE = {
  activeCycle: {
    include: {
      billingLines: {
        include: {
          billingDocument: true,
        },
      },
      executionSnapshot: true,
    },
  },
  clinic: true,
  doctor: true,
  workType: true,
} as const satisfies Prisma.WorkOrderInclude;

@Injectable()
export class BillingStatementService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  public async getClinicStatement(context: ActorContext, legalEntity: LegalEntityContext, query: ClinicStatementQueryDto) {
    const range = resolveDateRange(query);
    const clinic = await this.prisma.clinic.findUnique({ where: { id: query.clinicId } });
    if (!clinic) {
      throw new NotFoundException("Clinic was not found.");
    }

    const [documents, works] = await this.prisma.$transaction([
      this.prisma.billingDocument.findMany({
        include: STATEMENT_DOCUMENT_INCLUDE,
        orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }],
        where: {
          clinicId: query.clinicId,
          ...(query.doctorId ? { doctorId: query.doctorId } : {}),
          issueDate: { gte: range.from, lte: range.to },
          legalEntityId: legalEntity.id,
          status: { not: "CANCELLED" },
        },
      }),
      this.prisma.workOrder.findMany({
        include: UNINVOICED_WORK_INCLUDE,
        orderBy: { createdAt: "asc" },
        where: {
          clinicId: query.clinicId,
          createdAt: { gte: range.from, lte: range.to },
          ...(query.doctorId ? { doctorId: query.doctorId } : {}),
          activeCycle: {
            billingLines: { none: { billingDocument: { status: { not: "CANCELLED" }, type: "INVOICE" } } },
            executionLegalEntityId: legalEntity.id,
          },
        },
      }),
    ]);

    await this.recordStatementAudit(context, BILLING_AUDIT_ACTIONS.clinicStatementViewed, {
      clinicId: query.clinicId,
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      legalEntityCode: legalEntity.code,
    });

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      currency: resolveCurrency(documents, works),
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      documents: documents.map(toStatementRow),
      generatedAt: new Date().toISOString(),
      paidMinor: documents.reduce((total, document) => total + calculateBillingAmounts(document).paidMinor, 0),
      totalMinor: documents.reduce((total, document) => total + document.totalMinor, 0),
      uninvoicedMinor: works.reduce((total, work) => total + getWorkSnapshotTotal(work), 0),
      uninvoicedWorks: works.map(toUninvoicedWorkRow),
    };
  }

  public async getDoctorStatement(context: ActorContext, legalEntity: LegalEntityContext, query: DoctorStatementQueryDto) {
    const range = resolveDateRange(query);
    const doctor = await this.prisma.doctor.findUnique({ where: { id: query.doctorId } });
    if (!doctor) {
      throw new NotFoundException("Doctor was not found.");
    }

    const [documents, works] = await this.prisma.$transaction([
      this.prisma.billingDocument.findMany({
        include: STATEMENT_DOCUMENT_INCLUDE,
        orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }],
        where: {
          doctorId: query.doctorId,
          issueDate: { gte: range.from, lte: range.to },
          legalEntityId: legalEntity.id,
          status: { not: "CANCELLED" },
        },
      }),
      this.prisma.workOrder.findMany({
        include: UNINVOICED_WORK_INCLUDE,
        orderBy: { createdAt: "asc" },
        where: {
          createdAt: { gte: range.from, lte: range.to },
          doctorId: query.doctorId,
          activeCycle: {
            billingLines: { none: { billingDocument: { status: { not: "CANCELLED" }, type: "INVOICE" } } },
            executionLegalEntityId: legalEntity.id,
          },
        },
      }),
    ]);

    await this.recordStatementAudit(context, BILLING_AUDIT_ACTIONS.doctorStatementViewed, {
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      doctorId: query.doctorId,
      legalEntityCode: legalEntity.code,
    });

    return {
      currency: resolveCurrency(documents, works),
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      doctorId: doctor.id,
      doctorName: doctor.displayName,
      documents: documents.map(toStatementRow),
      generatedAt: new Date().toISOString(),
      paidMinor: documents.reduce((total, document) => total + calculateBillingAmounts(document).paidMinor, 0),
      totalMinor: documents.reduce((total, document) => total + document.totalMinor, 0),
      uninvoicedMinor: works.reduce((total, work) => total + getWorkSnapshotTotal(work), 0),
      uninvoicedWorks: works.map(toUninvoicedWorkRow),
    };
  }

  public async getMonthRegistry(context: ActorContext, legalEntity: LegalEntityContext, query: BillingRangeQueryDto) {
    const range = resolveDateRange(query);
    const archive = query.year && query.month
      ? await this.prisma.billingMonthCloseArchive.findUnique({
          include: {
            closedBy: {
              select: {
                displayName: true,
                email: true,
                id: true,
              },
            },
          },
          where: {
            legalEntityId_year_month: {
              legalEntityId: legalEntity.id,
            month: query.month,
            year: query.year,
          },
        },
      })
      : null;
    const snapshot = archive ? parseArchiveSnapshot(archive.snapshot) : await this.buildMonthRegistrySnapshot(legalEntity, range);

    await this.recordStatementAudit(context, BILLING_AUDIT_ACTIONS.monthRegistryViewed, {
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      legalEntityCode: legalEntity.code,
    });

    return snapshot.registry;
  }

  public async listMonthCloseArchives(legalEntity: LegalEntityContext): Promise<{ readonly items: readonly MonthCloseArchiveSummary[] }> {
    const archives = await this.prisma.billingMonthCloseArchive.findMany({
      include: {
        closedBy: {
          select: {
            displayName: true,
            email: true,
            id: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      where: { legalEntityId: legalEntity.id },
    });

    return {
      items: archives.map(toArchiveSummary),
    };
  }

  public async closeMonth(context: ActorContext, legalEntity: LegalEntityContext, query: BillingRangeQueryDto): Promise<MonthCloseArchiveDetail> {
    const range = resolveDateRange(query);
    const year = query.year ?? range.from.getUTCFullYear();
    const month = query.month ?? range.from.getUTCMonth() + 1;
    const existing = await this.prisma.billingMonthCloseArchive.findUnique({
      include: {
        closedBy: {
          select: {
            displayName: true,
            email: true,
            id: true,
          },
        },
      },
      where: {
        legalEntityId_year_month: {
          legalEntityId: legalEntity.id,
          month,
          year,
        },
      },
    });
    if (existing) {
      throw new ConflictException("Luna a fost deja arhivată pentru firma activă.");
    }

    const snapshot = await this.buildMonthRegistrySnapshot(legalEntity, range);
    const archive = await this.prisma.billingMonthCloseArchive.create({
      data: {
        closedAt: new Date(),
        closedByUserId: context.actorUserId,
        currency: snapshot.registry.currency,
        legalEntityId: legalEntity.id,
        month,
        paidMinor: snapshot.registry.paidMinor,
        paidTotalMinor: snapshot.registry.paidTotalMinor,
        partialTotalMinor: snapshot.registry.partialTotalMinor,
        periodEnd: range.to,
        periodStart: range.from,
        reportVersion: "1",
        snapshot: snapshot.registry as unknown as Prisma.InputJsonValue,
        totalMinor: snapshot.registry.totalMinor,
        unpaidTotalMinor: snapshot.registry.unpaidTotalMinor,
        year,
      },
      include: {
        closedBy: {
          select: {
            displayName: true,
            email: true,
            id: true,
          },
        },
      },
    });

    return toArchiveDetail(archive);
  }

  private async buildMonthRegistrySnapshot(legalEntity: LegalEntityContext, range: BillingDateRange) {
    const documents = await this.prisma.billingDocument.findMany({
      include: STATEMENT_DOCUMENT_INCLUDE,
      orderBy: [{ issueDate: "asc" }, { formattedNumber: "asc" }],
      where: {
        issueDate: { gte: range.from, lte: range.to },
        legalEntityId: legalEntity.id,
        status: { not: "CANCELLED" },
      },
    });
    const rows = documents.map(toRegistryRow);
    const payments = await this.prisma.payment.findMany({
      include: {
        billingDocument: true,
        clinic: true,
      },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
      where: {
        cancelledAt: null,
        legalEntityId: legalEntity.id,
        paymentDate: { gte: range.from, lte: range.to },
      },
    });

    return {
      registry: {
        currency: documents[0]?.currency ?? "RON",
        dateFrom: toDateOnly(range.from),
        dateTo: toDateOnly(range.to),
        generatedAt: new Date().toISOString(),
        paidMinor: rows.reduce((total, row) => total + row.paidMinor, 0),
        paidTotalMinor: rows.filter((row) => calculateRegistryPaymentStatus(row) === "PAID").reduce((total, row) => total + row.totalMinor, 0),
        partialTotalMinor: rows.filter((row) => calculateRegistryPaymentStatus(row) === "PARTIALLY_PAID").reduce((total, row) => total + row.totalMinor, 0),
        payments: payments.map(toMonthRegistryPaymentRow),
        rows,
        totalMinor: rows.reduce((total, row) => total + row.totalMinor, 0),
        unpaidTotalMinor: rows.filter((row) => calculateRegistryPaymentStatus(row) === "UNPAID").reduce((total, row) => total + row.totalMinor, 0),
      } satisfies MonthEndRegistrySnapshot,
    };
  }

  private async recordStatementAudit(context: ActorContext, action: string, metadata: Prisma.InputJsonValue): Promise<void> {
    await this.auditService.record({
      action,
      actorUserId: context.actorUserId,
      metadata,
      requestMetadata: context.requestMetadata,
      resourceType: BILLING_RESOURCE_TYPES.billingExport,
    });
  }
}

export function resolveDateRange(query: { readonly dateFrom?: string; readonly dateTo?: string; readonly month?: number; readonly year?: number }): BillingDateRange {
  if (query.year && query.month) {
    return getMonthBillingRange(query.year, query.month);
  }

  const defaults = getDefaultBillingRange();
  const from = query.dateFrom ? parseDateOnly(query.dateFrom, "dateFrom") : defaults.from;
  const to = query.dateTo ? endOfDateOnly(parseDateOnly(query.dateTo, "dateTo")) : endOfDateOnly(defaults.to);

  if (from.getTime() > to.getTime()) {
    throw new BadRequestException("dateFrom must be before dateTo.");
  }

  return { from, to };
}

function toStatementRow(document: StatementDocumentRecord) {
  const amounts = calculateBillingAmounts(document);

  return {
    balanceMinor: amounts.balanceMinor,
    documentId: document.id,
    documentNumber: document.formattedNumber,
    documentType: document.type,
    dueDate: document.dueDate?.toISOString() ?? null,
    issueDate: document.issueDate.toISOString(),
    isOverdue: isActiveOverdueInvoice(document),
    paidMinor: amounts.paidMinor,
    status: document.status,
    totalMinor: document.totalMinor,
    workCodes: uniqueStrings(document.lines.map((line) => line.workCode)),
  };
}

function toRegistryRow(document: StatementDocumentRecord) {
  const row = toStatementRow(document);

  return {
    ...row,
    clinicName: document.clinicNameSnapshot,
    doctorNames: uniqueStrings(document.lines.map((line) => line.doctorNameSnapshot)),
    patientNames: uniqueStrings(document.lines.map((line) => line.patientNameSnapshot)),
  };
}

function toMonthRegistryPaymentRow(payment: MonthRegistryPaymentRecord) {
  return {
    amountMinor: payment.amountMinor,
    billingDocumentId: payment.billingDocumentId,
    cancelledAt: payment.cancelledAt?.toISOString() ?? null,
    clinicName: payment.clinic.name,
    documentNumber: payment.billingDocument.formattedNumber,
    id: payment.id,
    method: payment.method,
    paymentDate: payment.paymentDate.toISOString(),
    receiptDate: payment.receiptDate?.toISOString() ?? null,
    receiptNumber: payment.receiptNumber,
    reference: payment.reference,
  };
}

function toArchiveSummary(archive: MonthCloseArchiveRecord | MonthCloseArchiveDetailRecord): MonthCloseArchiveSummary {
  return {
    archiveId: archive.id,
    closedAt: archive.closedAt.toISOString(),
    closedByDisplayName: archive.closedBy?.displayName ?? null,
    closedByEmail: archive.closedBy?.email ?? null,
    closedByUserId: archive.closedByUserId,
    currency: archive.currency,
    month: archive.month,
    paidMinor: archive.paidMinor,
    paidTotalMinor: archive.paidTotalMinor,
    partialTotalMinor: archive.partialTotalMinor,
    periodEnd: archive.periodEnd.toISOString().slice(0, 10),
    periodStart: archive.periodStart.toISOString().slice(0, 10),
    reportVersion: archive.reportVersion,
    totalMinor: archive.totalMinor,
    unpaidTotalMinor: archive.unpaidTotalMinor,
    year: archive.year,
  };
}

function toArchiveDetail(archive: MonthCloseArchiveDetailRecord): MonthCloseArchiveDetail {
  return {
    ...toArchiveSummary(archive),
    snapshot: parseArchiveSnapshot(archive.snapshot).registry,
  };
}

function parseArchiveSnapshot(snapshot: Prisma.JsonValue): { readonly registry: MonthEndRegistrySnapshot } {
  return { registry: snapshot as unknown as MonthEndRegistrySnapshot };
}

function toUninvoicedWorkRow(work: UninvoicedWorkRecord) {
  return {
    clinicName: work.clinic?.name ?? "-",
    code: work.code,
    createdAt: work.createdAt.toISOString(),
    doctorName: work.doctor?.displayName ?? "-",
    patientName: work.patientName,
    totalPriceMinor: getWorkSnapshotTotal(work),
    workTypeName: work.workType.name,
    workTypeSymbol: work.workType.symbol,
  };
}

function resolveCurrency(documents: readonly StatementDocumentRecord[], works: readonly UninvoicedWorkRecord[]): string {
  return documents[0]?.currency ?? works[0]?.activeCycle?.executionSnapshot?.pricingCurrency ?? "RON";
}

function getWorkSnapshotTotal(work: UninvoicedWorkRecord): number {
  return work.activeCycle?.executionSnapshot?.pricingTotalMinor ?? 0;
}

function uniqueStrings(values: readonly (string | null)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function calculateRegistryPaymentStatus(row: { readonly balanceMinor: number; readonly paidMinor: number }): "PAID" | "PARTIALLY_PAID" | "UNPAID" {
  if (row.balanceMinor === 0) {
    return "PAID";
  }

  return row.paidMinor > 0 ? "PARTIALLY_PAID" : "UNPAID";
}
