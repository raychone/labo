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
  "DELIVERY_SIGNATURE_CAPTURED",
  "DELIVERY_COMPLETED",
  "DELIVERY_COMPLETED_WITHOUT_SIGNATURE",
  "DELIVERY_FAILED",
  "DELIVERY_RESCHEDULED",
  "DELIVERY_CANCELLED",
] as const;
export const DELIVERY_FILTERS = ["ALL", "UNASSIGNED", "TODAY", "BY_COURIER", "PICKED_UP", "IN_TRANSIT", "FAILED", "DELIVERED", "CANCELLED"] as const;
export const DELIVERY_SORT_FIELDS = ["plannedDate", "sequenceOrder", "createdAt", "updatedAt", "code"] as const;
export const SIGNATURE_OVERRIDE_REASON_CODES = ["RECIPIENT_REFUSED_SIGNATURE", "DEVICE_UNAVAILABLE", "TECHNICAL_FAILURE", "OTHER"] as const;
export const SIGNATURE_LIMITS = {
  maxPayloadBytes: 200_000,
  maxPoints: 5_000,
  maxStrokes: 50,
  minPoints: 8,
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type DeliveryFailureReasonCode = (typeof DELIVERY_FAILURE_REASON_CODES)[number];
export type DeliveryEventType = (typeof DELIVERY_EVENT_TYPES)[number];
export type DeliveryFilter = (typeof DELIVERY_FILTERS)[number];
export type DeliverySortField = (typeof DELIVERY_SORT_FIELDS)[number];
export type SignatureOverrideReasonCode = (typeof SIGNATURE_OVERRIDE_REASON_CODES)[number];

export interface SignaturePoint {
  readonly t: number;
  readonly x: number;
  readonly y: number;
}

export interface SignatureStroke {
  readonly points: readonly SignaturePoint[];
}

export interface SignatureValue {
  readonly strokes: readonly SignatureStroke[];
}

export interface DeliveryProofSummary {
  readonly confirmedAt: string;
  readonly confirmedByUserName: string | null;
  readonly hasSignature: boolean;
  readonly id: string;
  readonly overrideDetails: string | null;
  readonly overrideReasonCode: SignatureOverrideReasonCode | null;
  readonly overrideReasonLabel: string | null;
  readonly recipientName: string;
  readonly recipientNotes: string | null;
  readonly recipientRole: string | null;
  readonly signatureCapturedAt: string | null;
  readonly signatureHashPrefix: string | null;
}

export interface DeliveryActionAvailability {
  readonly assign: boolean;
  readonly cancel: boolean;
  readonly complete: boolean;
  readonly fail: boolean;
  readonly printProof: boolean;
  readonly pickup: boolean;
  readonly readProof: boolean;
  readonly reschedule: boolean;
  readonly signatureOverride: boolean;
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
  readonly proof: DeliveryProofSummary | null;
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

export interface DeliveryProofView extends DeliveryProofSummary {
  readonly deliveryCode: string;
  readonly signature: SignatureValue | null;
}

export interface DeliveryProofPrintWorkItem {
  readonly doctorName: string;
  readonly patientName: string;
  readonly quantity: number;
  readonly workCode: string;
  readonly workTypeName: string;
}

export interface DeliveryProofPrintView extends DeliveryProofView {
  readonly clinic: DeliveryClinicSummary;
  readonly courierName: string | null;
  readonly deliveredAt: string | null;
  readonly disclaimer: string;
  readonly laboratory: {
    readonly address: string | null;
    readonly email: string | null;
    readonly legalName: string | null;
    readonly name: string;
    readonly phone: string | null;
    readonly taxId: string | null;
  };
  readonly plannedDate: string;
  readonly statusLabel: string;
  readonly works: readonly DeliveryProofPrintWorkItem[];
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
  readonly signature: SignatureValue;
  readonly confirmedHandover: boolean;
  readonly version: number;
}

export interface CompleteDeliveryWithoutSignatureInput {
  readonly confirmedWithoutSignature: boolean;
  readonly deliveryNotes?: string | null;
  readonly overrideDetails?: string | null;
  readonly overrideReasonCode: SignatureOverrideReasonCode;
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

export const SIGNATURE_OVERRIDE_REASON_LABELS = {
  DEVICE_UNAVAILABLE: "Dispozitiv indisponibil",
  OTHER: "Alt motiv",
  RECIPIENT_REFUSED_SIGNATURE: "Destinatarul a refuzat semnătura",
  TECHNICAL_FAILURE: "Problemă tehnică",
} as const satisfies Record<SignatureOverrideReasonCode, string>;

export const DELIVERY_PROOF_DISCLAIMER = "Document de confirmare operațională internă a predării. Nu reprezintă o semnătură electronică calificată.";

export function createDefaultDeliveryActions(): DeliveryActionAvailability {
  return {
    assign: false,
    cancel: false,
    complete: false,
    fail: false,
    printProof: false,
    pickup: false,
    readProof: false,
    reschedule: false,
    signatureOverride: false,
    startTransit: false,
    unassign: false,
    updatePlan: false,
  };
}

export interface SignatureValidationResult {
  readonly canonical: string;
  readonly pointCount: number;
  readonly signature: SignatureValue;
}

export function validateAndNormalizeSignature(value: unknown): SignatureValidationResult {
  const payloadSize = new TextEncoder().encode(JSON.stringify(value)).length;
  if (payloadSize > SIGNATURE_LIMITS.maxPayloadBytes) {
    throw new Error("Semnătura depășește dimensiunea permisă.");
  }
  if (!isPlainObject(value) || Object.keys(value).length !== 1 || !Array.isArray(value.strokes)) {
    throw new Error("Semnătura are un format invalid.");
  }
  if (value.strokes.length === 0 || value.strokes.length > SIGNATURE_LIMITS.maxStrokes) {
    throw new Error("Semnătura trebuie să conțină între 1 și 50 de linii.");
  }

  let pointCount = 0;
  const strokes = value.strokes.map((stroke) => {
    if (!isPlainObject(stroke) || Object.keys(stroke).length !== 1 || !Array.isArray(stroke.points)) {
      throw new Error("Semnătura conține linii invalide.");
    }
    if (stroke.points.length === 0) {
      throw new Error("Semnătura conține o linie goală.");
    }
    pointCount += stroke.points.length;
    if (pointCount > SIGNATURE_LIMITS.maxPoints) {
      throw new Error("Semnătura conține prea multe puncte.");
    }
    return {
      points: stroke.points.map((point) => normalizePoint(point)),
    };
  });

  if (pointCount < SIGNATURE_LIMITS.minPoints) {
    throw new Error("Semnătura este prea scurtă.");
  }

  const signature = { strokes } as const satisfies SignatureValue;
  return { canonical: canonicalizeSignature(signature), pointCount, signature };
}

export function canonicalizeSignature(signature: SignatureValue): string {
  return JSON.stringify({
    strokes: signature.strokes.map((stroke) => ({
      points: stroke.points.map((point) => ({ t: point.t, x: point.x, y: point.y })),
    })),
  });
}

function normalizePoint(value: unknown): SignaturePoint {
  if (!isPlainObject(value) || Object.keys(value).length !== 3) {
    throw new Error("Semnătura conține puncte invalide.");
  }
  const t = value["t"];
  const x = value["x"];
  const y = value["y"];
  if (!isFiniteNumber(x) || x < 0 || x > 1 || !isFiniteNumber(y) || y < 0 || y > 1 || !isFiniteNumber(t) || !Number.isInteger(t) || t < 0) {
    throw new Error("Semnătura conține coordonate invalide.");
  }
  return { t, x: roundCoordinate(x), y: roundCoordinate(y) };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
