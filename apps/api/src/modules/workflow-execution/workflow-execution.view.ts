import type { Prisma, WorkStageEventType, WorkStageExecutionStatus, WorkWorkflowExecutionStatus } from "@prisma/client";

const roleLabels: Readonly<Record<string, string>> = {
  CURIER: "Curier",
  LOGISTICA: "Logistică",
  MANAGER: "Manager",
  MEDIC: "Medic",
  RECEPTIE: "Recepție",
  TEHNICIAN: "Tehnician",
};

export interface WorkflowUserView {
  readonly displayName: string;
  readonly id: string;
}

export interface AssignedWorkflowUserView extends WorkflowUserView {
  readonly email: string;
}

export interface WorkStageExecutionView {
  readonly allowedRoleCodes: readonly string[];
  readonly allowedRoleLabels: readonly string[];
  readonly assignment: {
    readonly assignedAt: string | null;
    readonly assignedBy: WorkflowUserView | null;
    readonly assignedUser: AssignedWorkflowUserView | null;
  };
  readonly completedAt: string | null;
  readonly completedBy: WorkflowUserView | null;
  readonly description: string | null;
  readonly estimatedDurationMinutes: number | null;
  readonly id: string;
  readonly isCurrent: boolean;
  readonly key: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly startedAt: string | null;
  readonly startedBy: WorkflowUserView | null;
  readonly status: WorkStageExecutionStatus;
  readonly version: number;
}

export interface WorkStageEventView {
  readonly actor: WorkflowUserView | null;
  readonly id: string;
  readonly metadata: Record<string, unknown> | null;
  readonly occurredAt: string;
  readonly stageExecutionId: string | null;
  readonly type: WorkStageEventType;
}

export interface WorkflowActionAvailabilityView {
  readonly canCompleteCurrentStage: boolean;
  readonly canStartCurrentStage: boolean;
  readonly reason: string | null;
}

export interface WorkWorkflowExecutionView {
  readonly actions: WorkflowActionAvailabilityView;
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
  readonly status: WorkWorkflowExecutionStatus;
  readonly updatedAt: string;
  readonly workflowName: string;
  readonly workflowTemplateId: string | null;
  readonly workflowVersion: number;
  readonly version: number;
}

export type WorkflowExecutionRecord = Prisma.WorkWorkflowExecutionGetPayload<{
  include: {
    events: {
      include: {
        actor: {
          select: {
            displayName: true;
            id: true;
          };
        };
      };
    };
    stages: {
      include: {
        completedBy: {
          select: {
            displayName: true;
            id: true;
          };
        };
        startedBy: {
          select: {
            displayName: true;
            id: true;
          };
        };
        assignedBy: {
          select: {
            displayName: true;
            id: true;
          };
        };
        assignedUser: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
      };
    };
  };
}>;

export function toWorkflowExecutionView(
  execution: WorkflowExecutionRecord,
  actions: WorkflowActionAvailabilityView,
): WorkWorkflowExecutionView {
  const stages = [...execution.stages]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((stage) => toStageView(stage, stage.id === execution.currentStageExecutionId));
  const completed = stages.filter((stage) => stage.status === "COMPLETED").length;

  return {
    actions,
    completedAt: execution.completedAt?.toISOString() ?? null,
    createdAt: execution.createdAt.toISOString(),
    currentStage: stages.find((stage) => stage.isCurrent) ?? null,
    events: [...execution.events].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()).map(toEventView),
    id: execution.id,
    progress: {
      completed,
      total: stages.length,
    },
    stages,
    startedAt: execution.startedAt.toISOString(),
    status: execution.status,
    updatedAt: execution.updatedAt.toISOString(),
    workflowName: execution.workflowNameSnapshot,
    workflowTemplateId: execution.workflowTemplateId,
    workflowVersion: execution.workflowTemplateVersion,
    version: execution.version,
  };
}

export function toWorkflowSummaryView(execution: Pick<WorkflowExecutionRecord, "currentStageExecutionId" | "stages" | "status"> | null) {
  if (!execution) {
    return null;
  }

  const stages = [...execution.stages].sort((left, right) => left.sortOrder - right.sortOrder);
  const currentStage = stages.find((stage) => stage.id === execution.currentStageExecutionId) ?? null;

  return {
    currentStageName: currentStage?.stageNameSnapshot ?? null,
    progressCompleted: stages.filter((stage) => stage.status === "COMPLETED").length,
    progressTotal: stages.length,
    status: execution.status,
  };
}

function toStageView(stage: WorkflowExecutionRecord["stages"][number], isCurrent: boolean): WorkStageExecutionView {
  const allowedRoleCodes = Array.isArray(stage.allowedRoleCodesSnapshot)
    ? stage.allowedRoleCodesSnapshot.filter((value): value is string => typeof value === "string")
    : [];

  return {
    allowedRoleCodes,
    allowedRoleLabels: allowedRoleCodes.map((roleCode) => roleLabels[roleCode] ?? roleCode),
    assignment: {
      assignedAt: stage.assignedAt?.toISOString() ?? null,
      assignedBy: toUserView(stage.assignedBy),
      assignedUser: stage.assignedUser
        ? { displayName: stage.assignedUser.displayName, email: stage.assignedUser.email, id: stage.assignedUser.id }
        : null,
    },
    completedAt: stage.completedAt?.toISOString() ?? null,
    completedBy: toUserView(stage.completedBy),
    description: stage.stageDescriptionSnapshot,
    estimatedDurationMinutes: stage.estimatedDurationMinutesSnapshot,
    id: stage.id,
    isCurrent,
    key: stage.stageKeySnapshot,
    name: stage.stageNameSnapshot,
    sortOrder: stage.sortOrder,
    startedAt: stage.startedAt?.toISOString() ?? null,
    startedBy: toUserView(stage.startedBy),
    status: stage.status,
    version: stage.version,
  };
}

function toEventView(event: WorkflowExecutionRecord["events"][number]): WorkStageEventView {
  return {
    actor: toUserView(event.actor),
    id: event.id,
    metadata: event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? event.metadata as Record<string, unknown>
      : null,
    occurredAt: event.occurredAt.toISOString(),
    stageExecutionId: event.stageExecutionId,
    type: event.type,
  };
}

function toUserView(user: { readonly displayName: string; readonly id: string } | null): WorkflowUserView | null {
  return user ? { displayName: user.displayName, id: user.id } : null;
}
