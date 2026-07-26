import { formatWorkflowDuration, type WorkflowStageRoleCode } from "./workflow-templates.js";
import type { TechnicianAssignmentView } from "./technician-assignments.js";

export const WORKFLOW_EXECUTION_STATUSES = ["ACTIVE", "COMPLETED"] as const;
export const WORK_STAGE_EXECUTION_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export const WORK_STAGE_EVENT_TYPES = [
  "WORKFLOW_CREATED",
  "STAGE_STARTED",
  "STAGE_COMPLETED",
  "WORKFLOW_COMPLETED",
  "STAGE_ASSIGNED",
  "STAGE_REASSIGNED",
  "STAGE_UNASSIGNED",
] as const;

export type WorkflowExecutionStatus = (typeof WORKFLOW_EXECUTION_STATUSES)[number];
export type WorkStageExecutionStatus = (typeof WORK_STAGE_EXECUTION_STATUSES)[number];
export type WorkflowEventType = (typeof WORK_STAGE_EVENT_TYPES)[number];

export interface WorkflowUserSummary {
  readonly displayName: string;
  readonly id: string;
}

export interface WorkStageExecutionView {
  readonly allowedRoleCodes: readonly WorkflowStageRoleCode[];
  readonly allowedRoleLabels: readonly string[];
  readonly assignment: TechnicianAssignmentView;
  readonly completedAt: string | null;
  readonly completedBy: WorkflowUserSummary | null;
  readonly description: string | null;
  readonly estimatedDurationMinutes: number | null;
  readonly id: string;
  readonly isCurrent: boolean;
  readonly key: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly startedAt: string | null;
  readonly startedBy: WorkflowUserSummary | null;
  readonly status: WorkStageExecutionStatus;
  readonly version: number;
}

export interface WorkStageEventView {
  readonly actor: WorkflowUserSummary | null;
  readonly id: string;
  readonly metadata: Readonly<Record<string, unknown>> | null;
  readonly occurredAt: string;
  readonly stageExecutionId: string | null;
  readonly type: WorkflowEventType;
}

export interface WorkflowActionAvailability {
  readonly canCompleteCurrentStage: boolean;
  readonly canStartCurrentStage: boolean;
  readonly reason: string | null;
}

export interface WorkWorkflowExecutionView {
  readonly actions: WorkflowActionAvailability;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly currentStage: WorkStageExecutionView | null;
  readonly events: readonly WorkStageEventView[];
  readonly id: string;
  readonly progress: {
    readonly completed: number;
    readonly total: number;
  };
  readonly stages: readonly WorkStageExecutionView[];
  readonly startedAt: string;
  readonly status: WorkflowExecutionStatus;
  readonly updatedAt: string;
  readonly workflowName: string;
  readonly workflowTemplateId: string | null;
  readonly workflowVersion: number;
  readonly version: number;
}

export interface StartStageInput {
  readonly expectedStageVersion?: number;
  readonly expectedWorkflowVersion?: number;
  readonly source?: "scan";
}

export interface CompleteStageInput {
  readonly expectedStageVersion?: number;
  readonly expectedWorkflowVersion?: number;
  readonly source?: "scan";
}

export function getWorkflowProgress(stages: readonly Pick<WorkStageExecutionView, "status">[]): { readonly completed: number; readonly total: number } {
  return {
    completed: stages.filter((stage) => stage.status === "COMPLETED").length,
    total: stages.length,
  };
}

export function getNextStage<TStage extends { readonly sortOrder: number }>(
  stages: readonly TStage[],
  current: TStage,
): TStage | null {
  return [...stages].sort((left, right) => left.sortOrder - right.sortOrder).find((stage) => stage.sortOrder > current.sortOrder) ?? null;
}

export function getWorkflowExecutionStatusLabel(status: WorkflowExecutionStatus): string {
  return status === "COMPLETED" ? "Flux finalizat" : "Flux activ";
}

export function getWorkStageExecutionStatusLabel(status: WorkStageExecutionStatus): string {
  if (status === "IN_PROGRESS") {
    return "În lucru";
  }

  if (status === "COMPLETED") {
    return "Finalizată";
  }

  return "În așteptare";
}

export function getWorkStageEventLabel(type: WorkflowEventType): string {
  if (type === "STAGE_ASSIGNED") {
    return "Etapă asignată";
  }

  if (type === "STAGE_REASSIGNED") {
    return "Etapă reasignată";
  }

  if (type === "STAGE_UNASSIGNED") {
    return "Asignare eliminată";
  }

  if (type === "STAGE_STARTED") {
    return "Etapă începută";
  }

  if (type === "STAGE_COMPLETED") {
    return "Etapă finalizată";
  }

  if (type === "WORKFLOW_COMPLETED") {
    return "Flux finalizat";
  }

  return "Flux creat";
}

export function getStageActionAvailability(input: {
  readonly canExecuteCurrentStage: boolean;
  readonly currentStage: Pick<WorkStageExecutionView, "status"> | null;
  readonly status: WorkflowExecutionStatus;
}): WorkflowActionAvailability {
  if (input.status === "COMPLETED") {
    return { canCompleteCurrentStage: false, canStartCurrentStage: false, reason: "Fluxul este finalizat." };
  }

  if (!input.currentStage) {
    return { canCompleteCurrentStage: false, canStartCurrentStage: false, reason: "Nu există etapă curentă." };
  }

  if (!input.canExecuteCurrentStage) {
    return { canCompleteCurrentStage: false, canStartCurrentStage: false, reason: "Rolul curent nu poate executa etapa." };
  }

  return {
    canCompleteCurrentStage: input.currentStage.status === "IN_PROGRESS",
    canStartCurrentStage: input.currentStage.status === "PENDING",
    reason: null,
  };
}

export function formatTimelineDate(value: string | null, locale = "ro-RO"): string {
  if (!value) {
    return "Nefinalizat";
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export { formatWorkflowDuration };
