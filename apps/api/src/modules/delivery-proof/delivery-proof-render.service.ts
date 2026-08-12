import { Injectable } from "@nestjs/common";
import { DeliveryStatus, type LaboratorySettings, type Prisma } from "@prisma/client";

import { toDeliveryProofPrintView, type DeliveryProofPrintView } from "./delivery-proof.view.js";

type DeliveryProofPrintRecord = Prisma.DeliveryGetPayload<{
  include: {
    clinic: true;
    courier: { select: { displayName: true } };
    proof: { include: { confirmedBy: { select: { displayName: true } } } };
    preparationGroup: {
      include: {
        items: {
          include: {
            workCycle: {
              select: {
                cycleNumber: true,
              },
            },
            workOrder: {
              include: {
                doctor: { select: { displayName: true } };
                workType: { select: { name: true } };
              };
            };
          };
        };
      };
    };
  };
}>;

const statusLabels = {
  ASSIGNED: "Atribuită",
  CANCELLED: "Anulată",
  DELIVERED: "Finalizată",
  FAILED: "Nereușită",
  IN_TRANSIT: "În tranzit",
  PICKED_UP: "Preluată",
  PLANNED: "Planificată",
} as const satisfies Record<DeliveryStatus, string>;

@Injectable()
export class DeliveryProofRenderService {
  public toPrintView(delivery: DeliveryProofPrintRecord, laboratory: LaboratorySettings): DeliveryProofPrintView {
    if (!delivery.proof) {
      throw new Error("Dovada livrării lipsește.");
    }
    return toDeliveryProofPrintView({
      clinic: {
        address: [delivery.clinic.addressLine1, delivery.clinic.addressLine2].filter(Boolean).join(", ") || null,
        city: delivery.clinic.city,
        contactName: delivery.clinic.contactPersonName,
        contactPhone: delivery.clinic.contactPersonPhone ?? delivery.clinic.phone,
        id: delivery.clinic.id,
        name: delivery.clinic.name,
      },
      courierName: delivery.courier?.displayName ?? null,
      deliveredAt: delivery.deliveredAt,
      deliveryCode: delivery.code,
      laboratory,
      plannedDate: delivery.plannedDate,
      proof: delivery.proof,
      statusLabel: statusLabels[delivery.status],
      works: delivery.preparationGroup.items.map((item) => ({
        doctorName: item.workOrder.doctor.displayName,
        cycleNumber: item.workCycle?.cycleNumber ?? null,
        patientName: item.workOrder.patientName,
        quantity: item.workOrder.quantity,
        workCode: item.workOrder.code,
        workTypeName: item.workOrder.workType.name,
      })),
    });
  }
}
