import type { SortDirection } from "./clinics.js";
import type { WorkPriority } from "./works.js";

export const DELIVERY_STATUSES = ["PLANNED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"] as const;
export const DELIVERY_FAILURE_REASON_CODES = ["CLINIC_CLOSED", "RECIPIENT_UNAVAILABLE", "ADDRESS_PROBLEM", "DELIVERY_REFUSED", "COURIER_PROBLEM", "OTHER"] as const;
export const DELIVERY_EVENT_TYPES = [
  "DELIVERY_CREATED",
  "COURIER_ASSIGNED",
  "COURIER_REASSIGNED",
  "COURIER_UNASSIGNED",
  "DELIVERY_PICKED_UP",
  "DELIVERY_IN_TRANSIT",
  "DELIVERY_COMPLETED",
  "DELIVERY_FAILED",
  "DELIVERY_RESCHEDULED",
  "DELIVERY_CANCELLED",
] as const;
export const DELIVERY_FILTERS = ["ALL", "UNASSIGNED", "TODAY", "BY_COURIER", "PICKED_UP", "IN_TRANSIT", "FAILED", "DELIVERED", "CANCELLED"] as const;
export const DELIVERY_SORT_FIELDS = ["plannedDate", "sequenceOrder", "createdAt", "updatedAt", "code"] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type DeliveryFailureReasonCode = (typeof DELIVERY_FAILURE_REASON_CODES)[number];
export type DeliveryEventType = (typeof DELIVERY_EVENT_TYPES)[number];
export type DeliveryFilter = (typeof DELIVERY_FILTERS)[number];
export type DeliverySortField = (typeof DELIVERY_SORT_FIELDS)[number];

export interface DeliveryActionAvailability {
  readonly assign: boolean;
  readonly cancel: boolean;
  readonly complete: boolean;
  readonly fail: boolean;
  readonly pickup: boolean;
  readonly reschedule: boolean;
  readonly startTransit: boolean;
  readonly unassign: boolean;
  readonly updatePlan: boolean;
}

export interface DeliveryClinicSummary {
  readonly address: string | null;
  readonly city: string | null;
  readonly contactName: string | null;
  readonly contactPhone: string | null;
  readonly id: string;
  readonly name: string;
}

export interface DeliveryWorkItem {
  readonly doctorName: string;
  readonly id: string;
  readonly logisticsStatus: string;
  readonly patientName: string;
  readonly priority: WorkPriority;
  readonly requestedDeliveryDate: string;
  readonly workCode: string;
  readonly workTypeName: string;
}

export interface DeliveryEventView {
  readonly actorName: string | null;
  readonly id: string;
  readonly occurredAt: string;
  readonly summary: string;
  readonly type: DeliveryEventType;
}

export interface DeliverySummary {
  readonly actions: DeliveryActionAvailability;
  readonly assignedAt: string | null;
  readonly clinic: DeliveryClinicSummary;
  readonly code: string;
  readonly courier: { readonly id: string; readonly name: string } | null;
  readonly createdAt: string;
  readonly deliveredAt: string | null;
  readonly failedAt: string | null;
  readonly failureReasonCode: DeliveryFailureReasonCode | null;
  readonly failureReasonLabel: string | null;
  readonly id: string;
  readonly isToday: boolean;
  readonly pickedUpAt: string | null;
  readonly plannedDate: string;
  readonly preparationGroupCode: string;
  readonly preparationGroupId: string;
  readonly recipientName: string | null;
  readonly sequenceOrder: number | null;
  readonly status: DeliveryStatus;
  readonly statusLabel: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly workCount: number;
}

export interface DeliveryDetail extends DeliverySummary {
  readonly deliveryNotes: string | null;
  readonly events: readonly DeliveryEventView[];
  readonly failureDetails: string | null;
  readonly inTransitAt: string | null;
  readonly recipientRole: string | null;
  readonly rescheduledFor: string | null;
  readonly works: readonly DeliveryWorkItem[];
}

export interface PaginatedDeliveriesResponse {
  readonly items: readonly DeliverySummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface DeliveryFilters {
  readonly clinicId?: string;
  readonly courierUserId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly filter?: DeliveryFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly sortBy: DeliverySortField;
  readonly sortDirection: SortDirection;
  readonly status?: DeliveryStatus;
}

export interface CourierOption {
  readonly displayName: string;
  readonly id: string;
}

export interface CreateDeliveryInput {
  readonly courierUserId?: string | null;
  readonly plannedDate: string;
  readonly sequenceOrder?: number | null;
}

export interface UpdateDeliveryInput {
  readonly plannedDate?: string;
  readonly sequenceOrder?: number | null;
  readonly version: number;
}

export interface AssignCourierInput {
  readonly courierUserId: string;
  readonly version: number;
}

export interface CompleteDeliveryInput {
  readonly deliveryNotes?: string | null;
  readonly recipientName: string;
  readonly recipientRole?: string | null;
  readonly version: number;
}

export interface FailDeliveryInput {
  readonly failureDetails?: string | null;
  readonly reasonCode: DeliveryFailureReasonCode;
  readonly version: number;
}

export interface RescheduleDeliveryInput {
  readonly plannedDate: string;
  readonly sequenceOrder?: number | null;
  readonly version: number;
}

export interface VersionedDeliveryActionInput {
  readonly version: number;
}

export const DELIVERY_STATUS_LABELS = {
  ASSIGNED: "Atribuită",
  CANCELLED: "Anulată",
  DELIVERED: "Finalizată",
  FAILED: "Nereușită",
  IN_TRANSIT: "În tranzit",
  PICKED_UP: "Preluată",
  PLANNED: "Planificată",
} as const satisfies Record<DeliveryStatus, string>;

export const DELIVERY_FAILURE_REASON_LABELS = {
  ADDRESS_PROBLEM: "Problemă adresă",
  CLINIC_CLOSED: "Clinică închisă",
  COURIER_PROBLEM: "Problemă curier",
  DELIVERY_REFUSED: "Livrare refuzată",
  OTHER: "Alt motiv",
  RECIPIENT_UNAVAILABLE: "Destinatar indisponibil",
} as const satisfies Record<DeliveryFailureReasonCode, string>;

export function createDefaultDeliveryActions(): DeliveryActionAvailability {
  return {
    assign: false,
    cancel: false,
    complete: false,
    fail: false,
    pickup: false,
    reschedule: false,
    startTransit: false,
    unassign: false,
    updatePlan: false,
  };
}

export function isDeliveryToday(plannedDate: Date, now: Date): boolean {
  return plannedDate.getUTCFullYear() === now.getUTCFullYear()
    && plannedDate.getUTCMonth() === now.getUTCMonth()
    && plannedDate.getUTCDate() === now.getUTCDate();
}

export function canTransitionDelivery(status: DeliveryStatus, action: keyof DeliveryActionAvailability): boolean {
  if (action === "pickup") {
    return status === "ASSIGNED";
  }
  if (action === "startTransit") {
    return status === "PICKED_UP";
  }
  if (action === "complete") {
    return status === "IN_TRANSIT";
  }
  if (action === "fail") {
    return status === "PICKED_UP" || status === "IN_TRANSIT";
  }
  if (action === "reschedule") {
    return status === "FAILED";
  }
  if (action === "cancel") {
    return status === "PLANNED" || status === "ASSIGNED" || status === "FAILED";
  }
  if (action === "assign" || action === "unassign" || action === "updatePlan") {
    return status === "PLANNED" || status === "ASSIGNED";
  }
  return false;
}
