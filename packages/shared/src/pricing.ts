import type { WorkTypeUnit } from "./work-types.js";
import { formatMoneyMinor } from "./work-types.js";

export const PRICING_CATEGORIES = [
  "Ceramică",
  "Zirconiu",
  "Implanturi",
  "Proteze mobile",
  "Reparații",
  "Modele și ghiduri",
  "Alte lucrări",
] as const;

export const PRICING_AGREEMENT_SUBJECT_TYPES = ["CLINIC", "DOCTOR"] as const;
export const PRICING_RULE_SCOPES = ["ALL", "CATEGORY", "ITEM"] as const;
export const PRICING_ADJUSTMENT_TYPES = ["FIXED_AMOUNT", "PERCENTAGE", "OVERRIDE_PRICE"] as const;
export const PRICING_SORT_FIELDS = ["category", "displayName", "standardPriceMinor", "sortOrder", "updatedAt"] as const;
export const PRICING_AGREEMENT_SORT_FIELDS = ["name", "validFrom", "validUntil", "updatedAt"] as const;

export type PricingCategory = (typeof PRICING_CATEGORIES)[number];
export type PricingAgreementSubjectType = (typeof PRICING_AGREEMENT_SUBJECT_TYPES)[number];
export type PricingRuleScope = (typeof PRICING_RULE_SCOPES)[number];
export type PricingAdjustmentType = (typeof PRICING_ADJUSTMENT_TYPES)[number];
export type PricingSortField = (typeof PRICING_SORT_FIELDS)[number];
export type PricingAgreementSortField = (typeof PRICING_AGREEMENT_SORT_FIELDS)[number];

export interface ExecutionTimeRuleInput {
  readonly executionDays?: number | null;
  readonly isActive?: boolean;
  readonly maxQuantity?: number | null;
  readonly minQuantity: number;
  readonly priority?: number;
  readonly requiresManualDueDate: boolean;
}

export interface ExecutionTimeRuleView extends Required<Omit<ExecutionTimeRuleInput, "executionDays" | "maxQuantity">> {
  readonly executionDays: number | null;
  readonly id: string;
  readonly maxQuantity: number | null;
}

export interface PriceCatalogItemSummary {
  readonly category: string;
  readonly displayName: string;
  readonly executionTimeRules: readonly ExecutionTimeRuleView[];
  readonly id: string;
  readonly isActive: boolean;
  readonly notes: string | null;
  readonly sortOrder: number;
  readonly standardPriceMinor: number;
  readonly unit: WorkTypeUnit;
  readonly updatedAt: string;
  readonly workType: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
}

export interface PriceCatalogItemDetail extends PriceCatalogItemSummary {
  readonly archivedAt: string | null;
  readonly createdAt: string;
}

export interface PricingCatalogListParams {
  readonly active?: boolean | undefined;
  readonly category?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string | undefined;
  readonly sortBy: PricingSortField;
  readonly sortDirection: "asc" | "desc";
  readonly workTypeId?: string | undefined;
}

export interface PaginatedPricingCatalogResponse {
  readonly items: readonly PriceCatalogItemSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PriceCatalogItemInput {
  readonly category: string;
  readonly displayName: string;
  readonly isActive?: boolean;
  readonly notes?: string | null;
  readonly sortOrder?: number;
  readonly standardPriceMinor: number;
  readonly unit: WorkTypeUnit;
  readonly workTypeId: string;
}

export interface PricingAgreementRuleInput {
  readonly adjustmentPercentageBasisPoints?: number | null | undefined;
  readonly adjustmentType: PricingAdjustmentType;
  readonly adjustmentValueMinor?: number | null | undefined;
  readonly category?: string | null | undefined;
  readonly overridePriceMinor?: number | null | undefined;
  readonly priceCatalogItemId?: string | null | undefined;
  readonly scope: PricingRuleScope;
}

export interface PricingAgreementRuleView extends Required<Omit<PricingAgreementRuleInput, "adjustmentPercentageBasisPoints" | "adjustmentValueMinor" | "category" | "overridePriceMinor" | "priceCatalogItemId">> {
  readonly adjustmentPercentageBasisPoints: number | null;
  readonly adjustmentValueMinor: number | null;
  readonly category: string | null;
  readonly id: string;
  readonly overridePriceMinor: number | null;
  readonly priceCatalogItemId: string | null;
}

export interface PricingAgreementInput {
  readonly clinicId?: string | null | undefined;
  readonly doctorId?: string | null | undefined;
  readonly isActive?: boolean;
  readonly name: string;
  readonly notes?: string | null | undefined;
  readonly subjectType: PricingAgreementSubjectType;
  readonly validFrom: string;
  readonly validUntil?: string | null | undefined;
}

export interface PricingAgreementSummary {
  readonly clinic: { readonly id: string; readonly name: string } | null;
  readonly doctor: { readonly clinicName: string; readonly displayName: string; readonly id: string } | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly ruleCount: number;
  readonly subjectType: PricingAgreementSubjectType;
  readonly updatedAt: string;
  readonly validFrom: string;
  readonly validUntil: string | null;
}

export interface PricingAgreementDetail extends PricingAgreementSummary {
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly notes: string | null;
  readonly rules: readonly PricingAgreementRuleView[];
}

export interface PricingAgreementListParams {
  readonly active?: boolean | undefined;
  readonly clinicId?: string | undefined;
  readonly date?: string | undefined;
  readonly doctorId?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string | undefined;
  readonly sortBy: PricingAgreementSortField;
  readonly sortDirection: "asc" | "desc";
  readonly subjectType?: PricingAgreementSubjectType | undefined;
}

export interface PaginatedPricingAgreementsResponse {
  readonly items: readonly PricingAgreementSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PricingResolvePreviewInput {
  readonly clinicId: string;
  readonly doctorId: string;
  readonly evaluationDate?: string | undefined;
  readonly quantity: number;
  readonly workTypeId: string;
}

export interface PricingResolvePreviewResult {
  readonly adjustment: {
    readonly basisPoints: number | null;
    readonly fixedAmountMinor: number | null;
    readonly overridePriceMinor: number | null;
    readonly type: PricingAdjustmentType | null;
  };
  readonly appliedRuleScope: PricingRuleScope | null;
  readonly currency: string;
  readonly evaluationDate: string;
  readonly executionTimeRule: {
    readonly executionDays: number | null;
    readonly label: string;
    readonly maxQuantity: number | null;
    readonly minQuantity: number;
    readonly requiresManualDueDate: boolean;
  } | null;
  readonly explanation: string;
  readonly finalUnitPriceMinor: number;
  readonly quantity: number;
  readonly source: "Catalog standard" | "Clinică" | "Medic";
  readonly standardUnitPriceMinor: number;
  readonly totalPriceMinor: number;
  readonly workTypeId: string;
}

export function formatBasisPoints(value: number): string {
  const integer = Math.trunc(value / 100);
  const fraction = value % 100;

  return fraction === 0 ? `${integer}%` : `${integer}.${String(fraction).padStart(2, "0").replace(/0+$/, "")}%`;
}

export function formatExecutionRule(rule: Pick<ExecutionTimeRuleView, "executionDays" | "maxQuantity" | "minQuantity" | "requiresManualDueDate">): string {
  const range = rule.maxQuantity === null ? `peste ${rule.minQuantity - 1}` : `${rule.minQuantity}-${rule.maxQuantity}`;
  const duration = rule.requiresManualDueDate ? "termen manual" : `${rule.executionDays ?? 0} zile`;

  return `${range}: ${duration}`;
}

export function formatPricingAdjustment(rule: Pick<PricingAgreementRuleView, "adjustmentPercentageBasisPoints" | "adjustmentType" | "adjustmentValueMinor" | "overridePriceMinor">, currency: string, locale = "ro-RO"): string {
  if (rule.adjustmentType === "FIXED_AMOUNT") {
    return `Reducere ${formatMoneyMinor(rule.adjustmentValueMinor ?? 0, currency, locale)}`;
  }

  if (rule.adjustmentType === "PERCENTAGE") {
    return `Reducere ${formatBasisPoints(rule.adjustmentPercentageBasisPoints ?? 0)}`;
  }

  return `Preț final ${formatMoneyMinor(rule.overridePriceMinor ?? 0, currency, locale)}`;
}
