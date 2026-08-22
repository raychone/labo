import type { Prisma } from "@prisma/client";

export const technicianOperationRateInclude = {
  operation: true,
  technician: {
    select: {
      displayName: true,
      id: true,
    },
  },
} as const satisfies Prisma.TechnicianOperationRateInclude;

export const performedTechnicianOperationInclude = {
  operation: true,
} as const satisfies Prisma.TechnicianPerformedOperationInclude;

export const technicianEarningsInclude = {
  operation: true,
  technician: {
    select: {
      displayName: true,
      id: true,
    },
  },
  workOrder: {
    select: {
      code: true,
      id: true,
      patientName: true,
    },
  },
} as const satisfies Prisma.TechnicianPerformedOperationInclude;

export type TechnicianOperationRecord = Omit<Prisma.TechnicianOperationGetPayload<object>, "sortOrder"> & { sortOrder?: number };
export type TechnicianOperationRateRecord = Prisma.TechnicianOperationRateGetPayload<{ include: typeof technicianOperationRateInclude }>;
export type PerformedTechnicianOperationRecord = Prisma.TechnicianPerformedOperationGetPayload<{ include: typeof performedTechnicianOperationInclude }>;
export type TechnicianEarningsRecord = Prisma.TechnicianPerformedOperationGetPayload<{ include: typeof technicianEarningsInclude }>;

export interface TechnicianOperationOptionView {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface TechnicianOperationSummaryView extends TechnicianOperationOptionView {
  readonly createdAt: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly sortOrder: number;
  readonly updatedAt: string;
}

export interface TechnicianOperationDetailView extends TechnicianOperationSummaryView {
  readonly archivedAt: string | null;
  readonly archivedByUserId: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
}

export interface PaginatedTechnicianOperationsView {
  readonly items: readonly TechnicianOperationSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface TechnicianRateView {
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly currency: string;
  readonly effectiveFrom: string;
  readonly id: string;
  readonly operation: TechnicianOperationOptionView;
  readonly rateMinor: number;
  readonly technician: {
    readonly displayName: string;
    readonly id: string;
  };
  readonly validUntil: string | null;
}

export interface TechnicianRateResolutionView {
  readonly currency: string;
  readonly effectiveFrom: string;
  readonly operationId: string;
  readonly rateId: string;
  readonly rateMinor: number;
  readonly technicianId: string;
  readonly validUntil: string | null;
}

export interface PerformedTechnicianOperationView {
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly currency: string;
  readonly earningMinor: number;
  readonly id: string;
  readonly operation: TechnicianOperationOptionView;
  readonly performedAt: string;
  readonly rateId: string;
  readonly removalReason: string | null;
  readonly removedAt: string | null;
  readonly removedByUserId: string | null;
  readonly technicianId: string;
  readonly workOrderId: string;
}

export type TechnicianEarningsPeriodView = "DAY" | "MONTH" | "YEAR";

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

export interface TechnicianEarningsOperationBreakdownView {
  readonly currency: string;
  readonly earningMinor: number;
  readonly operation: TechnicianOperationOptionView;
  readonly performedAt: string;
  readonly performedOperationId: string;
}

export interface TechnicianEarningsWorkBreakdownView {
  readonly currency: string;
  readonly operations: readonly TechnicianEarningsOperationBreakdownView[];
  readonly patientName: string;
  readonly totalMinor: number;
  readonly workCode: string;
  readonly workOrderId: string;
}

export interface TechnicianEarningsSummaryView {
  readonly currency: string;
  readonly generatedAt: string;
  readonly period: TechnicianEarningsPeriodView;
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
  readonly works: readonly TechnicianEarningsWorkBreakdownView[];
}

export function toTechnicianOperationOptionView(operation: Pick<TechnicianOperationRecord, "code" | "id" | "name">): TechnicianOperationOptionView {
  return {
    code: operation.code,
    id: operation.id,
    name: operation.name,
  };
}

export function toTechnicianOperationSummaryView(operation: TechnicianOperationRecord): TechnicianOperationSummaryView {
  return {
    ...toTechnicianOperationOptionView(operation),
    createdAt: operation.createdAt.toISOString(),
    description: operation.description,
    isActive: operation.isActive,
    sortOrder: operation.sortOrder ?? 0,
    updatedAt: operation.updatedAt.toISOString(),
  };
}

export function toTechnicianOperationDetailView(operation: TechnicianOperationRecord): TechnicianOperationDetailView {
  return {
    ...toTechnicianOperationSummaryView(operation),
    archivedAt: operation.archivedAt?.toISOString() ?? null,
    archivedByUserId: operation.archivedByUserId,
    createdByUserId: operation.createdByUserId,
    updatedByUserId: operation.updatedByUserId,
    version: operation.version,
  };
}

export function toTechnicianRateView(rate: TechnicianOperationRateRecord): TechnicianRateView {
  return {
    createdAt: rate.createdAt.toISOString(),
    createdByUserId: rate.createdByUserId,
    currency: rate.currency,
    effectiveFrom: rate.effectiveFrom.toISOString(),
    id: rate.id,
    operation: toTechnicianOperationOptionView(rate.operation),
    rateMinor: rate.rateMinor,
    technician: {
      displayName: rate.technician.displayName,
      id: rate.technician.id,
    },
    validUntil: rate.validUntil?.toISOString() ?? null,
  };
}

export function toTechnicianRateResolutionView(rate: Pick<TechnicianOperationRateRecord, "currency" | "effectiveFrom" | "id" | "operationId" | "rateMinor" | "technicianId" | "validUntil">): TechnicianRateResolutionView {
  return {
    currency: rate.currency,
    effectiveFrom: rate.effectiveFrom.toISOString(),
    operationId: rate.operationId,
    rateId: rate.id,
    rateMinor: rate.rateMinor,
    technicianId: rate.technicianId,
    validUntil: rate.validUntil?.toISOString() ?? null,
  };
}

export function toPerformedTechnicianOperationView(performedOperation: PerformedTechnicianOperationRecord): PerformedTechnicianOperationView {
  return {
    createdAt: performedOperation.createdAt.toISOString(),
    createdByUserId: performedOperation.createdByUserId,
    currency: performedOperation.currency,
    earningMinor: performedOperation.earningMinor,
    id: performedOperation.id,
    operation: toTechnicianOperationOptionView(performedOperation.operation),
    performedAt: performedOperation.performedAt.toISOString(),
    rateId: performedOperation.rateId,
    removalReason: performedOperation.removalReason,
    removedAt: performedOperation.removedAt?.toISOString() ?? null,
    removedByUserId: performedOperation.removedByUserId,
    technicianId: performedOperation.technicianId,
    workOrderId: performedOperation.workOrderId,
  };
}

export function toTechnicianEarningsSummaryView(input: {
  readonly generatedAt: Date;
  readonly period: TechnicianEarningsPeriodView;
  readonly periodEnd: Date;
  readonly periodStart: Date;
  readonly performedOperations: readonly TechnicianEarningsRecord[];
  readonly payments: readonly Prisma.TechnicianPaymentGetPayload<object>[];
  readonly technician: TechnicianEarningsSummaryView["technician"];
}): TechnicianEarningsSummaryView {
  const works = new Map<string, {
    currency: string;
    operations: TechnicianEarningsOperationBreakdownView[];
    patientName: string;
    totalMinor: number;
    workCode: string;
    workOrderId: string;
  }>();

  for (const performedOperation of input.performedOperations) {
    const work = works.get(performedOperation.workOrderId) ?? {
      currency: performedOperation.currency,
      operations: [],
      patientName: performedOperation.workOrder.patientName,
      totalMinor: 0,
      workCode: performedOperation.workOrder.code,
      workOrderId: performedOperation.workOrderId,
    };

    work.totalMinor += performedOperation.earningMinor;
    work.operations.push({
      currency: performedOperation.currency,
      earningMinor: performedOperation.earningMinor,
      operation: toTechnicianOperationOptionView(performedOperation.operation),
      performedAt: performedOperation.performedAt.toISOString(),
      performedOperationId: performedOperation.id,
    });
    works.set(performedOperation.workOrderId, work);
  }

  const firstCurrency = input.performedOperations[0]?.currency ?? "RON";

  return {
    currency: firstCurrency,
    generatedAt: input.generatedAt.toISOString(),
    period: input.period,
    periodEnd: input.periodEnd.toISOString(),
    periodStart: input.periodStart.toISOString(),
    settlementStatus: getSettlementStatus(input.performedOperations.reduce((total, item) => total + item.earningMinor, 0), input.payments.reduce((total, item) => total + item.amountMinor, 0)),
    technician: input.technician,
    totalMinor: input.performedOperations.reduce((total, performedOperation) => total + performedOperation.earningMinor, 0),
    paidMinor: input.payments.reduce((total, payment) => total + payment.amountMinor, 0),
    remainingMinor: Math.max(0, input.performedOperations.reduce((total, performedOperation) => total + performedOperation.earningMinor, 0) - input.payments.reduce((total, payment) => total + payment.amountMinor, 0)),
    payments: input.payments.map((payment) => ({
      amountMinor: payment.amountMinor,
      createdAt: payment.createdAt.toISOString(),
      createdByUserId: payment.createdByUserId,
      currency: payment.currency,
      id: payment.id,
      notes: payment.notes,
      paidAt: payment.paidAt.toISOString(),
      technicianId: payment.technicianId,
    })),
    works: Array.from(works.values()),
  };
}

function getSettlementStatus(totalMinor: number, paidMinor: number): TechnicianEarningsSummaryView["settlementStatus"] {
  if (totalMinor > 0 && paidMinor <= 0) return "EARNED_NOT_SETTLED";
  if (paidMinor <= 0) return "UNPAID";
  if (paidMinor >= totalMinor) return "PAID";
  return "PARTIALLY_PAID";
}
