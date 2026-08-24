import { describe, expect, it, vi } from "vitest";

import { WorkItemsService } from "./work-items.service.js";

function record(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-08-24T10:00:00.000Z");
  return {
    id: "item_1",
    workOrderId: "work_1",
    sortOrder: 0,
    scope: "LOWER_ARCH" as const,
    workTypeId: "type_1",
    customWorkTypeSnapshot: null,
    shade: null,
    implantPlatform: null,
    customImplantPlatformSnapshot: null,
    restorationType: null,
    technicalCodeNotes: null,
    notes: null,
    baseUnitPriceMinor: 4000,
    totalPriceMinor: 4000,
    currency: "RON",
    commercialSnapshot: null,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    workType: { code: "GUT", id: "type_1", name: "Gutieră", symbol: "G" },
    teeth: [],
    ...overrides,
  };
}

function service() {
  const authorizationService = {
    hasPermission: vi.fn().mockResolvedValue({ allowed: true }),
    requirePermission: vi.fn().mockResolvedValue({ allowed: true }),
  };
  const auditService = { record: vi.fn().mockResolvedValue(undefined) };
  const prisma = {
    workOrder: {
      findFirst: vi.fn().mockResolvedValue({ id: "work_1", code: "WO-1" }),
      findUnique: vi.fn().mockResolvedValue({ id: "work_1", code: "WO-1" }),
    },
    workType: { findUnique: vi.fn().mockResolvedValue({ id: "type_1" }) },
    workOrderItem: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(record()),
      update: vi.fn().mockResolvedValue(record()),
    },
    $transaction: vi.fn(),
  };
  const toothConnectionsService = { cleanupOrphanedConnections: vi.fn().mockResolvedValue(undefined) };
  prisma.$transaction = vi.fn().mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
  return { authorizationService, auditService, prisma, subject: new WorkItemsService(authorizationService as never, auditService as never, prisma as never, toothConnectionsService as never) };
}

describe("WorkItemsService", () => {
  it("creates one item without creating another WorkOrder identity", async () => {
    const { subject, prisma, auditService } = service();
    const result = await subject.create({
      actorUserId: "user_1",
      workOrderId: "work_1",
      dto: { scope: "TOOTH", teeth: [21], workTypeId: "type_1" },
    });

    expect(result.workOrderId).toBe("work_1");
    expect(prisma.workOrderItem.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ workOrder: { connect: { id: "work_1" } }, teeth: { create: [{ fdiTooth: 21, sortOrder: 0 }] } }),
    }));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.item_added", resourceType: "work_order_item" }));
  });

  it("rejects duplicate teeth before persistence", async () => {
    const { subject, prisma } = service();

    await expect(subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { scope: "TEETH", teeth: [11, 11], workTypeId: "type_1" } })).rejects.toThrow("Același dinte");
    expect(prisma.workOrderItem.create).not.toHaveBeenCalled();
  });

  it("archives an item instead of deleting its historical identity", async () => {
    const { subject, prisma, auditService } = service();
    prisma.workOrderItem.findFirst.mockResolvedValueOnce(record());

    await expect(subject.archive({ actorUserId: "user_1", workOrderId: "work_1", itemId: "item_1" })).resolves.toEqual({ archived: true });
    expect(prisma.workOrderItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ archivedByUserId: "user_1", archivedAt: expect.any(Date) }),
      where: { id: "item_1" },
    }));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.item_removed" }));
  });

  it("lists active items as components of one case, not as work-order rows", async () => {
    const { subject, prisma } = service();
    prisma.workOrderItem.findMany.mockResolvedValue([record({ id: "item_1", sortOrder: 0 }), record({ id: "item_2", sortOrder: 1 })]);

    const result = await subject.list("user_1", "work_1");
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.workOrderId === "work_1")).toBe(true);
    expect(prisma.workOrderItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { workOrderId: "work_1", archivedAt: null } }));
  });

  it("does not let assigned-only permission enumerate an unrelated WorkOrder", async () => {
    const { subject, authorizationService, prisma } = service();
    authorizationService.hasPermission.mockImplementation(async ({ permission }: { readonly permission: string }) => permission === "works.read_assigned"
      ? { allowed: true, effectiveScopes: ["ASSIGNED"] }
      : { allowed: false, effectiveScopes: [] });
    prisma.workOrder.findFirst.mockResolvedValueOnce(null);

    await expect(subject.list("assigned_user", "other_work_order")).rejects.toThrow("Lucrarea nu a fost găsită");
    expect(prisma.workOrderItem.findMany).not.toHaveBeenCalled();
  });

  it("allows an assigned-only actor to read an actually visible WorkOrder", async () => {
    const { subject, authorizationService, prisma } = service();
    authorizationService.hasPermission.mockImplementation(async ({ permission }: { readonly permission: string }) => permission === "works.read_assigned"
      ? { allowed: true, effectiveScopes: ["ASSIGNED"] }
      : { allowed: false, effectiveScopes: [] });
    prisma.workOrder.findFirst.mockResolvedValueOnce({ id: "work_1" });
    prisma.workOrderItem.findMany.mockResolvedValueOnce([record()]);

    await expect(subject.list("assigned_user", "work_1")).resolves.toHaveLength(1);
    expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.any(Array) }) }));
  });

  it("clears stale teeth when TEETH changes to LOWER_ARCH", async () => {
    const { subject, prisma } = service();
    prisma.workOrderItem.findFirst.mockResolvedValueOnce(record({ scope: "TEETH", teeth: [{ fdiTooth: 11, sortOrder: 0 }, { fdiTooth: 12, sortOrder: 1 }] }));
    prisma.workOrderItem.update.mockResolvedValueOnce(record({ scope: "LOWER_ARCH", teeth: [] }));

    await subject.update({ actorUserId: "user_1", workOrderId: "work_1", itemId: "item_1", dto: { scope: "LOWER_ARCH" } });
    expect(prisma.workOrderItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ scope: "LOWER_ARCH", teeth: { deleteMany: {}, create: [] } }) }));
  });

  it("clears stale teeth when TOOTH changes to CASE", async () => {
    const { subject, prisma } = service();
    prisma.workOrderItem.findFirst.mockResolvedValueOnce(record({ scope: "TOOTH", teeth: [{ fdiTooth: 11, sortOrder: 0 }] }));
    prisma.workOrderItem.update.mockResolvedValueOnce(record({ scope: "CASE", teeth: [] }));

    await subject.update({ actorUserId: "user_1", workOrderId: "work_1", itemId: "item_1", dto: { scope: "CASE" } });
    expect(prisma.workOrderItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ scope: "CASE", teeth: { deleteMany: {}, create: [] } }) }));
  });

  it("requires a new valid tooth when LOWER_ARCH changes to TOOTH", async () => {
    const { subject, prisma } = service();
    prisma.workOrderItem.findFirst.mockResolvedValueOnce(record({ scope: "LOWER_ARCH", teeth: [] }));

    await expect(subject.update({ actorUserId: "user_1", workOrderId: "work_1", itemId: "item_1", dto: { scope: "TOOTH" } })).rejects.toThrow("exact un dinte");
    expect(prisma.workOrderItem.update).not.toHaveBeenCalled();
  });

  it("persists LOWER_ARCH to TOOTH with the selected tooth atomically", async () => {
    const { subject, prisma } = service();
    prisma.workOrderItem.findFirst.mockResolvedValueOnce(record({ scope: "LOWER_ARCH", teeth: [] }));
    prisma.workOrderItem.update.mockResolvedValueOnce(record({ scope: "TOOTH", teeth: [{ fdiTooth: 21, sortOrder: 0 }] }));

    await subject.update({ actorUserId: "user_1", workOrderId: "work_1", itemId: "item_1", dto: { scope: "TOOTH", teeth: [21] } });
    expect(prisma.workOrderItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ scope: "TOOTH", teeth: { deleteMany: {}, create: [{ fdiTooth: 21, sortOrder: 0 }] } }) }));
  });
});
