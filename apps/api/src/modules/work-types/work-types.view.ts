import type { Prisma } from "@prisma/client";

export type WorkTypeRecord = Prisma.WorkTypeGetPayload<object>;

export interface WorkTypeOptionView {
  readonly basePriceMinor: number;
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly unit: string;
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

export function toWorkTypeOptionView(workType: Pick<WorkTypeRecord, "basePriceMinor" | "code" | "id" | "name" | "unit">): WorkTypeOptionView {
  return {
    basePriceMinor: workType.basePriceMinor,
    code: workType.code,
    id: workType.id,
    name: workType.name,
    unit: workType.unit,
  };
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
