import {
  ADULT_FDI_TEETH,
  ANATOMICAL_SCOPE_TYPES,
  type AdultFdiTooth,
  type AnatomicalScopeType,
  isAdultFdiTooth,
} from "./postmeeting-contract.js";

export type WorkOrderItemScope = AnatomicalScopeType;

export interface WorkOrderItemToothInput {
  readonly fdiTooth: AdultFdiTooth;
  readonly sortOrder?: number;
}

export interface WorkOrderItemInput {
  readonly scope: WorkOrderItemScope;
  readonly teeth?: readonly number[];
  readonly workTypeId?: string | null;
  readonly customWorkTypeSnapshot?: Readonly<Record<string, unknown>> | null;
  readonly shade?: string | null;
  readonly implantPlatform?: string | null;
  readonly customImplantPlatformSnapshot?: Readonly<Record<string, unknown>> | null;
  readonly restorationType?: string | null;
  readonly technicalCodeNotes?: string | null;
  readonly notes?: string | null;
  readonly baseUnitPriceMinor?: number;
  readonly totalPriceMinor?: number;
  readonly currency?: string | null;
  readonly commercialSnapshot?: Readonly<Record<string, unknown>> | null;
  readonly selectedAddOns?: readonly { readonly code: string; readonly amountMinor?: number | null }[];
}

export interface WorkOrderCompositionItemInput extends WorkOrderItemInput {
  /** Existing database identity; omitted for a new component. */
  readonly id?: string;
}

export interface WorkOrderCompositionInput {
  readonly items: readonly WorkOrderCompositionItemInput[];
  readonly toothConnections: readonly { readonly toothA: number; readonly toothB: number }[];
}

export interface WorkOrderItemToothView {
  readonly fdiTooth: AdultFdiTooth;
  readonly sortOrder: number;
}

export interface WorkOrderItemView {
  readonly id: string;
  readonly workOrderId: string;
  readonly sortOrder: number;
  readonly scope: WorkOrderItemScope;
  readonly teeth: readonly WorkOrderItemToothView[];
  readonly workType: { readonly code: string; readonly colorHex?: string | null; readonly id: string; readonly name: string; readonly symbol: string; readonly unit?: string; readonly probeFamily?: string | null; readonly probeTypeCodes?: readonly string[]; } | null;
  readonly workTypeId: string | null;
  readonly customWorkTypeSnapshot: Readonly<Record<string, unknown>> | null;
  readonly shade: string | null;
  readonly implantPlatform: string | null;
  readonly customImplantPlatformSnapshot: Readonly<Record<string, unknown>> | null;
  readonly restorationType: string | null;
  readonly technicalCodeNotes: string | null;
  readonly notes: string | null;
  readonly baseUnitPriceMinor: number | null;
  readonly totalPriceMinor: number | null;
  readonly currency: string | null;
  readonly commercialSnapshot: Readonly<Record<string, unknown>> | null;
  readonly selectedAddOns?: readonly { readonly code: string; readonly amountMinor: number | null }[];
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkOrderItemScopeValidation {
  readonly valid: boolean;
  readonly reason?: "INVALID_SCOPE" | "INVALID_TOOTH" | "DUPLICATE_TOOTH" | "TOOTH_COUNT";
  readonly message?: string;
  readonly teeth: readonly AdultFdiTooth[];
}

const canonicalToothOrder = new Map<number, number>(ADULT_FDI_TEETH.map((tooth, index) => [tooth, index]));

export function normalizeWorkOrderItemTeeth(teeth: readonly number[] | undefined): readonly AdultFdiTooth[] {
  return [...(teeth ?? [])]
    .filter(isAdultFdiTooth)
    .sort((left, right) => (canonicalToothOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (canonicalToothOrder.get(right) ?? Number.MAX_SAFE_INTEGER));
}

export function validateWorkOrderItemScope(input: Pick<WorkOrderItemInput, "scope" | "teeth">): WorkOrderItemScopeValidation {
  if (!ANATOMICAL_SCOPE_TYPES.includes(input.scope)) {
    return { valid: false, reason: "INVALID_SCOPE", message: "Domeniul anatomic selectat nu este valid.", teeth: [] };
  }

  const rawTeeth = input.teeth ?? [];
  const teeth = normalizeWorkOrderItemTeeth(rawTeeth);
  if (rawTeeth.some((tooth) => !isAdultFdiTooth(tooth))) {
    return { valid: false, reason: "INVALID_TOOTH", message: "A fost selectat un dinte FDI adult invalid.", teeth };
  }
  if (new Set(rawTeeth).size !== rawTeeth.length) {
    return { valid: false, reason: "DUPLICATE_TOOTH", message: "Același dinte nu poate apărea de două ori în aceeași componentă.", teeth };
  }
  if (input.scope === "TOOTH" && rawTeeth.length !== 1) {
    return { valid: false, reason: "TOOTH_COUNT", message: "Domeniul Dinte necesită exact un dinte.", teeth };
  }
  if (input.scope === "TEETH" && rawTeeth.length < 2) {
    return { valid: false, reason: "TOOTH_COUNT", message: "Domeniul Dinți necesită cel puțin doi dinți.", teeth };
  }

  return { valid: true, teeth };
}
