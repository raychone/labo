import type { CreateWorkFormSubmissionInput, WorkFormSubmissionView, WorkFormValues } from "./work-forms.js";
import type { DeadlineDashboardSummary, DeadlineFilter } from "./work-deadline-visual-state.js";
import type { LegalEntityCode } from "./organization-context.js";
import type { WorkWorkflowExecutionView, WorkflowExecutionStatus } from "./workflow-execution.js";

export const WORK_STATUSES = ["REGISTERED"] as const;
export const WORK_PRIORITIES = ["NORMAL", "URGENT"] as const;
export const WORK_SORT_FIELDS = ["code", "createdAt", "effectiveDueAt", "priority", "requestedDeliveryDate", "status", "totalPriceMinor", "updatedAt"] as const;
export const WORK_QR_PAYLOAD_PREFIX = "dl-work:" as const;
export const SCAN_SOURCES = ["camera", "manual"] as const;
export const WORK_DEADLINE_MODES = ["CALCULATED", "MANUAL", "UNRESOLVED"] as const;
export const WORK_DEADLINE_SOURCES = ["CREATION", "WORK_UPDATE", "MANUAL_OVERRIDE", "MANUAL_RECALCULATION", "LEGACY_BACKFILL", "FUTURE_TECH_CLAIM"] as const;
export const WORK_CLAIM_STATUSES = ["UNCLAIMED", "CLAIMED"] as const;
export const WORK_CLAIM_SOURCES = ["TECHNICIAN_CLAIM", "MANAGER_ASSIGNMENT", "MANAGER_REASSIGNMENT", "TECHNICIAN_RELEASE", "MANAGER_RELEASE", "LEGACY_BACKFILL"] as const;
export const WORK_ASSIGNMENT_EVENT_TYPES = ["CLAIMED", "RELEASED", "ASSIGNED", "REASSIGNED"] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];
export type WorkPriority = (typeof WORK_PRIORITIES)[number];
export type WorkSortField = (typeof WORK_SORT_FIELDS)[number];
export type ScanSource = (typeof SCAN_SOURCES)[number];
export type WorkDeadlineMode = (typeof WORK_DEADLINE_MODES)[number];
export type WorkDeadlineSource = (typeof WORK_DEADLINE_SOURCES)[number];
export type WorkClaimStatus = (typeof WORK_CLAIM_STATUSES)[number];
export type WorkClaimSource = (typeof WORK_CLAIM_SOURCES)[number];
export type WorkAssignmentEventType = (typeof WORK_ASSIGNMENT_EVENT_TYPES)[number];

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

export interface WorkDeadlineSummary {
  readonly badge: string;
  readonly calculatedAt: string | null;
  readonly calculatedDueAt: string | null;
  readonly color: string;
  readonly countdown: string;
  readonly effectiveDueAt: string | null;
  readonly executionDays: number | null;
  readonly explanation: string | null;
  readonly includeStartDay: boolean | null;
  readonly isLocked: boolean;
  readonly manualDueAt: string | null;
  readonly mode: WorkDeadlineMode | null;
  readonly reasonCode: string | null;
  readonly revision: number;
  readonly source: WorkDeadlineSource | null;
  readonly status: string;
  readonly startAt: string | null;
  readonly tooltip: string;
  readonly timezone: string | null;
}

export interface WorkClaimUserSummary {
  readonly displayName: string;
  readonly publicId: string;
}

export interface WorkClaimLegalEntitySummary {
  readonly code: LegalEntityCode;
  readonly displayName: string;
}

export interface WorkClaimSummary {
  readonly canCurrentUserClaim: boolean;
  readonly canCurrentUserReassign: boolean;
  readonly canCurrentUserRelease: boolean;
  readonly claimedAt: string | null;
  readonly executionLegalEntity: WorkClaimLegalEntitySummary | null;
  readonly releasedAt: string | null;
  readonly releaseReason: string | null;
  readonly revision: number;
  readonly source: WorkClaimSource | null;
  readonly status: WorkClaimStatus;
  readonly technician: WorkClaimUserSummary | null;
}

export interface WorkAssignmentEventSummary {
  readonly actor: WorkClaimUserSummary;
  readonly createdAt: string;
  readonly eventType: WorkAssignmentEventType;
  readonly id: string;
  readonly newLegalEntity: WorkClaimLegalEntitySummary | null;
  readonly newTechnician: WorkClaimUserSummary | null;
  readonly previousLegalEntity: WorkClaimLegalEntitySummary | null;
  readonly previousTechnician: WorkClaimUserSummary | null;
  readonly reason: string | null;
  readonly revision: number;
}

export interface WorkSummary {
  readonly clinic: WorkClinicSummary;
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly claim: WorkClaimSummary;
  readonly doctor: WorkDoctorSummary;
  readonly id: string;
  readonly invoicedDocumentId: string | null;
  readonly deadline: WorkDeadlineSummary;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly patient: {
    readonly firstName: string;
    readonly fullName: string;
    readonly id: string;
    readonly lastName: string;
  } | null;
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
  readonly assignmentHistory: readonly WorkAssignmentEventSummary[];
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
  readonly patientId: string;
  readonly patientReference?: string | null;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly manualDueAt?: string | null;
  readonly workFormSubmission?: CreateWorkFormSubmissionInput;
  readonly workTypeId: string;
}

export type UpdateWorkInput = Partial<Omit<CreateWorkInput, "workFormSubmission">> & {
  readonly confirmWorkTypeChange?: boolean;
  readonly expectedDeadlineRevision?: number;
  readonly workFormSubmission?: CreateWorkFormSubmissionInput;
  readonly workFormValues?: WorkFormValues;
};

export interface WorksListParams {
  readonly clinicId?: string | undefined;
  readonly dateFrom?: string | undefined;
  readonly dateTo?: string | undefined;
  readonly deadlineFilter: DeadlineFilter | undefined;
  readonly claimStatus?: WorkClaimStatus | undefined;
  readonly executionLegalEntityCode?: LegalEntityCode | undefined;
  readonly assignedTechnicianId?: string | undefined;
  readonly doctorId?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly priority?: WorkPriority | undefined;
  readonly search?: string | undefined;
  readonly sortBy: WorkSortField;
  readonly sortDirection: "asc" | "desc";
  readonly status?: WorkStatus | undefined;
  readonly workTypeId?: string | undefined;
}

export interface ClaimWorksListParams extends Omit<WorksListParams, "dateFrom" | "dateTo" | "status"> {
  readonly onlyActive?: boolean | undefined;
}

export interface PaginatedWorksResponse {
  readonly deadlineDashboard: DeadlineDashboardSummary;
  readonly items: readonly WorkSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export type ClaimWorkInput = {
  readonly executionLegalEntityCode: LegalEntityCode;
  readonly expectedClaimRevision: number;
};

export type ReleaseWorkInput = {
  readonly expectedClaimRevision: number;
  readonly reason: string;
};

export type ReassignWorkInput = {
  readonly executionLegalEntityCode: LegalEntityCode;
  readonly expectedClaimRevision: number;
  readonly reason: string;
  readonly technicianId: string;
};

export interface WorkDeadlinePreviewInput {
  readonly clinicId: string;
  readonly doctorId: string;
  readonly manualDueAt?: string | null;
  readonly quantity: number;
  readonly startAt?: string;
  readonly workTypeId: string;
}

export interface WorkDeadlineSourceSummary {
  readonly executionRuleSource: "MANUAL_REQUIRED" | "NONE" | "RESOLVED";
  readonly pricingSource: "CLINIC" | "DOCTOR" | "NONE" | "STANDARD";
}

export interface WorkDeadlinePreview {
  readonly calculatedDueAt: string | null;
  readonly effectiveDueAt: string | null;
  readonly executionDays: number | null;
  readonly explanation: string;
  readonly includeStartDay: boolean;
  readonly manualDueAt: string | null;
  readonly mode: WorkDeadlineMode;
  readonly reasonCode: string | null;
  readonly sourceSummary: WorkDeadlineSourceSummary;
  readonly startAt: string;
  readonly timezone: string;
}

export interface RecalculateWorkDeadlineInput {
  readonly expectedRevision: number;
  readonly includeStartDay?: boolean;
}

export interface SetManualWorkDeadlineInput {
  readonly dueAt: string;
  readonly expectedRevision: number;
  readonly reason?: string | null;
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
