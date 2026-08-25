export const WORK_TYPE_UNITS = ["ELEMENT", "UNIT", "ARCH", "CASE", "REPAIR", "OTHER"] as const;
export const WORK_TYPE_SORT_FIELDS = ["basePriceMinor", "code", "createdAt", "name", "symbol", "updatedAt"] as const;

export type WorkTypeUnit = (typeof WORK_TYPE_UNITS)[number];
export type WorkTypeSortField = (typeof WORK_TYPE_SORT_FIELDS)[number];

export const WORK_TYPE_PROBE_FAMILIES = ["MC", "ZR", "ZRP", "PRO", "LA_GATA"] as const;
export type WorkTypeProbeFamily = (typeof WORK_TYPE_PROBE_FAMILIES)[number];

export const WORK_TYPE_PROBE_FAMILY_LABELS = {
  LA_GATA: "La gata",
  MC: "Metalo-ceramică",
  PRO: "Proteze",
  ZR: "Zirconia",
  ZRP: "Zirconia placată",
} as const satisfies Record<WorkTypeProbeFamily, string>;

export function formatWorkTypeCategory(probeFamily: WorkTypeProbeFamily | string | null | undefined): string {
  return probeFamily && Object.prototype.hasOwnProperty.call(WORK_TYPE_PROBE_FAMILY_LABELS, probeFamily)
    ? WORK_TYPE_PROBE_FAMILY_LABELS[probeFamily as WorkTypeProbeFamily]
    : "Alte lucrări";
}

export const WORK_TYPE_ADD_ON_CODES = ["PLACATA", "GINGIE"] as const;
export type WorkTypeAddOnCode = (typeof WORK_TYPE_ADD_ON_CODES)[number];

export interface WorkTypeAddOnOption {
  readonly code: WorkTypeAddOnCode;
  readonly label: string;
  readonly amountMinor: number | null;
}

export interface WorkTypeOption {
  readonly basePriceMinor: number | null;
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly unit: WorkTypeUnit;
  readonly probeFamily?: WorkTypeProbeFamily | null;
  readonly probeTypeCodes?: readonly string[];
  readonly allowedAddOns?: readonly WorkTypeAddOnOption[];
  readonly exclusiveGroup?: string | null;
}

export interface WorkTypeSummary extends WorkTypeOption {
  readonly createdAt: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

export interface WorkTypeDetail extends WorkTypeSummary {
  readonly archivedAt: string | null;
  readonly archivedByUserId: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
}

export interface CreateWorkTypeInput {
  readonly basePriceMinor: number | null;
  readonly description?: string | null;
  readonly name: string;
  readonly symbol: string;
  readonly unit: WorkTypeUnit;
  readonly probeFamily?: WorkTypeProbeFamily | null;
  readonly probeTypeCodes?: readonly string[];
  readonly allowedAddOns?: readonly WorkTypeAddOnOption[];
  readonly exclusiveGroup?: string | null;
}

export type UpdateWorkTypeInput = Partial<CreateWorkTypeInput>;

export interface WorkTypesListParams {
  readonly isActive: boolean | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | undefined;
  readonly sortBy: WorkTypeSortField;
  readonly sortDirection: "asc" | "desc";
}

export interface PaginatedWorkTypesResponse {
  readonly items: readonly WorkTypeSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export type DecimalStringToMinorResult =
  | {
      readonly ok: true;
      readonly value: number;
    }
  | {
      readonly error: string;
      readonly ok: false;
    };

export function minorToDecimalString(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Minor value must be a non-negative safe integer.");
  }

  const major = Math.floor(value / 100);
  const minor = String(value % 100).padStart(2, "0");

  return `${major}.${minor}`;
}

export function decimalStringToMinor(value: string): DecimalStringToMinorResult {
  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { error: "Use a non-negative decimal value with at most two decimals.", ok: false };
  }

  const [majorPart, minorPart = ""] = normalized.split(".") as [string, string?];
  const major = Number(majorPart);
  const minor = Number(minorPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor)) {
    return { error: "Value is too large.", ok: false };
  }

  const result = major * 100 + minor;

  if (!Number.isSafeInteger(result)) {
    return { error: "Value is too large.", ok: false };
  }

  return { ok: true, value: result };
}

export function formatMoneyMinor(value: number, currency: string, locale = "ro-RO"): string {
  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  }).format(value / 100);
}

export const WORK_TYPE_UNIT_LABELS = {
  ARCH: "arcadă",
  CASE: "lucrare",
  ELEMENT: "element",
  OTHER: "altă unitate",
  REPAIR: "reparație",
  UNIT: "bucată",
} as const satisfies Record<WorkTypeUnit, string>;

export function formatWorkTypeUnit(unit: WorkTypeUnit): string {
  return WORK_TYPE_UNIT_LABELS[unit];
}
