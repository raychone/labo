import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { BILLING_AUDIT_ACTIONS, BILLING_RESOURCE_TYPES } from "./billing.constants.js";
import { endOfDateOnly, getDefaultBillingRange, parseDateOnly, toDateOnly } from "./billing.helpers.js";
import { calculateBillingAmounts } from "./billing.view.js";
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

    await this.recordStatementAudit(context, BILLING_AUDIT_ACTIONS.monthRegistryViewed, {
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      legalEntityCode: legalEntity.code,
    });

    return {
      currency: documents[0]?.currency ?? "RON",
      dateFrom: toDateOnly(range.from),
      dateTo: toDateOnly(range.to),
      generatedAt: new Date().toISOString(),
      paidMinor: rows.reduce((total, row) => total + row.paidMinor, 0),
      rows,
      totalMinor: rows.reduce((total, row) => total + row.totalMinor, 0),
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

export function resolveDateRange(query: { readonly dateFrom?: string; readonly dateTo?: string }): BillingDateRange {
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
    issueDate: document.issueDate.toISOString(),
    paidMinor: amounts.paidMinor,
    status: document.status,
    totalMinor: document.totalMinor,
  };
}

function toRegistryRow(document: StatementDocumentRecord) {
  const row = toStatementRow(document);

  return {
    ...row,
    clinicName: document.clinicNameSnapshot,
  };
}

function toUninvoicedWorkRow(work: UninvoicedWorkRecord) {
  return {
    clinicName: work.clinic.name,
    code: work.code,
    createdAt: work.createdAt.toISOString(),
    doctorName: work.doctor.displayName,
    patientName: work.patientName,
    totalPriceMinor: getWorkSnapshotTotal(work),
    workTypeName: work.workType.name,
  };
}

function resolveCurrency(documents: readonly StatementDocumentRecord[], works: readonly UninvoicedWorkRecord[]): string {
  return documents[0]?.currency ?? works[0]?.activeCycle?.executionSnapshot?.pricingCurrency ?? "RON";
}

function getWorkSnapshotTotal(work: UninvoicedWorkRecord): number {
  return work.activeCycle?.executionSnapshot?.pricingTotalMinor ?? 0;
}
