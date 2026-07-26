import type { CreateWorkFormSubmissionInput, WorkFormSubmissionView, WorkFormValues } from "./work-forms.js";
import type { WorkWorkflowExecutionView, WorkflowExecutionStatus } from "./workflow-execution.js";

export const WORK_STATUSES = ["REGISTERED"] as const;
export const WORK_PRIORITIES = ["NORMAL", "URGENT"] as const;
export const WORK_SORT_FIELDS = ["code", "createdAt", "priority", "requestedDeliveryDate", "status", "totalPriceMinor", "updatedAt"] as const;
export const WORK_QR_PAYLOAD_PREFIX = "dl-work:" as const;
export const SCAN_SOURCES = ["camera", "manual"] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];
export type WorkPriority = (typeof WORK_PRIORITIES)[number];
export type WorkSortField = (typeof WORK_SORT_FIELDS)[number];
export type ScanSource = (typeof SCAN_SOURCES)[number];

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

export interface WorkWorkflowSummary {
  readonly currentStageName: string | null;
  readonly progressCompleted: number;
  readonly progressTotal: number;
  readonly status: WorkflowExecutionStatus | null;
}

export interface WorkSummary {
  readonly clinic: WorkClinicSummary;
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly doctor: WorkDoctorSummary;
  readonly id: string;
  readonly invoicedDocumentId: string | null;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: WorkStatus;
  readonly totalPriceMinor: number | null;
  readonly updatedAt: string;
  readonly workflow: WorkWorkflowSummary | null;
  readonly workType: WorkTypeSnapshot;
}

export interface WorkDetail extends Omit<WorkSummary, "workflow"> {
  readonly baseUnitPriceMinor: number | null;
  readonly clinicalNotes: string | null;
  readonly createdByUserId: string | null;
  readonly externalReference: string | null;
  readonly internalNotes: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
  readonly workForm: WorkFormSubmissionView | null;
  readonly workflow: WorkWorkflowExecutionView | null;
}

export interface CreateWorkInput {
  readonly clinicId: string;
  readonly clinicalNotes?: string | null;
  readonly doctorId: string;
  readonly externalReference?: string | null;
  readonly expectedWorkflowTemplateId?: string | null;
  readonly expectedWorkflowTemplateVersion?: number;
  readonly internalNotes?: string | null;
  readonly patientName: string;
  readonly patientReference?: string | null;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly workFormSubmission?: CreateWorkFormSubmissionInput;
  readonly workTypeId: string;
}

export type UpdateWorkInput = Partial<Omit<CreateWorkInput, "workFormSubmission">> & {
  readonly confirmWorkTypeChange?: boolean;
  readonly workFormSubmission?: CreateWorkFormSubmissionInput;
  readonly workFormValues?: WorkFormValues;
};

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

export interface WorkQrLabelView {
  readonly clinicName: string;
  readonly doctorName: string;
  readonly dueDate: string;
  readonly patientDisplay: string;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly workTypeName: string;
}

export interface WorkQrView {
  readonly label: WorkQrLabelView;
  readonly payload: string;
  readonly workCode: string;
  readonly workId: string;
}

export interface WorkLabelView extends WorkQrView {}

export interface ResolveWorkQrInput {
  readonly payload: string;
  readonly source: ScanSource;
}

export interface ResolveWorkQrResult {
  readonly work: WorkDetail;
}

export function isWorkQrPayload(value: string): boolean {
  return value.startsWith(WORK_QR_PAYLOAD_PREFIX);
}
