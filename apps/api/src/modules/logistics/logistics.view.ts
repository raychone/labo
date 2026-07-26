import type { Prisma, WorkStageExecutionStatus, WorkWorkflowExecutionStatus } from "@prisma/client";

type LogisticsStatus = "RECEIVED" | "IN_PRODUCTION" | "BLOCKED" | "READY_FOR_PACKING" | "PACKING" | "READY_FOR_DELIVERY" | "HANDED_TO_DELIVERY" | "DELIVERED";
type LogisticsLocationCode = "RECEPTIE" | "PRODUCTIE" | "RAFT_FINISARE" | "ZONA_AMBALARE" | "GATA_LIVRARE";
type LogisticsBlockReasonCode = "MISSING_INFO" | "DOCTOR_CONFIRMATION" | "MISSING_COMPONENTS" | "TECHNICAL_ISSUE" | "DEADLINE_CLARIFICATION" | "OTHER";
type LogisticsDueState = "ON_TRACK" | "DUE_SOON" | "OVERDUE";

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
  readonly clinic: { readonly id: string; readonly name: string };
  readonly createdAt: string;
  readonly doctor: { readonly id: string; readonly name: string };
  readonly dueState: LogisticsDueState;
  readonly id: string;
  readonly logistics: LogisticsStateView;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly preparationGroup: DeliveryPreparationGroupSummary | null;
  readonly priority: "NORMAL" | "URGENT";
  readonly requestedDeliveryDate: string;
  readonly workCode: string;
  readonly workflow: { readonly assignedUserName: string | null; readonly completedAt: string | null; readonly currentStageName: string | null; readonly progressCompleted: number; readonly progressTotal: number; readonly status: string | null };
  readonly workTypeName: string;
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
}

export interface DeliveryPreparationGroupDetail extends DeliveryPreparationGroupSummary {
  readonly items: readonly { readonly addedAt: string; readonly id: string; readonly work: LogisticsCenterItem }[];
}

export interface LogisticsCenterSummary {
  readonly blocked: number;
  readonly inProduction: number;
  readonly inPacking: number;
  readonly overdue: number;
  readonly readyForDelivery: number;
  readonly readyForDeliveryUnbilled: number;
  readonly readyForPacking: number;
  readonly receivedToday: number;
  readonly unassigned: number;
  readonly urgent: number;
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
      id: true,
      name: true,
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
  workFormSubmission: true,
  workType: {
    select: {
      name: true,
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
} as const satisfies Prisma.WorkOrderInclude;

export const deliveryPreparationGroupInclude = {
  clinic: {
    select: {
      id: true,
      name: true,
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
    clinic: work.clinic,
    createdAt: work.createdAt.toISOString(),
    doctor: {
      id: work.doctor.id,
      name: work.doctor.displayName,
    },
    dueState: deriveLogisticsDueState({ now, requestedDeliveryDate: work.requestedDeliveryDate }),
    id: work.id,
    logistics,
    patientName: work.patientName,
    patientReference: work.patientReference,
    preparationGroup: activeGroup ? toDeliveryPreparationGroupSummary(activeGroup) : null,
    priority: work.priority,
    requestedDeliveryDate: work.requestedDeliveryDate.toISOString(),
    workCode: work.code,
    workflow: toWorkflowSummary(work),
    workTypeName: work.workType.name,
  };
}

export function toWorkLogisticsView(work: LogisticsWorkRecord, actionContext: ActionContext, now: Date): WorkLogisticsView {
  return {
    ...toLogisticsCenterItem(work, actionContext, now),
    events: work.logisticsEvents.map(toLogisticsEventView),
    formSnapshot: toFormSnapshot(work.workFormSubmission),
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
}): DeliveryPreparationGroupSummary {
  return {
    clinicId: group.clinic.id,
    clinicName: group.clinic.name,
    code: group.code,
    id: group.id,
    itemCount: group.items.length,
    notes: group.notes,
    plannedDate: group.plannedDate?.toISOString() ?? null,
    status: group.status as DeliveryPreparationGroupSummary["status"],
    version: group.version,
  };
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

export function createLogisticsSummary(items: readonly LogisticsCenterItem[]): LogisticsCenterSummary {
  return {
    blocked: items.filter((item) => item.logistics.status === "BLOCKED").length,
    inPacking: items.filter((item) => item.logistics.status === "PACKING").length,
    inProduction: items.filter((item) => item.logistics.status === "IN_PRODUCTION").length,
    overdue: items.filter((item) => item.dueState === "OVERDUE").length,
    readyForDelivery: items.filter((item) => item.logistics.status === "READY_FOR_DELIVERY").length,
    readyForDeliveryUnbilled: items.filter((item) => item.logistics.status === "READY_FOR_DELIVERY" && item.billing.documentId === null).length,
    readyForPacking: items.filter((item) => item.logistics.status === "READY_FOR_PACKING").length,
    receivedToday: items.filter((item) => isSameUtcDay(new Date(item.createdAt), new Date())).length,
    unassigned: items.filter((item) => item.workflow.status === "ACTIVE" && item.workflow.assignedUserName === null).length,
    urgent: items.filter((item) => item.priority === "URGENT").length,
  };
}

function toLogisticsStateView(work: LogisticsWorkRecord): LogisticsStateView {
  const state = work.logisticsState;
  const status = state?.status ?? deriveInitialStatus(work.workflowExecution?.status ?? null);
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

function deriveInitialStatus(workflowStatus: WorkWorkflowExecutionStatus | null): LogisticsStateView["status"] {
  return workflowStatus === "ACTIVE" ? "IN_PRODUCTION" : "RECEIVED";
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
  const execution = work.workflowExecution;
  if (!execution) {
    return {
      assignedUserName: null,
      completedAt: null,
      currentStageName: null,
      progressCompleted: 0,
      progressTotal: 0,
      status: null,
    };
  }
  const completed = execution.stages.filter((stage) => stage.status === ("COMPLETED" satisfies WorkStageExecutionStatus)).length;

  return {
    assignedUserName: execution.currentStage?.assignedUser?.displayName ?? null,
    completedAt: execution.completedAt?.toISOString() ?? null,
    currentStageName: execution.currentStage?.stageNameSnapshot ?? null,
    progressCompleted: completed,
    progressTotal: execution.stages.length,
    status: execution.status,
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

function toLogisticsEventView(event: LogisticsWorkRecord["logisticsEvents"][number]): LogisticsEventView {
  return {
    actorName: event.actor?.displayName ?? null,
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    summary: event.type.replaceAll("_", " ").toLowerCase(),
    type: event.type,
  };
}

function toFormSnapshot(submission: LogisticsWorkRecord["workFormSubmission"]): WorkLogisticsView["formSnapshot"] {
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
