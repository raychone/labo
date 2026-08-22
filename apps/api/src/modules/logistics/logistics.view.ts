import type { Prisma, WorkStageExecutionStatus, WorkStatus, WorkWorkflowExecutionStatus } from "@prisma/client";

type LogisticsStatus = "RECEIVED" | "IN_PRODUCTION" | "BLOCKED" | "READY_FOR_PACKING" | "PACKING" | "READY_FOR_DELIVERY" | "HANDED_TO_DELIVERY" | "DELIVERED";
type LogisticsLocationCode = "RECEPTIE" | "PRODUCTIE" | "RAFT_FINISARE" | "ZONA_AMBALARE" | "GATA_LIVRARE";
type LogisticsBlockReasonCode = "MISSING_INFO" | "DOCTOR_CONFIRMATION" | "MISSING_COMPONENTS" | "TECHNICAL_ISSUE" | "DEADLINE_CLARIFICATION" | "OTHER";
type LogisticsDueState = "ON_TRACK" | "DUE_SOON" | "OVERDUE";
type LogisticsMarker = "MARKER_1" | "MARKER_2" | "MARKER_3" | "MARKER_4" | "MARKER_5";

export interface LogisticsActionAvailability {
  readonly block: boolean;
  readonly completePacking: boolean;
  readonly manageGroups: boolean;
  readonly readyForPacking: boolean;
  readonly startPacking: boolean;
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
  readonly packingStartedAt: string | null;
  readonly readyForDeliveryAt: string | null;
  readonly readyForPackingAt: string | null;
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
  readonly inPacking: number;
  readonly overdue: number;
  readonly readyForDelivery: number;
  readonly readyForDeliveryUnbilled: number;
  readonly readyForPacking: number;
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
  PACKING: "În ambalare",
  READY_FOR_DELIVERY: "Gata de livrare",
  READY_FOR_PACKING: "De ambalat",
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
            },
          },
        },
      },
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
  readonly canPrepare: boolean;
  readonly canUnblock: boolean;
  readonly canUpdateLocation: boolean;
}

export function toLogisticsCenterItem(work: LogisticsWorkRecord, actionContext: ActionContext, now: Date): LogisticsCenterItem {
  const logistics = toLogisticsStateView(work);
  const activeGroup = work.deliveryPreparationItems[0]?.group ?? null;

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
    inPacking: items.filter((item) => item.logistics.status === "PACKING").length,
    inProduction: items.filter((item) => item.logistics.status === "IN_PRODUCTION").length,
    overdue: items.filter((item) => item.dueState === "OVERDUE").length,
    readyForDelivery: items.filter((item) => item.logistics.status === "READY_FOR_DELIVERY").length,
    readyForDeliveryUnbilled: items.filter((item) => item.logistics.status === "READY_FOR_DELIVERY" && item.billing.documentId === null).length,
    readyForPacking: items.filter((item) => item.logistics.status === "READY_FOR_PACKING").length,
    receivedToday: items.filter((item) => isSameUtcDay(new Date(item.createdAt), new Date())).length,
    toDeliver: items.filter((item) => item.logistics.status === "READY_FOR_DELIVERY").length,
    toPickup,
    unassigned: items.filter((item) => item.workflow.status === "ACTIVE" && item.workflow.assignedUserName === null).length,
    urgent: items.filter((item) => item.priority === "URGENT").length,
    waiting: items.filter((item) => item.logistics.status === "BLOCKED").length,
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
    packingStartedAt: state?.packingStartedAt?.toISOString() ?? null,
    readyForDeliveryAt: state?.readyForDeliveryAt?.toISOString() ?? null,
    readyForPackingAt: state?.readyForPackingAt?.toISOString() ?? null,
    status,
    statusLabel: LOGISTICS_STATUS_LABELS[status],
    version: state?.version ?? 1,
  };
}

function deriveInitialStatus(workStatus: WorkStatus, workflowStatus: WorkWorkflowExecutionStatus | null): LogisticsStateView["status"] {
  if (workStatus === "FINALIZATA") {
    return "READY_FOR_PACKING";
  }
  return workflowStatus === "ACTIVE" ? "IN_PRODUCTION" : "RECEIVED";
}

export function resolveEffectiveLogisticsStatus(
  workStatus: WorkStatus,
  persistedStatus: LogisticsStateView["status"] | null,
  workflowStatus: WorkWorkflowExecutionStatus | null,
): LogisticsStateView["status"] {
  if (workStatus === "FINALIZATA" && (persistedStatus === null || persistedStatus === "RECEIVED" || persistedStatus === "IN_PRODUCTION")) {
    return "READY_FOR_PACKING";
  }
  return persistedStatus ?? deriveInitialStatus(workStatus, workflowStatus);
}

function toActions(status: LogisticsStateView["status"], context: ActionContext, hasActiveGroup: boolean): LogisticsActionAvailability {
  const actions = createDefaultLogisticsActions();
  return {
    ...actions,
    block: context.canBlock && status !== "BLOCKED" && status !== "READY_FOR_DELIVERY",
    completePacking: context.canPrepare && status === "PACKING",
    manageGroups: context.canManageGroups && status === "READY_FOR_DELIVERY" && !hasActiveGroup,
    readyForPacking: context.canPrepare && (status === "IN_PRODUCTION" || status === "RECEIVED"),
    startPacking: context.canPrepare && status === "READY_FOR_PACKING",
    unblock: context.canUnblock && status === "BLOCKED",
    updateLocation: context.canUpdateLocation,
  };
}

function createDefaultLogisticsActions(): LogisticsActionAvailability {
  return {
    block: false,
    completePacking: false,
    manageGroups: false,
    readyForPacking: false,
    startPacking: false,
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
