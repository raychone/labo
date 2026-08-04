import type {
  DeliveryStatus,
  Prisma,
  WorkClaimStatus,
  WorkLogisticsStatus,
  WorkPriority,
  WorkStageExecutionStatus,
  WorkWorkflowExecutionStatus,
} from "@prisma/client";

import { resolveDeadlineVisualState, type DeadlineVisualState } from "../works/work-deadline-visual.js";
import { type OperationalStatusSortDirection, type OperationalStatusSortField, type OperationalStatusTab } from "./status.constants.js";

export const operationalStatusWorkInclude = {
  assignedTechnician: {
    select: {
      displayName: true,
      id: true,
    },
  },
  claimedBy: {
    select: {
      displayName: true,
      id: true,
    },
  },
  clinic: {
    select: {
      id: true,
      name: true,
    },
  },
  deliveryPreparationItems: {
    include: {
      group: {
        include: {
          deliveries: {
            orderBy: {
              updatedAt: "desc",
            },
            select: {
              code: true,
              id: true,
              plannedDate: true,
              status: true,
              updatedAt: true,
            },
            take: 1,
            where: {
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: {
      addedAt: "desc",
    },
    where: {
      isActive: true,
    },
  },
  doctor: {
    select: {
      displayName: true,
      id: true,
    },
  },
  executionLegalEntity: {
    select: {
      code: true,
      displayName: true,
    },
  },
  activeCycle: {
    include: {
      logisticsState: {
        select: {
          status: true,
        },
      },
      workflowExecution: {
        include: {
          currentStage: {
            include: {
              assignedUser: {
                select: {
                  displayName: true,
                  id: true,
                },
              },
            },
          },
          stages: {
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              status: true,
            },
          },
        },
      },
    },
  },
  patient: {
    select: {
      id: true,
    },
  },
  workType: {
    select: {
      id: true,
      name: true,
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

export type OperationalStatusWorkRecord = Prisma.WorkOrderGetPayload<{ include: typeof operationalStatusWorkInclude }>;

export interface OperationalStatusPersonView {
  readonly displayName: string;
  readonly publicId: string;
}

export interface OperationalStatusRowView {
  readonly claimStatus: WorkClaimStatus;
  readonly createdAt: string;
  readonly clinic: {
    readonly id: string;
    readonly name: string;
  };
  readonly currentCycle: {
    readonly id: string;
    readonly label: string;
    readonly number: number;
    readonly reason: string;
    readonly status: string;
  } | null;
  readonly currentStageTechnician: OperationalStatusPersonView | null;
  readonly deadline: {
    readonly badge: string;
    readonly effectiveDueAt: string | null;
    readonly state: DeadlineVisualState;
    readonly tooltip: string;
  };
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
    readonly code: string;
    readonly displayName: string;
  } | null;
  readonly id: string;
  readonly logistics: {
    readonly status: WorkLogisticsStatus | null;
  };
  readonly patient: {
    readonly id: string | null;
    readonly name: string;
    readonly reference: string | null;
  };
  readonly priority: WorkPriority;
  readonly updatedAt: string;
  readonly workCode: string;
  readonly workOwner: OperationalStatusPersonView | null;
  readonly workflow: {
    readonly currentStage: {
      readonly key: string;
      readonly name: string;
      readonly status: WorkStageExecutionStatus;
    } | null;
    readonly progress: string | null;
    readonly progressCompleted: number;
    readonly progressTotal: number;
    readonly status: WorkWorkflowExecutionStatus | null;
  };
  readonly workType: {
    readonly id: string;
    readonly name: string;
  };
}

export interface OperationalStatusTabCounterView {
  readonly count: number;
  readonly label: string;
  readonly tab: OperationalStatusTab;
}

export interface OperationalStatusResponseView {
  readonly counters: readonly OperationalStatusTabCounterView[];
  readonly items: readonly OperationalStatusRowView[];
  readonly meta: {
    readonly hasMore: boolean;
    readonly page: number;
    readonly pageSize: number;
    readonly scannedRows: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

const tabLabels = {
  AT_CLINIC: "Plecate la medic",
  AVAILABLE: "Disponibile",
  COMPLETED: "Finalizate",
  IN_PROGRESS: "În lucru",
  LATE: "Întârziate",
  RETURNED: "Revenite",
  TODAY: "Astăzi",
} as const satisfies Record<OperationalStatusTab, string>;

export function createOperationalStatusCounters(rows: readonly OperationalStatusRowView[]): readonly OperationalStatusTabCounterView[] {
  const tabs: readonly OperationalStatusTab[] = ["TODAY", "IN_PROGRESS", "AVAILABLE", "LATE", "AT_CLINIC", "RETURNED", "COMPLETED"];
  return tabs.map((tab) => ({
    count: rows.filter((row) => matchesOperationalStatusTab(row, tab)).length,
    label: tabLabels[tab],
    tab,
  }));
}

export function matchesOperationalStatusTab(row: OperationalStatusRowView, tab: OperationalStatusTab): boolean {
  if (tab === "TODAY") {
    return row.deadline.state === "DUE_TODAY";
  }
  if (tab === "IN_PROGRESS") {
    return row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED";
  }
  if (tab === "AVAILABLE") {
    return row.claimStatus === "UNCLAIMED" && row.delivery.status !== "DELIVERED" && row.logistics.status !== "DELIVERED";
  }
  if (tab === "LATE") {
    return row.deadline.state === "LATE";
  }
  if (tab === "AT_CLINIC") {
    return row.logistics.status === "HANDED_TO_DELIVERY"
      || row.logistics.status === "DELIVERED"
      || row.delivery.status === "PICKED_UP"
      || row.delivery.status === "IN_TRANSIT"
      || row.delivery.status === "DELIVERED";
  }
  if (tab === "RETURNED") {
    return row.currentCycle !== null && row.currentCycle.number > 1 && row.delivery.status !== "DELIVERED";
  }
  return row.workflow.status === "COMPLETED" || row.logistics.status === "DELIVERED" || row.delivery.status === "DELIVERED";
}

export function compareOperationalStatusRows(
  left: OperationalStatusRowView,
  right: OperationalStatusRowView,
  sortBy: OperationalStatusSortField,
  sortDirection: OperationalStatusSortDirection,
): number {
  const direction = sortDirection === "asc" ? 1 : -1;
  return direction * compareValues(getSortValue(left, sortBy), getSortValue(right, sortBy));
}

export function toOperationalStatusRow(work: OperationalStatusWorkRecord, now: Date): OperationalStatusRowView {
  const latestDelivery = getLatestDelivery(work);
  const deadline = resolveDeadlineVisualState({
    effectiveDueAt: work.effectiveDueAt?.toISOString() ?? null,
    mode: work.deadlineMode,
    now: now.toISOString(),
  });
  const workflowExecution = work.activeCycle?.workflowExecution ?? null;
  const logisticsState = work.activeCycle?.logisticsState ?? null;
  const currentStage = workflowExecution?.currentStage ?? null;
  const progressCompleted = workflowExecution?.stages.filter((stage) => stage.status === "COMPLETED").length ?? 0;
  const progressTotal = workflowExecution?.stages.length ?? 0;

  return {
    claimStatus: work.claimStatus,
    createdAt: work.createdAt.toISOString(),
    clinic: {
      id: work.clinic.id,
      name: work.clinic.name,
    },
    currentCycle: work.activeCycle ? {
      id: work.activeCycle.id,
      label: `Cycle ${work.activeCycle.cycleNumber}`,
      number: work.activeCycle.cycleNumber,
      reason: work.activeCycle.reason,
      status: work.activeCycle.status,
    } : null,
    currentStageTechnician: currentStage?.assignedUser ? toPerson(currentStage.assignedUser) : null,
    deadline: {
      badge: deadline.badge,
      effectiveDueAt: work.effectiveDueAt?.toISOString() ?? null,
      state: deadline.state,
      tooltip: deadline.tooltip,
    },
    delivery: {
      code: latestDelivery?.code ?? null,
      plannedDate: latestDelivery?.plannedDate.toISOString() ?? null,
      status: latestDelivery?.status ?? null,
    },
    doctor: {
      id: work.doctor.id,
      name: work.doctor.displayName,
    },
    executionCompany: work.executionLegalEntity ? {
      code: work.executionLegalEntity.code,
      displayName: work.executionLegalEntity.displayName,
    } : null,
    id: work.id,
    logistics: {
      status: logisticsState?.status ?? null,
    },
    patient: {
      id: work.patient?.id ?? null,
      name: work.patientName,
      reference: work.patientReference,
    },
    priority: work.priority,
    updatedAt: work.updatedAt.toISOString(),
    workCode: work.code,
    workOwner: work.claimedBy ? toPerson(work.claimedBy) : work.assignedTechnician ? toPerson(work.assignedTechnician) : null,
    workflow: {
      currentStage: currentStage ? {
        key: currentStage.stageKeySnapshot,
        name: currentStage.stageNameSnapshot,
        status: currentStage.status,
      } : null,
      progress: progressTotal > 0 ? `${progressCompleted}/${progressTotal}` : null,
      progressCompleted,
      progressTotal,
      status: workflowExecution?.status ?? null,
    },
    workType: {
      id: work.workType.id,
      name: work.workType.name,
    },
  };
}

function getLatestDelivery(work: OperationalStatusWorkRecord) {
  return work.deliveryPreparationItems
    .flatMap((item) => item.group.deliveries)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
}

function toPerson(user: { readonly displayName: string; readonly id: string }): OperationalStatusPersonView {
  return {
    displayName: user.displayName,
    publicId: user.id,
  };
}

function getSortValue(row: OperationalStatusRowView, sortBy: OperationalStatusSortField): Date | number | string | null {
  if (sortBy === "effectiveDueAt") {
    return row.deadline.effectiveDueAt ? new Date(row.deadline.effectiveDueAt) : null;
  }
  if (sortBy === "priority") {
    return row.priority === "URGENT" ? 0 : 1;
  }
  if (sortBy === "createdAt" || sortBy === "updatedAt") {
    return new Date(row[sortBy]);
  }
  if (sortBy === "workCode") {
    return row.workCode;
  }
  if (sortBy === "clinicName") {
    return row.clinic.name;
  }
  return row.patient.name;
}

function compareValues(left: Date | number | string | null, right: Date | number | string | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "ro");
}

export function matchesDeadlineState(row: OperationalStatusRowView, deadlineState: DeadlineVisualState | undefined): boolean {
  return deadlineState === undefined || row.deadline.state === deadlineState;
}
