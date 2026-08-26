import { DeliveryStatus } from "@prisma/client";
import type { Prisma, WorkStageExecutionStatus, WorkStatus, WorkWorkflowExecutionStatus } from "@prisma/client";
import type { LogisticsActionReason } from "@dental-lab/shared";

type LogisticsStatus = "RECEIVED" | "IN_PRODUCTION" | "BLOCKED" | "HANDED_TO_DELIVERY" | "DELIVERED";
type LogisticsLocationCode = "RECEPTIE" | "PRODUCTIE" | "RAFT_FINISARE" | "ZONA_AMBALARE" | "GATA_LIVRARE";
type LogisticsBlockReasonCode = "MISSING_INFO" | "DOCTOR_CONFIRMATION" | "MISSING_COMPONENTS" | "TECHNICAL_ISSUE" | "DEADLINE_CLARIFICATION" | "OTHER";
type LogisticsDueState = "ON_TRACK" | "DUE_SOON" | "OVERDUE";
type LogisticsMarker = "MARKER_1" | "MARKER_2" | "MARKER_3" | "MARKER_4" | "MARKER_5";

export interface LogisticsActionAvailability {
  readonly block: boolean;
  readonly manageGroups: boolean;
  readonly unblock: boolean;
  readonly updateLocation: boolean;
}

export interface LogisticsStateView {
  readonly blockedAt: string | null;
  readonly blockedReasonCode: LogisticsBlockReasonCode | null;
  readonly blockedReasonLabel: string | null;
  readonly blockedReasonNotes: string | null;
  readonly locationCode: LogisticsLocationCode | null;
  readonly locationLabel: string | null;
  readonly status: LogisticsStatus;
  readonly statusLabel: string;
  readonly version: number;
}

export interface LogisticsCenterItem {
  readonly actions: LogisticsActionAvailability;
  readonly billing: { readonly documentId: string | null; readonly documentNumber: string | null; readonly documentStatus: string | null; readonly label: string; readonly paymentStatus: string | null };
  readonly claimedAt: string | null;
  readonly clinic: { readonly address: string | null; readonly id: string; readonly name: string; readonly phone: string | null };
  readonly createdAt: string;
  readonly doctor: { readonly id: string; readonly name: string };
  readonly dueState: LogisticsDueState;
  readonly id: string;
  readonly logistics: LogisticsStateView;
  readonly logisticsMarker: LogisticsMarker | null;
  readonly logisticsNote: string | null;
  readonly operationalStatus: "RECEPTIE" | "IN_LUCRU" | "IN_ASTEPTARE" | "FINALIZATA";
  readonly technicalReadiness: "PROBE_READY" | "FINAL_READY" | null;
  readonly probeReadyAt: string | null;
  readonly probeReceivedAt: string | null;
  readonly finalizedAt: string | null;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly preparationGroup: DeliveryPreparationGroupSummary | null;
  readonly priority: "NORMAL" | "URGENT";
  readonly requestedDeliveryDate: string;
  readonly technician: { readonly name: string; readonly preferredColor: string | null } | null;
  readonly workCode: string;
  readonly workflow: { readonly assignedUserName: string | null; readonly completedAt: string | null; readonly currentStageName: string | null; readonly progressCompleted: number; readonly progressTotal: number; readonly status: string | null };
  readonly workTypeName: string;
  readonly requiresDelivery: boolean;
  readonly requiresPickup: boolean;
  readonly requiresLogisticsAction: boolean;
  readonly logisticsActionReasons: readonly LogisticsActionReason[];
}

export interface WorkLogisticsView extends LogisticsCenterItem {
  readonly events: readonly LogisticsEventView[];
  readonly formSnapshot: { readonly fields: readonly { readonly label: string; readonly value: string }[]; readonly templateName: string; readonly templateVersion: number } | null;
}

export interface DeliveryPreparationGroupSummary {
  readonly clinicId: string;
  readonly clinicName: string;
  readonly code: string;
  readonly id: string;
  readonly itemCount: number;
  readonly notes: string | null;
  readonly plannedDate: string | null;
  readonly status: "DRAFT" | "READY" | "CANCELLED";
  readonly version: number;
  readonly delivery: { readonly code: string; readonly courierName: string | null; readonly id: string; readonly status: string; readonly statusLabel: string } | null;
}

export interface DeliveryPreparationGroupDetail extends DeliveryPreparationGroupSummary {
  readonly items: readonly { readonly addedAt: string; readonly id: string; readonly work: LogisticsCenterItem }[];
}

export interface LogisticsCenterSummary {
  readonly all: number;
  readonly blocked: number;
  readonly inProduction: number;
  readonly overdue: number;
  readonly receivedToday: number;
  readonly toDeliver: number;
  readonly toPickup: number;
  readonly unassigned: number;
  readonly urgent: number;
  readonly waiting: number;
}

interface WorkFormSnapshotField {
  readonly key: string;
  readonly label: string;
  readonly type: string;
}

interface LogisticsEventView {
  readonly actorName: string | null;
  readonly id: string;
  readonly occurredAt: string;
  readonly summary: string;
  readonly type: string;
}

const LOGISTICS_STATUS_LABELS = {
  BLOCKED: "Blocată",
  DELIVERED: "Livrată",
  HANDED_TO_DELIVERY: "Predată spre livrare",
  IN_PRODUCTION: "În producție",
  RECEIVED: "Recepționată",
} as const satisfies Record<LogisticsStatus, string>;

const LOGISTICS_LOCATION_LABELS = {
  GATA_LIVRARE: "Gata livrare",
  PRODUCTIE: "Producție",
  RAFT_FINISARE: "Raft finisare",
  RECEPTIE: "Recepție",
  ZONA_AMBALARE: "Zonă ambalare",
} as const satisfies Record<LogisticsLocationCode, string>;

const LOGISTICS_BLOCK_REASON_LABELS = {
  DEADLINE_CLARIFICATION: "Clarificare termen",
  DOCTOR_CONFIRMATION: "Confirmare medic",
  MISSING_COMPONENTS: "Componente lipsă",
  MISSING_INFO: "Informații lipsă",
  OTHER: "Alt motiv",
  TECHNICAL_ISSUE: "Problemă tehnică",
} as const satisfies Record<LogisticsBlockReasonCode, string>;

export const logisticsWorkInclude = {
  billingLines: {
    include: {
      billingDocument: {
        include: {
          payments: true,
        },
      },
    },
  },
  clinic: {
    select: {
      addressLine1: true,
      addressLine2: true,
      city: true,
      id: true,
      name: true,
      phone: true,
      postalCode: true,
    },
  },
  claimedBy: {
    select: {
      displayName: true,
      preferredColor: true,
    },
  },
  deliveryPreparationItems: {
    include: {
      group: {
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            where: {
              isActive: true,
            },
          },
          deliveries: {
            include: {
              courier: {
                select: {
                  displayName: true,
                },
              },
            },
            where: {
              isActive: true,
              status: { in: [DeliveryStatus.PLANNED, DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT] },
            },
          },
        },
      },
    },
    where: {
      isActive: true,
    },
  },
  courierRouteStops: {
    orderBy: { outcomeAt: "desc" },
    where: {
      outcomeStatus: "DELIVERED",
      type: "DELIVERY",
    },
    take: 1,
  },
  doctor: {
    select: {
      displayName: true,
      id: true,
    },
  },
  activeCycle: {
    include: {
      logisticsEvents: {
        include: {
          actor: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: 50,
      },
      logisticsState: true,
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
            include: {
              assignedUser: {
                select: {
                  displayName: true,
                  id: true,
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  },
  workFormSubmissions: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    where: {
      templateKind: "GENERIC",
    },
  },
  workType: {
    select: {
      name: true,
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

export const deliveryPreparationGroupInclude = {
  clinic: {
    select: {
      id: true,
      name: true,
    },
  },
  deliveries: {
    include: {
      courier: {
        select: {
          displayName: true,
        },
      },
    },
    where: {
      isActive: true,
      status: { in: [DeliveryStatus.PLANNED, DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT] },
    },
  },
  items: {
    include: {
      workOrder: {
        include: logisticsWorkInclude,
      },
    },
    orderBy: {
      addedAt: "asc",
    },
    where: {
      isActive: true,
    },
  },
} as const satisfies Prisma.DeliveryPreparationGroupInclude;

export type LogisticsWorkRecord = Prisma.WorkOrderGetPayload<{ include: typeof logisticsWorkInclude }>;
export type DeliveryPreparationGroupRecord = Prisma.DeliveryPreparationGroupGetPayload<{ include: typeof deliveryPreparationGroupInclude }>;

export interface ActionContext {
  readonly canBlock: boolean;
  readonly canManageGroups: boolean;
  readonly canUnblock: boolean;
  readonly canUpdateLocation: boolean;
}

export function toLogisticsCenterItem(work: LogisticsWorkRecord, actionContext: ActionContext, now: Date): LogisticsCenterItem {
  const logistics = toLogisticsStateView(work);
  const activeGroup = work.deliveryPreparationItems[0]?.group ?? null;
  const activeDelivery = activeGroup?.deliveries[0] ?? null;
  const logisticsActionReasons: LogisticsActionReason[] = [];
  if (work.status === "REGISTERED" && work.technicalReadiness === null && !activeDelivery) logisticsActionReasons.push("NEW_WORK");
  const latestDeliveredStop = work.courierRouteStops[0] ?? null;
  const readinessAt = work.technicalReadiness === "FINAL_READY" ? work.finalizedAt : work.probeReadyAt;
  // The logistics state belongs to the whole work order, while readiness is
  // updated for every probe/finalization cycle. A stale DELIVERED state from a
  // previous route must not hide a newly ready probe. Only a delivered stop
  // after the current readiness event closes the current delivery action.
  const isAlreadyDelivered = Boolean(latestDeliveredStop?.outcomeAt && readinessAt && latestDeliveredStop.outcomeAt >= readinessAt)
    || (!readinessAt && work.activeCycle?.logisticsState?.status === "DELIVERED");
  if (work.technicalReadiness === "PROBE_READY" && !activeDelivery && !isAlreadyDelivered) logisticsActionReasons.push("READY_FOR_PROBE_DELIVERY");
  if (work.technicalReadiness === "FINAL_READY" && !activeDelivery && !isAlreadyDelivered) logisticsActionReasons.push("READY_FOR_FINAL_DELIVERY");
  if (work.requiresDelivery) logisticsActionReasons.push("FAILED_DELIVERY");
  if (work.requiresPickup) logisticsActionReasons.push("PICKUP_REQUIRED");

  return {
    actions: toActions(logistics.status, actionContext, activeGroup !== null),
    billing: toBillingSummary(work),
    claimedAt: work.claimedAt?.toISOString() ?? null,
    clinic: work.clinic
      ? { address: [work.clinic.addressLine1, work.clinic.addressLine2, work.clinic.postalCode, work.clinic.city].filter(Boolean).join(", ") || null, id: work.clinic.id, name: work.clinic.name, phone: work.clinic.phone }
      : { address: null, id: "", name: "-", phone: null },
    createdAt: work.createdAt.toISOString(),
    doctor: work.doctor
      ? {
          id: work.doctor.id,
          name: work.doctor.displayName,
        }
      : { id: "", name: "-" },
    dueState: deriveLogisticsDueState({ now, requestedDeliveryDate: work.requestedDeliveryDate }),
    id: work.id,
    logistics,
    logisticsMarker: work.logisticsMarker,
    logisticsNote: work.logisticsNote,
    operationalStatus: work.status === "REGISTERED" ? "RECEPTIE" : work.status,
    technicalReadiness: work.technicalReadiness,
    probeReadyAt: work.probeReadyAt?.toISOString() ?? null,
    probeReceivedAt: work.probeReceivedAt?.toISOString() ?? null,
    finalizedAt: work.finalizedAt?.toISOString() ?? null,
    patientName: work.patientName,
    patientReference: work.patientReference,
    technician: work.claimedBy ? { name: work.claimedBy.displayName, preferredColor: work.claimedBy.preferredColor } : null,
    preparationGroup: activeGroup ? toDeliveryPreparationGroupSummary(activeGroup) : null,
    priority: work.priority,
    requestedDeliveryDate: work.requestedDeliveryDate.toISOString(),
    workCode: work.code,
    workflow: toWorkflowSummary(work),
    workTypeName: work.workType.name,
    requiresDelivery: work.requiresDelivery,
    requiresPickup: work.requiresPickup,
    requiresLogisticsAction: logisticsActionReasons.length > 0,
    logisticsActionReasons,
  };
}

export function toWorkLogisticsView(work: LogisticsWorkRecord, actionContext: ActionContext, now: Date): WorkLogisticsView {
  return {
    ...toLogisticsCenterItem(work, actionContext, now),
    events: (work.activeCycle?.logisticsEvents ?? []).map(toLogisticsEventView),
    formSnapshot: toFormSnapshot(work.workFormSubmissions[0] ?? null),
  };
}

export function toDeliveryPreparationGroupSummary(group: {
  readonly clinic: { readonly id: string; readonly name: string };
  readonly code: string;
  readonly id: string;
  readonly items: readonly unknown[];
  readonly notes: string | null;
  readonly plannedDate: Date | null;
  readonly status: string;
  readonly version: number;
  readonly deliveries?: readonly { readonly code: string; readonly courier?: { readonly displayName: string } | null; readonly id: string; readonly status: string }[];
}): DeliveryPreparationGroupSummary {
  const delivery = group.deliveries?.[0] ?? null;
  return {
    clinicId: group.clinic.id,
    clinicName: group.clinic.name,
    code: group.code,
    delivery: delivery ? {
      code: delivery.code,
      courierName: delivery.courier?.displayName ?? null,
      id: delivery.id,
      status: delivery.status,
      statusLabel: deliveryStatusLabel(delivery.status),
    } : null,
    id: group.id,
    itemCount: group.items.length,
    notes: group.notes,
    plannedDate: group.plannedDate?.toISOString() ?? null,
    status: group.status as DeliveryPreparationGroupSummary["status"],
    version: group.version,
  };
}

function deliveryStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ASSIGNED: "Atribuită",
    CANCELLED: "Anulată",
    DELIVERED: "Finalizată",
    FAILED: "Nereușită",
    IN_TRANSIT: "În tranzit",
    PICKED_UP: "Preluată",
    PLANNED: "Planificată",
  };
  return labels[status] ?? status;
}

export function toDeliveryPreparationGroupDetail(
  group: DeliveryPreparationGroupRecord,
  actionContext: ActionContext,
  now: Date,
): DeliveryPreparationGroupDetail {
  return {
    ...toDeliveryPreparationGroupSummary(group),
    items: group.items.map((item) => ({
      addedAt: item.addedAt.toISOString(),
      id: item.id,
      work: toLogisticsCenterItem(item.workOrder, actionContext, now),
    })),
  };
}

export function createLogisticsSummary(items: readonly LogisticsCenterItem[], toPickup = 0): LogisticsCenterSummary {
  return {
    all: items.length,
    blocked: items.filter((item) => item.logistics.status === "BLOCKED").length,
    inProduction: items.filter((item) => item.logistics.status === "IN_PRODUCTION").length,
    overdue: items.filter((item) => item.dueState === "OVERDUE").length,
    receivedToday: items.filter((item) => isSameUtcDay(new Date(item.createdAt), new Date())).length,
    toDeliver: items.filter((item) => item.requiresLogisticsAction && (item.technicalReadiness === "PROBE_READY" || item.technicalReadiness === "FINAL_READY")).length,
    toPickup,
    unassigned: items.filter((item) => item.workflow.status === "ACTIVE" && item.workflow.assignedUserName === null).length,
    urgent: items.filter((item) => item.priority === "URGENT").length,
    waiting: items.filter((item) => item.operationalStatus === "IN_ASTEPTARE").length,
  };
}

function toLogisticsStateView(work: LogisticsWorkRecord): LogisticsStateView {
  const state = work.activeCycle?.logisticsState ?? null;
  const status = resolveEffectiveLogisticsStatus(work.status, state?.status ?? null, work.activeCycle?.workflowExecution?.status ?? null);
  const blockedReasonCode = state?.blockedReasonCode ?? null;
  const locationCode = state?.physicalLocationCode ?? null;

  return {
    blockedAt: state?.blockedAt?.toISOString() ?? null,
    blockedReasonCode,
    blockedReasonLabel: blockedReasonCode ? LOGISTICS_BLOCK_REASON_LABELS[blockedReasonCode] : null,
    blockedReasonNotes: state?.blockedReasonNotes ?? null,
    locationCode,
    locationLabel: locationCode ? LOGISTICS_LOCATION_LABELS[locationCode] : null,
    status,
    statusLabel: LOGISTICS_STATUS_LABELS[status],
    version: state?.version ?? 1,
  };
}

function deriveInitialStatus(workflowStatus: WorkWorkflowExecutionStatus | null): LogisticsStateView["status"] {
  return workflowStatus === "ACTIVE" ? "IN_PRODUCTION" : "RECEIVED";
}

export function resolveEffectiveLogisticsStatus(
  workStatus: WorkStatus,
  persistedStatus: (LogisticsStateView["status"] | "READY_FOR_PACKING" | "PACKING" | "READY_FOR_DELIVERY") | null,
  workflowStatus: WorkWorkflowExecutionStatus | null,
): LogisticsStateView["status"] {
  if (persistedStatus === "READY_FOR_PACKING" || persistedStatus === "PACKING" || persistedStatus === "READY_FOR_DELIVERY") {
    return workStatus === "FINALIZATA" ? "RECEIVED" : "IN_PRODUCTION";
  }
  return persistedStatus ?? deriveInitialStatus(workflowStatus);
}

function toActions(status: LogisticsStateView["status"], context: ActionContext, hasActiveGroup: boolean): LogisticsActionAvailability {
  const actions = createDefaultLogisticsActions();
  return {
    ...actions,
    block: context.canBlock && status !== "BLOCKED" && status !== "HANDED_TO_DELIVERY" && status !== "DELIVERED",
    manageGroups: context.canManageGroups && !hasActiveGroup,
    unblock: context.canUnblock && status === "BLOCKED",
    updateLocation: context.canUpdateLocation,
  };
}

function createDefaultLogisticsActions(): LogisticsActionAvailability {
  return {
    block: false,
    manageGroups: false,
    unblock: false,
    updateLocation: false,
  };
}

function toWorkflowSummary(work: LogisticsWorkRecord): LogisticsCenterItem["workflow"] {
  const execution = work.activeCycle?.workflowExecution ?? null;
  if (!execution) {
    return {
      assignedUserName: null,
      completedAt: work.status === "FINALIZATA" ? work.completedAt?.toISOString() ?? null : null,
      currentStageName: null,
      progressCompleted: 0,
      progressTotal: 0,
      status: work.status === "FINALIZATA" ? "COMPLETED" : null,
    };
  }
  const completed = execution.stages.filter((stage) => stage.status === ("COMPLETED" satisfies WorkStageExecutionStatus)).length;
  const isFinalized = work.status === "FINALIZATA";

  return {
    assignedUserName: execution.currentStage?.assignedUser?.displayName ?? null,
    completedAt: isFinalized ? work.completedAt?.toISOString() ?? execution.completedAt?.toISOString() ?? null : execution.completedAt?.toISOString() ?? null,
    currentStageName: execution.currentStage?.stageNameSnapshot ?? null,
    progressCompleted: isFinalized ? execution.stages.length : completed,
    progressTotal: execution.stages.length,
    status: isFinalized ? "COMPLETED" : execution.status,
  };
}

function toBillingSummary(work: LogisticsWorkRecord): LogisticsCenterItem["billing"] {
  const document = work.billingLines
    .map((line) => line.billingDocument)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
  if (!document) {
    return {
      documentId: null,
      documentNumber: null,
      documentStatus: null,
      label: "Nefacturată",
      paymentStatus: null,
    };
  }
  const paidMinor = document.payments.filter((payment) => payment.cancelledAt === null).reduce((total, payment) => total + payment.amountMinor, 0);
  const paymentStatus = paidMinor === 0 ? "UNPAID" : paidMinor >= document.totalMinor ? "PAID" : "PARTIALLY_PAID";
  const label = document.status === "CANCELLED"
    ? "Factură anulată"
    : document.type === "PROFORMA"
      ? "În proformă"
      : "Facturată";

  return {
    documentId: document.id,
    documentNumber: document.formattedNumber,
    documentStatus: document.status,
    label,
    paymentStatus,
  };
}

function toLogisticsEventView(event: NonNullable<LogisticsWorkRecord["activeCycle"]>["logisticsEvents"][number]): LogisticsEventView {
  return {
    actorName: event.actor?.displayName ?? null,
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    summary: event.type.replaceAll("_", " ").toLowerCase(),
    type: event.type,
  };
}

function toFormSnapshot(submission: LogisticsWorkRecord["workFormSubmissions"][number] | null): WorkLogisticsView["formSnapshot"] {
  if (!submission) {
    return null;
  }
  const schema = submission.schemaSnapshot as { readonly fields?: readonly WorkFormSnapshotField[] };
  const values = submission.values as Record<string, boolean | number | readonly string[] | string | null>;

  return {
    fields: (schema.fields ?? []).map((field) => ({
      label: field.label,
      value: formatWorkFormValue(field, values[field.key] ?? null),
    })),
    templateName: submission.templateNameSnapshot,
    templateVersion: submission.templateVersion,
  };
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function deriveLogisticsDueState(input: { readonly now: Date; readonly requestedDeliveryDate: Date }): LogisticsDueState {
  const msUntilDue = input.requestedDeliveryDate.getTime() - input.now.getTime();
  if (msUntilDue < 0) {
    return "OVERDUE";
  }
  return msUntilDue <= 24 * 60 * 60 * 1000 ? "DUE_SOON" : "ON_TRACK";
}

function formatWorkFormValue(field: WorkFormSnapshotField, value: boolean | number | readonly string[] | string | null): string {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return "";
  }
  if (field.type === "CHECKBOX") {
    return value === true ? "Da" : "Nu";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}
