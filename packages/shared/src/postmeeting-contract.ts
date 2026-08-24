/**
 * POSTMODEL-001 canonical contracts.
 *
 * These are vocabulary, invariant, compatibility, and transition contracts
 * only. They intentionally do not persist or activate any later-bundle
 * behavior (items, connections, probe cycles, maneuvers, notifications, or
 * billing realignment).
 */

export const ANATOMICAL_SCOPE_TYPES = [
  "TOOTH",
  "TEETH",
  "UPPER_ARCH",
  "LOWER_ARCH",
  "BOTH_ARCHES",
  "CASE",
] as const;

export type AnatomicalScopeType = (typeof ANATOMICAL_SCOPE_TYPES)[number];

export const ANATOMICAL_SCOPE_LABELS_RO: Readonly<Record<AnatomicalScopeType, string>> = {
  TOOTH: "Dinte",
  TEETH: "Dinți",
  UPPER_ARCH: "Arcada superioară",
  LOWER_ARCH: "Arcada inferioară",
  BOTH_ARCHES: "Ambele arcade",
  CASE: "Lucrare",
};

export const ADULT_FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export type AdultFdiTooth = (typeof ADULT_FDI_TEETH)[number];

export const DENTAL_ASSET_SOURCE_CODES = [
  11, 12, 13, 14, 15, 16, 17, 18,
  41, 42, 43, 44, 45, 46, 47, 48,
] as const;

export type DentalAssetSourceCode = (typeof DENTAL_ASSET_SOURCE_CODES)[number];

export const DENTAL_ASSET_DIRECTORY = "assets/dinti" as const;

export interface DentalAssetIdentity {
  readonly assetCode: DentalAssetSourceCode;
  readonly mirrored: boolean;
  readonly fdiTooth: AdultFdiTooth;
}

export const PROBE_LIFECYCLE_TERMS_RO = {
  activeCycle: "Probă activă",
  probeReady: "Probă gata",
  received: "Recepționată",
  finalized: "Finalizată",
} as const;

export type ProbeLifecycleAction = "PROBE_READY" | "RECEIVED" | "FINALIZED";

export type ProbeLifecycleState =
  | "ACTIVE"
  | "PROBE_HISTORY"
  | "RECEIVED"
  | "DEFINITIVELY_FINALIZED";

export interface ProbeLifecycleTransition {
  readonly action: ProbeLifecycleAction;
  readonly from: readonly ProbeLifecycleState[];
  readonly to: ProbeLifecycleState;
  readonly userLabel: string;
}

export const PROBE_LIFECYCLE_TRANSITIONS: readonly ProbeLifecycleTransition[] = [
  {
    action: "PROBE_READY",
    from: ["ACTIVE"],
    to: "PROBE_HISTORY",
    userLabel: PROBE_LIFECYCLE_TERMS_RO.probeReady,
  },
  {
    action: "RECEIVED",
    from: ["PROBE_HISTORY"],
    to: "RECEIVED",
    userLabel: PROBE_LIFECYCLE_TERMS_RO.received,
  },
  {
    action: "FINALIZED",
    from: ["ACTIVE", "PROBE_HISTORY", "RECEIVED"],
    to: "DEFINITIVELY_FINALIZED",
    userLabel: PROBE_LIFECYCLE_TERMS_RO.finalized,
  },
] as const;

export const TECHNICIAN_MANEUVER_UNITS = ["PER_ELEMENT", "PER_UNIT", "PER_ARCH", "PER_CASE"] as const;
export type TechnicianManeuverUnit = (typeof TECHNICIAN_MANEUVER_UNITS)[number];

export const TECHNICIAN_MANEUVER_UNIT_LABELS_RO: Readonly<Record<TechnicianManeuverUnit, string>> = {
  PER_ELEMENT: "Per element",
  PER_UNIT: "Per unitate",
  PER_ARCH: "Per arcadă",
  PER_CASE: "Per lucrare",
};

export const TECHNICIAN_MANEUVER_UNIT_HELP_RO: Readonly<Record<TechnicianManeuverUnit, string>> = {
  PER_ELEMENT: "Se calculează după numărul de dinți selectați.",
  PER_UNIT: "Se calculează după numărul de componente selectate.",
  PER_ARCH: "1 pentru o arcadă, 2 pentru ambele arcade.",
  PER_CASE: "Întotdeauna 1 pentru lucrarea curentă.",
};

export function calculateManeuverQuantity(input: {
  readonly unit: TechnicianManeuverUnit;
  readonly selectedToothCount?: number;
  readonly selectedItemCount?: number;
  readonly selectedArchCount?: number;
}): number {
  const count = input.unit === "PER_ELEMENT"
    ? input.selectedToothCount
    : input.unit === "PER_UNIT"
      ? input.selectedItemCount
      : input.unit === "PER_ARCH"
        ? input.selectedArchCount
        : 1;
  if (input.unit === "PER_CASE") return 1;
  if (!Number.isSafeInteger(count) || (count as number) < 0) throw new RangeError("Cantitatea manoperei trebuie să fie un număr întreg nenegativ.");
  return count as number;
}

export function calculateManeuverTotalMinor(quantity: number, rateMinor: number): number {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(rateMinor) || rateMinor < 0) {
    throw new RangeError("Cantitatea și tariful trebuie să fie numere întregi nenegative.");
  }
  const total = quantity * rateMinor;
  if (!Number.isSafeInteger(total)) throw new RangeError("Totalul manoperei depășește limita sigură.");
  return total;
}

export type ManeuverQuantityFixture =
  | { readonly unit: "PER_ELEMENT"; readonly selectedToothCount: number; readonly selectedItemCount?: never; readonly selectedArchCount?: never; readonly expectedQuantity: number }
  | { readonly unit: "PER_UNIT"; readonly selectedItemCount: number; readonly selectedToothCount?: number; readonly selectedArchCount?: never; readonly expectedQuantity: number }
  | { readonly unit: "PER_ARCH"; readonly selectedArchCount: number; readonly selectedToothCount?: number; readonly selectedItemCount?: number; readonly expectedQuantity: number }
  | { readonly unit: "PER_CASE"; readonly selectedToothCount?: number; readonly selectedItemCount?: number; readonly selectedArchCount?: number; readonly expectedQuantity: 1 };

export const MANEUVER_QUANTITY_FIXTURES = [
  { unit: "PER_ELEMENT", selectedToothCount: 1, expectedQuantity: 1 },
  { unit: "PER_ELEMENT", selectedToothCount: 2, expectedQuantity: 2 },
  { unit: "PER_ELEMENT", selectedToothCount: 3, expectedQuantity: 3 },
  { unit: "PER_UNIT", selectedItemCount: 1, expectedQuantity: 1 },
  { unit: "PER_UNIT", selectedItemCount: 2, expectedQuantity: 2 },
  { unit: "PER_ARCH", selectedArchCount: 1, expectedQuantity: 1 },
  { unit: "PER_ARCH", selectedArchCount: 2, expectedQuantity: 2 },
  { unit: "PER_CASE", expectedQuantity: 1 },
] as const satisfies readonly ManeuverQuantityFixture[];

export const URGENCY_LEVELS = ["NORMAL", "URGENCY_1", "URGENCY_2", "URGENCY_3", "URGENCY_4"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const URGENCY_SURCHARGE_PERCENT: Readonly<Record<UrgencyLevel, 0 | 25 | 50 | 75 | 100>> = {
  NORMAL: 0,
  URGENCY_1: 25,
  URGENCY_2: 50,
  URGENCY_3: 75,
  URGENCY_4: 100,
};

export const URGENCY_LABELS_RO: Readonly<Record<UrgencyLevel, string>> = {
  NORMAL: "Normal",
  URGENCY_1: "Urgență 1",
  URGENCY_2: "Urgență 2",
  URGENCY_3: "Urgență 3",
  URGENCY_4: "Urgență 4",
};

export function calculateUrgencySurchargeMinor(subtotalMinor: number, urgency: UrgencyLevel): number {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 0) throw new RangeError("Subtotalul trebuie să fie un număr întreg pozitiv sau zero.");
  return Math.floor((subtotalMinor * URGENCY_SURCHARGE_PERCENT[urgency] + 50) / 100);
}

export interface WorkOrderCanonicalIdentity {
  readonly isSingleOperationalCase: true;
  readonly hasSingleCommercialLifecycle: true;
  readonly hasSingleCourierUnit: true;
  readonly hasSingleLogisticsUnit: true;
  readonly hasSingleQrIdentity: true;
}

export const WORK_ORDER_CANONICAL_IDENTITY: WorkOrderCanonicalIdentity = {
  isSingleOperationalCase: true,
  hasSingleCommercialLifecycle: true,
  hasSingleCourierUnit: true,
  hasSingleLogisticsUnit: true,
  hasSingleQrIdentity: true,
};

export const LEGACY_COMPATIBILITY_MAPPINGS = {
  genericPriority: "READ_ONLY_HISTORICAL; new flows use urgency",
  legacyCycle: "READ_ONLY_HISTORICAL; do not infer item-level cycles",
  legacyReturnTerminology: "READ_ONLY_HISTORICAL; new flow uses Recepționată",
  legacySingleWorkTypeFields: "READ_THROUGH_UNTIL_ITEM_MIGRATION",
  legacyTechnicianOperationWithoutScope: "READ_AS_LEGACY_GENERAL_SCOPE",
  legacyLegalEntityNC: "PRESERVE_HISTORICAL; current canonical collaboration code is CDT",
} as const;

export const POSTMODEL_AUDIT_ACTIONS = {
  canonicalScopeChanged: "work_order.canonical_scope_changed",
  canonicalTerminologyTransitioned: "work_order.canonical_terminology_transitioned",
  definitiveFinalization: "work_order.definitive_finalization",
  probeReady: "work_order.probe_ready",
} as const;

export const POSTMODEL_UI_TERMINOLOGY_RO = {
  activeProbe: "Probă activă",
  probeHistory: "Istoric probe",
  probeReady: "Probă gata",
  received: "Recepționată",
  finalized: "Finalizată",
  urgency: "Urgență",
  noUrgency: "Fără urgență",
  saveToCatalog: "Salvează în catalog",
} as const;

export function isAdultFdiTooth(value: number): value is AdultFdiTooth {
  return (ADULT_FDI_TEETH as readonly number[]).includes(value);
}

export function isAnatomicalScopeType(value: string): value is AnatomicalScopeType {
  return (ANATOMICAL_SCOPE_TYPES as readonly string[]).includes(value);
}

export function resolveMirroredFdiTooth(assetCode: DentalAssetSourceCode, mirrored: boolean): AdultFdiTooth {
  if (!mirrored) return assetCode;
  return (assetCode >= 11 && assetCode <= 18 ? assetCode + 10 : assetCode - 10) as AdultFdiTooth;
}

export function isAllowedProbeTransition(from: ProbeLifecycleState, action: ProbeLifecycleAction): boolean {
  return PROBE_LIFECYCLE_TRANSITIONS.some((transition) => transition.action === action && transition.from.includes(from));
}
