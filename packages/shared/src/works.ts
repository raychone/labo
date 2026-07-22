export const WORK_STATUSES = ["REGISTERED"] as const;
export const WORK_PRIORITIES = ["NORMAL", "URGENT"] as const;
export const WORK_SORT_FIELDS = ["code", "createdAt", "priority", "requestedDeliveryDate", "status", "totalPriceMinor", "updatedAt"] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];
export type WorkPriority = (typeof WORK_PRIORITIES)[number];
export type WorkSortField = (typeof WORK_SORT_FIELDS)[number];

export interface WorkClinicSummary {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface WorkDoctorSummary {
  readonly displayName: string;
  readonly id: string;
}

export interface WorkTypeSnapshot {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface WorkTypeFormOption extends WorkTypeSnapshot {
  readonly unit: string;
}

export interface WorkSummary {
  readonly clinic: WorkClinicSummary;
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly doctor: WorkDoctorSummary;
  readonly id: string;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: WorkStatus;
  readonly totalPriceMinor: number | null;
  readonly updatedAt: string;
  readonly workType: WorkTypeSnapshot;
}

export interface WorkDetail extends WorkSummary {
  readonly baseUnitPriceMinor: number | null;
  readonly clinicalNotes: string | null;
  readonly createdByUserId: string | null;
  readonly externalReference: string | null;
  readonly internalNotes: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
}

export interface CreateWorkInput {
  readonly clinicId: string;
  readonly clinicalNotes?: string | null;
  readonly doctorId: string;
  readonly externalReference?: string | null;
  readonly internalNotes?: string | null;
  readonly patientName: string;
  readonly patientReference?: string | null;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly workTypeId: string;
}

export type UpdateWorkInput = Partial<CreateWorkInput>;

export interface WorksListParams {
  readonly clinicId: string | undefined;
  readonly dateFrom: string | undefined;
  readonly dateTo: string | undefined;
  readonly doctorId: string | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly priority: WorkPriority | undefined;
  readonly search: string | undefined;
  readonly sortBy: WorkSortField;
  readonly sortDirection: "asc" | "desc";
  readonly status: WorkStatus | undefined;
  readonly workTypeId: string | undefined;
}

export interface PaginatedWorksResponse {
  readonly items: readonly WorkSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}
