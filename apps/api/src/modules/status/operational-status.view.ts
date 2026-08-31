import {
  WorkFormTemplateKind,
  type DeliveryStatus,
  type Prisma,
  type WorkClaimStatus,
  type WorkLogisticsStatus,
  type WorkPriority,
  type WorkStageExecutionStatus,
  type WorkWorkflowExecutionStatus,
} from "@prisma/client";

import { resolveDeadlineVisualState, type DeadlineVisualState } from "../works/work-deadline-visual.js";
import { type OperationalStatusSortDirection, type OperationalStatusSortField, type OperationalStatusTab } from "./status.constants.js";

export const operationalStatusWorkInclude = {
  assignedTechnician: {
    select: {
      displayName: true,
      id: true,
      preferredColor: true,
    },
  },
  claimedBy: {
    select: {
      displayName: true,
      id: true,
      preferredColor: true,
    },
  },
  clinic: {
    include: {
      pickupRequests: {
        select: {
          id: true,
        },
        where: {
          routeStops: {
            some: {
              outcomeStatus: "PICKED_UP",
            },
          },
        },
      },
    },
  },
  courierRouteStops: {
    orderBy: {
      outcomeAt: "desc",
    },
    select: {
      outcomeAt: true,
      outcomeStatus: true,
      type: true,
    },
    take: 1,
    where: {
      outcomeStatus: "PICKED_UP",
      type: "PICKUP",
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
      workFormSubmissions: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          finalizedAt: true,
          realLabSheetStatus: true,
          updatedAt: true,
        },
        take: 1,
        where: {
          templateKind: WorkFormTemplateKind.REAL_LAB_SHEET,
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
                preferredColor: true,
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
  items: {
    include: {
      teeth: {
        orderBy: [{ sortOrder: "asc" }, { fdiTooth: "asc" }],
      },
      workType: {
        select: {
          colorHex: true,
          id: true,
          name: true,
          symbol: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    where: { archivedAt: null },
  },
  workType: {
    select: {
      id: true,
      name: true,
      symbol: true,
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

export type OperationalStatusWorkRecord = Prisma.WorkOrderGetPayload<{ include: typeof operationalStatusWorkInclude }>;

export interface OperationalStatusPersonView {
  readonly displayName: string;
  readonly publicId: string;
  readonly preferredColor: string | null;
}

export interface OperationalStatusRowView {
  readonly claimedAt: string | null;
  readonly claimStatus: WorkClaimStatus;
  readonly createdAt: string;
  readonly clinic: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly currentCycle: {
    readonly code: string;
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
  } | null;
  readonly executionCompany: {
    readonly code: string;
    readonly displayName: string;
  } | null;
  readonly id: string;
  readonly logistics: {
    readonly status: WorkLogisticsStatus | null;
  };
  readonly requiresDelivery: boolean;
  readonly requiresPickup: boolean;
  readonly hasCompletedPickup: boolean;
  readonly components: readonly {
    readonly colorHex: string | null;
    readonly name: string;
    readonly symbol: string;
    readonly teeth: readonly number[];
  }[];
  readonly operationalStatus: "RECEPTIE" | "IN_LUCRU" | "IN_ASTEPTARE" | "FINALIZATA";
  readonly technicalReadiness: "PROBE_READY" | "FINAL_READY" | null;
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
    readonly status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "FINALIZED";
  };
  readonly updatedAt: string;
  readonly shade: string | null;
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
    readonly symbol: string;
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
    return row.operationalStatus !== "FINALIZATA"
      && (row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED");
  }
  if (tab === "AVAILABLE") {
    return row.operationalStatus !== "FINALIZATA"
      && row.claimStatus === "UNCLAIMED"
      && row.delivery.status !== "DELIVERED"
      && row.logistics.status !== "DELIVERED";
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
    // A probe-ready cycle is still on its way to the clinic/logistics. It is a
    // real return only after reception has opened the next cycle for it.
    return row.currentCycle !== null && row.currentCycle.number > 1;
  }
  return row.operationalStatus === "FINALIZATA"
    || row.workflow.status === "COMPLETED"
    || row.hasCompletedPickup
    || row.delivery.status === "PICKED_UP"
    || row.logistics.status === "DELIVERED"
    || row.delivery.status === "DELIVERED";
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
  const realLabSheet = toRealLabSheetSummary(work.activeCycle);
  const currentStage = workflowExecution?.currentStage ?? null;
  const progressCompleted = workflowExecution?.stages.filter((stage) => stage.status === "COMPLETED").length ?? 0;
  const progressTotal = workflowExecution?.stages.length ?? 0;

  return {
    claimedAt: work.claimedAt?.toISOString() ?? null,
    claimStatus: work.claimStatus,
    createdAt: work.createdAt.toISOString(),
    clinic: work.clinic
      ? {
          id: work.clinic.id,
          name: work.clinic.name,
        }
      : null,
    components: (work.items ?? []).map((item) => ({
      colorHex: item.workType?.colorHex ?? null,
      name: item.workType?.name ?? "Tip personalizat",
      symbol: item.workType?.symbol ?? "CUSTOM",
      teeth: item.teeth.map((tooth) => tooth.fdiTooth),
    })),
    currentCycle: work.activeCycle ? {
      code: `CYCLE_${work.activeCycle.cycleNumber}`,
      id: work.activeCycle.id,
      label: `Ciclul ${work.activeCycle.cycleNumber}`,
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
    doctor: work.doctor
      ? {
          id: work.doctor.id,
          name: work.doctor.displayName,
        }
      : null,
    executionCompany: work.executionLegalEntity ? {
      code: work.executionLegalEntity.code,
      displayName: work.executionLegalEntity.displayName,
    } : null,
    id: work.id,
    logistics: {
      status: logisticsState?.status ?? null,
    },
    requiresDelivery: work.requiresDelivery,
    requiresPickup: work.requiresPickup,
    hasCompletedPickup: work.courierRouteStops.length > 0 || (work.clinic?.pickupRequests.length ?? 0) > 0,
    operationalStatus: work.status === "REGISTERED" ? "RECEPTIE" : work.status,
    patient: {
      id: work.patient?.id ?? null,
      name: work.patientName,
      reference: work.patientReference,
    },
    priority: work.priority,
    realLabSheet,
    shade: work.shade,
    technicalReadiness: work.technicalReadiness,
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
      symbol: work.workType.symbol,
    },
  };
}

function toRealLabSheetSummary(cycle: OperationalStatusWorkRecord["activeCycle"]): OperationalStatusRowView["realLabSheet"] {
  const submission = cycle?.workFormSubmissions[0] ?? null;
  const status = submission?.finalizedAt ? "FINALIZED" : submission?.realLabSheetStatus ?? "NOT_STARTED";
  const labels = {
    COMPLETE: "Completă",
    FINALIZED: "Finalizată",
    IN_PROGRESS: "În lucru",
    NOT_STARTED: "Necompletată",
  } as const;

  return {
    cycleNumber: cycle?.cycleNumber ?? null,
    finalizedAt: submission?.finalizedAt?.toISOString() ?? null,
    label: labels[status],
    lastModifiedAt: submission?.updatedAt.toISOString() ?? null,
    status,
  };
}

function getLatestDelivery(work: OperationalStatusWorkRecord) {
  return work.deliveryPreparationItems
    .flatMap((item) => item.group.deliveries)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
}

function toPerson(user: { readonly displayName: string; readonly id: string; readonly preferredColor: string | null }): OperationalStatusPersonView {
  return {
    displayName: user.displayName,
    preferredColor: user.preferredColor,
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
    return row.clinic?.name ?? "";
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
