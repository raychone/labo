import type { Prisma } from "@prisma/client";
import type { WorkTypeAddOnOption, WorkTypeProbeFamily } from "@dental-lab/shared";

export type WorkTypeRecord = Prisma.WorkTypeGetPayload<object>;

export interface WorkTypeOptionView {
  readonly basePriceMinor: number | null;
  readonly code: string;
  readonly colorHex: string | null;
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly unit: string;
  readonly probeFamily?: WorkTypeProbeFamily | null;
  readonly probeTypeCodes?: readonly string[];
  readonly allowedAddOns?: readonly WorkTypeAddOnOption[];
  readonly exclusiveGroup?: string | null;
}

export interface WorkTypeSummaryView extends WorkTypeOptionView {
  readonly createdAt: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

export interface WorkTypeDetailView extends WorkTypeSummaryView {
  readonly archivedAt: string | null;
  readonly archivedByUserId: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
}

export interface PaginatedWorkTypesView {
  readonly items: readonly WorkTypeSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toWorkTypeOptionView(workType: Pick<WorkTypeRecord, "basePriceMinor" | "code" | "colorHex" | "id" | "name" | "symbol" | "unit" | "probeFamily" | "probeTypeCodes" | "allowedAddOns" | "exclusiveGroup">): WorkTypeOptionView {
  return {
    basePriceMinor: workType.basePriceMinor,
    code: workType.code,
    colorHex: workType.colorHex,
    id: workType.id,
    name: workType.name,
    symbol: workType.symbol,
    unit: workType.unit,
    ...(isProbeFamily(workType.probeFamily) ? { probeFamily: workType.probeFamily } : {}),
    ...(jsonStringArray(workType.probeTypeCodes).length > 0 ? { probeTypeCodes: jsonStringArray(workType.probeTypeCodes) } : {}),
    ...(jsonAddOns(workType.allowedAddOns).length > 0 ? { allowedAddOns: jsonAddOns(workType.allowedAddOns) } : {}),
    ...(workType.exclusiveGroup ? { exclusiveGroup: workType.exclusiveGroup } : {}),
  };
}

function isProbeFamily(value: string | null): value is WorkTypeProbeFamily {
  return value === "MC" || value === "ZR" || value === "ZRP" || value === "PRO" || value === "LA_GATA";
}

function jsonStringArray(value: Prisma.JsonValue | null): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function jsonAddOns(value: Prisma.JsonValue | null): readonly WorkTypeAddOnOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const code = entry.code;
    const label = entry.label;
    const amountMinor = entry.amountMinor;
    if ((code !== "PLACATA" && code !== "GINGIE") || typeof label !== "string") return [];
    return [{ code, label: code === "PLACATA" ? "Adiacente" : label, amountMinor: typeof amountMinor === "number" ? amountMinor : null }];
  });
}

export function toWorkTypeSummaryView(workType: WorkTypeRecord): WorkTypeSummaryView {
  return {
    ...toWorkTypeOptionView(workType),
    createdAt: workType.createdAt.toISOString(),
    description: workType.description,
    isActive: workType.isActive,
    updatedAt: workType.updatedAt.toISOString(),
  };
}

export function toWorkTypeDetailView(workType: WorkTypeRecord): WorkTypeDetailView {
  return {
    ...toWorkTypeSummaryView(workType),
    archivedAt: workType.archivedAt?.toISOString() ?? null,
    archivedByUserId: workType.archivedByUserId,
    createdByUserId: workType.createdByUserId,
    updatedByUserId: workType.updatedByUserId,
    version: workType.version,
  };
}
