import type { Prisma, WorkPriority, WorkStageExecutionStatus } from "@prisma/client";

type TechnicianQueueCategory = "ALL" | "DUE_TODAY" | "IN_PROGRESS" | "OVERDUE" | "UNSTARTED" | "URGENT";

export interface TechnicianOption {
  readonly activeAssignedStages: number;
  readonly preferredColor: string | null;
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
}

export interface TechnicianWorkbenchItem {
  readonly assignment: {
    readonly assignedAt: string | null;
    readonly assignedBy: { readonly displayName: string; readonly id: string } | null;
    readonly assignedUser: { readonly displayName: string; readonly email: string; readonly id: string } | null;
  };
  readonly categories: readonly TechnicianQueueCategory[];
  readonly clinic: { readonly id: string; readonly name: string } | null;
  readonly doctor: { readonly displayName: string; readonly id: string } | null;
  readonly dueDate: string;
  readonly id: string;
  readonly patientName: string;
  readonly priority: WorkPriority;
  readonly progress: { readonly completed: number; readonly total: number };
  readonly realLabSheet: {
    readonly cycleNumber: number | null;
    readonly label: string;
    readonly status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "FINALIZED";
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

export interface TechnicianWorkloadItem extends TechnicianWorkbenchSummary {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly pending: number;
}

const roleLabels: Readonly<Record<string, string>> = {
  CURIER: "Curier",
  LOGISTICA: "Logistică",
  MANAGER: "Manager",
  MEDIC: "Medic",
  RECEPTIE: "Recepție",
  TEHNICIAN: "Tehnician",
};

export type TechnicianWorkbenchStageRecord = Prisma.WorkStageExecutionGetPayload<{
  include: {
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
    workflowExecution: {
      include: {
        stages: {
          select: {
            status: true;
          };
        };
        workOrder: {
          include: {
            activeCycle: {
              include: {
                workFormSubmissions: {
                  orderBy: {
                    updatedAt: "desc";
                  };
                  select: {
                    finalizedAt: true;
                    realLabSheetStatus: true;
                  };
                  take: 1;
                  where: {
                    templateKind: "REAL_LAB_SHEET";
                  };
                };
              };
            };
            clinic: {
              select: {
                id: true;
                name: true;
              };
            };
            doctor: {
              select: {
                displayName: true;
                id: true;
              };
            };
            workType: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export type TechnicianOptionRecord = {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly preferredColor: string | null;
  readonly _count?: { readonly assignedWorkStages?: number };
};

export function toTechnicianOption(user: TechnicianOptionRecord): TechnicianOption {
  return {
    activeAssignedStages: user._count?.assignedWorkStages ?? 0,
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    preferredColor: user.preferredColor,
  };
}

export function toTechnicianWorkbenchItem(stage: TechnicianWorkbenchStageRecord, now = new Date()): TechnicianWorkbenchItem {
  const work = stage.workflowExecution.workOrder;
  const dueDate = work.requestedDeliveryDate.toISOString();
  const completed = stage.workflowExecution.stages.filter((item) => item.status === "COMPLETED").length;
  const allowedRoleCodes = getStringArray(stage.allowedRoleCodesSnapshot);

  return {
    assignment: {
      assignedAt: stage.assignedAt?.toISOString() ?? null,
      assignedBy: stage.assignedBy ? { displayName: stage.assignedBy.displayName, id: stage.assignedBy.id } : null,
      assignedUser: stage.assignedUser
        ? { displayName: stage.assignedUser.displayName, email: stage.assignedUser.email, id: stage.assignedUser.id }
        : null,
    },
    categories: deriveQueueCategories({ dueDate, priority: work.priority, status: stage.status }, now),
    clinic: work.clinic
      ? {
          id: work.clinic.id,
          name: work.clinic.name,
        }
      : null,
    doctor: work.doctor
      ? {
          displayName: work.doctor.displayName,
          id: work.doctor.id,
        }
      : null,
    dueDate,
    id: stage.id,
    patientName: work.patientName,
    priority: work.priority,
    progress: {
      completed,
      total: stage.workflowExecution.stages.length,
    },
    realLabSheet: toRealLabSheetSummary(work.activeCycle),
    stage: {
      allowedRoleLabels: allowedRoleCodes.map((roleCode) => roleLabels[roleCode] ?? roleCode),
      id: stage.id,
      key: stage.stageKeySnapshot,
      name: stage.stageNameSnapshot,
      status: stage.status,
      version: stage.version,
    },
    workCode: work.code,
    workId: work.id,
    workType: {
      id: work.workType.id,
      name: work.workType.name,
    },
    workflowStatus: stage.workflowExecution.status,
  };
}

function toRealLabSheetSummary(activeCycle: TechnicianWorkbenchStageRecord["workflowExecution"]["workOrder"]["activeCycle"]): TechnicianWorkbenchItem["realLabSheet"] {
  const submission = activeCycle?.workFormSubmissions[0] ?? null;
  const status = submission?.finalizedAt ? "FINALIZED" : submission?.realLabSheetStatus ?? "NOT_STARTED";
  const labels = {
    COMPLETE: "Completă",
    FINALIZED: "Finalizată",
    IN_PROGRESS: "În lucru",
    NOT_STARTED: "Necompletată",
  } as const;

  return {
    cycleNumber: activeCycle?.cycleNumber ?? null,
    label: labels[status],
    status,
  };
}

export function summarizeWorkbench(items: readonly TechnicianWorkbenchItem[]): TechnicianWorkbenchSummary {
  return {
    dueToday: items.filter((item) => item.categories.includes("DUE_TODAY")).length,
    inProgress: items.filter((item) => item.stage.status === "IN_PROGRESS").length,
    overdue: items.filter((item) => item.categories.includes("OVERDUE")).length,
    totalActive: items.length,
    unstarted: items.filter((item) => item.stage.status === "PENDING").length,
    urgent: items.filter((item) => item.priority === "URGENT").length,
  };
}

export function toTechnicianWorkloadItem(user: TechnicianOption, stages: readonly { readonly dueDate: string; readonly priority: WorkPriority; readonly status: WorkStageExecutionStatus }[], now = new Date()): TechnicianWorkloadItem {
  const items = stages.map((stage) => ({
    categories: deriveQueueCategories(stage, now),
    priority: stage.priority,
    status: stage.status,
  }));

  return {
    displayName: user.displayName,
    dueToday: items.filter((item) => item.categories.includes("DUE_TODAY")).length,
    email: user.email,
    id: user.id,
    inProgress: items.filter((item) => item.status === "IN_PROGRESS").length,
    overdue: items.filter((item) => item.categories.includes("OVERDUE")).length,
    pending: items.filter((item) => item.status === "PENDING").length,
    totalActive: stages.length,
    unstarted: items.filter((item) => item.status === "PENDING").length,
    urgent: items.filter((item) => item.priority === "URGENT").length,
  };
}

function getStringArray(value: Prisma.JsonValue): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function deriveQueueCategories(input: {
  readonly dueDate: string;
  readonly priority: WorkPriority;
  readonly status: WorkStageExecutionStatus;
}, now = new Date()): readonly TechnicianQueueCategory[] {
  const due = new Date(input.dueDate);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());

  return [
    "ALL",
    ...(input.status === "PENDING" ? ["UNSTARTED" as const] : []),
    ...(input.status === "IN_PROGRESS" ? ["IN_PROGRESS" as const] : []),
    ...(input.priority === "URGENT" ? ["URGENT" as const] : []),
    ...(dueDay === today ? ["DUE_TODAY" as const] : []),
    ...(dueDay < today ? ["OVERDUE" as const] : []),
  ];
}
