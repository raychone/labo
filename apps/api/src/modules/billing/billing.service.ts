import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { BillingDocumentType, Prisma, WorkStatus } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { DEFAULT_LABORATORY_SETTINGS } from "../settings/settings.constants.js";
import {
  BILLING_AUDIT_ACTIONS,
  BILLING_RESOURCE_TYPES,
} from "./billing.constants.js";
import { endOfDateOnly, formatBillingNumber, getDefaultBillingRange, parseDateOnly, toDateOnly } from "./billing.helpers.js";
import type {
  BillableWorksQueryDto,
  BillingRangeQueryDto,
  CreateBillingDocumentDto,
  ListBillingDocumentsQueryDto,
  RecordPaymentDto,
  DocumentShareAttemptDto,
  ReplaceBillingLinesDto,
  SearchBillingQueryDto,
  UpdateBillingDocumentDto,
  UpsertBillingSeriesDto,
} from "./dto/billing.dto.js";
import {
  calculateBillingAmounts,
  isActiveOverdueInvoice,
  createEmptyBillingOverview,
  type BillingGroup,
  type BillingOverview,
  type BillableWorkRecord,
  type BillingDocumentRecord,
  toBillableWorkView,
  toBillingDocumentDetail,
  toBillingDocumentSummary,
  toBillingSeriesView,
} from "./billing.view.js";

type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";
type BillingAdjustmentInput = NonNullable<CreateBillingDocumentDto["adjustments"]>[number];

interface DraftPricing {
  readonly discountMinor: number;
  readonly lines: readonly Prisma.BillingDocumentLineUncheckedCreateWithoutBillingDocumentInput[];
  readonly subtotalMinor: number;
  readonly totalMinor: number;
}

export interface PaginatedBillingDocumentsResponse {
  readonly items: readonly ReturnType<typeof toBillingDocumentSummary>[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

interface BillingDateRange {
  readonly from: Date;
  readonly to: Date;
}

const BILLING_DOCUMENT_INCLUDE = {
  clinic: true,
  legalEntity: true,
  lines: {
    include: {
      legalEntity: true,
      workCycle: true,
      workOrder: {
        include: {
          workType: true,
        },
      },
    },
  },
  payments: true,
  stornoDocument: true,
  stornoOfDocument: true,
} as const satisfies Prisma.BillingDocumentInclude;

const BILLABLE_WORK_INCLUDE = {
  activeCycle: {
    include: {
      billingLines: {
        include: {
          billingDocument: true,
        },
      },
      executionLegalEntity: true,
      executionSnapshot: true,
    },
  },
  clinic: true,
  doctor: true,
  workType: true,
} as const satisfies Prisma.WorkOrderInclude;

@Injectable()
export class BillingService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  public async getOverview(legalEntity: LegalEntityContext, query: BillingRangeQueryDto): Promise<BillingOverview> {
    const range = this.resolveDateRange(query);
    const currency = await this.getCurrency(legalEntity);
    const workWhere = this.createWorkWhere(legalEntity, query, range);
    const documentWhere = this.createDocumentWhere(legalEntity, query, range);

    const [works, documents, ambiguousLegacyCount] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        include: BILLABLE_WORK_INCLUDE,
        where: workWhere,
      }),
      this.prisma.billingDocument.findMany({
        include: BILLING_DOCUMENT_INCLUDE,
        where: documentWhere,
      }),
      this.prisma.billingDocument.count({
        where: this.createAmbiguousLegacyWhere(legalEntity),
      }),
    ]);

    const billableWorks = works.filter((work) => this.isWorkCycleBillable(work));

    if (billableWorks.length === 0 && documents.length === 0) {
      return {
        ...createEmptyBillingOverview(toDateOnly(range.from), toDateOnly(range.to), currency),
        ambiguousLegacyCount,
      };
    }

    const workValueMinor = billableWorks.reduce((total, work) => total + (this.getRequiredBillableSnapshot(work).pricingTotalMinor ?? 0), 0);
    const uninvoicedWorks = billableWorks.filter((work) => !this.hasActiveInvoiceLine(work));
    const uninvoicedMinor = uninvoicedWorks.reduce((total, work) => total + (this.getRequiredBillableSnapshot(work).pricingTotalMinor ?? 0), 0);
    const activeDocuments = documents.filter((document) => document.status !== "CANCELLED");
    const invoices = activeDocuments.filter((document) => document.type === "INVOICE");
    const proformas = activeDocuments.filter((document) => document.type === "PROFORMA");
    const paidMinor = invoices.reduce((total, document) => total + calculateBillingAmounts(document).paidMinor, 0);
    const outstandingMinor = invoices.reduce((total, document) => total + calculateBillingAmounts(document).balanceMinor, 0);
    const unpaidOutstandingMinor = invoices.reduce((total, document) => {
      const amounts = calculateBillingAmounts(document);
      return total + (amounts.paymentStatus === "UNPAID" ? amounts.balanceMinor : 0);
    }, 0);
    const partialOutstandingMinor = invoices.reduce((total, document) => {
      const amounts = calculateBillingAmounts(document);
      return total + (amounts.paymentStatus === "PARTIALLY_PAID" ? amounts.balanceMinor : 0);
    }, 0);
    const unpaidInvoiceCount = invoices.filter((document) => calculateBillingAmounts(document).paymentStatus === "UNPAID").length;
    const partialInvoiceCount = invoices.filter((document) => calculateBillingAmounts(document).paymentStatus === "PARTIALLY_PAID").length;
    const paidInvoiceCount = invoices.filter((document) => calculateBillingAmounts(document).paymentStatus === "PAID").length;
    const overdueInvoiceCount = invoices.filter((document) => this.isOverdueInvoice(document)).length;

    return {
      ambiguousLegacyCount,
      currency,
      documentCount: activeDocuments.length,
      from: toDateOnly(range.from),
      groups: this.createOverviewGroups(query.groupBy, billableWorks, invoices),
      invoiceCount: invoices.length,
      openProformaCount: proformas.filter((document) => document.status !== "CANCELLED").length,
      overdueInvoiceCount,
      outstandingMinor,
      paidMinor,
      paidInvoiceCount,
      partialInvoiceCount,
      proformaMinor: proformas.reduce((total, document) => total + document.totalMinor, 0),
      to: toDateOnly(range.to),
      totalIssuedMinor: invoices.reduce((total, document) => total + document.totalMinor, 0),
      unpaidInvoiceCount,
      unpaidOutstandingMinor,
      partialOutstandingMinor,
      uninvoicedMinor,
      uninvoicedWorkCount: uninvoicedWorks.length,
      workValueMinor,
    };
  }

  public async listBillableWorks(legalEntity: LegalEntityContext, query: BillableWorksQueryDto, includeMoney: boolean) {
    const range = this.resolveDateRange(query);
    const search = query.search?.trim();
    const activeCycleWhere = {
      executionLegalEntityId: legalEntity.id,
      ...(query.cycleNumber ? { cycleNumber: query.cycleNumber } : {}),
      ...(query.uninvoicedOnly ? { billingLines: { none: { billingDocument: { status: { not: "CANCELLED" }, type: "INVOICE" } } } } : {}),
    } satisfies Prisma.WorkCycleWhereInput;
    const where: Prisma.WorkOrderWhereInput = {
      activeCycle: { is: activeCycleWhere },
      createdAt: {
        gte: range.from,
        lte: endOfDateOnly(range.to),
      },
    };
    if (query.clinicId) {
      where.clinicId = query.clinicId;
    }
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.patient) {
      where.patientName = { contains: query.patient, mode: "insensitive" };
    }
    if (query.status) {
      where.status = query.status as WorkStatus;
    }
    if (query.workCode) {
      where.code = { contains: query.workCode, mode: "insensitive" };
    }
    if (query.workTypeId) {
      where.workTypeId = query.workTypeId;
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { patientName: { contains: search, mode: "insensitive" } },
        { patientReference: { contains: search, mode: "insensitive" } },
        { clinic: { name: { contains: search, mode: "insensitive" } } },
        { doctor: { displayName: { contains: search, mode: "insensitive" } } },
      ];
    }
    const workOrders = await this.prisma.workOrder.findMany({
      include: BILLABLE_WORK_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      where,
    });

    return {
      items: workOrders.map((workOrder) => toBillableWorkView(workOrder, includeMoney)),
    };
  }

  public async listDocuments(legalEntity: LegalEntityContext, query: ListBillingDocumentsQueryDto): Promise<PaginatedBillingDocumentsResponse> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const where = this.createDocumentsListWhere(legalEntity, query);
    const [total, documents] = await Promise.all([
      this.prisma.billingDocument.count({ where }),
      this.prisma.billingDocument.findMany({
        include: BILLING_DOCUMENT_INCLUDE,
        orderBy: {
          [query.sortBy]: query.sortDirection,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: documents.map(toBillingDocumentSummary),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async getDocument(legalEntity: LegalEntityContext, documentId: string) {
    return toBillingDocumentDetail(await this.findDocumentOrThrow(legalEntity, documentId));
  }

  public async listReceivables(legalEntity: LegalEntityContext, query: ListBillingDocumentsQueryDto) {
    const where = {
      ...this.createDocumentsListWhere(legalEntity, {
        ...query,
        paymentFilter: "OUTSTANDING",
        type: "INVOICE",
      }),
      type: "INVOICE" as const,
    };
    const documents = await this.prisma.billingDocument.findMany({
      include: BILLING_DOCUMENT_INCLUDE,
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
      take: 500,
      where,
    });
    const items = documents
      .filter((document) => document.status !== "CANCELLED" && calculateBillingAmounts(document).balanceMinor > 0)
      .filter((document) => this.matchesDocumentPaymentFilter(document, { paymentFilter: query.paymentFilter ?? "OUTSTANDING" }))
      .map((document) => this.toReceivableRow(document));

    return {
      currency: items[0]?.currency ?? await this.getCurrency(legalEntity),
      generatedAt: new Date().toISOString(),
      items,
      overdueCount: items.filter((item) => item.daysOverdue > 0).length,
      totalBalanceMinor: items.reduce((total, item) => total + item.balanceMinor, 0),
    };
  }

  public async listAmbiguousLegacyRecords(legalEntity: LegalEntityContext, context: ActorContext) {
    const documents = await this.prisma.billingDocument.findMany({
      include: BILLING_DOCUMENT_INCLUDE,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 200,
      where: this.createAmbiguousLegacyWhere(legalEntity),
    });

    await this.auditService.record({
      action: BILLING_AUDIT_ACTIONS.ambiguousLegacyReviewViewed,
      actorUserId: context.actorUserId,
      metadata: { legalEntityCode: legalEntity.code, rowCount: documents.length },
      requestMetadata: context.requestMetadata,
      resourceType: BILLING_RESOURCE_TYPES.billingExport,
    });

    return {
      items: documents.map((document) => ({
        clinicName: document.clinicNameSnapshot,
        companyAssignmentNotes: document.companyAssignmentNotes,
        companyAssignmentStatus: document.companyAssignmentStatus as "AMBIGUOUS" | "UNASSIGNED",
        createdAt: document.createdAt.toISOString(),
        documentId: document.id,
        documentNumber: document.formattedNumber,
        documentType: document.type,
        issueDate: document.issueDate.toISOString(),
        lineCompanyCodes: uniqueStrings(document.lines.map((line) => line.legalEntityCodeSnapshot)),
        totalMinor: document.totalMinor,
        workCodes: uniqueStrings(document.lines.map((line) => line.workCode)),
      })),
    };
  }

  public async createProforma(context: ActorContext, legalEntity: LegalEntityContext, dto: CreateBillingDocumentDto) {
    const document = await this.createDraftDocument(context, legalEntity, "PROFORMA", dto);
    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.proformaCreated, document);
    return toBillingDocumentDetail(document);
  }

  public async createInvoice(context: ActorContext, legalEntity: LegalEntityContext, dto: CreateBillingDocumentDto) {
    const document = await this.createDraftDocument(context, legalEntity, "INVOICE", dto);
    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.invoiceCreated, document);
    return toBillingDocumentDetail(document);
  }

  public async createAndIssueInvoice(context: ActorContext, legalEntity: LegalEntityContext, dto: CreateBillingDocumentDto) {
    const draft = await this.createInvoice(context, legalEntity, dto);
    return this.issueDocument(legalEntity, context, draft.id);
  }

  public async updateDraft(legalEntity: LegalEntityContext, context: ActorContext, documentId: string, dto: UpdateBillingDocumentDto) {
    const before = await this.findDocumentOrThrow(legalEntity, documentId);
    this.assertDraft(before);

    const updated = await this.prisma.billingDocument.update({
      data: {
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? parseDateOnly(dto.dueDate, "dueDate") : null } : {}),
        ...(dto.issueDate !== undefined ? { issueDate: parseDateOnly(dto.issueDate, "issueDate") } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedByUserId: context.actorUserId,
        version: { increment: 1 },
      },
      include: BILLING_DOCUMENT_INCLUDE,
      where: { id: documentId },
    });

    return toBillingDocumentDetail(updated);
  }

  public async replaceLines(legalEntity: LegalEntityContext, context: ActorContext, documentId: string, dto: ReplaceBillingLinesDto) {
    const before = await this.findDocumentOrThrow(legalEntity, documentId);
    this.assertDraft(before);
    const works = await this.findCompatibleWorks(legalEntity, dto.workOrderIds, before.type, before.clinicId);
    const lines = this.createLineInputs(works);
    const totalMinor = lines.reduce((total, line) => total + line.lineTotalMinor, 0);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.billingDocumentLine.deleteMany({ where: { billingDocumentId: documentId } });
      await tx.billingDocumentLine.createMany({
        data: lines.map((line) => ({ ...line, billingDocumentId: documentId })),
      });

      return tx.billingDocument.update({
        data: {
          subtotalMinor: totalMinor,
          totalMinor,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId },
      });
    });

    return toBillingDocumentDetail(updated);
  }

  public async issueDocument(legalEntity: LegalEntityContext, context: ActorContext, documentId: string) {
    const document = await this.prisma.$transaction(async (tx) => {
      const draft = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId, legalEntityId: legalEntity.id },
      });
      if (!draft) {
        throw new NotFoundException("Billing document was not found.");
      }
      this.assertDraft(draft);
      if (draft.lines.length === 0) {
        throw new BadRequestException("Documentul nu are linii.");
      }

      const numbered = await this.assignDocumentNumber(tx, draft, context.actorUserId);
      if (numbered.type === "INVOICE") {
        await this.assertCyclesNotInvoiced(tx, numbered.lines.map((line) => line.workCycleId).filter((id): id is string => id !== null), numbered.id);
        await this.attachInvoiceToWorks(tx, numbered.id, numbered.lines.map((line) => line.workOrderId));
      }

      return numbered;
    });

    await this.recordDocumentAudit(
      context,
      document.type === "PROFORMA" ? BILLING_AUDIT_ACTIONS.proformaIssued : BILLING_AUDIT_ACTIONS.invoiceIssued,
      document,
    );
    return toBillingDocumentDetail(document);
  }

  public async convertProformaToInvoice(legalEntity: LegalEntityContext, context: ActorContext, documentId: string) {
    const invoice = await this.prisma.$transaction(async (tx) => {
      const proforma = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId, legalEntityId: legalEntity.id },
      });
      if (!proforma) {
        throw new NotFoundException("Proforma was not found.");
      }
      if (proforma.type !== "PROFORMA" || proforma.status !== "ISSUED") {
        throw new BadRequestException("Doar o proforma emisa poate fi transformata in factura.");
      }

      await this.assertCyclesNotInvoiced(tx, proforma.lines.map((line) => line.workCycleId).filter((id): id is string => id !== null));
      const created = await tx.billingDocument.create({
        data: {
          clinicAddressSnapshot: proforma.clinicAddressSnapshot,
          clinicEmailSnapshot: proforma.clinicEmailSnapshot,
          clinicId: proforma.clinicId,
          clinicLegalNameSnapshot: proforma.clinicLegalNameSnapshot,
          clinicNameSnapshot: proforma.clinicNameSnapshot,
          clinicPhoneSnapshot: proforma.clinicPhoneSnapshot,
          clinicRegistrationNumberSnapshot: proforma.clinicRegistrationNumberSnapshot,
          clinicTaxIdSnapshot: proforma.clinicTaxIdSnapshot,
          companyAssignmentNotes: "Created from issued proforma with resolved company.",
          companyAssignmentStatus: "RESOLVED",
          createdByUserId: context.actorUserId,
          currency: proforma.currency,
          discountMinor: proforma.discountMinor,
          doctorId: proforma.doctorId,
          dueDate: proforma.dueDate,
          issueDate: proforma.issueDate,
          legalEntityCodeSnapshot: proforma.legalEntityCodeSnapshot,
          legalEntityId: proforma.legalEntityId,
          legalEntityNameSnapshot: proforma.legalEntityNameSnapshot,
          notes: proforma.notes,
          status: "DRAFT",
          subtotalMinor: proforma.subtotalMinor,
          taxMinor: proforma.taxMinor,
          totalMinor: proforma.totalMinor,
          type: "INVOICE",
          stornoOfDocumentId: null,
          updatedByUserId: context.actorUserId,
          lines: {
            create: proforma.lines.map((line) => ({
              cycleNumberSnapshot: line.cycleNumberSnapshot,
              description: line.description,
              doctorNameSnapshot: line.doctorNameSnapshot,
              legalEntityCodeSnapshot: line.legalEntityCodeSnapshot,
              legalEntityId: line.legalEntityId,
              lineTotalMinor: line.lineTotalMinor,
              patientNameSnapshot: line.patientNameSnapshot,
              quantity: line.quantity,
              sortOrder: line.sortOrder,
              toothPositionSnapshot: line.toothPositionSnapshot,
              unitPriceMinor: line.unitPriceMinor,
              workCycleId: line.workCycleId,
              workCode: line.workCode,
              workCreatedAtSnapshot: line.workCreatedAtSnapshot,
              workOrderId: line.workOrderId,
              workTypeNameSnapshot: line.workTypeNameSnapshot,
            })),
          },
        },
        include: BILLING_DOCUMENT_INCLUDE,
      });
      const numbered = await this.assignDocumentNumber(tx, created, context.actorUserId);
      await this.attachInvoiceToWorks(tx, numbered.id, numbered.lines.map((line) => line.workOrderId));
      return numbered;
    });

    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.proformaConverted, invoice);
    return toBillingDocumentDetail(invoice);
  }

  public async cancelDocument(legalEntity: LegalEntityContext, context: ActorContext, documentId: string) {
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const document = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId, legalEntityId: legalEntity.id },
      });
      if (!document) {
        throw new NotFoundException("Billing document was not found.");
      }
      if (document.status === "CANCELLED") {
        throw new BadRequestException("Documentul este deja anulat.");
      }

      if (document.type === "INVOICE") {
        await tx.workOrder.updateMany({
          data: { invoicedDocumentId: null },
          where: { invoicedDocumentId: document.id },
        });
      }

      return tx.billingDocument.update({
        data: {
          cancelledAt: new Date(),
          cancelledByUserId: context.actorUserId,
          status: "CANCELLED",
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId },
      });
    });

    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.documentCancelled, cancelled);
    return toBillingDocumentDetail(cancelled);
  }

  public async createStorno(legalEntity: LegalEntityContext, context: ActorContext, documentId: string) {
    const storno = await this.prisma.$transaction(async (tx) => {
      const original = await tx.billingDocument.findUnique({ include: BILLING_DOCUMENT_INCLUDE, where: { id: documentId, legalEntityId: legalEntity.id } });
      if (!original) {
        throw new NotFoundException("Factura nu a fost gasita.");
      }
      if (original.type !== "INVOICE" || !["ISSUED", "PARTIALLY_PAID", "PAID"].includes(original.status)) {
        throw new BadRequestException("Storno este disponibil doar pentru facturi emise active.");
      }
      if (original.stornoDocument) {
        throw new ConflictException("Factura are deja storno.");
      }

      const created = await tx.billingDocument.create({
        data: {
          clinicId: original.clinicId,
          clinicAddressSnapshot: original.clinicAddressSnapshot,
          clinicEmailSnapshot: original.clinicEmailSnapshot,
          clinicLegalNameSnapshot: original.clinicLegalNameSnapshot,
          clinicNameSnapshot: original.clinicNameSnapshot,
          clinicPhoneSnapshot: original.clinicPhoneSnapshot,
          clinicRegistrationNumberSnapshot: original.clinicRegistrationNumberSnapshot,
          clinicTaxIdSnapshot: original.clinicTaxIdSnapshot,
          companyAssignmentNotes: original.companyAssignmentNotes,
          companyAssignmentStatus: original.companyAssignmentStatus,
          currency: original.currency,
          discountMinor: -original.discountMinor,
          doctorId: original.doctorId,
          issueDate: new Date(),
          legalEntityCodeSnapshot: original.legalEntityCodeSnapshot,
          legalEntityId: original.legalEntityId,
          legalEntityNameSnapshot: original.legalEntityNameSnapshot,
          notes: `Storno pentru ${original.formattedNumber ?? original.id}`,
          status: "DRAFT",
          stornoOfDocumentId: original.id,
          subtotalMinor: -original.subtotalMinor,
          taxMinor: -original.taxMinor,
          totalMinor: -original.totalMinor,
          type: "INVOICE",
          createdByUserId: context.actorUserId,
          updatedByUserId: context.actorUserId,
          lines: {
            create: original.lines.map((line) => ({
              description: `Storno ${line.description}`,
              doctorNameSnapshot: line.doctorNameSnapshot,
              legalEntityCodeSnapshot: line.legalEntityCodeSnapshot,
              legalEntityId: line.legalEntityId,
              lineTotalMinor: -line.lineTotalMinor,
              patientNameSnapshot: line.patientNameSnapshot,
              quantity: line.quantity,
              sortOrder: line.sortOrder,
              toothPositionSnapshot: line.toothPositionSnapshot,
              unitPriceMinor: -line.unitPriceMinor,
              workCode: line.workCode,
              workCreatedAtSnapshot: line.workCreatedAtSnapshot,
              workCycleId: line.workCycleId,
              workOrderId: line.workOrderId,
              workTypeNameSnapshot: line.workTypeNameSnapshot,
            })),
          },
        },
        include: BILLING_DOCUMENT_INCLUDE,
      });
      const numbered = await this.assignDocumentNumber(tx, created, context.actorUserId);
      await tx.workOrder.updateMany({ data: { invoicedDocumentId: null }, where: { invoicedDocumentId: original.id } });
      return numbered;
    });

    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.stornoCreated, storno);
    return toBillingDocumentDetail(storno);
  }

  public async recordPayment(legalEntity: LegalEntityContext, context: ActorContext, documentId: string, dto: RecordPaymentDto) {
    const document = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId, legalEntityId: legalEntity.id },
      });
      if (!invoice) {
        throw new NotFoundException("Invoice was not found.");
      }
      if (invoice.type !== "INVOICE" || !["ISSUED", "PARTIALLY_PAID"].includes(invoice.status)) {
        throw new BadRequestException("Platile pot fi inregistrate doar pe facturi emise active.");
      }

      const amounts = calculateBillingAmounts(invoice);
      if (dto.amountMinor > amounts.balanceMinor) {
        throw new ConflictException("Plata depaseste soldul ramas.");
      }

      await tx.payment.create({
        data: {
          amountMinor: dto.amountMinor,
          billingDocumentId: invoice.id,
          clinicId: invoice.clinicId,
          createdByUserId: context.actorUserId,
          currency: invoice.currency,
          legalEntityId: invoice.legalEntityId,
          method: dto.method,
          notes: dto.notes ?? null,
          paymentDate: parseDateOnly(dto.paymentDate, "paymentDate"),
          receiptDate: dto.receiptDate ? parseDateOnly(dto.receiptDate, "receiptDate") : dto.method === "CASH" ? parseDateOnly(dto.paymentDate, "paymentDate") : null,
          receiptNumber: dto.receiptNumber ?? null,
          reference: dto.reference ?? null,
        },
      });

      return this.updateDocumentPaymentStatus(tx, invoice.id, context.actorUserId);
    }, { isolationLevel: "Serializable" });

    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.paymentRecorded, document);
    return toBillingDocumentDetail(document);
  }

  public async cancelPayment(legalEntity: LegalEntityContext, context: ActorContext, paymentId: string) {
    const document = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, legalEntityId: legalEntity.id } });
      if (!payment) {
        throw new NotFoundException("Payment was not found.");
      }
      if (payment.cancelledAt) {
        throw new BadRequestException("Plata este deja anulata.");
      }

      await tx.payment.update({
        data: {
          cancelledAt: new Date(),
          cancelledByUserId: context.actorUserId,
        },
        where: { id: paymentId },
      });

      return this.updateDocumentPaymentStatus(tx, payment.billingDocumentId, context.actorUserId);
    });

    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.paymentCancelled, document);
    return toBillingDocumentDetail(document);
  }

  public async listPayments(legalEntity: LegalEntityContext) {
    const payments = await this.prisma.payment.findMany({
      include: { billingDocument: true },
      orderBy: { paymentDate: "desc" },
      take: 200,
      where: { legalEntityId: legalEntity.id },
    });

    return {
      items: payments.map((payment) => ({
        amountMinor: payment.amountMinor,
        billingDocumentId: payment.billingDocumentId,
        cancelledAt: payment.cancelledAt?.toISOString() ?? null,
        clinicId: payment.clinicId,
        currency: payment.currency,
        documentNumber: payment.billingDocument.formattedNumber,
        id: payment.id,
        method: payment.method,
        paymentDate: payment.paymentDate.toISOString(),
        receiptDate: payment.receiptDate?.toISOString() ?? null,
        receiptNumber: payment.receiptNumber,
        reference: payment.reference,
      })),
    };
  }

  public async recordDocumentShareAttempt(legalEntity: LegalEntityContext, context: ActorContext, documentId: string, dto: DocumentShareAttemptDto) {
    const document = await this.findDocumentOrThrow(legalEntity, documentId);
    await this.auditService.record({
      action: BILLING_AUDIT_ACTIONS.documentShareAttempted,
      actorUserId: context.actorUserId,
      metadata: {
        channel: dto.channel,
        documentNumber: document.formattedNumber,
        recipient: dto.recipient ?? null,
      },
      requestMetadata: context.requestMetadata,
      resourceId: document.id,
      resourceType: BILLING_RESOURCE_TYPES.billingDocument,
    });
    return { channel: dto.channel, documentId: document.id, recorded: true };
  }

  public async search(legalEntity: LegalEntityContext, query: SearchBillingQueryDto) {
    const search = query.q.trim();
    const [works, documents, payments] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        include: BILLABLE_WORK_INCLUDE,
        take: 8,
        where: {
          activeCycle: {
            executionLegalEntityId: legalEntity.id,
          },
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { patientName: { contains: search, mode: "insensitive" } },
            { clinic: { name: { contains: search, mode: "insensitive" } } },
            { doctor: { displayName: { contains: search, mode: "insensitive" } } },
          ],
        },
      }),
      this.prisma.billingDocument.findMany({
        include: BILLING_DOCUMENT_INCLUDE,
        take: 8,
        where: {
          legalEntityId: legalEntity.id,
          OR: [
            { formattedNumber: { contains: search, mode: "insensitive" } },
            { clinicNameSnapshot: { contains: search, mode: "insensitive" } },
            { lines: { some: { workCode: { contains: search, mode: "insensitive" } } } },
            { lines: { some: { patientNameSnapshot: { contains: search, mode: "insensitive" } } } },
          ],
        },
      }),
      this.prisma.payment.findMany({
        include: { billingDocument: true },
        take: 8,
        where: {
          legalEntityId: legalEntity.id,
          OR: [
            { receiptNumber: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    return {
      documents: documents.map(toBillingDocumentSummary),
      payments: payments.map((payment) => ({
        amountMinor: payment.amountMinor,
        documentNumber: payment.billingDocument.formattedNumber,
        id: payment.id,
        paymentDate: payment.paymentDate.toISOString(),
        receiptNumber: payment.receiptNumber,
        reference: payment.reference,
      })),
      works: works.map((work) => toBillableWorkView(work, true)),
    };
  }

  public async listSeries(legalEntity: LegalEntityContext) {
    const series = await this.prisma.billingSeries.findMany({
      include: { legalEntity: true },
      orderBy: [{ year: "desc" }, { documentType: "asc" }, { prefix: "asc" }],
      where: { legalEntityId: legalEntity.id },
    });

    return { items: series.map(toBillingSeriesView) };
  }

  public async createSeries(context: ActorContext, legalEntity: LegalEntityContext, dto: UpsertBillingSeriesDto) {
    const series = await this.prisma.billingSeries.create({
      include: { legalEntity: true },
      data: { ...dto, legalEntityId: legalEntity.id },
    });
    await this.auditService.record({
      action: BILLING_AUDIT_ACTIONS.seriesCreated,
      actorUserId: context.actorUserId,
      metadata: { documentType: series.documentType, prefix: series.prefix, year: series.year },
      requestMetadata: context.requestMetadata,
      resourceId: series.id,
      resourceType: BILLING_RESOURCE_TYPES.billingSeries,
    });
    return toBillingSeriesView(series);
  }

  public async updateSeries(context: ActorContext, legalEntity: LegalEntityContext, seriesId: string, dto: UpsertBillingSeriesDto) {
    const series = await this.prisma.billingSeries.update({
      include: { legalEntity: true },
      data: dto,
      where: { id: seriesId, legalEntityId: legalEntity.id },
    });
    await this.auditService.record({
      action: BILLING_AUDIT_ACTIONS.seriesUpdated,
      actorUserId: context.actorUserId,
      metadata: { changedFields: ["documentType", "prefix", "year", "currentNumber", "isActive"] },
      requestMetadata: context.requestMetadata,
      resourceId: series.id,
      resourceType: BILLING_RESOURCE_TYPES.billingSeries,
    });
    return toBillingSeriesView(series);
  }

  private async createDraftDocument(context: ActorContext, legalEntity: LegalEntityContext, type: BillingDocumentType, dto: CreateBillingDocumentDto): Promise<BillingDocumentRecord> {
    const works = await this.findCompatibleWorks(legalEntity, dto.workOrderIds, type);
    const clinic = works[0]?.clinic;
    if (!clinic) {
      throw new BadRequestException("Selecteaza cel putin o lucrare.");
    }
    const currency = await this.getCurrency(legalEntity);
    const pricing = this.createDraftPricing(works, dto.adjustments ?? []);

    return this.prisma.billingDocument.create({
      data: {
        ...this.createClinicSnapshot(clinic),
        clinicId: clinic.id,
        companyAssignmentNotes: "Created from selected work cycle execution snapshots.",
        companyAssignmentStatus: "RESOLVED",
        createdByUserId: context.actorUserId,
        currency,
        doctorId: this.resolveDocumentDoctorId(works),
        dueDate: dto.dueDate ? parseDateOnly(dto.dueDate, "dueDate") : null,
        issueDate: parseDateOnly(dto.issueDate, "issueDate"),
        legalEntityCodeSnapshot: legalEntity.code,
        legalEntityId: legalEntity.id,
        legalEntityNameSnapshot: legalEntity.displayName,
        notes: dto.notes ?? null,
        status: "DRAFT",
        discountMinor: pricing.discountMinor,
        subtotalMinor: pricing.subtotalMinor,
        totalMinor: pricing.totalMinor,
        type,
        updatedByUserId: context.actorUserId,
        lines: {
          create: [...pricing.lines],
        },
      },
      include: BILLING_DOCUMENT_INCLUDE,
    });
  }

  private async findCompatibleWorks(legalEntity: LegalEntityContext, workOrderIds: readonly string[], documentType: BillingDocumentType, expectedClinicId?: string): Promise<readonly BillableWorkRecord[]> {
    const uniqueIds = [...new Set(workOrderIds)];
    if (uniqueIds.length !== workOrderIds.length) {
      throw new BadRequestException("Aceeasi lucrare nu poate fi adaugata de doua ori.");
    }

    const works = await this.prisma.workOrder.findMany({
      include: BILLABLE_WORK_INCLUDE,
      where: { id: { in: uniqueIds } },
    });
    if (works.length !== uniqueIds.length) {
      throw new BadRequestException("Una sau mai multe lucrari nu au fost gasite.");
    }

    const clinicIds = new Set(works.map((work) => work.clinicId));
    if (clinicIds.size !== 1 || (expectedClinicId && !clinicIds.has(expectedClinicId))) {
      throw new BadRequestException("Toate lucrarile trebuie sa apartina aceleiasi clinici.");
    }

    const invalidCompany = works.find((work) => this.getBillableCycle(work)?.executionLegalEntityId !== legalEntity.id);
    if (invalidCompany) {
      await this.auditService.record({
        action: BILLING_AUDIT_ACTIONS.companyMismatchRejected,
        metadata: { activeLegalEntityCode: legalEntity.code, workId: invalidCompany.id },
        resourceId: invalidCompany.id,
        resourceType: BILLING_RESOURCE_TYPES.billingDocument,
      });
      throw new BadRequestException("Lucrarea selectata apartine altei firme. Schimba firma activa.");
    }

    const unbillable = works.find((work) => !this.isWorkCycleBillable(work));
    if (unbillable) {
      throw new BadRequestException("Una sau mai multe lucrari nu au companie de executie si pret blocate pe ciclul activ.");
    }

    if (documentType === "INVOICE") {
      await this.assertCyclesNotInvoiced(
        this.prisma,
        works.map((work) => this.getRequiredBillableCycle(work).id),
      );
    }

    return uniqueIds.map((id) => works.find((work) => work.id === id)).filter((work): work is BillableWorkRecord => work !== undefined);
  }

  private createLineInputs(works: readonly BillableWorkRecord[]): readonly Prisma.BillingDocumentLineUncheckedCreateWithoutBillingDocumentInput[] {
    return works.map((work, index) => {
      const cycle = this.getRequiredBillableCycle(work);
      const snapshot = this.getRequiredBillableSnapshot(work);
      const quantity = Number(snapshot.pricingQuantity ?? work.quantity);

      return {
        cycleNumberSnapshot: cycle.cycleNumber,
        description: `${work.workType.name} - ${work.patientName}`,
        doctorNameSnapshot: work.doctor?.displayName ?? "-",
        legalEntityCodeSnapshot: cycle.executionLegalEntityCodeSnapshot,
        legalEntityId: cycle.executionLegalEntityId,
        lineTotalMinor: snapshot.pricingTotalMinor ?? 0,
        patientNameSnapshot: work.patientName,
        quantity,
        sortOrder: index + 1,
        toothPositionSnapshot: work.patientReference,
        unitPriceMinor: snapshot.pricingUnitPriceMinor ?? 0,
        workCode: work.code,
        workCreatedAtSnapshot: work.createdAt,
        workCycleId: cycle.id,
        workOrderId: work.id,
        workTypeNameSnapshot: work.workType.name,
      };
    });
  }

  private createDraftPricing(works: readonly BillableWorkRecord[], adjustments: readonly BillingAdjustmentInput[]): DraftPricing {
    const lines = this.createLineInputs(works).map((line) => ({ ...line }));
    const subtotalMinor = lines.reduce((total, line) => total + line.lineTotalMinor, 0);
    this.assertBillingAdjustments(lines, adjustments);

    for (const adjustment of adjustments) {
      const lineIndexes = this.resolveAdjustmentLineIndexes(lines, adjustment);
      if (lineIndexes.length === 0) {
        continue;
      }

      if (adjustment.mode === "PERCENTAGE") {
        const percentage = adjustment.percentage ?? 0;
        for (const lineIndex of lineIndexes) {
          const currentLine = lines[lineIndex];
          if (!currentLine) {
            continue;
          }
          const discountMinor = Math.min(currentLine.lineTotalMinor, Math.round(currentLine.lineTotalMinor * (percentage / 100)));
          currentLine.lineTotalMinor -= discountMinor;
          currentLine.unitPriceMinor = currentLine.quantity > 0 ? Math.round(currentLine.lineTotalMinor / currentLine.quantity) : 0;
        }
        continue;
      }

      const amountMinor = adjustment.amountMinor ?? 0;
      this.distributeFixedDiscount(lines, lineIndexes, amountMinor);
    }

    const totalMinor = lines.reduce((total, line) => total + line.lineTotalMinor, 0);
    return {
      discountMinor: Math.max(0, subtotalMinor - totalMinor),
      lines,
      subtotalMinor,
      totalMinor,
    };
  }

  private assertBillingAdjustments(lines: readonly Prisma.BillingDocumentLineUncheckedCreateWithoutBillingDocumentInput[], adjustments: readonly BillingAdjustmentInput[]): void {
    for (const adjustment of adjustments) {
      if (adjustment.scope === "WORK" && !adjustment.workOrderId) {
        throw new BadRequestException("Ajustarea pe lucrare necesita workOrderId.");
      }
      if (adjustment.scope === "PATIENT" && !adjustment.patientName) {
        throw new BadRequestException("Ajustarea pe pacient necesita patientName.");
      }
      if (adjustment.mode === "PERCENTAGE" && adjustment.percentage === undefined) {
        throw new BadRequestException("Ajustarea procentuala necesita percentage.");
      }
      if (adjustment.mode === "FIXED" && adjustment.amountMinor === undefined) {
        throw new BadRequestException("Ajustarea fixa necesita amountMinor.");
      }
      if (adjustment.scope === "WORK" && adjustment.workOrderId && !lines.some((line) => line.workOrderId === adjustment.workOrderId)) {
        throw new BadRequestException("Lucrarea ajustata nu exista in document.");
      }
      if (adjustment.scope === "PATIENT" && adjustment.patientName && !lines.some((line) => line.patientNameSnapshot === adjustment.patientName)) {
        throw new BadRequestException("Pacientul ajustat nu exista in document.");
      }
    }
  }

  private resolveAdjustmentLineIndexes(lines: readonly Prisma.BillingDocumentLineUncheckedCreateWithoutBillingDocumentInput[], adjustment: BillingAdjustmentInput): number[] {
    if (adjustment.scope === "DOCUMENT") {
      return lines.map((_, index) => index);
    }

    if (adjustment.scope === "PATIENT") {
      return lines.flatMap((line, index) => line.patientNameSnapshot === adjustment.patientName ? [index] : []);
    }

    return lines.flatMap((line, index) => line.workOrderId === adjustment.workOrderId ? [index] : []);
  }

  private distributeFixedDiscount(lines: Prisma.BillingDocumentLineUncheckedCreateWithoutBillingDocumentInput[], lineIndexes: readonly number[], amountMinor: number): void {
    const currentTotalMinor = lineIndexes.reduce((total, lineIndex) => total + (lines[lineIndex]?.lineTotalMinor ?? 0), 0);
    let remainingDiscountMinor = Math.min(amountMinor, currentTotalMinor);
    if (remainingDiscountMinor <= 0 || currentTotalMinor <= 0) {
      return;
    }

    lineIndexes.forEach((lineIndex, index) => {
      const currentLine = lines[lineIndex];
      if (!currentLine) {
        return;
      }
      const isLastLine = index === lineIndexes.length - 1;
      const proportionalDiscountMinor = isLastLine
        ? remainingDiscountMinor
        : Math.min(currentLine.lineTotalMinor, Math.floor((amountMinor * currentLine.lineTotalMinor) / currentTotalMinor));
      const appliedDiscountMinor = Math.min(currentLine.lineTotalMinor, proportionalDiscountMinor, remainingDiscountMinor);

      currentLine.lineTotalMinor -= appliedDiscountMinor;
      currentLine.unitPriceMinor = currentLine.quantity > 0 ? Math.round(currentLine.lineTotalMinor / currentLine.quantity) : 0;
      remainingDiscountMinor -= appliedDiscountMinor;
    });
  }

  private getBillableCycle(work: BillableWorkRecord): BillableWorkRecord["activeCycle"] {
    return work.activeCycle;
  }

  private getRequiredBillableCycle(work: BillableWorkRecord): NonNullable<BillableWorkRecord["activeCycle"]> {
    const cycle = this.getBillableCycle(work);
    if (!cycle) {
      throw new BadRequestException("Lucrarea nu are ciclu activ pentru facturare.");
    }

    return cycle;
  }

  private getRequiredBillableSnapshot(work: BillableWorkRecord): NonNullable<NonNullable<BillableWorkRecord["activeCycle"]>["executionSnapshot"]> {
    const snapshot = this.getRequiredBillableCycle(work).executionSnapshot;
    if (!snapshot) {
      throw new BadRequestException("Lucrarea nu are snapshot de executie pentru facturare.");
    }

    return snapshot;
  }

  private isWorkCycleBillable(work: BillableWorkRecord): boolean {
    const cycle = this.getBillableCycle(work);
    const snapshot = cycle?.executionSnapshot ?? null;

    return Boolean(
      cycle?.executionLegalEntityId
      && cycle.executionLegalEntityCodeSnapshot
      && snapshot?.status === "LOCKED"
      && snapshot.pricingTotalMinor !== null
      && snapshot.pricingUnitPriceMinor !== null,
    );
  }

  private hasActiveInvoiceLine(work: BillableWorkRecord): boolean {
    return this.getBillableCycle(work)?.billingLines.some((line) => line.billingDocument.type === "INVOICE" && line.billingDocument.status !== "CANCELLED" && line.billingDocument.stornoOfDocumentId === null) ?? false;
  }

  private createClinicSnapshot(clinic: BillableWorkRecord["clinic"]): Pick<Prisma.BillingDocumentUncheckedCreateInput, "clinicAddressSnapshot" | "clinicEmailSnapshot" | "clinicLegalNameSnapshot" | "clinicNameSnapshot" | "clinicPhoneSnapshot" | "clinicRegistrationNumberSnapshot" | "clinicTaxIdSnapshot"> {
    if (!clinic) {
      return {
        clinicAddressSnapshot: null,
        clinicEmailSnapshot: null,
        clinicLegalNameSnapshot: null,
        clinicNameSnapshot: "-",
        clinicPhoneSnapshot: null,
        clinicRegistrationNumberSnapshot: null,
        clinicTaxIdSnapshot: null,
      };
    }

    const addressParts = [
      clinic.billingAddressLine1 ?? clinic.addressLine1,
      clinic.billingAddressLine2 ?? clinic.addressLine2,
      clinic.billingCity ?? clinic.city,
      clinic.billingCountyOrRegion ?? clinic.countyOrRegion,
      clinic.billingPostalCode ?? clinic.postalCode,
      clinic.billingCountryCode ?? clinic.countryCode,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return {
      clinicAddressSnapshot: addressParts.length > 0 ? addressParts.join(", ") : null,
      clinicEmailSnapshot: clinic.email,
      clinicLegalNameSnapshot: clinic.billingName ?? clinic.legalName,
      clinicNameSnapshot: clinic.billingName ?? clinic.legalName ?? clinic.name,
      clinicPhoneSnapshot: clinic.phone,
      clinicRegistrationNumberSnapshot: clinic.billingRegistrationNumber ?? clinic.registrationNumber,
      clinicTaxIdSnapshot: clinic.billingTaxId ?? clinic.taxId,
    };
  }

  private resolveDocumentDoctorId(works: readonly BillableWorkRecord[]): string | null {
    const doctorIds = new Set(works.map((work) => work.doctorId));
    return doctorIds.size === 1 ? works[0]?.doctorId ?? null : null;
  }

  private async assignDocumentNumber(tx: Prisma.TransactionClient, document: BillingDocumentRecord, actorUserId: string): Promise<BillingDocumentRecord> {
    const year = document.issueDate.getUTCFullYear();
    const series = document.type === "INVOICE" && document.legalEntityId
      ? await this.ensureAutomaticInvoiceSeries(tx, document.legalEntityId, document.legalEntityCodeSnapshot, year)
      : await tx.billingSeries.findFirst({
        orderBy: { createdAt: "asc" },
        where: {
          documentType: document.type,
          isActive: true,
          legalEntityId: document.legalEntityId,
          year,
        },
      });
    if (!series) {
      throw new BadRequestException("Nu exista serie activa pentru tipul documentului si anul selectat.");
    }

    const nextSeries = await tx.billingSeries.update({
      data: { currentNumber: { increment: 1 } },
      where: { id: series.id },
    });
    const number = nextSeries.currentNumber;

    return tx.billingDocument.update({
      data: {
        formattedNumber: formatBillingNumber(series.prefix, series.year, number),
        issuedAt: new Date(),
        issuedByUserId: actorUserId,
        number,
        series: series.prefix,
        status: "ISSUED",
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
      include: BILLING_DOCUMENT_INCLUDE,
      where: { id: document.id },
    });
  }

  private async ensureAutomaticInvoiceSeries(tx: Prisma.TransactionClient, legalEntityId: string, legalEntityCode: string | null, year: number) {
    const prefix = legalEntityCode === "NG" ? "NG" : "CD";
    return tx.billingSeries.upsert({
      create: { currentNumber: 0, documentType: "INVOICE", isActive: true, legalEntityId, prefix, year },
      update: { isActive: true },
      where: {
        legalEntityId_documentType_prefix_year: {
          documentType: "INVOICE",
          legalEntityId,
          prefix,
          year,
        },
      },
    });
  }

  private async attachInvoiceToWorks(tx: Prisma.TransactionClient, documentId: string, workOrderIds: readonly string[]): Promise<void> {
    const result = await tx.workOrder.updateMany({
      data: { invoicedDocumentId: documentId },
      where: {
        id: { in: [...workOrderIds] },
        invoicedDocumentId: null,
      },
    });
    if (result.count !== workOrderIds.length) {
      throw new ConflictException("Una sau mai multe lucrari au fost facturate intre timp.");
    }
  }

  private async assertCyclesNotInvoiced(tx: Prisma.TransactionClient | PrismaService, workCycleIds: readonly string[], exceptDocumentId?: string): Promise<void> {
    if (workCycleIds.length === 0) {
      throw new BadRequestException("Documentul trebuie sa aiba cicluri de lucrare facturabile.");
    }

    const count = await tx.billingDocumentLine.count({
      where: {
        billingDocument: {
          ...(exceptDocumentId ? { id: { not: exceptDocumentId } } : {}),
          status: { not: "CANCELLED" },
          type: "INVOICE",
          stornoOfDocumentId: null,
        },
        workCycleId: { in: [...workCycleIds] },
      },
    });
    if (count > 0) {
      throw new ConflictException("Unul sau mai multe cicluri sunt deja facturate.");
    }
  }

  private async updateDocumentPaymentStatus(tx: Prisma.TransactionClient, documentId: string, actorUserId: string): Promise<BillingDocumentRecord> {
    const document = await tx.billingDocument.findUnique({
      include: BILLING_DOCUMENT_INCLUDE,
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException("Billing document was not found.");
    }
    const paymentStatus = calculateBillingAmounts(document).paymentStatus;
    const nextStatus = this.toDocumentStatusFromPayment(paymentStatus);

    return tx.billingDocument.update({
      data: {
        status: nextStatus,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
      include: BILLING_DOCUMENT_INCLUDE,
      where: { id: documentId },
    });
  }

  private toDocumentStatusFromPayment(paymentStatus: PaymentStatus) {
    if (paymentStatus === "PAID") {
      return "PAID" as const;
    }

    if (paymentStatus === "PARTIALLY_PAID") {
      return "PARTIALLY_PAID" as const;
    }

    return "ISSUED" as const;
  }

  private assertDraft(document: BillingDocumentRecord): void {
    if (document.status !== "DRAFT") {
      throw new BadRequestException("Doar documentele draft pot fi modificate.");
    }
  }

  private createWorkWhere(legalEntity: LegalEntityContext, query: Pick<BillingRangeQueryDto, "clinicId" | "dateFrom" | "dateTo" | "doctorId">, range: BillingDateRange): Prisma.WorkOrderWhereInput {
    return {
      activeCycle: { is: { executionLegalEntityId: legalEntity.id } },
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      createdAt: {
        gte: range.from,
        lte: endOfDateOnly(range.to),
      },
    };
  }

  private createDocumentWhere(legalEntity: LegalEntityContext, query: Pick<BillingRangeQueryDto, "clinicId" | "dateFrom" | "dateTo" | "doctorId">, range: BillingDateRange): Prisma.BillingDocumentWhereInput {
    return {
      legalEntityId: legalEntity.id,
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      issueDate: {
        gte: range.from,
        lte: endOfDateOnly(range.to),
      },
    };
  }

  private createDocumentsListWhere(legalEntity: LegalEntityContext, query: ListBillingDocumentsQueryDto): Prisma.BillingDocumentWhereInput {
    const range = this.resolveDateRange(query);
    const search = query.search?.trim();
    const filters: Prisma.BillingDocumentWhereInput[] = [];

    if (query.patient) {
      filters.push({ lines: { some: { patientNameSnapshot: { contains: query.patient, mode: "insensitive" } } } });
    }

    if (query.paymentReference) {
      filters.push({ payments: { some: { reference: { contains: query.paymentReference, mode: "insensitive" } } } });
    }

    if (query.receiptNumber) {
      filters.push({ payments: { some: { receiptNumber: { contains: query.receiptNumber, mode: "insensitive" } } } });
    }

    if (query.workCode) {
      filters.push({ lines: { some: { workCode: { contains: query.workCode, mode: "insensitive" } } } });
    }

    const dueDateRange = query.dueDateFrom || query.dueDateTo
      ? {
          dueDate: {
            ...(query.dueDateFrom ? { gte: parseDateOnly(query.dueDateFrom, "dueDateFrom") } : {}),
            ...(query.dueDateTo ? { lte: endOfDateOnly(parseDateOnly(query.dueDateTo, "dueDateTo")) } : {}),
          },
        }
      : {};
    const paymentFilter = query.paymentFilter ?? query.paymentStatus ?? "ALL";
    const paymentFilterWhere: Prisma.BillingDocumentWhereInput = paymentFilter === "CANCELLED"
      ? { status: "CANCELLED" }
      : paymentFilter === "OUTSTANDING" || paymentFilter === "DUE"
        ? { status: { in: ["ISSUED", "PARTIALLY_PAID"] }, type: "INVOICE", ...(paymentFilter === "DUE" ? { dueDate: { not: null } } : {}) }
        : paymentFilter === "OVERDUE"
          ? { dueDate: { lt: new Date() }, status: { in: ["ISSUED", "PARTIALLY_PAID"] }, type: "INVOICE" }
          : paymentFilter === "UNPAID" || paymentFilter === "PARTIALLY_PAID" || paymentFilter === "PAID"
            ? { status: paymentFilter === "UNPAID" ? "ISSUED" : paymentFilter, type: "INVOICE" }
            : {};

    return {
      ...this.createDocumentWhere(legalEntity, query, range),
      ...dueDateRange,
      ...(query.amountMinMinor !== undefined || query.amountMaxMinor !== undefined
        ? { totalMinor: { ...(query.amountMinMinor !== undefined ? { gte: query.amountMinMinor } : {}), ...(query.amountMaxMinor !== undefined ? { lte: query.amountMaxMinor } : {}) } }
        : {}),
      ...(filters.length > 0 || Object.keys(paymentFilterWhere).length > 0 ? { AND: [...filters, paymentFilterWhere] } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(search
        ? {
            OR: [
              { formattedNumber: { contains: search, mode: "insensitive" } },
              { clinicNameSnapshot: { contains: search, mode: "insensitive" } },
              { lines: { some: { doctorNameSnapshot: { contains: search, mode: "insensitive" } } } },
              { lines: { some: { workCode: { contains: search, mode: "insensitive" } } } },
              { lines: { some: { patientNameSnapshot: { contains: search, mode: "insensitive" } } } },
              { payments: { some: { receiptNumber: { contains: search, mode: "insensitive" } } } },
              { payments: { some: { reference: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
  }

  private matchesDocumentPaymentFilter(document: BillingDocumentRecord, query: Pick<ListBillingDocumentsQueryDto, "paymentFilter" | "paymentStatus">): boolean {
    const filter = query.paymentFilter ?? query.paymentStatus ?? "ALL";
    const amounts = calculateBillingAmounts(document);

    if (filter === "ALL") {
      return true;
    }

    if (filter === "CANCELLED") {
      return document.status === "CANCELLED";
    }

    if (document.status === "CANCELLED") {
      return false;
    }

    if (filter === "OUTSTANDING") {
      return document.type === "INVOICE" && amounts.balanceMinor > 0;
    }

    if (filter === "DUE") {
      return document.type === "INVOICE" && amounts.balanceMinor > 0 && document.dueDate !== null;
    }

    if (filter === "OVERDUE") {
      return this.isOverdueInvoice(document);
    }

    return document.type === "INVOICE" && amounts.paymentStatus === filter;
  }

  private resolveDateRange(query: Pick<BillingRangeQueryDto, "dateFrom" | "dateTo">): BillingDateRange {
    const fallback = getDefaultBillingRange();
    return {
      from: query.dateFrom ? parseDateOnly(query.dateFrom, "dateFrom") : fallback.from,
      to: query.dateTo ? parseDateOnly(query.dateTo, "dateTo") : fallback.to,
    };
  }

  private createOverviewGroups(groupBy: BillingRangeQueryDto["groupBy"], works: readonly BillableWorkRecord[], invoices: readonly BillingDocumentRecord[]): readonly BillingGroup[] {
    const groups = new Map<string, BillingGroup>();
    const add = (key: string, label: string, delta: Omit<BillingGroup, "key" | "label">) => {
      const current = groups.get(key) ?? { balanceMinor: 0, count: 0, invoicedMinor: 0, key, label, paidMinor: 0, uninvoicedMinor: 0 };
      groups.set(key, {
        balanceMinor: current.balanceMinor + delta.balanceMinor,
        count: current.count + delta.count,
        invoicedMinor: current.invoicedMinor + delta.invoicedMinor,
        key,
        label,
        paidMinor: current.paidMinor + delta.paidMinor,
        uninvoicedMinor: current.uninvoicedMinor + delta.uninvoicedMinor,
      });
    };

    for (const work of works) {
      const { key, label } = this.getWorkGroupKey(groupBy, work);
      const totalMinor = this.getRequiredBillableSnapshot(work).pricingTotalMinor ?? 0;
      const isInvoiced = this.hasActiveInvoiceLine(work);
      add(key, label, {
        balanceMinor: 0,
        count: 1,
        invoicedMinor: isInvoiced ? totalMinor : 0,
        paidMinor: 0,
        uninvoicedMinor: isInvoiced ? 0 : totalMinor,
      });
    }

    for (const invoice of invoices) {
      const { key, label } = this.getDocumentGroupKey(groupBy, invoice);
      const amounts = calculateBillingAmounts(invoice);
      add(key, label, {
        balanceMinor: amounts.balanceMinor,
        count: 0,
        invoicedMinor: invoice.totalMinor,
        paidMinor: amounts.paidMinor,
        uninvoicedMinor: 0,
      });
    }

    return [...groups.values()].sort((first, second) => first.label.localeCompare(second.label));
  }

  private getWorkGroupKey(groupBy: BillingRangeQueryDto["groupBy"], work: BillableWorkRecord): { readonly key: string; readonly label: string } {
    if (groupBy === "doctor") {
      return { key: work.doctorId ?? "no-doctor", label: work.doctor?.displayName ?? "Fără medic" };
    }
    if (groupBy === "patient") {
      return { key: work.patientName, label: work.patientName };
    }
    if (groupBy === "workType") {
      return { key: work.workTypeId, label: work.workType.name };
    }
    if (groupBy === "day") {
      return { key: toDateOnly(work.createdAt), label: toDateOnly(work.createdAt) };
    }
    if (groupBy === "month") {
      return { key: toDateOnly(work.createdAt).slice(0, 7), label: toDateOnly(work.createdAt).slice(0, 7) };
    }
    if (groupBy === "billingStatus") {
      return this.hasActiveInvoiceLine(work) ? { key: "invoiced", label: "Facturate" } : { key: "uninvoiced", label: "Nefacturate" };
    }

    return { key: work.clinicId ?? "no-clinic", label: work.clinic?.name ?? "Fără clinică" };
  }

  private getDocumentGroupKey(groupBy: BillingRangeQueryDto["groupBy"], document: BillingDocumentRecord): { readonly key: string; readonly label: string } {
    if (groupBy === "day") {
      return { key: toDateOnly(document.issueDate), label: toDateOnly(document.issueDate) };
    }
    if (groupBy === "month") {
      return { key: toDateOnly(document.issueDate).slice(0, 7), label: toDateOnly(document.issueDate).slice(0, 7) };
    }
    if (groupBy === "paymentStatus") {
      return { key: calculateBillingAmounts(document).paymentStatus, label: calculateBillingAmounts(document).paymentStatus };
    }

    return { key: document.clinicId, label: document.clinicNameSnapshot };
  }

  private async findDocumentOrThrow(legalEntity: LegalEntityContext, documentId: string): Promise<BillingDocumentRecord> {
    const document = await this.prisma.billingDocument.findUnique({
      include: BILLING_DOCUMENT_INCLUDE,
      where: { id: documentId, legalEntityId: legalEntity.id },
    });
    if (!document) {
      throw new NotFoundException("Billing document was not found.");
    }

    return document;
  }

  private createAmbiguousLegacyWhere(legalEntity: LegalEntityContext): Prisma.BillingDocumentWhereInput {
    return {
      companyAssignmentStatus: { in: ["AMBIGUOUS", "UNASSIGNED"] },
      OR: [
        { legalEntityId: legalEntity.id },
        { legalEntityCodeSnapshot: legalEntity.code },
        { lines: { some: { legalEntityId: legalEntity.id } } },
        { lines: { some: { legalEntityCodeSnapshot: legalEntity.code } } },
      ],
    };
  }

  private toReceivableRow(document: BillingDocumentRecord) {
    const amounts = calculateBillingAmounts(document);

    return {
      balanceMinor: amounts.balanceMinor,
      clinicName: document.clinicNameSnapshot,
      currency: document.currency,
      daysOverdue: this.getDaysOverdue(document),
      doctorNames: uniqueStrings(document.lines.map((line) => line.doctorNameSnapshot)),
      documentId: document.id,
      documentNumber: document.formattedNumber,
      dueDate: document.dueDate?.toISOString() ?? null,
      issueDate: document.issueDate.toISOString(),
      paidMinor: amounts.paidMinor,
      patientNames: uniqueStrings(document.lines.map((line) => line.patientNameSnapshot)),
      status: document.status,
      totalMinor: document.totalMinor,
      workCodes: uniqueStrings(document.lines.map((line) => line.workCode)),
    };
  }

  private isOverdueInvoice(document: BillingDocumentRecord): boolean {
    return isActiveOverdueInvoice(document);
  }

  private getDaysOverdue(document: Pick<BillingDocumentRecord, "dueDate">): number {
    if (!document.dueDate) {
      return 0;
    }
    const today = new Date();
    const due = new Date(document.dueDate);
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());

    return Math.max(0, Math.floor((todayUtc - dueUtc) / 86_400_000));
  }

  private async getCurrency(legalEntity: LegalEntityContext): Promise<string> {
    const settings = await this.prisma.legalEntitySettings.findUnique({
      select: { currency: true },
      where: { legalEntityId: legalEntity.id },
    });

    return settings?.currency ?? DEFAULT_LABORATORY_SETTINGS.currency;
  }

  private async recordDocumentAudit(context: ActorContext, action: string, document: BillingDocumentRecord): Promise<void> {
    await this.auditService.record({
      action,
      actorUserId: context.actorUserId,
      metadata: {
        documentId: document.id,
        documentNumber: document.formattedNumber,
        totalMinor: document.totalMinor,
        workIds: document.lines.map((line) => line.workOrderId),
      },
      requestMetadata: context.requestMetadata,
      resourceId: document.id,
      resourceType: BILLING_RESOURCE_TYPES.billingDocument,
    });
  }
}

function uniqueStrings(values: readonly (string | null)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}
