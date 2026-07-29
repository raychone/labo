import type { Prisma } from "@prisma/client";

export const priceCatalogItemInclude = {
  executionTimeRules: {
    orderBy: [
      { minQuantity: "asc" },
      { priority: "asc" },
    ],
  },
  workType: {
    select: {
      code: true,
      id: true,
      name: true,
    },
  },
} as const satisfies Prisma.PriceCatalogItemInclude;

export const pricingAgreementInclude = {
  clinic: {
    select: {
      id: true,
      name: true,
    },
  },
  doctor: {
    select: {
      clinic: {
        select: {
          name: true,
        },
      },
      displayName: true,
      id: true,
    },
  },
  rules: {
    orderBy: {
      createdAt: "asc",
    },
  },
} as const satisfies Prisma.PricingAgreementInclude;

export type PriceCatalogItemRecord = Prisma.PriceCatalogItemGetPayload<{ readonly include: typeof priceCatalogItemInclude }>;
export type PricingAgreementRecord = Prisma.PricingAgreementGetPayload<{ readonly include: typeof pricingAgreementInclude }>;
export type ExecutionTimeRuleRecord = PriceCatalogItemRecord["executionTimeRules"][number];
export type PricingAgreementRuleRecord = PricingAgreementRecord["rules"][number];

export interface ExecutionTimeRuleView {
  readonly executionDays: number | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly maxQuantity: number | null;
  readonly minQuantity: number;
  readonly priority: number;
  readonly requiresManualDueDate: boolean;
}

export interface PriceCatalogItemSummaryView {
  readonly category: string;
  readonly displayName: string;
  readonly executionTimeRules: readonly ExecutionTimeRuleView[];
  readonly id: string;
  readonly isActive: boolean;
  readonly notes: string | null;
  readonly sortOrder: number;
  readonly standardPriceMinor: number;
  readonly unit: string;
  readonly updatedAt: string;
  readonly workType: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
}

export interface PriceCatalogItemDetailView extends PriceCatalogItemSummaryView {
  readonly archivedAt: string | null;
  readonly createdAt: string;
}

export interface PaginatedPricingCatalogView {
  readonly items: readonly PriceCatalogItemSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PricingAgreementRuleView {
  readonly adjustmentPercentageBasisPoints: number | null;
  readonly adjustmentType: string;
  readonly adjustmentValueMinor: number | null;
  readonly category: string | null;
  readonly id: string;
  readonly overridePriceMinor: number | null;
  readonly priceCatalogItemId: string | null;
  readonly scope: string;
}

export interface PricingAgreementSummaryView {
  readonly clinic: { readonly id: string; readonly name: string } | null;
  readonly doctor: { readonly clinicName: string; readonly displayName: string; readonly id: string } | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly ruleCount: number;
  readonly subjectType: string;
  readonly updatedAt: string;
  readonly validFrom: string;
  readonly validUntil: string | null;
}

export interface PricingAgreementDetailView extends PricingAgreementSummaryView {
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly notes: string | null;
  readonly rules: readonly PricingAgreementRuleView[];
}

export interface PaginatedPricingAgreementsView {
  readonly items: readonly PricingAgreementSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toExecutionTimeRuleView(rule: ExecutionTimeRuleRecord): ExecutionTimeRuleView {
  return {
    executionDays: rule.executionDays,
    id: rule.id,
    isActive: rule.isActive,
    maxQuantity: rule.maxQuantity,
    minQuantity: rule.minQuantity,
    priority: rule.priority,
    requiresManualDueDate: rule.requiresManualDueDate,
  };
}

export function toPriceCatalogItemSummaryView(item: PriceCatalogItemRecord): PriceCatalogItemSummaryView {
  return {
    category: item.category,
    displayName: item.displayName,
    executionTimeRules: item.executionTimeRules.map(toExecutionTimeRuleView),
    id: item.id,
    isActive: item.isActive,
    notes: item.notes,
    sortOrder: item.sortOrder,
    standardPriceMinor: item.standardPriceMinor,
    unit: item.unit,
    updatedAt: item.updatedAt.toISOString(),
    workType: item.workType,
  };
}

export function toPriceCatalogItemDetailView(item: PriceCatalogItemRecord): PriceCatalogItemDetailView {
  return {
    ...toPriceCatalogItemSummaryView(item),
    archivedAt: item.archivedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toPricingAgreementRuleView(rule: PricingAgreementRuleRecord): PricingAgreementRuleView {
  return {
    adjustmentPercentageBasisPoints: rule.adjustmentPercentageBasisPoints,
    adjustmentType: rule.adjustmentType,
    adjustmentValueMinor: rule.adjustmentValueMinor,
    category: rule.category,
    id: rule.id,
    overridePriceMinor: rule.overridePriceMinor,
    priceCatalogItemId: rule.priceCatalogItemId,
    scope: rule.scope,
  };
}

export function toPricingAgreementSummaryView(agreement: PricingAgreementRecord): PricingAgreementSummaryView {
  return {
    clinic: agreement.clinic,
    doctor: agreement.doctor
      ? {
          clinicName: agreement.doctor.clinic.name,
          displayName: agreement.doctor.displayName,
          id: agreement.doctor.id,
        }
      : null,
    id: agreement.id,
    isActive: agreement.isActive,
    name: agreement.name,
    ruleCount: agreement.rules.length,
    subjectType: agreement.subjectType,
    updatedAt: agreement.updatedAt.toISOString(),
    validFrom: agreement.validFrom.toISOString().slice(0, 10),
    validUntil: agreement.validUntil?.toISOString().slice(0, 10) ?? null,
  };
}

export function toPricingAgreementDetailView(agreement: PricingAgreementRecord): PricingAgreementDetailView {
  return {
    ...toPricingAgreementSummaryView(agreement),
    archivedAt: agreement.archivedAt?.toISOString() ?? null,
    createdAt: agreement.createdAt.toISOString(),
    notes: agreement.notes,
    rules: agreement.rules.map(toPricingAgreementRuleView),
  };
}
