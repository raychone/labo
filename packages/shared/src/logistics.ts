import type { BillingDocumentStatus, PaymentStatus } from "./billing.js";
import type { SortDirection } from "./clinics.js";
import { FINAL_WORK_STATUSES, type WorkDetail, type WorkPriority } from "./works.js";
import type { WorkflowExecutionStatus } from "./workflow-execution.js";

export const LOGISTICS_STATUSES = [
  "RECEIVED",
  "IN_PRODUCTION",
  "BLOCKED",
  "READY_FOR_PACKING",
  "PACKING",
  "READY_FOR_DELIVERY",
  "HANDED_TO_DELIVERY",
  "DELIVERED",
] as const;

export const LOGISTICS_LOCATION_CODES = ["RECEPTIE", "PRODUCTIE", "RAFT_FINISARE", "ZONA_AMBALARE", "GATA_LIVRARE"] as const;
export const LOGISTICS_BLOCK_REASON_CODES = [
  "MISSING_INFO",
  "DOCTOR_CONFIRMATION",
  "MISSING_COMPONENTS",
  "TECHNICAL_ISSUE",
  "DEADLINE_CLARIFICATION",
  "OTHER",
] as const;
export const LOGISTICS_CENTER_CATEGORIES = [
  "ALL",
  "INTRARI_ASTAZI",
  "DE_VERIFICAT",
  "IN_PRODUCTIE",
  "NEASIGNATE",
  "BLOCARE",
  "URGENTE",
  "INTARZIATE",
  "FINALIZATE_AZI",
  "DE_AMBALAT",
  "IN_AMBALARE",
  "GATA_DE_LIVRARE",
  "NEFACTURATE",
  "IN_ASTEPTARE",
  "DE_LIVRAT",
  "DE_RIDICAT",
] as const;
export const LOGISTICS_DUE_STATES = ["ON_TRACK", "DUE_SOON", "OVERDUE"] as const;
export const LOGISTICS_SORT_FIELDS = ["createdAt", "requestedDeliveryDate", "updatedAt", "priority", "workCode"] as const;
export const DELIVERY_PREPARATION_GROUP_STATUSES = ["DRAFT", "READY", "CANCELLED"] as const;
export const PICKUP_REQUEST_STATUSES = ["SCHEDULED", "CANCELLED"] as const;
export const PICKUP_SCHEDULE_TYPES = ["EXACT", "RANGE"] as const;
export const COURIER_ROUTE_STATUSES = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const COURIER_ROUTE_STOP_TYPES = ["DELIVERY", "PICKUP"] as const;
export const COURIER_ROUTE_STOP_OUTCOMES = ["PENDING", "DELIVERED", "NOT_DELIVERED", "PICKED_UP", "NOT_PICKED_UP"] as const;

export type LogisticsStatus = (typeof LOGISTICS_STATUSES)[number];
export type LogisticsLocationCode = (typeof LOGISTICS_LOCATION_CODES)[number];
export type LogisticsBlockReasonCode = (typeof LOGISTICS_BLOCK_REASON_CODES)[number];
export type LogisticsCenterCategory = (typeof LOGISTICS_CENTER_CATEGORIES)[number];
export type LogisticsDueState = (typeof LOGISTICS_DUE_STATES)[number];
export const LOGISTICS_MARKERS = ["MARKER_1", "MARKER_2", "MARKER_3", "MARKER_4", "MARKER_5"] as const;
export type LogisticsMarker = (typeof LOGISTICS_MARKERS)[number];
export type LogisticsSortField = (typeof LOGISTICS_SORT_FIELDS)[number];
export type DeliveryPreparationGroupStatus = (typeof DELIVERY_PREPARATION_GROUP_STATUSES)[number];
export type PickupRequestStatus = (typeof PICKUP_REQUEST_STATUSES)[number];
export type PickupScheduleType = (typeof PICKUP_SCHEDULE_TYPES)[number];
export type CourierRouteStatus = (typeof COURIER_ROUTE_STATUSES)[number];
export type CourierRouteStopType = (typeof COURIER_ROUTE_STOP_TYPES)[number];
export type CourierRouteStopOutcome = (typeof COURIER_ROUTE_STOP_OUTCOMES)[number];

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

export interface LogisticsWorkflowSummary {
  readonly assignedUserName: string | null;
  readonly completedAt: string | null;
  readonly currentStageName: string | null;
  readonly progressCompleted: number;
  readonly progressTotal: number;
  readonly status: WorkflowExecutionStatus | null;
}

export interface LogisticsBillingSummary {
  readonly documentId: string | null;
  readonly documentNumber: string | null;
  readonly documentStatus: BillingDocumentStatus | null;
  readonly label: string;
  readonly paymentStatus: PaymentStatus | null;
}

export interface DeliveryPreparationGroupSummary {
  readonly clinicId: string;
  readonly clinicName: string;
  readonly code: string;
  readonly id: string;
  readonly itemCount: number;
  readonly notes: string | null;
  readonly plannedDate: string | null;
  readonly status: DeliveryPreparationGroupStatus;
  readonly version: number;
  readonly delivery: {
    readonly code: string;
    readonly courierName: string | null;
    readonly id: string;
    readonly status: string;
    readonly statusLabel: string;
  } | null;
}

export interface DeliveryPreparationItem {
  readonly addedAt: string;
  readonly id: string;
  readonly work: LogisticsCenterItem;
}

export interface DeliveryPreparationGroupDetail extends DeliveryPreparationGroupSummary {
  readonly items: readonly DeliveryPreparationItem[];
}

export interface LogisticsCenterItem {
  readonly actions: LogisticsActionAvailability;
  readonly billing: LogisticsBillingSummary;
  readonly clinic: {
    readonly address: string | null;
    readonly id: string;
    readonly name: string;
    readonly phone: string | null;
  };
  readonly claimedAt: string | null;
  readonly technician: { readonly name: string; readonly preferredColor: string | null } | null;
  readonly createdAt: string;
  readonly doctor: {
    readonly id: string;
    readonly name: string;
  };
  readonly dueState: LogisticsDueState;
  readonly id: string;
  readonly logistics: LogisticsStateView;
  readonly logisticsMarker: LogisticsMarker | null;
  readonly logisticsNote: string | null;
  readonly operationalStatus: (typeof FINAL_WORK_STATUSES)[number];
  readonly technicalReadiness?: "PROBE_READY" | "FINAL_READY" | null;
  readonly probeReadyAt?: string | null;
  readonly probeReceivedAt?: string | null;
  readonly finalizedAt?: string | null;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly preparationGroup: DeliveryPreparationGroupSummary | null;
  readonly priority: WorkPriority;
  readonly requestedDeliveryDate: string;
  readonly workCode: string;
  readonly workflow: LogisticsWorkflowSummary;
  readonly workTypeName: string;
  readonly requiresDelivery: boolean;
  readonly requiresPickup: boolean;
}

export interface WorkLogisticsView extends LogisticsCenterItem {
  readonly events: readonly LogisticsEventView[];
  readonly formSnapshot: {
    readonly fields: readonly { readonly label: string; readonly value: string }[];
    readonly templateName: string;
    readonly templateVersion: number;
  } | null;
}

export interface WorkAttachmentSummary {
  readonly fileName: string;
  readonly id: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly uploadedAt: string;
}

export interface LogisticsWorkCreateResponse {
  readonly attachments: readonly WorkAttachmentSummary[];
  readonly work: WorkDetail;
}

export interface PickupRequestView {
  readonly address: string | null;
  readonly cancelledAt: string | null;
  readonly clinic: {
    readonly id: string;
    readonly name: string;
  };
  readonly createdAt: string;
  readonly doctor: {
    readonly id: string;
    readonly name: string;
  };
  readonly exactTime: string | null;
  readonly id: string;
  readonly notes: string | null;
  readonly phone: string | null;
  readonly scheduledDate: string;
  readonly scheduleLabel: string;
  readonly scheduleType: PickupScheduleType;
  readonly status: PickupRequestStatus;
  readonly statusLabel: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly windowEndTime: string | null;
  readonly windowStartTime: string | null;
}

export interface LogisticsEventView {
  readonly actorName: string | null;
  readonly id: string;
  readonly occurredAt: string;
  readonly summary: string;
  readonly type: string;
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

export interface LogisticsCenterQuery {
  readonly billingStatus?: string;
  readonly category?: LogisticsCenterCategory;
  readonly clinicId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly doctorId?: string;
  readonly deliveryHorizonDays?: 1 | 2 | 3;
  readonly dueState?: LogisticsDueState;
  readonly exactDate?: string;
  readonly logisticsStatus?: LogisticsStatus;
  readonly page: number;
  readonly pageSize: number;
  readonly priority?: WorkPriority;
  readonly pickupHorizonDays?: 1 | 2 | 3;
  readonly receptionUserId?: string;
  readonly search?: string;
  readonly sortBy: LogisticsSortField;
  readonly sortDirection: SortDirection;
  readonly technicianId?: string;
  readonly workTypeId?: string;
  readonly workflowStageKey?: string;
}

export interface PaginatedLogisticsCenterResponse {
  readonly items: readonly LogisticsCenterItem[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface UpdateLogisticsLocationInput {
  readonly locationCode: LogisticsLocationCode;
  readonly version: number;
}

export interface BlockWorkInput {
  readonly reasonCode: LogisticsBlockReasonCode;
  readonly reasonNotes?: string | null;
  readonly version: number;
}

export interface LogisticsTransitionInput {
  readonly version: number;
  readonly workflowOverride?: boolean;
}

export interface CreateDeliveryPreparationGroupInput {
  readonly clinicId: string;
  readonly notes?: string | null;
  readonly plannedDate?: string | null;
}

export interface UpdateDeliveryPreparationGroupInput {
  readonly notes?: string | null;
  readonly plannedDate?: string | null;
  readonly version: number;
}

export interface AddWorkToDeliveryPreparationGroupInput {
  readonly workOrderId: string;
}

export interface RemoveWorkFromDeliveryPreparationGroupInput {
  readonly workOrderId: string;
}

export interface CreatePickupRequestInput {
  readonly address?: string | null;
  readonly clinicId: string;
  readonly doctorId: string;
  readonly exactTime?: string | null;
  readonly notes?: string | null;
  readonly scheduledDate: string;
  readonly scheduleType: PickupScheduleType;
  readonly windowEndTime?: string | null;
  readonly windowStartTime?: string | null;
  readonly phone?: string | null;
}

export interface UpdatePickupRequestInput extends CreatePickupRequestInput {
  readonly version: number;
}

export interface CancelPickupRequestInput {
  readonly version: number;
}

export interface CourierRouteStopInput {
  readonly addressOverride?: string | null;
  readonly pickupRequestId?: string | null;
  readonly phoneOverride?: string | null;
  readonly stopNotes?: string | null;
  readonly type: CourierRouteStopType;
  readonly workOrderId?: string | null;
}

export interface CreateCourierRouteInput {
  readonly courierUserId?: string | null;
  readonly name: string;
  readonly notes?: string | null;
  readonly routeDate: string;
  readonly stops: readonly CourierRouteStopInput[];
}

export interface CourierRouteStopView {
  readonly addressOverride: string | null;
  readonly failureReason: string | null;
  readonly id: string;
  readonly outcomeAt: string | null;
  readonly outcomeByUserName: string | null;
  readonly outcomeNotes: string | null;
  readonly outcomeStatus: CourierRouteStopOutcome;
  readonly phoneOverride: string | null;
  readonly pickupRequestId: string | null;
  readonly stopOrder: number;
  readonly stopNotes: string | null;
  readonly targetLabel: string;
  readonly type: CourierRouteStopType;
  readonly workOrderId: string | null;
}

export interface CourierRouteView {
  readonly completedAt: string | null;
  readonly courier: { readonly id: string; readonly name: string } | null;
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly notes: string | null;
  readonly routeDate: string;
  readonly routeNumber: string;
  readonly startedAt: string | null;
  readonly status: CourierRouteStatus;
  readonly stops: readonly CourierRouteStopView[];
  readonly updatedAt: string;
  readonly version: number;
}

export interface CourierRouteListQuery {
  readonly courierUserId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly exactDate?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly status?: CourierRouteStatus;
}

export interface RecordCourierRouteStopOutcomeInput {
  readonly failureReason?: string | null;
  readonly notes?: string | null;
  readonly outcomeStatus: CourierRouteStopOutcome;
}

export interface PaginatedCourierRoutesResponse {
  readonly items: readonly CourierRouteView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export const LOGISTICS_STATUS_LABELS = {
  BLOCKED: "Blocată",
  DELIVERED: "Livrată",
  HANDED_TO_DELIVERY: "Predată spre livrare",
  IN_PRODUCTION: "În producție",
  PACKING: "În ambalare",
  READY_FOR_DELIVERY: "Gata de livrare",
  READY_FOR_PACKING: "De ambalat",
  RECEIVED: "Recepționată",
} as const satisfies Record<LogisticsStatus, string>;

export const LOGISTICS_LOCATION_LABELS = {
  GATA_LIVRARE: "Gata livrare",
  PRODUCTIE: "Producție",
  RAFT_FINISARE: "Raft finisare",
  RECEPTIE: "Recepție",
  ZONA_AMBALARE: "Zonă ambalare",
} as const satisfies Record<LogisticsLocationCode, string>;

export const LOGISTICS_BLOCK_REASON_LABELS = {
  DEADLINE_CLARIFICATION: "Clarificare termen",
  DOCTOR_CONFIRMATION: "Confirmare medic",
  MISSING_COMPONENTS: "Componente lipsă",
  MISSING_INFO: "Informații lipsă",
  OTHER: "Alt motiv",
  TECHNICAL_ISSUE: "Problemă tehnică",
} as const satisfies Record<LogisticsBlockReasonCode, string>;

export const DELIVERY_PREPARATION_GROUP_STATUS_LABELS = {
  CANCELLED: "Anulată",
  DRAFT: "În pregătire",
  READY: "Gata pentru livrare",
} as const satisfies Record<DeliveryPreparationGroupStatus, string>;

export const PICKUP_REQUEST_STATUS_LABELS = {
  CANCELLED: "Anulată",
  SCHEDULED: "Programată",
} as const satisfies Record<PickupRequestStatus, string>;

export const COURIER_ROUTE_STATUS_LABELS = {
  ASSIGNED: "Asignat",
  CANCELLED: "Anulat",
  COMPLETED: "Finalizat",
  DRAFT: "Draft",
  IN_PROGRESS: "În curs",
} as const satisfies Record<CourierRouteStatus, string>;

export function deriveLogisticsDueState(input: { readonly now: Date; readonly requestedDeliveryDate: Date }): LogisticsDueState {
  const msUntilDue = input.requestedDeliveryDate.getTime() - input.now.getTime();
  if (msUntilDue < 0) {
    return "OVERDUE";
  }
  return msUntilDue <= 24 * 60 * 60 * 1000 ? "DUE_SOON" : "ON_TRACK";
}

export function canAddWorkToPreparationGroup(input: {
  readonly groupClinicId: string;
  readonly groupStatus: DeliveryPreparationGroupStatus;
  readonly hasActiveGroup: boolean;
  readonly workClinicId: string;
  readonly workLogisticsStatus: LogisticsStatus;
}): boolean {
  return input.groupStatus === "DRAFT"
    && input.groupClinicId === input.workClinicId
    && !input.hasActiveGroup
    && input.workLogisticsStatus === "READY_FOR_DELIVERY";
}

export function createDefaultLogisticsActions(): LogisticsActionAvailability {
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
