import { ConflictException } from "@nestjs/common";
import { DeliveryEventType, Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { DeliveryTransitionService } from "./delivery-transition.service.js";

describe("DeliveryTransitionService completion", () => {
  it("keeps the optimistic version predicate on the transition write", async () => {
    const writeError = new Prisma.PrismaClientKnownRequestError("stale write", {
      clientVersion: "test",
      code: "P2025",
    });
    const updateDelivery = vi.fn().mockRejectedValue(writeError);
    const tx = {
      delivery: {
        findUnique: vi.fn().mockResolvedValue({
          courierUserId: "courier-1",
          id: "delivery-1",
          status: "PICKED_UP",
          version: 7,
        }),
        update: updateDelivery,
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new DeliveryTransitionService(
      { hasPermission: vi.fn().mockResolvedValue({ allowed: true }) } as never,
      {} as never,
      {} as never,
      {} as never,
      prisma as never,
      {} as never,
    );

    await expect(service.startTransit({
      actor: { displayName: "Curier Test", email: "curier@example.test", id: "courier-1", isActive: true, mustChangePassword: false },
      requestMetadata: {},
    }, "delivery-1", 7)).rejects.toBeInstanceOf(ConflictException);

    expect(updateDelivery).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "delivery-1", version: 7 },
    }));
  });

  it("releases preparation items after preserving delivery history", async () => {
    const createdAt = new Date("2026-09-07T08:00:00.000Z");
    const item = {
      addedAt: new Date("2026-09-07T07:30:00.000Z"),
      id: "item-1",
      isActive: true,
      removedAt: null,
      workCycle: { cycleNumber: 1 },
      workCycleId: "cycle-1",
      workOrderId: "work-1",
      workOrder: {
        activeCycle: { logisticsState: { status: "DELIVERED" } },
        code: "WO-26-0001",
        doctor: { displayName: "Dr. Test" },
        id: "work-1",
        patientName: "Pacient Test",
        priority: "NORMAL",
        requestedDeliveryDate: new Date("2026-09-08T08:00:00.000Z"),
        workType: { name: "Coroană" },
      },
    };
    const current = {
      code: "DLV-26-0001",
      courierUserId: "courier-1",
      id: "delivery-1",
      preparationGroupId: "group-1",
      preparationGroup: { items: [item] },
      status: "IN_TRANSIT",
      version: 3,
    };
    const updated = {
      ...current,
      assignedAt: createdAt,
      clinic: {
        addressLine1: "Strada Test 1",
        addressLine2: null,
        city: "București",
        contactPersonName: null,
        contactPersonPhone: null,
        id: "clinic-1",
        name: "Clinica Test",
        phone: "0700000000",
      },
      courier: { displayName: "Curier Test", id: "courier-1" },
      createdAt,
      deliveredAt: new Date("2026-09-07T09:00:00.000Z"),
      deliveryNotes: null,
      events: [],
      failedAt: null,
      failureDetails: null,
      failureReasonCode: null,
      inTransitAt: new Date("2026-09-07T08:30:00.000Z"),
      pickedUpAt: new Date("2026-09-07T08:15:00.000Z"),
      plannedDate: createdAt,
      preparationGroup: { code: "PG-26-0001", items: [item] },
      proof: null,
      recipientName: "Recepție",
      recipientRole: "Asistent",
      rescheduledFor: null,
      sequenceOrder: 1,
      status: "DELIVERED",
      updatedAt: new Date("2026-09-07T09:00:00.000Z"),
      version: 4,
    };
    const updatePreparationItems = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      auditLog: { create: vi.fn() },
      delivery: {
        findUnique: vi.fn().mockResolvedValue(current),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          code: current.code,
          failureDetails: null,
          failureReasonCode: null,
          preparationGroup: { items: [{ workOrderId: "work-1" }] },
        }),
        update: vi.fn().mockResolvedValue(updated),
      },
      deliveryEvent: { create: vi.fn() },
      deliveryPreparationItem: { updateMany: updatePreparationItems },
      workLogisticsState: { updateMany: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new DeliveryTransitionService(
      { hasPermission: vi.fn().mockResolvedValue({ allowed: true }) } as never,
      { createAccessContext: vi.fn().mockResolvedValue({ canAssign: true, userId: "courier-1" }) } as never,
      {
        createForCompletedDelivery: vi.fn().mockResolvedValue({
          auditAction: "delivery.proof.signature_captured",
          eventType: DeliveryEventType.DELIVERY_SIGNATURE_CAPTURED,
          metadata: { actorUserId: "courier-1", overrideReasonCode: null, proofId: "proof-1", signed: true, signatureHashPrefix: "abc" },
        }),
      } as never,
      {} as never,
      prisma as never,
      { publishDeliveryInTransaction: vi.fn() } as never,
    );

    const result = await service.complete({
      actor: { displayName: "Curier Test", email: "curier@example.test", id: "courier-1", isActive: true, mustChangePassword: false },
      requestMetadata: {},
    }, "delivery-1", {
      confirmedHandover: true,
      recipientName: "Recepție",
      signature: { strokes: [] },
      version: 3,
    });

    expect(result.works).toEqual([expect.objectContaining({ workCode: "WO-26-0001" })]);
    expect(updatePreparationItems).toHaveBeenCalledWith({
      data: {
        isActive: false,
        removedAt: expect.any(Date),
        removedByUserId: "courier-1",
      },
      where: {
        groupId: "group-1",
        isActive: true,
      },
    });
  });
});
