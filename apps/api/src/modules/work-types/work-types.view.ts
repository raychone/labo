import type { Prisma } from "@prisma/client";
import { ANATOMICAL_SCOPE_TYPES, type AnatomicalScopeType, type WorkTypeAddOnOption, type WorkTypeProbeFamily } from "@dental-lab/shared";

export type WorkTypeRecord = Prisma.WorkTypeGetPayload<{ include: { probeTypes: { include: { probeType: true } }; technicianOperations: true } }>;

export interface WorkTypeOptionView {
  readonly basePriceMinor: number | null;
  readonly code: string;
  readonly colorHex: string | null;
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly unit: string;
  readonly probeFamily?: WorkTypeProbeFamily | null;
  readonly probeTypeIds: readonly string[];
  readonly probeTypeCodes?: readonly string[];
  readonly allowedAddOns?: readonly WorkTypeAddOnOption[];
  readonly allowedAnatomicalScopes?: readonly AnatomicalScopeType[];
  readonly operationApplicabilityConfigured: boolean;
  readonly probeApplicabilityConfigured: boolean;
  readonly technicianOperationIds: readonly string[];
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

export function toWorkTypeOptionView(workType: Pick<WorkTypeRecord, "allowedAddOns" | "allowedAnatomicalScopes" | "basePriceMinor" | "code" | "colorHex" | "exclusiveGroup" | "id" | "name" | "operationApplicabilityConfigured" | "probeApplicabilityConfigured" | "probeFamily" | "probeTypes" | "symbol" | "technicianOperations" | "unit">): WorkTypeOptionView {
  const probeTypes = workType.probeTypes ?? [];
  const technicianOperations = workType.technicianOperations ?? [];
  return {
    basePriceMinor: workType.basePriceMinor,
    code: workType.code,
    colorHex: workType.colorHex,
    id: workType.id,
    name: workType.name,
    symbol: workType.symbol,
    unit: workType.unit,
    ...(isProbeFamily(workType.probeFamily) ? { probeFamily: workType.probeFamily } : {}),
    probeTypeIds: [...probeTypes].sort((left, right) => left.sortOrder - right.sortOrder).map((mapping) => mapping.probeTypeId),
    probeTypeCodes: [...probeTypes].sort((left, right) => left.sortOrder - right.sortOrder).flatMap((mapping) => mapping.probeType.code ? [mapping.probeType.code] : []),
    ...(jsonAddOns(workType.allowedAddOns).length > 0 ? { allowedAddOns: jsonAddOns(workType.allowedAddOns) } : {}),
    allowedAnatomicalScopes: jsonAnatomicalScopes(workType.allowedAnatomicalScopes),
    operationApplicabilityConfigured: workType.operationApplicabilityConfigured ?? false,
    probeApplicabilityConfigured: workType.probeApplicabilityConfigured ?? false,
    technicianOperationIds: [...technicianOperations].sort((left, right) => left.sortOrder - right.sortOrder).map((mapping) => mapping.operationId),
    ...(workType.exclusiveGroup ? { exclusiveGroup: workType.exclusiveGroup } : {}),
  };
}

function jsonAnatomicalScopes(value: Prisma.JsonValue | null): readonly AnatomicalScopeType[] {
  const allowed = new Set<string>(ANATOMICAL_SCOPE_TYPES);
  return Array.isArray(value) ? value.filter((entry): entry is AnatomicalScopeType => typeof entry === "string" && allowed.has(entry)) : [];
}

function isProbeFamily(value: string | null): value is WorkTypeProbeFamily {
  return value === "MC" || value === "ZR" || value === "ZRP" || value === "PRO" || value === "LA_GATA";
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
