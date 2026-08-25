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
  probeCycle: { select: { id: true, sequence: true, status: true } },
  teeth: { orderBy: { fdiTooth: "asc" } },
} as const satisfies Prisma.TechnicianPerformedOperationInclude;

export const technicianEarningsInclude = {
  operation: true,
  probeCycle: { select: { id: true, sequence: true, status: true } },
  teeth: { orderBy: { fdiTooth: "asc" } },
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
  readonly category: string;
  readonly code: string;
  readonly currency?: string | null;
  readonly id: string;
  readonly name: string;
  readonly rateMinor?: number | null;
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
  readonly operationCodeSnapshot: string | null;
  readonly operationNameSnapshot: string | null;
  readonly probeCycle: { readonly id: string; readonly sequence: number; readonly status: string } | null;
  readonly probeCycleId: string | null;
  readonly selectedTeeth: readonly number[];
  readonly quantity: number | null;
  readonly rateMinorSnapshot: number | null;
  readonly notes: string | null;
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
  readonly isLegacy: boolean;
  readonly operation: TechnicianOperationOptionView;
  readonly operationCodeSnapshot: string | null;
  readonly operationNameSnapshot: string | null;
  readonly probeCycle: { readonly id: string; readonly sequence: number; readonly status: string } | null;
  readonly quantity: number | null;
  readonly rateMinorSnapshot: number | null;
  readonly selectedTeeth: readonly number[];
  readonly performedAt: string;
  readonly performedOperationId: string;
  readonly removedAt: string | null;
  readonly removalReason: string | null;
  readonly technician: { readonly id: string; readonly displayName: string } | null;
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
  readonly currencyTotals: readonly { readonly currency: string; readonly totalMinor: number; readonly paidMinor: number; readonly remainingMinor: number }[];
  readonly generatedAt: string;
  readonly period: TechnicianEarningsPeriodView;
  readonly periodEnd: string;
  readonly periodStart: string;
  readonly settlementStatus: "PARTIALLY_PAID" | "PAID" | "UNPAID" | "EARNED_NOT_SETTLED" | "OVERPAID";
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

export function toTechnicianOperationViewInput(operation: Pick<TechnicianOperationRecord, "category" | "code" | "id" | "name">): TechnicianOperationOptionView {
  return {
    category: operation.category,
    code: operation.code,
    id: operation.id,
    name: operation.name,
  };
}

export const toTechnicianOperationOptionView = toTechnicianOperationViewInput;

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
    operationCodeSnapshot: performedOperation.operationCodeSnapshot,
    operationNameSnapshot: performedOperation.operationNameSnapshot,
    probeCycle: performedOperation.probeCycle
      ? { id: performedOperation.probeCycle.id, sequence: performedOperation.probeCycle.sequence, status: performedOperation.probeCycle.status }
      : null,
    probeCycleId: performedOperation.probeCycleId,
    performedAt: performedOperation.performedAt.toISOString(),
    selectedTeeth: (performedOperation.teeth ?? []).map((tooth) => tooth.fdiTooth),
    quantity: performedOperation.quantity,
    rateMinorSnapshot: performedOperation.rateMinorSnapshot,
    notes: performedOperation.notes,
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
  readonly cumulativePerformedOperations?: readonly TechnicianEarningsRecord[];
  readonly cumulativePayments?: readonly Prisma.TechnicianPaymentGetPayload<object>[];
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

  const periodTotals = new Map<string, { earned: number; paid: number }>();
  const cumulativeTotals = new Map<string, { earned: number; paid: number }>();
  const cumulativeOperations = input.cumulativePerformedOperations ?? input.performedOperations.filter((operation) => operation.removedAt === null);
  const cumulativePayments = input.cumulativePayments ?? input.payments;

  for (const performedOperation of input.performedOperations) {
    const workKey = `${performedOperation.workOrderId}:${performedOperation.currency}`;
    const work = works.get(workKey) ?? {
      currency: performedOperation.currency,
      operations: [],
      patientName: performedOperation.workOrder.patientName,
      totalMinor: 0,
      workCode: performedOperation.workOrder.code,
      workOrderId: performedOperation.workOrderId,
    };

    if (performedOperation.removedAt === null) {
      work.totalMinor += performedOperation.earningMinor;
    }
    const periodTotal = periodTotals.get(performedOperation.currency) ?? { earned: 0, paid: 0 };
    if (performedOperation.removedAt === null) periodTotal.earned += performedOperation.earningMinor;
    periodTotals.set(performedOperation.currency, periodTotal);
    work.operations.push({
      currency: performedOperation.currency,
      earningMinor: performedOperation.earningMinor,
      isLegacy: performedOperation.quantity === null && performedOperation.rateMinorSnapshot === null && performedOperation.operationNameSnapshot === null && (performedOperation.teeth ?? []).length === 0,
      operation: {
        ...toTechnicianOperationOptionView(performedOperation.operation),
        code: performedOperation.operationCodeSnapshot ?? performedOperation.operation.code,
        name: performedOperation.operationNameSnapshot ?? performedOperation.operation.name,
      },
      operationCodeSnapshot: performedOperation.operationCodeSnapshot,
      operationNameSnapshot: performedOperation.operationNameSnapshot,
      probeCycle: performedOperation.probeCycle
        ? { id: performedOperation.probeCycle.id, sequence: performedOperation.probeCycle.sequence, status: performedOperation.probeCycle.status }
        : null,
      quantity: performedOperation.quantity,
      rateMinorSnapshot: performedOperation.rateMinorSnapshot,
      selectedTeeth: (performedOperation.teeth ?? []).map((tooth) => tooth.fdiTooth),
      performedAt: performedOperation.performedAt.toISOString(),
      performedOperationId: performedOperation.id,
      removedAt: performedOperation.removedAt?.toISOString() ?? null,
      removalReason: performedOperation.removalReason,
      technician: performedOperation.technician ? { displayName: performedOperation.technician.displayName, id: performedOperation.technician.id } : null,
    });
    works.set(workKey, work);
  }

  for (const payment of input.payments) {
    const periodTotal = periodTotals.get(payment.currency) ?? { earned: 0, paid: 0 };
    periodTotal.paid += payment.amountMinor;
    periodTotals.set(payment.currency, periodTotal);
  }
  for (const operation of cumulativeOperations) {
    const total = cumulativeTotals.get(operation.currency) ?? { earned: 0, paid: 0 };
    if (operation.removedAt === null) total.earned += operation.earningMinor;
    cumulativeTotals.set(operation.currency, total);
  }
  for (const payment of cumulativePayments) {
    const total = cumulativeTotals.get(payment.currency) ?? { earned: 0, paid: 0 };
    total.paid += payment.amountMinor;
    cumulativeTotals.set(payment.currency, total);
  }
  const currencies = new Set([...periodTotals.keys(), ...cumulativeTotals.keys()]);
  const currencyEntries = Array.from(currencies).sort((left, right) => left.localeCompare(right));
  const firstCurrency = currencyEntries.length === 1 ? currencyEntries[0]! : currencyEntries.length > 1 ? "MULTI" : "RON";
  const currencyTotals = currencyEntries.map((currency) => {
    const periodTotal = periodTotals.get(currency) ?? { earned: 0, paid: 0 };
    const cumulativeTotal = cumulativeTotals.get(currency) ?? { earned: 0, paid: 0 };
    const balance = cumulativeTotal.earned - cumulativeTotal.paid;
    return { balanceMinor: balance, cumulativeEarnedMinor: cumulativeTotal.earned, cumulativePaidMinor: cumulativeTotal.paid, currency, paidMinor: periodTotal.paid, periodEarnedMinor: periodTotal.earned, periodPaidMinor: periodTotal.paid, remainingMinor: balance, settlementStatus: getSettlementStatus(cumulativeTotal.earned, cumulativeTotal.paid), totalMinor: periodTotal.earned };
  });
  const single = currencyTotals.length === 1 ? currencyTotals[0]! : null;
  const totalMinor = single?.periodEarnedMinor ?? 0;
  const paidMinor = single?.periodPaidMinor ?? 0;

  return {
    currency: firstCurrency,
    currencyTotals,
    generatedAt: input.generatedAt.toISOString(),
    period: input.period,
    periodEnd: input.periodEnd.toISOString(),
    periodStart: input.periodStart.toISOString(),
    settlementStatus: single?.settlementStatus ?? "UNPAID",
    technician: input.technician,
    totalMinor,
    paidMinor,
    remainingMinor: single?.balanceMinor ?? 0,
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
  if (paidMinor > totalMinor) return "OVERPAID";
  if (totalMinor > 0 && paidMinor <= 0) return "EARNED_NOT_SETTLED";
  if (paidMinor <= 0) return "UNPAID";
  if (paidMinor >= totalMinor) return "PAID";
  return "PARTIALLY_PAID";
}
