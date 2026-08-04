import type { DeliveryEventType, DeliveryFailureReasonCode, DeliveryStatus, Prisma } from "@prisma/client";
import { toDeliveryProofSummary } from "../delivery-proof/delivery-proof.view.js";

type WorkPriority = "NORMAL" | "URGENT";

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

export interface DeliverySummary {
  readonly actions: DeliveryActionAvailability;
  readonly assignedAt: string | null;
  readonly clinic: { readonly address: string | null; readonly city: string | null; readonly contactName: string | null; readonly contactPhone: string | null; readonly id: string; readonly name: string };
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
  readonly proof: ReturnType<typeof toDeliveryProofSummary> | null;
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
  readonly events: readonly { readonly actorName: string | null; readonly id: string; readonly occurredAt: string; readonly summary: string; readonly type: DeliveryEventType }[];
  readonly failureDetails: string | null;
  readonly inTransitAt: string | null;
  readonly recipientRole: string | null;
  readonly rescheduledFor: string | null;
  readonly works: readonly {
    readonly doctorName: string;
    readonly id: string;
    readonly logisticsStatus: string;
    readonly patientName: string;
    readonly priority: WorkPriority;
    readonly requestedDeliveryDate: string;
    readonly workCode: string;
    readonly workTypeName: string;
  }[];
}

export interface DeliveryAccessContext {
  readonly canAssign: boolean;
  readonly canCancel: boolean;
  readonly canComplete: boolean;
  readonly canFail: boolean;
  readonly canPickup: boolean;
  readonly canPrintProof: boolean;
  readonly canReadBilling: boolean;
  readonly canReadProof: boolean;
  readonly canReschedule: boolean;
  readonly canSignatureOverride: boolean;
  readonly canStartTransit: boolean;
  readonly canUpdatePlan: boolean;
  readonly canUnassign: boolean;
  readonly userId: string;
}

export const deliveryInclude = {
  clinic: true,
  courier: {
    select: {
      displayName: true,
      id: true,
    },
  },
  events: {
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
  preparationGroup: {
    include: {
      items: {
        include: {
          workOrder: {
            include: {
              doctor: {
                select: {
                  displayName: true,
                },
              },
              activeCycle: {
                include: {
                  logisticsState: true,
                },
              },
              workType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        where: {
          isActive: true,
        },
      },
    },
  },
  proof: {
    include: {
      confirmedBy: {
        select: {
          displayName: true,
        },
      },
    },
  },
} as const satisfies Prisma.DeliveryInclude;

export type DeliveryRecord = Prisma.DeliveryGetPayload<{ include: typeof deliveryInclude }>;

const statusLabels = {
  ASSIGNED: "Atribuită",
  CANCELLED: "Anulată",
  DELIVERED: "Finalizată",
  FAILED: "Nereușită",
  IN_TRANSIT: "În tranzit",
  PICKED_UP: "Preluată",
  PLANNED: "Planificată",
} as const satisfies Record<DeliveryStatus, string>;

const failureLabels = {
  ADDRESS_PROBLEM: "Problemă adresă",
  CLINIC_CLOSED: "Clinică închisă",
  COURIER_PROBLEM: "Problemă curier",
  DELIVERY_REFUSED: "Livrare refuzată",
  OTHER: "Alt motiv",
  RECIPIENT_UNAVAILABLE: "Destinatar indisponibil",
} as const satisfies Record<DeliveryFailureReasonCode, string>;

export function toDeliverySummary(delivery: DeliveryRecord, context: DeliveryAccessContext, now: Date): DeliverySummary {
  return {
    actions: toActions(delivery, context),
    assignedAt: delivery.assignedAt?.toISOString() ?? null,
    clinic: {
      address: [delivery.clinic.addressLine1, delivery.clinic.addressLine2].filter(Boolean).join(", ") || null,
      city: delivery.clinic.city,
      contactName: delivery.clinic.contactPersonName,
      contactPhone: delivery.clinic.contactPersonPhone ?? delivery.clinic.phone,
      id: delivery.clinic.id,
      name: delivery.clinic.name,
    },
    code: delivery.code,
    courier: delivery.courier ? { id: delivery.courier.id, name: delivery.courier.displayName } : null,
    createdAt: delivery.createdAt.toISOString(),
    deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
    failedAt: delivery.failedAt?.toISOString() ?? null,
    failureReasonCode: delivery.failureReasonCode,
    failureReasonLabel: delivery.failureReasonCode ? failureLabels[delivery.failureReasonCode] : null,
    id: delivery.id,
    isToday: isSameUtcDay(delivery.plannedDate, now),
    pickedUpAt: delivery.pickedUpAt?.toISOString() ?? null,
    plannedDate: delivery.plannedDate.toISOString(),
    preparationGroupCode: delivery.preparationGroup.code,
    preparationGroupId: delivery.preparationGroupId,
    proof: delivery.proof ? toDeliveryProofSummary(delivery.proof) : null,
    recipientName: delivery.recipientName,
    sequenceOrder: delivery.sequenceOrder,
    status: delivery.status,
    statusLabel: statusLabels[delivery.status],
    updatedAt: delivery.updatedAt.toISOString(),
    version: delivery.version,
    workCount: delivery.preparationGroup.items.length,
  };
}

export function toDeliveryDetail(delivery: DeliveryRecord, context: DeliveryAccessContext, now: Date): DeliveryDetail {
  return {
    ...toDeliverySummary(delivery, context, now),
    deliveryNotes: delivery.deliveryNotes,
    events: delivery.events.map((event) => ({
      actorName: event.actor?.displayName ?? null,
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      summary: event.type.replaceAll("_", " ").toLowerCase(),
      type: event.type,
    })),
    failureDetails: delivery.failureDetails,
    inTransitAt: delivery.inTransitAt?.toISOString() ?? null,
    recipientRole: delivery.recipientRole,
    rescheduledFor: delivery.rescheduledFor?.toISOString() ?? null,
    works: delivery.preparationGroup.items.map((item) => ({
      doctorName: item.workOrder.doctor.displayName,
      id: item.workOrder.id,
      logisticsStatus: item.workOrder.activeCycle?.logisticsState?.status ?? "RECEIVED",
      patientName: item.workOrder.patientName,
      priority: item.workOrder.priority as WorkPriority,
      requestedDeliveryDate: item.workOrder.requestedDeliveryDate.toISOString(),
      workCode: item.workOrder.code,
      workTypeName: item.workOrder.workType.name,
    })),
  };
}

function toActions(delivery: DeliveryRecord, context: DeliveryAccessContext): DeliveryActionAvailability {
  const isOwner = delivery.courierUserId === context.userId;
  const courierAllowed = isOwner || context.canAssign;
  return {
    assign: context.canAssign && (delivery.status === "PLANNED" || delivery.status === "ASSIGNED"),
    cancel: context.canCancel && (delivery.status === "PLANNED" || delivery.status === "ASSIGNED" || delivery.status === "FAILED"),
    complete: context.canComplete && courierAllowed && delivery.status === "IN_TRANSIT",
    fail: context.canFail && courierAllowed && (delivery.status === "PICKED_UP" || delivery.status === "IN_TRANSIT"),
    printProof: context.canPrintProof && delivery.proof !== null,
    pickup: context.canPickup && courierAllowed && delivery.status === "ASSIGNED",
    readProof: context.canReadProof && (courierAllowed || context.canAssign) && delivery.proof !== null,
    reschedule: context.canReschedule && delivery.status === "FAILED",
    signatureOverride: context.canSignatureOverride && delivery.status === "IN_TRANSIT",
    startTransit: context.canStartTransit && courierAllowed && delivery.status === "PICKED_UP",
    unassign: context.canUnassign && delivery.courierUserId !== null && (delivery.status === "PLANNED" || delivery.status === "ASSIGNED"),
    updatePlan: context.canUpdatePlan && (delivery.status === "PLANNED" || delivery.status === "ASSIGNED"),
  };
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth() && left.getUTCDate() === right.getUTCDate();
}
