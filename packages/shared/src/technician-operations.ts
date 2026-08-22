export const TECHNICIAN_OPERATION_SORT_FIELDS = ["code", "createdAt", "name", "updatedAt"] as const;

export type TechnicianOperationSortField = (typeof TECHNICIAN_OPERATION_SORT_FIELDS)[number];

export interface TechnicianOperationInput {
  readonly code: string;
  readonly description?: string | null;
  readonly name: string;
}

export interface TechnicianOperationSummary {
  readonly code: string;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly sortOrder: number;
  readonly updatedAt: string;
}

export interface TechnicianOperationDetail extends TechnicianOperationSummary {
  readonly archivedAt: string | null;
  readonly archivedByUserId: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
}

export interface TechnicianOperationOption {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface TechnicianOperationsListParams {
  readonly isActive?: boolean | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string | undefined;
  readonly sortBy: TechnicianOperationSortField;
  readonly sortDirection: "asc" | "desc";
}

export interface PaginatedTechnicianOperationsResponse {
  readonly items: readonly TechnicianOperationSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface TechnicianRateInput {
  readonly currency?: string;
  readonly effectiveFrom?: string;
  readonly operationId: string;
  readonly rateMinor: number;
  readonly technicianId: string;
}

export interface TechnicianRateView {
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly currency: string;
  readonly effectiveFrom: string;
  readonly id: string;
  readonly operation: TechnicianOperationOption;
  readonly rateMinor: number;
  readonly technician: {
    readonly displayName: string;
    readonly id: string;
  };
  readonly validUntil: string | null;
}

export interface TechnicianRatesListParams {
  readonly asOf?: string | undefined;
  readonly operationId?: string | undefined;
  readonly technicianId?: string | undefined;
}

export interface TechnicianRateResolution {
  readonly currency: string;
  readonly effectiveFrom: string;
  readonly operationId: string;
  readonly rateId: string;
  readonly rateMinor: number;
  readonly technicianId: string;
  readonly validUntil: string | null;
}

export interface PerformedTechnicianOperationInput {
  readonly operationId: string;
  readonly workOrderId: string;
}

export interface RemovePerformedTechnicianOperationInput {
  readonly reason?: string | null;
}

export interface PerformedTechnicianOperationView {
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly currency: string;
  readonly earningMinor: number;
  readonly id: string;
  readonly operation: TechnicianOperationOption;
  readonly performedAt: string;
  readonly rateId: string;
  readonly removalReason: string | null;
  readonly removedAt: string | null;
  readonly removedByUserId: string | null;
  readonly technicianId: string;
  readonly workOrderId: string;
}

export type TechnicianEarningsPeriod = "DAY" | "MONTH" | "YEAR";

export interface TechnicianEarningsParams {
  readonly date?: string | undefined;
  readonly month?: string | undefined;
  readonly period: TechnicianEarningsPeriod;
  readonly technicianId?: string | undefined;
}

export interface TechnicianEarningsOperationBreakdown {
  readonly currency: string;
  readonly earningMinor: number;
  readonly operation: TechnicianOperationOption;
  readonly performedAt: string;
  readonly performedOperationId: string;
}

export interface TechnicianEarningsWorkBreakdown {
  readonly currency: string;
  readonly operations: readonly TechnicianEarningsOperationBreakdown[];
  readonly patientName: string;
  readonly totalMinor: number;
  readonly workCode: string;
  readonly workOrderId: string;
}

export interface TechnicianEarningsSummary {
  readonly currency: string;
  readonly generatedAt: string;
  readonly period: TechnicianEarningsPeriod;
  readonly periodEnd: string;
  readonly periodStart: string;
  readonly settlementStatus: "PARTIALLY_PAID" | "PAID" | "UNPAID" | "EARNED_NOT_SETTLED";
  readonly technician: {
    readonly displayName: string;
    readonly id: string;
  } | null;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly remainingMinor: number;
  readonly payments: readonly TechnicianPaymentView[];
  readonly works: readonly TechnicianEarningsWorkBreakdown[];
}

export interface TechnicianPaymentView {
  readonly amountMinor: number;
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly currency: string;
  readonly id: string;
  readonly notes: string | null;
  readonly paidAt: string;
  readonly technicianId: string;
}

export interface TechnicianPaymentInput {
  readonly amountMinor: number;
  readonly currency?: string;
  readonly notes?: string | null;
  readonly paidAt?: string;
  readonly technicianId: string;
}
