import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { BillingDocumentType, Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "../settings/settings.constants.js";
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
  ReplaceBillingLinesDto,
  SearchBillingQueryDto,
  UpdateBillingDocumentDto,
  UpsertBillingSeriesDto,
} from "./dto/billing.dto.js";
import {
  calculateBillingAmounts,
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
  lines: true,
  payments: true,
} as const satisfies Prisma.BillingDocumentInclude;

const BILLABLE_WORK_INCLUDE = {
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

  public async getOverview(query: BillingRangeQueryDto): Promise<BillingOverview> {
    const range = this.resolveDateRange(query);
    const currency = await this.getCurrency();
    const workWhere = this.createWorkWhere(query, range);
    const documentWhere = this.createDocumentWhere(query, range);

    const [works, documents] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        include: BILLABLE_WORK_INCLUDE,
        where: workWhere,
      }),
      this.prisma.billingDocument.findMany({
        include: BILLING_DOCUMENT_INCLUDE,
        where: documentWhere,
      }),
    ]);

    if (works.length === 0 && documents.length === 0) {
      return createEmptyBillingOverview(toDateOnly(range.from), toDateOnly(range.to), currency);
    }

    const workValueMinor = works.reduce((total, work) => total + work.totalPriceMinor, 0);
    const uninvoicedWorks = works.filter((work) => work.invoicedDocumentId === null);
    const uninvoicedMinor = uninvoicedWorks.reduce((total, work) => total + work.totalPriceMinor, 0);
    const activeDocuments = documents.filter((document) => document.status !== "CANCELLED");
    const invoices = activeDocuments.filter((document) => document.type === "INVOICE");
    const proformas = activeDocuments.filter((document) => document.type === "PROFORMA");
    const paidMinor = invoices.reduce((total, document) => total + calculateBillingAmounts(document).paidMinor, 0);
    const outstandingMinor = invoices.reduce((total, document) => total + calculateBillingAmounts(document).balanceMinor, 0);
    const unpaidInvoiceCount = invoices.filter((document) => calculateBillingAmounts(document).balanceMinor > 0).length;

    return {
      currency,
      documentCount: activeDocuments.length,
      from: toDateOnly(range.from),
      groups: this.createOverviewGroups(query.groupBy, works, invoices),
      invoiceCount: invoices.length,
      openProformaCount: proformas.filter((document) => document.status !== "CANCELLED").length,
      outstandingMinor,
      paidMinor,
      proformaMinor: proformas.reduce((total, document) => total + document.totalMinor, 0),
      to: toDateOnly(range.to),
      unpaidInvoiceCount,
      uninvoicedMinor,
      uninvoicedWorkCount: uninvoicedWorks.length,
      workValueMinor,
    };
  }

  public async listBillableWorks(query: BillableWorksQueryDto, includeMoney: boolean) {
    const range = this.resolveDateRange(query);
    const search = query.search?.trim();
    const workOrders = await this.prisma.workOrder.findMany({
      include: BILLABLE_WORK_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      where: {
        ...this.createWorkWhere(query, range),
        ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
        ...(query.uninvoicedOnly ? { invoicedDocumentId: null } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { patientName: { contains: search, mode: "insensitive" } },
                { patientReference: { contains: search, mode: "insensitive" } },
                { clinic: { name: { contains: search, mode: "insensitive" } } },
                { doctor: { displayName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
    });

    return {
      items: workOrders.map((workOrder) => toBillableWorkView(workOrder, includeMoney)),
    };
  }

  public async listDocuments(query: ListBillingDocumentsQueryDto): Promise<PaginatedBillingDocumentsResponse> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const where = this.createDocumentsListWhere(query);
    const documents = await this.prisma.billingDocument.findMany({
      include: BILLING_DOCUMENT_INCLUDE,
      orderBy: {
        [query.sortBy]: query.sortDirection,
      },
      where,
    });
    const filteredItems = documents.filter((document) => this.matchesDocumentPaymentFilter(document, query));
    const total = filteredItems.length;

    return {
      items: filteredItems.slice((page - 1) * pageSize, page * pageSize).map(toBillingDocumentSummary),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async getDocument(documentId: string) {
    return toBillingDocumentDetail(await this.findDocumentOrThrow(documentId));
  }

  public async createProforma(context: ActorContext, dto: CreateBillingDocumentDto) {
    const document = await this.createDraftDocument(context, "PROFORMA", dto);
    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.proformaCreated, document);
    return toBillingDocumentDetail(document);
  }

  public async createInvoice(context: ActorContext, dto: CreateBillingDocumentDto) {
    const document = await this.createDraftDocument(context, "INVOICE", dto);
    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.invoiceCreated, document);
    return toBillingDocumentDetail(document);
  }

  public async updateDraft(context: ActorContext, documentId: string, dto: UpdateBillingDocumentDto) {
    const before = await this.findDocumentOrThrow(documentId);
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

  public async replaceLines(context: ActorContext, documentId: string, dto: ReplaceBillingLinesDto) {
    const before = await this.findDocumentOrThrow(documentId);
    this.assertDraft(before);
    const works = await this.findCompatibleWorks(dto.workOrderIds, before.type, before.clinicId);
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

  public async issueDocument(context: ActorContext, documentId: string) {
    const document = await this.prisma.$transaction(async (tx) => {
      const draft = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId },
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

  public async convertProformaToInvoice(context: ActorContext, documentId: string) {
    const invoice = await this.prisma.$transaction(async (tx) => {
      const proforma = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId },
      });
      if (!proforma) {
        throw new NotFoundException("Proforma was not found.");
      }
      if (proforma.type !== "PROFORMA" || proforma.status !== "ISSUED") {
        throw new BadRequestException("Doar o proforma emisa poate fi transformata in factura.");
      }

      await this.assertWorksNotInvoiced(tx, proforma.lines.map((line) => line.workOrderId));
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
          createdByUserId: context.actorUserId,
          currency: proforma.currency,
          discountMinor: proforma.discountMinor,
          doctorId: proforma.doctorId,
          dueDate: proforma.dueDate,
          issueDate: proforma.issueDate,
          notes: proforma.notes,
          status: "DRAFT",
          subtotalMinor: proforma.subtotalMinor,
          taxMinor: proforma.taxMinor,
          totalMinor: proforma.totalMinor,
          type: "INVOICE",
          updatedByUserId: context.actorUserId,
          lines: {
            create: proforma.lines.map((line) => ({
              description: line.description,
              doctorNameSnapshot: line.doctorNameSnapshot,
              lineTotalMinor: line.lineTotalMinor,
              patientNameSnapshot: line.patientNameSnapshot,
              quantity: line.quantity,
              sortOrder: line.sortOrder,
              toothPositionSnapshot: line.toothPositionSnapshot,
              unitPriceMinor: line.unitPriceMinor,
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

  public async cancelDocument(context: ActorContext, documentId: string) {
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const document = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId },
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

  public async recordPayment(context: ActorContext, documentId: string, dto: RecordPaymentDto) {
    const document = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.billingDocument.findUnique({
        include: BILLING_DOCUMENT_INCLUDE,
        where: { id: documentId },
      });
      if (!invoice) {
        throw new NotFoundException("Invoice was not found.");
      }
      if (invoice.type !== "INVOICE" || invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
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
          method: dto.method,
          notes: dto.notes ?? null,
          paymentDate: parseDateOnly(dto.paymentDate, "paymentDate"),
          receiptDate: dto.receiptDate ? parseDateOnly(dto.receiptDate, "receiptDate") : dto.method === "CASH" ? parseDateOnly(dto.paymentDate, "paymentDate") : null,
          receiptNumber: dto.receiptNumber ?? null,
          reference: dto.reference ?? null,
        },
      });

      return this.updateDocumentPaymentStatus(tx, invoice.id, context.actorUserId);
    });

    await this.recordDocumentAudit(context, BILLING_AUDIT_ACTIONS.paymentRecorded, document);
    return toBillingDocumentDetail(document);
  }

  public async cancelPayment(context: ActorContext, paymentId: string) {
    const document = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
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

  public async listPayments() {
    const payments = await this.prisma.payment.findMany({
      include: { billingDocument: true },
      orderBy: { paymentDate: "desc" },
      take: 200,
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

  public async search(query: SearchBillingQueryDto) {
    const search = query.q.trim();
    const [works, documents, payments] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        include: BILLABLE_WORK_INCLUDE,
        take: 8,
        where: {
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

  public async listSeries() {
    const series = await this.prisma.billingSeries.findMany({
      orderBy: [{ year: "desc" }, { documentType: "asc" }, { prefix: "asc" }],
    });

    return { items: series.map(toBillingSeriesView) };
  }

  public async createSeries(context: ActorContext, dto: UpsertBillingSeriesDto) {
    const series = await this.prisma.billingSeries.create({
      data: dto,
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

  public async updateSeries(context: ActorContext, seriesId: string, dto: UpsertBillingSeriesDto) {
    const series = await this.prisma.billingSeries.update({
      data: dto,
      where: { id: seriesId },
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

  private async createDraftDocument(context: ActorContext, type: BillingDocumentType, dto: CreateBillingDocumentDto): Promise<BillingDocumentRecord> {
    const works = await this.findCompatibleWorks(dto.workOrderIds, type);
    const clinic = works[0]?.clinic;
    if (!clinic) {
      throw new BadRequestException("Selecteaza cel putin o lucrare.");
    }
    const currency = await this.getCurrency();
    const lines = this.createLineInputs(works);
    const totalMinor = lines.reduce((total, line) => total + line.lineTotalMinor, 0);

    return this.prisma.billingDocument.create({
      data: {
        ...this.createClinicSnapshot(clinic),
        clinicId: clinic.id,
        createdByUserId: context.actorUserId,
        currency,
        doctorId: this.resolveDocumentDoctorId(works),
        dueDate: dto.dueDate ? parseDateOnly(dto.dueDate, "dueDate") : null,
        issueDate: parseDateOnly(dto.issueDate, "issueDate"),
        notes: dto.notes ?? null,
        status: "DRAFT",
        subtotalMinor: totalMinor,
        totalMinor,
        type,
        updatedByUserId: context.actorUserId,
        lines: {
          create: [...lines],
        },
      },
      include: BILLING_DOCUMENT_INCLUDE,
    });
  }

  private async findCompatibleWorks(workOrderIds: readonly string[], documentType: BillingDocumentType, expectedClinicId?: string): Promise<readonly BillableWorkRecord[]> {
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

    if (documentType === "INVOICE" && works.some((work) => work.invoicedDocumentId !== null)) {
      throw new ConflictException("Una sau mai multe lucrari sunt deja facturate.");
    }

    return uniqueIds.map((id) => works.find((work) => work.id === id)).filter((work): work is BillableWorkRecord => work !== undefined);
  }

  private createLineInputs(works: readonly BillableWorkRecord[]): readonly Prisma.BillingDocumentLineUncheckedCreateWithoutBillingDocumentInput[] {
    return works.map((work, index) => ({
      description: `${work.workType.name} - ${work.patientName}`,
      doctorNameSnapshot: work.doctor.displayName,
      lineTotalMinor: work.totalPriceMinor,
      patientNameSnapshot: work.patientName,
      quantity: work.quantity,
      sortOrder: index + 1,
      toothPositionSnapshot: work.patientReference,
      unitPriceMinor: work.baseUnitPriceMinor,
      workCode: work.code,
      workCreatedAtSnapshot: work.createdAt,
      workOrderId: work.id,
      workTypeNameSnapshot: work.workType.name,
    }));
  }

  private createClinicSnapshot(clinic: BillableWorkRecord["clinic"]): Pick<Prisma.BillingDocumentUncheckedCreateInput, "clinicAddressSnapshot" | "clinicEmailSnapshot" | "clinicLegalNameSnapshot" | "clinicNameSnapshot" | "clinicPhoneSnapshot" | "clinicRegistrationNumberSnapshot" | "clinicTaxIdSnapshot"> {
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
    const series = await tx.billingSeries.findFirst({
      orderBy: { createdAt: "asc" },
      where: {
        documentType: document.type,
        isActive: true,
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

  private async assertWorksNotInvoiced(tx: Prisma.TransactionClient, workOrderIds: readonly string[]): Promise<void> {
    const count = await tx.workOrder.count({
      where: {
        id: { in: [...workOrderIds] },
        invoicedDocumentId: { not: null },
      },
    });
    if (count > 0) {
      throw new ConflictException("Una sau mai multe lucrari sunt deja facturate.");
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

  private createWorkWhere(query: Pick<BillingRangeQueryDto, "clinicId" | "dateFrom" | "dateTo" | "doctorId">, range: BillingDateRange): Prisma.WorkOrderWhereInput {
    return {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      createdAt: {
        gte: range.from,
        lte: endOfDateOnly(range.to),
      },
    };
  }

  private createDocumentWhere(query: Pick<BillingRangeQueryDto, "clinicId" | "dateFrom" | "dateTo" | "doctorId">, range: BillingDateRange): Prisma.BillingDocumentWhereInput {
    return {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      issueDate: {
        gte: range.from,
        lte: endOfDateOnly(range.to),
      },
    };
  }

  private createDocumentsListWhere(query: ListBillingDocumentsQueryDto): Prisma.BillingDocumentWhereInput {
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

    return {
      ...this.createDocumentWhere(query, range),
      ...(query.amountMinMinor !== undefined || query.amountMaxMinor !== undefined
        ? { totalMinor: { ...(query.amountMinMinor !== undefined ? { gte: query.amountMinMinor } : {}), ...(query.amountMaxMinor !== undefined ? { lte: query.amountMaxMinor } : {}) } }
        : {}),
      ...(filters.length > 0 ? { AND: filters } : {}),
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
      return document.type === "INVOICE" && amounts.balanceMinor > 0 && document.dueDate !== null && document.dueDate.getTime() < Date.now();
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
      add(key, label, {
        balanceMinor: 0,
        count: 1,
        invoicedMinor: work.invoicedDocumentId ? work.totalPriceMinor : 0,
        paidMinor: 0,
        uninvoicedMinor: work.invoicedDocumentId ? 0 : work.totalPriceMinor,
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
      return { key: work.doctorId, label: work.doctor.displayName };
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
      return work.invoicedDocumentId ? { key: "invoiced", label: "Facturate" } : { key: "uninvoiced", label: "Nefacturate" };
    }

    return { key: work.clinicId, label: work.clinic.name };
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

  private async findDocumentOrThrow(documentId: string): Promise<BillingDocumentRecord> {
    const document = await this.prisma.billingDocument.findUnique({
      include: BILLING_DOCUMENT_INCLUDE,
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException("Billing document was not found.");
    }

    return document;
  }

  private async getCurrency(): Promise<string> {
    const settings = await this.prisma.laboratorySettings.findUnique({
      select: { currency: true },
      where: { key: SETTINGS_SINGLETON_KEY },
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
