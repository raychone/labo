import type { BillingDocumentStatus, BillingDocumentType, PaymentMethod, Prisma } from "@prisma/client";

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
  readonly description: string;
  readonly doctorNameSnapshot: string;
  readonly id: string;
  readonly lineTotalMinor: number;
  readonly patientNameSnapshot: string;
  readonly quantity: number;
  readonly sortOrder: number;
  readonly toothPositionSnapshot: string | null;
  readonly unitPriceMinor: number;
  readonly workCode: string;
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
  readonly formattedNumber: string | null;
  readonly id: string;
  readonly issueDate: string;
  readonly paidMinor: number;
  readonly paymentStatus: PaymentStatus;
  readonly status: BillingDocumentStatus;
  readonly totalMinor: number;
  readonly type: BillingDocumentType;
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
  readonly clinicId: string;
  readonly clinicName: string;
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly id: string;
  readonly invoicedDocumentId: string | null;
  readonly isBillable: boolean;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: string;
  readonly totalPriceMinor: number | null;
  readonly unavailableReason: string | null;
  readonly workTypeName: string;
}

export interface BillingSeriesView {
  readonly currentNumber: number;
  readonly documentType: BillingDocumentType;
  readonly id: string;
  readonly isActive: boolean;
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
  readonly currency: string;
  readonly documentCount: number;
  readonly from: string;
  readonly groups: readonly BillingGroup[];
  readonly invoiceCount: number;
  readonly openProformaCount: number;
  readonly outstandingMinor: number;
  readonly paidMinor: number;
  readonly proformaMinor: number;
  readonly to: string;
  readonly unpaidInvoiceCount: number;
  readonly uninvoicedMinor: number;
  readonly uninvoicedWorkCount: number;
  readonly workValueMinor: number;
}

export type BillingDocumentRecord = Prisma.BillingDocumentGetPayload<{
  include: {
    clinic: true;
    lines: true;
    payments: true;
  };
}>;

export type BillableWorkRecord = Prisma.WorkOrderGetPayload<{
  include: {
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
    formattedNumber: document.formattedNumber,
    id: document.id,
    issueDate: document.issueDate.toISOString(),
    paidMinor: amounts.paidMinor,
    paymentStatus: amounts.paymentStatus,
    status: document.status as BillingDocumentStatus,
    totalMinor: document.totalMinor,
    type: document.type as BillingDocumentType,
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
    doctorNameSnapshot: line.doctorNameSnapshot,
    id: line.id,
    lineTotalMinor: line.lineTotalMinor,
    patientNameSnapshot: line.patientNameSnapshot,
    quantity: line.quantity,
    sortOrder: line.sortOrder,
    toothPositionSnapshot: line.toothPositionSnapshot,
    unitPriceMinor: line.unitPriceMinor,
    workCode: line.workCode,
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
  return {
    baseUnitPriceMinor: includeMoney ? workOrder.baseUnitPriceMinor : null,
    clinicId: workOrder.clinicId,
    clinicName: workOrder.clinic.name,
    code: workOrder.code,
    createdAt: workOrder.createdAt.toISOString(),
    currency: includeMoney ? workOrder.currency : null,
    doctorId: workOrder.doctorId,
    doctorName: workOrder.doctor.displayName,
    id: workOrder.id,
    invoicedDocumentId: workOrder.invoicedDocumentId,
    isBillable: workOrder.invoicedDocumentId === null,
    patientName: workOrder.patientName,
    patientReference: workOrder.patientReference,
    quantity: workOrder.quantity,
    requestedDeliveryDate: workOrder.requestedDeliveryDate.toISOString(),
    status: workOrder.status,
    totalPriceMinor: includeMoney ? workOrder.totalPriceMinor : null,
    unavailableReason: workOrder.invoicedDocumentId ? "Lucrarea este deja asociata unei facturi active." : null,
    workTypeName: workOrder.workType.name,
  };
}

export function toBillingSeriesView(series: { readonly currentNumber: number; readonly documentType: BillingDocumentType; readonly id: string; readonly isActive: boolean; readonly prefix: string; readonly year: number }): BillingSeriesView {
  return {
    currentNumber: series.currentNumber,
    documentType: series.documentType,
    id: series.id,
    isActive: series.isActive,
    prefix: series.prefix,
    year: series.year,
  };
}

export function createEmptyBillingOverview(from: string, to: string, currency: string): BillingOverview {
  return {
    currency,
    documentCount: 0,
    from,
    groups: [],
    invoiceCount: 0,
    openProformaCount: 0,
    outstandingMinor: 0,
    paidMinor: 0,
    proformaMinor: 0,
    to,
    unpaidInvoiceCount: 0,
    uninvoicedMinor: 0,
    uninvoicedWorkCount: 0,
    workValueMinor: 0,
  };
}
