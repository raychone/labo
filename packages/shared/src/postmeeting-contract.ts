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

export const TECHNICIAN_MANEUVER_PRICING_SEMANTIC = "PER_ELEMENT" as const;
export const TECHNICIAN_MANEUVER_PRICING_LABEL_RO = "Per element" as const;
export const TECHNICIAN_MANEUVER_SELECTION_ORDER = ["TEETH_FIRST", "MANEUVER_SECOND"] as const;
export const TECHNICIAN_PERFORMED_MANEUVER_UNIQUENESS_SCOPE = ["workOrderId", "operationId", "fdiTooth"] as const;

export function calculateTechnicianManeuverElementQuantity(selectedTeeth: readonly number[]): number {
  if (selectedTeeth.length === 0) {
    throw new RangeError("Selectează cel puțin un dinte adult FDI pentru manoperă.");
  }
  const uniqueTeeth = new Set<number>();
  for (const tooth of selectedTeeth) {
    if (!isAdultFdiTooth(tooth)) {
      throw new RangeError("Manopera poate fi calculată doar pentru dinți adulți FDI valizi.");
    }
    uniqueTeeth.add(tooth);
  }
  return uniqueTeeth.size;
}

export function calculateTechnicianManeuverTotalMinor(quantity: number, rateMinor: number): number {
  if (!Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(rateMinor) || rateMinor < 0) {
    throw new RangeError("Cantitatea și tariful trebuie să fie numere întregi nenegative.");
  }
  const total = quantity * rateMinor;
  if (!Number.isSafeInteger(total)) throw new RangeError("Totalul manoperei depășește limita sigură.");
  return total;
}

export const URGENCY_LEVELS = ["NORMAL", "URGENCY_1", "URGENCY_2", "URGENCY_3", "URGENCY_4"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const URGENCY_SURCHARGE_PERCENT: Readonly<Record<UrgencyLevel, 0 | 35 | 50 | 75 | 100>> = {
  NORMAL: 0,
  URGENCY_1: 35,
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

/** B16 integration contract consumed by the later durable notification bundle. */
export const B16_NOTIFICATION_EVENTS = {
  newUnpricedWorkTypeRequiresManagerPricing: "NEW_UNPRICED_WORK_TYPE_REQUIRES_MANAGER_PRICING",
} as const;

export function getB16WorkTypePricingNotificationKey(workTypeId: string): string {
  return `work_type:${workTypeId}:pricing_required`;
}

/** B17 Logistics events are consumed by the B18 notification runtime. */
export const B17_LOGISTICS_NOTIFICATION_EVENTS = {
  newWork: "NEW_WORK",
  probeReady: "PROBE_READY",
  finalWorkReady: "FINAL_WORK_READY",
  deliveryCompleted: "DELIVERY_COMPLETED",
  deliveryFailed: "DELIVERY_FAILED",
} as const;

export type B17LogisticsNotificationEvent = (typeof B17_LOGISTICS_NOTIFICATION_EVENTS)[keyof typeof B17_LOGISTICS_NOTIFICATION_EVENTS];

export function getB17LogisticsNotificationKey(event: B17LogisticsNotificationEvent, input: { readonly workOrderId: string; readonly probeCycleId?: string | null; readonly movementId?: string | null }): string {
  if (event === B17_LOGISTICS_NOTIFICATION_EVENTS.newWork) return `new-work:${input.workOrderId}`;
  if (event === B17_LOGISTICS_NOTIFICATION_EVENTS.probeReady) {
    if (!input.probeCycleId) throw new RangeError("Evenimentul PROBE_READY necesită identificatorul ProbeCycle.");
    return `probe-ready:${input.workOrderId}:${input.probeCycleId}`;
  }
  if (event === B17_LOGISTICS_NOTIFICATION_EVENTS.finalWorkReady) return `final-ready:${input.workOrderId}`;
  if (!input.movementId) throw new RangeError("Evenimentul de livrare necesită identificatorul mișcării.");
  return `${event === B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryCompleted ? "delivery-completed" : "delivery-failed"}:${input.movementId}`;
}

export const B18_NOTIFICATION_TYPES = [
  "NEW_UNPRICED_WORK_TYPE_REQUIRES_MANAGER_PRICING",
  "PAYMENT_NOTE_REQUIRED",
  "INVOICE_REQUIRED",
  "LARGE_OUTSTANDING_BALANCE",
  "NEW_WORK",
  "PROBE_READY",
  "FINAL_WORK_READY",
  "DELIVERY_COMPLETED",
  "DELIVERY_FAILED",
  "DEADLINE_APPROACHING",
  "OVERDUE_WORK",
  "NEW_WORK_AVAILABLE",
  "NEW_PROBE_AVAILABLE",
  "RETURNED_WORK",
  "NEW_PROBE",
  "ROUTE_RECEIVED",
  "NEW_WORK_TYPE",
  "NEW_IMPLANT_PLATFORM",
] as const;
export type B18NotificationType = (typeof B18_NOTIFICATION_TYPES)[number];

export const B18_NOTIFICATION_LABELS_RO: Readonly<Record<B18NotificationType, string>> = {
  NEW_UNPRICED_WORK_TYPE_REQUIRES_MANAGER_PRICING: "Tip de lucrare nou fără preț",
  PAYMENT_NOTE_REQUIRED: "Notă de plată de generat",
  INVOICE_REQUIRED: "Factură de emis",
  LARGE_OUTSTANDING_BALANCE: "Restanțe mari",
  NEW_WORK: "Lucrare nouă",
  PROBE_READY: "Probă gata",
  FINAL_WORK_READY: "Lucrare finalizată",
  DELIVERY_COMPLETED: "Livrare efectuată",
  DELIVERY_FAILED: "Livrare eșuată",
  DEADLINE_APPROACHING: "Termen apropiat",
  OVERDUE_WORK: "Lucrare întârziată",
  NEW_WORK_AVAILABLE: "Lucrare nouă disponibilă",
  NEW_PROBE_AVAILABLE: "Probă nouă disponibilă",
  RETURNED_WORK: "Lucrare revenită",
  NEW_PROBE: "Probă nouă",
  ROUTE_RECEIVED: "Traseu primit",
  NEW_WORK_TYPE: "Tip de lucrare nou",
  NEW_IMPLANT_PLATFORM: "Platformă implant nouă",
};

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
