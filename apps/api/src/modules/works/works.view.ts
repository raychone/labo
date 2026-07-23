import type { Prisma } from "@prisma/client";

export type WorkOrderRecord = Prisma.WorkOrderGetPayload<{
  include: {
    clinic: true;
    doctor: true;
    workType: true;
  };
}>;

export interface WorkTypeFormOptionView {
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly unit: string;
}

export interface WorkSummaryView {
  readonly clinic: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly doctor: {
    readonly displayName: string;
    readonly id: string;
  };
  readonly id: string;
  readonly invoicedDocumentId: string | null;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly priority: string;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: string;
  readonly totalPriceMinor: number | null;
  readonly updatedAt: string;
  readonly workType: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
}

export interface WorkDetailView extends WorkSummaryView {
  readonly baseUnitPriceMinor: number | null;
  readonly clinicalNotes: string | null;
  readonly createdByUserId: string | null;
  readonly externalReference: string | null;
  readonly internalNotes: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
}

export interface PaginatedWorksView {
  readonly items: readonly WorkSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toWorkTypeFormOptionView(workType: { readonly code: string; readonly id: string; readonly name: string; readonly unit: string }): WorkTypeFormOptionView {
  return {
    code: workType.code,
    id: workType.id,
    name: workType.name,
    unit: workType.unit,
  };
}

export function toWorkSummaryView(workOrder: WorkOrderRecord, includePricing: boolean): WorkSummaryView {
  return {
    clinic: {
      code: workOrder.clinic.code,
      id: workOrder.clinic.id,
      name: workOrder.clinic.name,
    },
    code: workOrder.code,
    createdAt: workOrder.createdAt.toISOString(),
    currency: includePricing ? workOrder.currency : null,
    doctor: {
      displayName: workOrder.doctor.displayName,
      id: workOrder.doctor.id,
    },
    id: workOrder.id,
    invoicedDocumentId: workOrder.invoicedDocumentId,
    patientName: workOrder.patientName,
    patientReference: workOrder.patientReference,
    priority: workOrder.priority,
    quantity: workOrder.quantity,
    requestedDeliveryDate: workOrder.requestedDeliveryDate.toISOString(),
    status: workOrder.status,
    totalPriceMinor: includePricing ? workOrder.totalPriceMinor : null,
    updatedAt: workOrder.updatedAt.toISOString(),
    workType: {
      code: workOrder.workType.code,
      id: workOrder.workType.id,
      name: workOrder.workType.name,
    },
  };
}

export function toWorkDetailView(workOrder: WorkOrderRecord, includePricing: boolean): WorkDetailView {
  return {
    ...toWorkSummaryView(workOrder, includePricing),
    baseUnitPriceMinor: includePricing ? workOrder.baseUnitPriceMinor : null,
    clinicalNotes: workOrder.clinicalNotes,
    createdByUserId: workOrder.createdByUserId,
    externalReference: workOrder.externalReference,
    internalNotes: workOrder.internalNotes,
    updatedByUserId: workOrder.updatedByUserId,
    version: workOrder.version,
  };
}
