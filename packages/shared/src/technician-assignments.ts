import type { WorkPriority } from "./works.js";
import type { RealLabSheetOperationalStatus } from "./work-forms.js";
import type { WorkStageExecutionStatus } from "./workflow-execution.js";

export const TECHNICIAN_QUEUE_CATEGORIES = ["ALL", "UNSTARTED", "IN_PROGRESS", "URGENT", "DUE_TODAY", "OVERDUE"] as const;
export type TechnicianQueueCategory = (typeof TECHNICIAN_QUEUE_CATEGORIES)[number];

export interface TechnicianOption {
  readonly activeAssignedStages: number;
  readonly preferredColor: string | null;
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
}

export interface TechnicianAssignmentView {
  readonly assignedAt: string | null;
  readonly assignedBy: { readonly displayName: string; readonly id: string } | null;
  readonly assignedUser: { readonly displayName: string; readonly email: string; readonly id: string } | null;
}

export interface AssignStageInput {
  readonly confirmInProgress?: boolean | undefined;
  readonly expectedVersion: number;
  readonly source?: "scan";
  readonly userId: string;
}

export interface UnassignStageInput {
  readonly confirmInProgress?: boolean | undefined;
  readonly expectedVersion: number;
}

export interface TechnicianWorkbenchFilter {
  readonly clinicId?: string | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly priority?: WorkPriority | undefined;
  readonly queue?: TechnicianQueueCategory | undefined;
  readonly search?: string | undefined;
  readonly sortBy: "priority" | "requestedDeliveryDate" | "startedAt";
  readonly sortOrder: "asc" | "desc";
  readonly stageKey?: string | undefined;
  readonly status?: WorkStageExecutionStatus | undefined;
  readonly technicianId?: string | undefined;
}

export interface TechnicianWorkbenchItem {
  readonly assignment: TechnicianAssignmentView;
  readonly categories: readonly TechnicianQueueCategory[];
  readonly clinic: { readonly id: string; readonly name: string };
  readonly doctor: { readonly displayName: string; readonly id: string };
  readonly dueDate: string;
  readonly id: string;
  readonly patientName: string;
  readonly priority: WorkPriority;
  readonly progress: { readonly completed: number; readonly total: number };
  readonly realLabSheet: {
    readonly cycleNumber: number | null;
    readonly label: string;
    readonly status: RealLabSheetOperationalStatus;
  };
  readonly stage: {
    readonly allowedRoleLabels: readonly string[];
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly status: WorkStageExecutionStatus;
    readonly version: number;
  };
  readonly workCode: string;
  readonly workId: string;
  readonly workType: { readonly id: string; readonly name: string };
  readonly workflowStatus: "ACTIVE" | "COMPLETED";
}

export interface TechnicianWorkbenchSummary {
  readonly dueToday: number;
  readonly inProgress: number;
  readonly overdue: number;
  readonly totalActive: number;
  readonly unstarted: number;
  readonly urgent: number;
}

export interface TechnicianWorkbenchResponse {
  readonly items: readonly TechnicianWorkbenchItem[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly summary: TechnicianWorkbenchSummary;
  readonly total: number;
}

export interface TechnicianWorkloadItem {
  readonly displayName: string;
  readonly dueToday: number;
  readonly email: string;
  readonly id: string;
  readonly inProgress: number;
  readonly overdue: number;
  readonly pending: number;
  readonly totalActive: number;
  readonly urgent: number;
}

export function isDueToday(dueDate: string, now = new Date()): boolean {
  const due = new Date(dueDate);
  return due.getUTCFullYear() === now.getUTCFullYear()
    && due.getUTCMonth() === now.getUTCMonth()
    && due.getUTCDate() === now.getUTCDate();
}

export function isOverdue(dueDate: string, now = new Date()): boolean {
  const due = new Date(dueDate);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return dueDay < today;
}

export function deriveQueueCategories(input: {
  readonly dueDate: string;
  readonly priority: WorkPriority;
  readonly status: WorkStageExecutionStatus;
}, now = new Date()): readonly TechnicianQueueCategory[] {
  return [
    "ALL",
    ...(input.status === "PENDING" ? ["UNSTARTED" as const] : []),
    ...(input.status === "IN_PROGRESS" ? ["IN_PROGRESS" as const] : []),
    ...(input.priority === "URGENT" ? ["URGENT" as const] : []),
    ...(isDueToday(input.dueDate, now) ? ["DUE_TODAY" as const] : []),
    ...(isOverdue(input.dueDate, now) ? ["OVERDUE" as const] : []),
  ];
}

export function getTechnicianQueueCategoryLabel(category: TechnicianQueueCategory): string {
  const labels: Record<TechnicianQueueCategory, string> = {
    ALL: "Toate",
    DUE_TODAY: "Astăzi",
    IN_PROGRESS: "În lucru",
    OVERDUE: "Întârziate",
    UNSTARTED: "De început",
    URGENT: "Urgente",
  };

  return labels[category];
}

export function getAssignmentStatusLabel(assignment: TechnicianAssignmentView): string {
  return assignment.assignedUser ? `Responsabil: ${assignment.assignedUser.displayName}` : "Neasignată";
}
