import { ADULT_FDI_TEETH, isAdultFdiTooth, type AdultFdiTooth } from "./postmeeting-contract.js";
import type { WorkOrderItemView } from "./work-order-items.js";

export const LEGACY_COMPATIBILITY_SOURCES = ["CANONICAL", "LEGACY"] as const;
export type LegacyCompatibilitySource = (typeof LEGACY_COMPATIBILITY_SOURCES)[number];

export const LEGACY_COMPATIBILITY_CLASSIFICATIONS = [
  "CANONICAL",
  "LEGACY_SAFE",
  "LEGACY_AMBIGUOUS",
  "MIXED",
  "CANONICAL_ARCHIVED",
] as const;
export type LegacyCompatibilityClassification = (typeof LEGACY_COMPATIBILITY_CLASSIFICATIONS)[number];

export const LEGACY_COMPATIBILITY_LABELS_RO: Readonly<Record<LegacyCompatibilityClassification, string>> = {
  CANONICAL: "Date canonice",
  LEGACY_SAFE: "Date istorice",
  LEGACY_AMBIGUOUS: "Date istorice — verificare necesară",
  MIXED: "Date canonice cu informații istorice păstrate",
  CANONICAL_ARCHIVED: "Compoziție canonică arhivată",
};

export interface LegacyClassificationInput {
  readonly activeCanonicalItemCount: number;
  readonly archivedCanonicalItemCount: number;
  readonly legacyToothCount: number;
}

export interface LegacyClassificationResult {
  readonly classification: LegacyCompatibilityClassification;
  readonly source: LegacyCompatibilitySource;
  readonly canonicalItemsAuthoritative: boolean;
  readonly legacyProjectionAllowed: boolean;
  readonly compatibilityLabelRo: string;
}

export function classifyLegacyComposition(input: LegacyClassificationInput): LegacyClassificationResult {
  if (input.activeCanonicalItemCount > 0) {
    const classification = input.legacyToothCount > 0 || input.archivedCanonicalItemCount > 0 ? "MIXED" : "CANONICAL";
    return {
      classification,
      source: "CANONICAL",
      canonicalItemsAuthoritative: true,
      legacyProjectionAllowed: false,
      compatibilityLabelRo: LEGACY_COMPATIBILITY_LABELS_RO[classification],
    };
  }

  if (input.archivedCanonicalItemCount > 0) {
    return {
      classification: "CANONICAL_ARCHIVED",
      source: "LEGACY",
      canonicalItemsAuthoritative: false,
      legacyProjectionAllowed: false,
      compatibilityLabelRo: LEGACY_COMPATIBILITY_LABELS_RO.CANONICAL_ARCHIVED,
    };
  }

  const classification = input.legacyToothCount > 1 ? "LEGACY_AMBIGUOUS" : "LEGACY_SAFE";
  return {
    classification,
    source: "LEGACY",
    canonicalItemsAuthoritative: false,
    legacyProjectionAllowed: true,
    compatibilityLabelRo: LEGACY_COMPATIBILITY_LABELS_RO[classification],
  };
}

export function extractLegacyFdiTeeth(value: unknown): readonly AdultFdiTooth[] {
  if (!Array.isArray(value)) return [];
  const selected = new Set<AdultFdiTooth>();
  for (const entry of value) {
    const numeric = typeof entry === "number" ? entry : typeof entry === "string" && /^\d+$/.test(entry) ? Number(entry) : null;
    if (numeric !== null && isAdultFdiTooth(numeric)) selected.add(numeric);
  }
  const order = new Map<number, number>(ADULT_FDI_TEETH.map((tooth, index) => [tooth, index]));
  return [...selected].sort((left, right) => (order.get(left) ?? Number.MAX_SAFE_INTEGER) - (order.get(right) ?? Number.MAX_SAFE_INTEGER));
}

export interface LegacyCycleCompatibilityView {
  readonly id: string;
  readonly cycleNumber: number;
  readonly source: "LEGACY";
  readonly exactProbeInterpretation: false;
  readonly compatibilityLabelRo: "Istoric ciclu";
  readonly status: string;
  readonly openedAt: string;
  readonly closedAt: string | null;
}

export interface LegacyCompatibilityItemView {
  readonly id: string;
  readonly source: "LEGACY";
  readonly legacy: true;
  readonly exactSemanticScope: false;
  readonly compatibilityLabelRo: "Date istorice" | "Date istorice — verificare necesară";
  readonly workType: { readonly code: string; readonly id: string; readonly name: string; readonly symbol: string };
  readonly teeth: readonly AdultFdiTooth[];
  readonly shade: string | null;
  readonly implantPlatform: string | null;
  readonly restorationType: string | null;
  readonly technicalCodeNotes: string | null;
  readonly notes: string | null;
  readonly quantity: number;
  readonly baseUnitPriceMinor: number;
  readonly totalPriceMinor: number;
  readonly currency: string;
}

export interface WorkOrderCompatibilityView {
  readonly workOrderId: string;
  readonly workCode: string;
  readonly source: LegacyCompatibilitySource;
  readonly classification: LegacyCompatibilityClassification;
  readonly compatibilityLabelRo: string;
  readonly canonicalItemsAuthoritative: boolean;
  readonly legacyProjectionAllowed: boolean;
  readonly canonicalItems: readonly WorkOrderItemView[];
  readonly legacyItem: LegacyCompatibilityItemView | null;
  readonly archivedCanonicalItemCount: number;
  readonly cycles: readonly LegacyCycleCompatibilityView[];
  readonly identity: {
    readonly singleWorkOrder: true;
    readonly code: string;
    readonly qrIdentityPreserved: true;
  };
  readonly editing: {
    readonly requiresExplicitCanonicalConversion: boolean;
    readonly legacyFieldsRemainHistorical: true;
  };
  readonly commercial: {
    readonly source: "CANONICAL_ITEMS" | "LEGACY_WORK_ORDER";
    readonly quantity: number;
    readonly baseUnitPriceMinor: number | null;
    readonly totalPriceMinor: number | null;
    readonly currency: string;
  };
}
