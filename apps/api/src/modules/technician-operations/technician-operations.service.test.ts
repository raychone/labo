import { BadRequestException } from "@nestjs/common";
import type { TechnicianOperation, TechnicianOperationRate } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { TechnicianOperationsService } from "./technician-operations.service.js";

function operation(overrides: Partial<TechnicianOperation> = {}): TechnicianOperation {
  return {
    archivedAt: null,
    archivedByUserId: null,
    code: "CERAMICA",
    createdAt: new Date("2026-08-20T10:00:00.000Z"),
    createdByUserId: "manager_1",
    description: "Stratificare ceramică",
    id: "operation_1",
    isActive: true,
    name: "Ceramică",
    pricingUnit: null,
    sortOrder: 0,
    updatedAt: new Date("2026-08-20T10:00:00.000Z"),
    updatedByUserId: "manager_1",
    version: 1,
    ...overrides,
  };
}

function rate(overrides: Partial<TechnicianOperationRate> = {}) {
  return {
    createdAt: new Date("2026-08-20T10:00:00.000Z"),
    createdByUserId: "manager_1",
    currency: "RON",
    effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
    id: "rate_1",
    operationId: "operation_1",
    rateMinor: 3000,
    technicianId: "tech_1",
    validUntil: null,
    ...overrides,
    operation: operation({ id: overrides.operationId ?? "operation_1" }),
    technician: {
      displayName: overrides.technicianId === "tech_2" ? "Tehnician B" : "Tehnician A",
      id: overrides.technicianId ?? "tech_1",
    },
  };
}

function performedOperation(overrides: Record<string, unknown> = {}) {
  const operationId = String(overrides.operationId ?? "operation_1");
  const technicianId = String(overrides.technicianId ?? "tech_1");
  const workOrderId = String(overrides.workOrderId ?? "work_1");
  return {
    createdAt: new Date("2026-08-20T10:05:00.000Z"),
    createdByUserId: "tech_1",
    currency: "RON",
    earningMinor: 3000,
    id: "performed_1",
    operationId,
    performedAt: new Date("2026-08-20T10:05:00.000Z"),
    rateId: "rate_1",
    removalReason: null,
    removedAt: null,
    removedByUserId: null,
    technicianId,
    workOrderId,
    ...overrides,
    operation: operation({ id: operationId }),
    technician: {
      displayName: technicianId === "tech_2" ? "Tehnician B" : "Tehnician A",
      id: technicianId,
    },
    workOrder: {
      code: workOrderId === "work_2" ? "WO-26-0002" : "WO-26-0001",
      id: workOrderId,
      patientName: workOrderId === "work_2" ? "Maria Ionescu" : "Ion Pop",
    },
  };
}

function createService(prisma: unknown): TechnicianOperationsService {
  return new TechnicianOperationsService(prisma as PrismaService);
}

describe("TechnicianOperationsService", () => {
  it("creates a technician operation separately from work types and audits it", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue(operation({ code: "GLAZE", name: "Glazurare" }));
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          technicianOperation: { create },
        }),
      ),
    });

    const result = await service.createOperation(
      { actorUserId: "manager_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      { code: "glaze", description: null, name: "Glazurare", pricingUnit: "PER_ELEMENT" },
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "GLAZE",
        createdByUserId: "manager_1",
        name: "Glazurare",
      }),
    });
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("workTypeId");
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "technician_operations.created",
        resourceType: "technician_operation",
      }),
    });
    expect(result.code).toBe("GLAZE");
  });

  it("resolves different rates for different technicians on the same operation", async () => {
    const service = createService({
      technicianOperationRate: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(rate({ id: "rate_a", rateMinor: 3000, technicianId: "tech_1" }))
          .mockResolvedValueOnce(rate({ id: "rate_b", rateMinor: 4500, technicianId: "tech_2" })),
      },
    });

    await expect(service.resolveRate("tech_1", "operation_1", new Date("2026-09-10T00:00:00.000Z"))).resolves.toMatchObject({
      rateMinor: 3000,
      technicianId: "tech_1",
    });
    await expect(service.resolveRate("tech_2", "operation_1", new Date("2026-09-10T00:00:00.000Z"))).resolves.toMatchObject({
      rateMinor: 4500,
      technicianId: "tech_2",
    });
  });

  it("sets a future-facing technician rate and closes the previous open rate", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue(rate({ id: "old_rate", validUntil: new Date("2026-09-01T00:00:00.000Z") }));
    const create = vi.fn().mockResolvedValue(rate({ id: "new_rate", rateMinor: 4000 }));
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          technicianOperation: { findFirst: vi.fn().mockResolvedValue({ id: "operation_1" }) },
          technicianOperationRate: {
            create,
            findFirst: vi.fn().mockResolvedValue(rate({ effectiveFrom: new Date("2026-08-20T00:00:00.000Z"), id: "old_rate" })),
            update,
          },
          user: { findFirst: vi.fn().mockResolvedValue({ id: "tech_1" }) },
        }),
      ),
    });

    const result = await service.setRate(
      { actorUserId: "manager_1", requestMetadata: {} },
      {
        currency: "RON",
        effectiveFrom: "2026-09-01T00:00:00.000Z",
        operationId: "operation_1",
        rateMinor: 4000,
        technicianId: "tech_1",
      },
    );

    expect(update).toHaveBeenCalledWith({
      data: { validUntil: new Date("2026-09-01T00:00:00.000Z") },
      where: { id: "old_rate" },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rateMinor: 4000,
        technicianId: "tech_1",
      }),
      include: expect.any(Object),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "technician_rates.set",
        resourceType: "technician_operation_rate",
      }),
    });
    expect(result.rateMinor).toBe(4000);
  });

  it("requires explicit confirmation before changing a classified maneuver unit and closes active rates", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const before = operation({ pricingUnit: "PER_ELEMENT" });
    const update = vi.fn().mockResolvedValue(operation({ pricingUnit: "PER_CASE" }));
    const closeRates = vi.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      technicianOperation: { findUnique: vi.fn().mockResolvedValue(before) },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        auditLog: { create: auditCreate },
        technicianOperation: { update },
        technicianOperationRate: { updateMany: closeRates },
      })),
    });

    await expect(service.updateOperation(
      { actorUserId: "manager_1", requestMetadata: {} },
      "operation_1",
      { code: "CERAMICA", description: "Stratificare ceramică", name: "Ceramică", pricingUnit: "PER_CASE" },
    )).rejects.toThrow("Confirmă explicit");
    expect(closeRates).not.toHaveBeenCalled();

    await service.updateOperation(
      { actorUserId: "manager_1", requestMetadata: {} },
      "operation_1",
      { code: "CERAMICA", description: "Stratificare ceramică", name: "Ceramică", pricingUnit: "PER_CASE", confirmPricingUnitChange: true },
    );
    expect(closeRates).toHaveBeenCalledWith({ data: { validUntil: expect.any(Date) }, where: { operationId: "operation_1", validUntil: null } });
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "technician_operations.unit_changed", metadata: expect.objectContaining({ from: "Per element", to: "Per lucrare" }) }) }));
  });

  it("rejects setting a rate for an inactive or missing technician", async () => {
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          technicianOperation: { findFirst: vi.fn().mockResolvedValue({ id: "operation_1" }) },
          user: { findFirst: vi.fn().mockResolvedValue(null) },
        }),
      ),
    });

    await expect(
      service.setRate(
        { actorUserId: "manager_1", requestMetadata: {} },
        { operationId: "operation_1", rateMinor: 3000, technicianId: "not_tech" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("snapshots the applicable technician rate when an operation is performed", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue(performedOperation({
      earningMinor: 3000,
      rateId: "rate_30",
    }));
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          technicianOperation: { findFirst: vi.fn().mockResolvedValue({ code: "CERAMICA", id: "operation_1", name: "Ceramică" }) },
          technicianOperationRate: { findFirst: vi.fn().mockResolvedValue(rate({ id: "rate_30", rateMinor: 3000 })) },
          technicianPerformedOperation: {
            create,
            findFirst: vi.fn().mockResolvedValue(null),
          },
          workOrder: { findUnique: vi.fn().mockResolvedValue({ assignedTechnicianId: "tech_1", claimedByUserId: "tech_1", id: "work_1" }) },
        }),
      ),
    });

    const result = await service.performOperation(
      { actorUserId: "tech_1", requestMetadata: {} },
      { operationId: "operation_1", workOrderId: "work_1" },
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "RON",
        earningMinor: 3000,
        rateId: "rate_30",
        technicianId: "tech_1",
        workOrderId: "work_1",
      }),
      include: expect.any(Object),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "technician_performed_operations.created",
        resourceType: "technician_performed_operation",
      }),
    });
    expect(result.earningMinor).toBe(3000);
  });

  it("reads the immutable earning snapshot instead of recalculating from later rates", async () => {
    const service = createService({
      technicianPerformedOperation: {
        findMany: vi.fn().mockResolvedValue([
          performedOperation({
            earningMinor: 3000,
            rateId: "old_rate",
          }),
        ]),
      },
      workOrder: { findUnique: vi.fn().mockResolvedValue({ assignedTechnicianId: "tech_1", claimedByUserId: "tech_1", id: "work_1" }) },
    });

    const result = await service.listPerformedOperations({ actorUserId: "tech_1", requestMetadata: {} }, "work_1");

    expect(result).toHaveLength(1);
    expect(result[0]?.earningMinor).toBe(3000);
    expect(result[0]?.rateId).toBe("old_rate");
  });

  it("soft-removes performed operations without changing the earning snapshot", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const existing = performedOperation({ earningMinor: 3000 });
    const update = vi.fn().mockResolvedValue(performedOperation({
      earningMinor: 3000,
      removalReason: "Corecție",
      removedAt: new Date("2026-08-20T10:10:00.000Z"),
      removedByUserId: "tech_1",
    }));
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          technicianPerformedOperation: {
            findUnique: vi.fn().mockResolvedValue(existing),
            update,
          },
          workOrder: { findUnique: vi.fn().mockResolvedValue({ assignedTechnicianId: "tech_1", claimedByUserId: "tech_1", id: "work_1" }) },
        }),
      ),
    });

    const result = await service.removePerformedOperation(
      { actorUserId: "tech_1", requestMetadata: {} },
      "performed_1",
      { reason: "Corecție" },
    );

    expect(update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        removalReason: "Corecție",
        removedByUserId: "tech_1",
      }),
      include: expect.any(Object),
      where: { id: "performed_1" },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "technician_performed_operations.removed",
        metadata: expect.objectContaining({ earningMinor: 3000, rateId: "rate_1" }),
      }),
    });
    expect(result.earningMinor).toBe(3000);
  });

  it("aggregates own daily earnings from immutable performed-operation snapshots", async () => {
    const findMany = vi.fn().mockResolvedValue([
      performedOperation({ earningMinor: 3000, id: "performed_1", workOrderId: "work_1" }),
      performedOperation({ earningMinor: 1500, id: "performed_2", operationId: "operation_2", workOrderId: "work_1" }),
      performedOperation({ earningMinor: 2500, id: "performed_3", workOrderId: "work_2" }),
    ]);
    const rateFindFirst = vi.fn();
    const service = createService({
      technicianOperationRate: { findFirst: rateFindFirst },
      technicianPerformedOperation: { findMany },
      user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Tehnician A", id: "tech_1" }) },
    });

    const result = await service.listOwnEarnings(
      { actorUserId: "tech_1", requestMetadata: {} },
      { date: "2026-08-20", period: "DAY" },
    );

    expect(findMany).toHaveBeenCalledWith({
      include: expect.any(Object),
      orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
      where: expect.objectContaining({
        performedAt: {
          gte: new Date("2026-08-20T00:00:00.000Z"),
          lt: new Date("2026-08-21T00:00:00.000Z"),
        },
        removedAt: null,
        technicianId: "tech_1",
      }),
    });
    expect(rateFindFirst).not.toHaveBeenCalled();
    expect(result.totalMinor).toBe(7000);
    expect(result.settlementStatus).toBe("EARNED_NOT_SETTLED");
    expect(result.works).toHaveLength(2);
    expect(result.works[0]?.totalMinor).toBe(4500);
  });

  it("lets manager aggregate monthly earnings for a selected technician", async () => {
    const service = createService({
      technicianPerformedOperation: {
        findMany: vi.fn().mockResolvedValue([
          performedOperation({ earningMinor: 4000, technicianId: "tech_2", workOrderId: "work_2" }),
        ]),
      },
      user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Tehnician B", id: "tech_2" }) },
    });

    const result = await service.listManagerEarnings({ month: "2026-08", period: "MONTH", technicianId: "tech_2" });

    expect(result.periodStart).toBe("2026-08-01T00:00:00.000Z");
    expect(result.periodEnd).toBe("2026-09-01T00:00:00.000Z");
    expect(result.technician?.id).toBe("tech_2");
    expect(result.totalMinor).toBe(4000);
    expect(result.works[0]?.operations[0]?.earningMinor).toBe(4000);
  });

  it("shows only payments from the selected earnings period", async () => {
    const paymentFindMany = vi.fn().mockResolvedValue([]);
    const service = createService({
      technicianPerformedOperation: { findMany: vi.fn().mockResolvedValue([]) },
      technicianPayment: { findMany: paymentFindMany },
      user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Tehnician A", id: "tech_1" }) },
    });

    await service.listManagerEarnings({ month: "2026-09", period: "MONTH", technicianId: "tech_1" });

    expect(paymentFindMany).toHaveBeenCalledWith({
      orderBy: { paidAt: "desc" },
      where: {
        paidAt: {
          gte: new Date("2026-09-01T00:00:00.000Z"),
          lt: new Date("2026-10-01T00:00:00.000Z"),
        },
        technicianId: "tech_1",
      },
    });
  });

  it("rejects a payment that exceeds earnings completed by the payment date", async () => {
    const paymentCreate = vi.fn();
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          technicianPerformedOperation: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { earningMinor: 3000 } }),
          },
          technicianPayment: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountMinor: 1000 } }),
            create: paymentCreate,
          },
          user: { findFirst: vi.fn().mockResolvedValue({ id: "tech_1", role: "TEHNICIAN" }) },
        }),
      ),
    });

    await expect(
      service.createPayment(
        { actorUserId: "manager_1", requestMetadata: {} },
        { amountMinor: 2500, paidAt: "2026-08-21T12:00:00.000Z", technicianId: "tech_1" },
      ),
    ).rejects.toThrow("Plata nu poate depăși câștigurile realizate până la data plății.");
    expect(paymentCreate).not.toHaveBeenCalled();
  });
});
