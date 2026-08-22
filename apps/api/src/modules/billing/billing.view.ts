import type { BillingDocumentStatus, BillingDocumentType, PaymentMethod, Prisma } from "@prisma/client";
import type { WorkTypeUnit } from "@prisma/client";

type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface BillingClinicSnapshot {
  readonly address: string | null;
  readonly email: string | null;
  readonly legalName: string | null;
  readonly name: string;
  readonly phone: string | null;
  readonly registrationNumber: string | null;
  readonly taxId: string | null;
}

export interface BillingDocumentLineView {
  readonly cycleNumber: number | null;
  readonly description: string;
  readonly doctorNameSnapshot: string;
  readonly id: string;
  readonly lineTotalMinor: number;
  readonly patientNameSnapshot: string;
  readonly quantity: number;
  readonly sortOrder: number;
  readonly toothPositionSnapshot: string | null;
  readonly unitPriceMinor: number;
  readonly workTypeUnitSnapshot: WorkTypeUnit;
  readonly workCode: string;
  readonly workCycleId: string | null;
  readonly workCreatedAtSnapshot: string;
  readonly workOrderId: string;
  readonly workTypeNameSnapshot: string;
}

export interface PaymentView {
  readonly amountMinor: number;
  readonly billingDocumentId: string;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly currency: string;
  readonly id: string;
  readonly method: PaymentMethod;
  readonly paymentDate: string;
  readonly receiptDate: string | null;
  readonly receiptNumber: string | null;
  readonly reference: string | null;
}

export interface BillingDocumentSummary {
  readonly balanceMinor: number;
  readonly clinicId: string;
  readonly clinicName: string;
  readonly currency: string;
  readonly dueDate: string | null;
  readonly formattedNumber: string | null;
  readonly id: string;
  readonly legalEntityCode: string | null;
  readonly legalEntityName: string | null;
  readonly issueDate: string;
  readonly paidMinor: number;
  readonly paymentStatus: PaymentStatus;
  readonly status: BillingDocumentStatus;
  readonly totalMinor: number;
  readonly type: BillingDocumentType;
  readonly stornoOfDocumentId?: string | null;
  readonly stornoDocumentId?: string | null;
  readonly workCodes: readonly string[];
  readonly workCount: number;
}

export interface BillingDocumentDetail extends BillingDocumentSummary {
  readonly clinicSnapshot: BillingClinicSnapshot;
  readonly createdAt: string;
  readonly discountMinor: number;
  readonly dueDate: string | null;
  readonly issuedAt: string | null;
  readonly lines: readonly BillingDocumentLineView[];
  readonly notes: string | null;
  readonly payments: readonly PaymentView[];
  readonly subtotalMinor: number;
  readonly taxMinor: number;
}

export interface BillableWork {
  readonly baseUnitPriceMinor: number | null;
  readonly clinicId: string | null;
  readonly clinicName: string;
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly doctorId: string | null;
  readonly doctorName: string;
  readonly id: string;
  readonly invoicedDocumentId: string | null;
  readonly isBillable: boolean;
  readonly legalEntityCode: string | null;
  readonly legalEntityName: string | null;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: string;
  readonly totalPriceMinor: number | null;
  readonly unavailableReason: string | null;
  readonly workCycleId: string | null;
  readonly workCycleNumber: number | null;
  readonly workTypeName: string;
}

export interface BillingSeriesView {
  readonly currentNumber: number;
  readonly documentType: BillingDocumentType;
  readonly id: string;
  readonly isActive: boolean;
  readonly legalEntityCode: string | null;
  readonly prefix: string;
  readonly year: number;
}

export interface BillingGroup {
  readonly balanceMinor: number;
  readonly count: number;
  readonly invoicedMinor: number;
  readonly key: string;
  readonly label: string;
  readonly paidMinor: number;
  readonly uninvoicedMinor: number;
}

export interface BillingOverview {
  readonly ambiguousLegacyCount: number;
  readonly currency: string;
  readonly documentCount: number;
  readonly from: string;
  readonly groups: readonly BillingGroup[];
  readonly invoiceCount: number;
  readonly openProformaCount: number;
  readonly overdueInvoiceCount: number;
  readonly outstandingMinor: number;
  readonly paidMinor: number;
  readonly paidInvoiceCount: number;
  readonly partialInvoiceCount: number;
  readonly proformaMinor: number;
  readonly to: string;
  readonly totalIssuedMinor: number;
  readonly unpaidInvoiceCount: number;
  readonly unpaidOutstandingMinor: number;
  readonly partialOutstandingMinor: number;
  readonly uninvoicedMinor: number;
  readonly uninvoicedWorkCount: number;
  readonly workValueMinor: number;
}

export type BillingDocumentRecord = Prisma.BillingDocumentGetPayload<{
  include: {
    clinic: true;
    legalEntity: true;
    lines: {
      include: {
        legalEntity: true;
        workCycle: true;
        workOrder: {
          include: {
            workType: true;
          };
        };
      };
    };
    payments: true;
    stornoDocument: true;
    stornoOfDocument: true;
  };
}>;

export type BillableWorkRecord = Prisma.WorkOrderGetPayload<{
  include: {
    activeCycle: {
      include: {
        billingLines: {
          include: {
            billingDocument: true;
          };
        };
        executionLegalEntity: true;
        executionSnapshot: true;
      };
    };
    clinic: true;
    doctor: true;
    workType: true;
  };
}>;

export interface BillingAmounts {
  readonly balanceMinor: number;
  readonly paidMinor: number;
  readonly paymentStatus: PaymentStatus;
}

export function isActiveOverdueInvoice(
  document: {
    readonly type: BillingDocumentType;
    readonly status: BillingDocumentStatus;
    readonly dueDate: Date | null;
    readonly stornoDocumentId?: string | null;
    readonly payments: readonly { readonly amountMinor: number; readonly cancelledAt: Date | null }[];
    readonly totalMinor: number;
  },
  now = new Date(),
): boolean {
  if (document.type !== "INVOICE" || document.stornoDocumentId !== undefined && document.stornoDocumentId !== null || !["ISSUED", "PARTIALLY_PAID"].includes(document.status) || !document.dueDate) {
    return false;
  }

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(document.dueDate.getUTCFullYear(), document.dueDate.getUTCMonth(), document.dueDate.getUTCDate());
  return dueUtc < todayUtc && calculateBillingAmounts(document).balanceMinor > 0;
}

export function calculateBillingAmounts(document: { readonly payments: readonly { readonly amountMinor: number; readonly cancelledAt: Date | null }[]; readonly totalMinor: number }): BillingAmounts {
  const paidMinor = document.payments
    .filter((payment) => payment.cancelledAt === null)
    .reduce((total, payment) => total + payment.amountMinor, 0);
  const balanceMinor = Math.max(0, document.totalMinor - paidMinor);
  const paymentStatus: PaymentStatus = paidMinor === 0
    ? "UNPAID"
    : balanceMinor === 0
      ? "PAID"
      : "PARTIALLY_PAID";

  return { balanceMinor, paidMinor, paymentStatus };
}

export function toBillingDocumentSummary(document: BillingDocumentRecord): BillingDocumentSummary {
  const amounts = calculateBillingAmounts(document);

  return {
    balanceMinor: amounts.balanceMinor,
    clinicId: document.clinicId,
    clinicName: document.clinicNameSnapshot,
    currency: document.currency,
    dueDate: document.dueDate?.toISOString() ?? null,
    formattedNumber: document.formattedNumber,
    id: document.id,
    issueDate: document.issueDate.toISOString(),
    legalEntityCode: document.legalEntityCodeSnapshot,
    legalEntityName: document.legalEntityNameSnapshot,
    paidMinor: amounts.paidMinor,
    paymentStatus: amounts.paymentStatus,
    status: document.status as BillingDocumentStatus,
    totalMinor: document.totalMinor,
    type: document.type as BillingDocumentType,
    stornoOfDocumentId: document.stornoOfDocumentId,
    stornoDocumentId: document.stornoDocument?.id ?? null,
    workCodes: document.lines.map((line) => line.workCode),
    workCount: document.lines.length,
  };
}

export function toBillingDocumentDetail(document: BillingDocumentRecord): BillingDocumentDetail {
  return {
    ...toBillingDocumentSummary(document),
    clinicSnapshot: toBillingClinicSnapshot(document),
    createdAt: document.createdAt.toISOString(),
    discountMinor: document.discountMinor,
    dueDate: document.dueDate?.toISOString() ?? null,
    issuedAt: document.issuedAt?.toISOString() ?? null,
    lines: document.lines
      .slice()
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map(toBillingDocumentLineView),
    notes: document.notes,
    payments: document.payments
      .slice()
      .sort((first, second) => first.paymentDate.getTime() - second.paymentDate.getTime())
      .map(toPaymentView),
    subtotalMinor: document.subtotalMinor,
    taxMinor: document.taxMinor,
  };
}

export function toBillingClinicSnapshot(document: BillingDocumentRecord): BillingClinicSnapshot {
  return {
    address: document.clinicAddressSnapshot,
    email: document.clinicEmailSnapshot,
    legalName: document.clinicLegalNameSnapshot,
    name: document.clinicNameSnapshot,
    phone: document.clinicPhoneSnapshot,
    registrationNumber: document.clinicRegistrationNumberSnapshot,
    taxId: document.clinicTaxIdSnapshot,
  };
}

export function toBillingDocumentLineView(line: BillingDocumentRecord["lines"][number]): BillingDocumentLineView {
  return {
    description: line.description,
    cycleNumber: line.cycleNumberSnapshot,
    doctorNameSnapshot: line.doctorNameSnapshot,
    id: line.id,
    lineTotalMinor: line.lineTotalMinor,
    patientNameSnapshot: line.patientNameSnapshot,
    quantity: line.quantity,
    sortOrder: line.sortOrder,
    toothPositionSnapshot: line.toothPositionSnapshot,
    unitPriceMinor: line.unitPriceMinor,
    workTypeUnitSnapshot: line.workOrder.workType.unit,
    workCode: line.workCode,
    workCycleId: line.workCycleId,
    workCreatedAtSnapshot: line.workCreatedAtSnapshot.toISOString(),
    workOrderId: line.workOrderId,
    workTypeNameSnapshot: line.workTypeNameSnapshot,
  };
}

export function toPaymentView(payment: BillingDocumentRecord["payments"][number]): PaymentView {
  return {
    amountMinor: payment.amountMinor,
    billingDocumentId: payment.billingDocumentId,
    cancelledAt: payment.cancelledAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    currency: payment.currency,
    id: payment.id,
    method: payment.method as PaymentMethod,
    paymentDate: payment.paymentDate.toISOString(),
    receiptDate: payment.receiptDate?.toISOString() ?? null,
    receiptNumber: payment.receiptNumber,
    reference: payment.reference,
  };
}

export function toBillableWorkView(workOrder: BillableWorkRecord, includeMoney: boolean): BillableWork {
  const activeCycle = workOrder.activeCycle;
  const snapshot = activeCycle?.executionSnapshot ?? null;
  const activeInvoiceLine = activeCycle?.billingLines.find((line) => line.billingDocument.type === "INVOICE" && line.billingDocument.status !== "CANCELLED") ?? null;
  const isBillable = Boolean(activeCycle?.executionLegalEntityId && snapshot?.status === "LOCKED" && snapshot.pricingTotalMinor !== null && activeInvoiceLine === null);

  return {
    baseUnitPriceMinor: includeMoney ? snapshot?.pricingUnitPriceMinor ?? null : null,
    clinicId: workOrder.clinicId,
    clinicName: workOrder.clinic?.name ?? "-",
    code: workOrder.code,
    createdAt: workOrder.createdAt.toISOString(),
    currency: includeMoney ? workOrder.currency : null,
    doctorId: workOrder.doctorId,
    doctorName: workOrder.doctor?.displayName ?? "-",
    id: workOrder.id,
    invoicedDocumentId: activeInvoiceLine?.billingDocumentId ?? workOrder.invoicedDocumentId,
    isBillable,
    legalEntityCode: activeCycle?.executionLegalEntityCodeSnapshot ?? null,
    legalEntityName: activeCycle?.executionLegalEntityNameSnapshot ?? null,
    patientName: workOrder.patientName,
    patientReference: workOrder.patientReference,
    quantity: workOrder.quantity,
    requestedDeliveryDate: workOrder.requestedDeliveryDate.toISOString(),
    status: workOrder.status,
    totalPriceMinor: includeMoney ? snapshot?.pricingTotalMinor ?? null : null,
    unavailableReason: activeInvoiceLine
      ? "Ciclul activ este deja asociat unei facturi active."
      : !activeCycle?.executionLegalEntityId || snapshot?.status !== "LOCKED" || snapshot.pricingTotalMinor === null
        ? "Lipsește snapshot-ul de execuție pentru firma activă."
        : null,
    workCycleId: activeCycle?.id ?? null,
    workCycleNumber: activeCycle?.cycleNumber ?? null,
    workTypeName: workOrder.workType.name,
  };
}

export function toBillingSeriesView(series: { readonly currentNumber: number; readonly documentType: BillingDocumentType; readonly id: string; readonly isActive: boolean; readonly legalEntity?: { readonly code: string } | null; readonly prefix: string; readonly year: number }): BillingSeriesView {
  return {
    currentNumber: series.currentNumber,
    documentType: series.documentType,
    id: series.id,
    isActive: series.isActive,
    legalEntityCode: series.legalEntity?.code ?? null,
    prefix: series.prefix,
    year: series.year,
  };
}

export function createEmptyBillingOverview(from: string, to: string, currency: string): BillingOverview {
  return {
    currency,
    documentCount: 0,
    ambiguousLegacyCount: 0,
    from,
    groups: [],
    invoiceCount: 0,
    openProformaCount: 0,
    overdueInvoiceCount: 0,
    outstandingMinor: 0,
    paidMinor: 0,
    paidInvoiceCount: 0,
    partialInvoiceCount: 0,
    proformaMinor: 0,
    to,
    totalIssuedMinor: 0,
    unpaidInvoiceCount: 0,
    unpaidOutstandingMinor: 0,
    partialOutstandingMinor: 0,
    uninvoicedMinor: 0,
    uninvoicedWorkCount: 0,
    workValueMinor: 0,
  };
}
