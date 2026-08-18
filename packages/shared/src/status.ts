import type { DeliveryStatus } from "./delivery.js";
import type { LogisticsStatus } from "./logistics.js";
import type { LegalEntityCode } from "./organization-context.js";
import type { DeadlineVisualState } from "./work-deadline-visual-state.js";
import type { WorkClaimStatus, WorkPriority } from "./works.js";
import type { RealLabSheetOperationalStatus } from "./work-forms.js";
import type { WorkflowExecutionStatus, WorkStageExecutionStatus } from "./workflow-execution.js";

export const OPERATIONAL_STATUS_TABS = ["TODAY", "IN_PROGRESS", "AVAILABLE", "LATE", "AT_CLINIC", "RETURNED", "COMPLETED"] as const;
export const OPERATIONAL_STATUS_SORT_FIELDS = ["effectiveDueAt", "priority", "createdAt", "updatedAt", "workCode", "clinicName", "patientName"] as const;
export const OPERATIONAL_STATUS_SORT_DIRECTIONS = ["asc", "desc"] as const;
export const OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE = 25;
export const OPERATIONAL_STATUS_MAX_PAGE_SIZE = 100;
export const OPERATIONAL_STATUS_MAX_SCANNED_ROWS = 1_000;

export type OperationalStatusTab = (typeof OPERATIONAL_STATUS_TABS)[number];
export type OperationalStatusSortField = (typeof OPERATIONAL_STATUS_SORT_FIELDS)[number];
export type OperationalStatusSortDirection = (typeof OPERATIONAL_STATUS_SORT_DIRECTIONS)[number];

export interface OperationalStatusQuery {
  readonly clinicId?: string | null;
  readonly deadlineState?: DeadlineVisualState;
  readonly deliveryStatus?: DeliveryStatus;
  readonly doctorId?: string | null;
  readonly executionLegalEntityCode?: LegalEntityCode;
  readonly logisticsStatus?: LogisticsStatus;
  readonly ownerUserId?: string | null;
  readonly page: number;
  readonly pageSize: number;
  readonly patientId?: string | null;
  readonly priority?: WorkPriority;
  readonly search?: string | null;
  readonly sheetStatus?: RealLabSheetOperationalStatus;
  readonly sortBy: OperationalStatusSortField;
  readonly sortDirection: OperationalStatusSortDirection;
  readonly stageTechnicianUserId?: string | null;
  readonly tab: OperationalStatusTab;
  readonly workTypeId?: string | null;
}

export interface OperationalStatusPerson {
  readonly displayName: string;
  readonly publicId: string;
  readonly preferredColor: string | null;
}

export interface OperationalStatusWorkflow {
  readonly currentStage: {
    readonly key: string;
    readonly name: string;
    readonly status: WorkStageExecutionStatus;
  } | null;
  readonly progress: string | null;
  readonly progressCompleted: number;
  readonly progressTotal: number;
  readonly status: WorkflowExecutionStatus | null;
}

export interface OperationalStatusDeadline {
  readonly badge: string;
  readonly effectiveDueAt: string | null;
  readonly state: DeadlineVisualState;
  readonly tooltip: string;
}

export interface OperationalStatusCurrentCycle {
  readonly code: string;
  readonly id: string;
  readonly label: string;
  readonly number: number;
  readonly reason: string;
  readonly status: string;
}

export interface OperationalStatusRow {
  readonly claimStatus: WorkClaimStatus;
  readonly createdAt: string;
  readonly clinic: {
    readonly id: string;
    readonly name: string;
  };
  readonly currentCycle: OperationalStatusCurrentCycle | null;
  readonly currentStageTechnician: OperationalStatusPerson | null;
  readonly deadline: OperationalStatusDeadline;
  readonly delivery: {
    readonly code: string | null;
    readonly plannedDate: string | null;
    readonly status: DeliveryStatus | null;
  };
  readonly doctor: {
    readonly id: string;
    readonly name: string;
  };
  readonly executionCompany: {
    readonly code: LegalEntityCode;
    readonly displayName: string;
  } | null;
  readonly id: string;
  readonly logistics: {
    readonly status: LogisticsStatus | null;
  };
  readonly patient: {
    readonly id: string | null;
    readonly name: string;
    readonly reference: string | null;
  };
  readonly priority: WorkPriority;
  readonly realLabSheet: {
    readonly cycleNumber: number | null;
    readonly finalizedAt: string | null;
    readonly label: string;
    readonly lastModifiedAt: string | null;
    readonly status: RealLabSheetOperationalStatus;
  };
  readonly updatedAt: string;
  readonly workCode: string;
  readonly workOwner: OperationalStatusPerson | null;
  readonly workflow: OperationalStatusWorkflow;
  readonly workType: {
    readonly id: string;
    readonly name: string;
    readonly symbol: string;
  };
}

export interface OperationalStatusTabCounter {
  readonly count: number;
  readonly label: string;
  readonly tab: OperationalStatusTab;
}

export interface OperationalStatusResponse {
  readonly counters: readonly OperationalStatusTabCounter[];
  readonly items: readonly OperationalStatusRow[];
  readonly meta: {
    readonly hasMore: boolean;
    readonly page: number;
    readonly pageSize: number;
    readonly scannedRows: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
