import type { WorkTypeUnit } from "./work-types.js";

export const BILLING_DOCUMENT_TYPES = ["PROFORMA", "INVOICE"] as const;
export const BILLING_DOCUMENT_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"] as const;
export const BILLING_ADJUSTMENT_SCOPES = ["WORK", "PATIENT", "DOCUMENT"] as const;
export const BILLING_ADJUSTMENT_MODES = ["PERCENTAGE", "FIXED"] as const;
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export const DOCUMENT_PAYMENT_FILTERS = ["ALL", "UNPAID", "PARTIALLY_PAID", "PAID", "OUTSTANDING", "DUE", "OVERDUE", "CANCELLED"] as const;
export const BILLING_GROUP_BY = ["day", "week", "month", "clinic", "doctor", "patient", "workType", "billingStatus", "paymentStatus"] as const;
export const BILLING_DOCUMENT_SORT_FIELDS = ["createdAt", "issueDate", "formattedNumber", "totalMinor", "status"] as const;

export type BillingDocumentType = (typeof BILLING_DOCUMENT_TYPES)[number];
export type BillingDocumentStatus = (typeof BILLING_DOCUMENT_STATUSES)[number];
export type BillingAdjustmentScope = (typeof BILLING_ADJUSTMENT_SCOPES)[number];
export type BillingAdjustmentMode = (typeof BILLING_ADJUSTMENT_MODES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type DocumentPaymentFilter = (typeof DOCUMENT_PAYMENT_FILTERS)[number];
export type BillingGroupBy = (typeof BILLING_GROUP_BY)[number];
export type BillingDocumentSortField = (typeof BILLING_DOCUMENT_SORT_FIELDS)[number];

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
  readonly paidMinor: number;
  readonly paidInvoiceCount: number;
  readonly partialInvoiceCount: number;
  readonly proformaMinor: number;
  readonly to: string;
  readonly totalIssuedMinor: number;
  readonly unpaidInvoiceCount: number;
  readonly unpaidOutstandingMinor: number;
  readonly partialOutstandingMinor: number;
  readonly outstandingMinor: number;
  readonly uninvoicedMinor: number;
  readonly uninvoicedWorkCount: number;
  readonly workValueMinor: number;
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

export interface BillingAdjustmentInput {
  readonly amountMinor?: number;
  readonly mode: BillingAdjustmentMode;
  readonly patientName?: string | null;
  readonly percentage?: number;
  readonly scope: BillingAdjustmentScope;
  readonly workOrderId?: string | null;
}

export interface CreateBillingDocumentInput {
  readonly adjustments?: readonly BillingAdjustmentInput[];
  readonly dueDate?: string | null;
  readonly issueDate: string;
  readonly notes?: string | null;
  readonly workOrderIds: readonly string[];
}

export interface UpdateBillingDocumentInput {
  readonly dueDate?: string | null;
  readonly issueDate?: string;
  readonly notes?: string | null;
}

export interface ReplaceBillingLinesInput {
  readonly workOrderIds: readonly string[];
}

export interface RecordPaymentInput {
  readonly amountMinor: number;
  readonly method: PaymentMethod;
  readonly notes?: string | null;
  readonly paymentDate: string;
  readonly receiptDate?: string | null;
  readonly receiptNumber?: string | null;
  readonly reference?: string | null;
}

export interface BillingListQuery {
  readonly amountMaxMinor?: number;
  readonly amountMinMinor?: number;
  readonly clinicId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly doctorId?: string;
  readonly dueDateFrom?: string;
  readonly dueDateTo?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly paymentStatus?: PaymentStatus;
  readonly paymentFilter?: DocumentPaymentFilter;
  readonly patient?: string;
  readonly paymentReference?: string;
  readonly receiptNumber?: string;
  readonly search?: string;
  readonly sortBy: BillingDocumentSortField;
  readonly sortDirection: "asc" | "desc";
  readonly status?: BillingDocumentStatus;
  readonly type?: BillingDocumentType;
  readonly workCode?: string;
}

export interface PaginatedBillingDocumentsResponse {
  readonly items: readonly BillingDocumentSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface BillingPrintParty {
  readonly address: string | null;
  readonly email: string | null;
  readonly legalName: string | null;
  readonly name: string;
  readonly phone: string | null;
  readonly registrationNumber: string | null;
  readonly taxId: string | null;
  readonly website?: string | null;
}

export interface PrintableBillingDocument extends BillingDocumentDetail {
  readonly complianceNotice: string;
  readonly customer: BillingPrintParty;
  readonly documentTitle: string;
  readonly generatedAt: string;
  readonly supplier: BillingPrintParty;
}

export interface BillingDocumentAttachment {
  readonly complianceNotice: string;
  readonly currency: string;
  readonly customer: BillingPrintParty;
  readonly documentId: string;
  readonly documentNumber: string | null;
  readonly documentTitle: string;
  readonly generatedAt: string;
  readonly lines: readonly BillingDocumentLineView[];
  readonly supplier: BillingPrintParty;
  readonly totalMinor: number;
}

export interface BillingStatementRow {
  readonly balanceMinor: number;
  readonly documentId: string;
  readonly documentNumber: string | null;
  readonly documentType: BillingDocumentType;
  readonly dueDate: string | null;
  readonly issueDate: string;
  readonly paidMinor: number;
  readonly status: BillingDocumentStatus;
  readonly totalMinor: number;
  readonly workCodes: readonly string[];
}

export interface BillingStatementWorkRow {
  readonly clinicName: string;
  readonly code: string;
  readonly createdAt: string;
  readonly doctorName: string;
  readonly patientName: string;
  readonly totalPriceMinor: number;
  readonly workTypeName: string;
}

export interface ClinicBillingStatement {
  readonly clinicId: string;
  readonly clinicName: string;
  readonly currency: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly documents: readonly BillingStatementRow[];
  readonly generatedAt: string;
  readonly paidMinor: number;
  readonly totalMinor: number;
  readonly uninvoicedMinor: number;
  readonly uninvoicedWorks: readonly BillingStatementWorkRow[];
}

export interface DoctorBillingStatement {
  readonly currency: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly documents: readonly BillingStatementRow[];
  readonly generatedAt: string;
  readonly paidMinor: number;
  readonly totalMinor: number;
  readonly uninvoicedMinor: number;
  readonly uninvoicedWorks: readonly BillingStatementWorkRow[];
}

export interface MonthEndRegistryRow {
  readonly balanceMinor: number;
  readonly clinicName: string;
  readonly documentId: string;
  readonly documentNumber: string | null;
  readonly documentType: BillingDocumentType;
  readonly doctorNames: readonly string[];
  readonly dueDate: string | null;
  readonly issueDate: string;
  readonly paidMinor: number;
  readonly patientNames: readonly string[];
  readonly status: BillingDocumentStatus;
  readonly totalMinor: number;
  readonly workCodes: readonly string[];
}

export interface MonthEndRegistryPaymentRow {
  readonly amountMinor: number;
  readonly billingDocumentId: string;
  readonly cancelledAt: string | null;
  readonly clinicName: string;
  readonly documentNumber: string | null;
  readonly id: string;
  readonly method: PaymentMethod;
  readonly paymentDate: string;
  readonly receiptDate: string | null;
  readonly receiptNumber: string | null;
  readonly reference: string | null;
}

export interface MonthEndRegistry {
  readonly currency: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly generatedAt: string;
  readonly paidMinor: number;
  readonly paidTotalMinor: number;
  readonly partialTotalMinor: number;
  readonly payments: readonly MonthEndRegistryPaymentRow[];
  readonly rows: readonly MonthEndRegistryRow[];
  readonly totalMinor: number;
  readonly unpaidTotalMinor: number;
}

export interface MonthCloseArchiveSummary {
  readonly archiveId: string;
  readonly closedAt: string;
  readonly closedByDisplayName: string | null;
  readonly closedByEmail: string | null;
  readonly closedByUserId: string | null;
  readonly currency: string;
  readonly month: number;
  readonly periodEnd: string;
  readonly periodStart: string;
  readonly year: number;
  readonly reportVersion: string;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly paidTotalMinor: number;
  readonly partialTotalMinor: number;
  readonly unpaidTotalMinor: number;
}

export interface MonthCloseArchiveDetail extends MonthCloseArchiveSummary {
  readonly snapshot: MonthEndRegistry;
}

export interface BillingReceivableRow {
  readonly balanceMinor: number;
  readonly clinicName: string;
  readonly currency: string;
  readonly daysOverdue: number;
  readonly doctorNames: readonly string[];
  readonly documentId: string;
  readonly documentNumber: string | null;
  readonly dueDate: string | null;
  readonly issueDate: string;
  readonly paidMinor: number;
  readonly patientNames: readonly string[];
  readonly status: BillingDocumentStatus;
  readonly totalMinor: number;
  readonly workCodes: readonly string[];
}

export interface BillingReceivables {
  readonly currency: string;
  readonly generatedAt: string;
  readonly items: readonly BillingReceivableRow[];
  readonly overdueCount: number;
  readonly totalBalanceMinor: number;
}

export interface AmbiguousLegacyBillingRecord {
  readonly clinicName: string;
  readonly companyAssignmentNotes: string | null;
  readonly companyAssignmentStatus: "AMBIGUOUS" | "UNASSIGNED";
  readonly createdAt: string;
  readonly documentId: string;
  readonly documentNumber: string | null;
  readonly documentType: BillingDocumentType;
  readonly issueDate: string;
  readonly lineCompanyCodes: readonly string[];
  readonly totalMinor: number;
  readonly workCodes: readonly string[];
}
