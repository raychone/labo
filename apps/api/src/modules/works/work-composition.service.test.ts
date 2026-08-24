import { describe, expect, it, vi } from "vitest";

import { WorkItemsService } from "./work-items.service.js";

const now = new Date("2026-08-24T10:00:00.000Z");

function item(id: string, tooth: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    workOrderId: "work_1",
    sortOrder: 0,
    scope: "TOOTH" as const,
    workTypeId: "type_1",
    customWorkTypeSnapshot: null,
    shade: null,
    implantPlatform: null,
    customImplantPlatformSnapshot: null,
    restorationType: null,
    technicalCodeNotes: null,
    notes: null,
    baseUnitPriceMinor: null,
    totalPriceMinor: null,
    currency: null,
    commercialSnapshot: null,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    workType: { code: "T", id: "type_1", name: "Coroană", symbol: "C" },
    teeth: [{ id: `${id}-tooth`, workOrderItemId: id, fdiTooth: tooth, sortOrder: 0, createdAt: now }],
    ...overrides,
  };
}

function setup(initialItems: readonly unknown[], initialConnections: readonly unknown[] = []) {
  const prisma = {
    workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "work_1", code: "WO-1" }) },
    workType: { findUnique: vi.fn().mockResolvedValue({ id: "type_1" }) },
    workOrderItem: {
      findMany: vi.fn().mockResolvedValueOnce(initialItems),
      create: vi.fn().mockResolvedValue(item("item_new", 21)),
      update: vi.fn().mockResolvedValue(item("item_1", 11)),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    workOrderToothConnection: {
      findMany: vi.fn().mockResolvedValueOnce(initialConnections),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockImplementation(async ({ data }: { data: { toothA: number; toothB: number } }) => ({ id: `connection-${data.toothA}-${data.toothB}`, workOrderId: "work_1", createdAt: now, ...data })),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
  const authorizationService = { requirePermission: vi.fn().mockResolvedValue({ allowed: true }) };
  const auditService = { record: vi.fn().mockResolvedValue(undefined) };
  const toothConnectionsService = { cleanupOrphanedConnections: vi.fn() };
  return { prisma, authorizationService, auditService, subject: new WorkItemsService(authorizationService as never, auditService as never, prisma as never, toothConnectionsService as never) };
}

describe("WorkItemsService.updateComposition", () => {
  it("reconciles existing and new items plus connections in one transaction", async () => {
    const existing = item("item_1", 11);
    const created = item("item_new", 21, { sortOrder: 1 });
    const { subject, prisma } = setup([existing], [],);
    prisma.workOrderItem.findMany.mockResolvedValueOnce([existing, created]);
    prisma.workOrderToothConnection.findMany.mockResolvedValueOnce([{ id: "connection-11-21", workOrderId: "work_1", toothA: 11, toothB: 21, createdAt: now }]);

    const result = await subject.updateComposition({
      actorUserId: "user_1",
      workOrderId: "work_1",
      dto: {
        items: [
          { id: "item_1", scope: "TOOTH", teeth: [11], workTypeId: "type_1" },
          { scope: "TOOTH", teeth: [21], workTypeId: "type_1" },
        ],
        toothConnections: [{ toothA: 11, toothB: 21 }],
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.workOrderItem.create).toHaveBeenCalledTimes(1);
    expect(prisma.workOrderItem.update).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(2);
    expect(result.toothConnections).toHaveLength(1);
  });

  it("archives removed items and reconciles obsolete connections without stale connection IDs", async () => {
    const existing = item("item_1", 11);
    const removed = item("item_2", 12, { sortOrder: 1 });
    const connection = { id: "old-connection", workOrderId: "work_1", toothA: 11, toothB: 12, createdAt: now };
    const { subject, prisma } = setup([existing, removed], [connection]);
    prisma.workOrderItem.findMany.mockResolvedValueOnce([existing]);
    prisma.workOrderToothConnection.findMany.mockResolvedValueOnce([]);

    await subject.updateComposition({ actorUserId: "user_1", workOrderId: "work_1", dto: { items: [{ id: "item_1", scope: "TOOTH", teeth: [11], workTypeId: "type_1" }], toothConnections: [] } });

    expect(prisma.workOrderItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["item_2"] } }) }));
    expect(prisma.workOrderToothConnection.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["old-connection"] } }) }));
  });

  it("rejects a connection absent from the final composition before opening the transaction", async () => {
    const existing = item("item_1", 11);
    const { subject, prisma } = setup([existing]);

    await expect(subject.updateComposition({ actorUserId: "user_1", workOrderId: "work_1", dto: { items: [{ id: "item_1", scope: "TOOTH", teeth: [11], workTypeId: "type_1" }], toothConnections: [{ toothA: 11, toothB: 12 }] } })).rejects.toThrow("compoziția finală");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not persist a client draft ID and rolls back at the transaction boundary on failure", async () => {
    const existing = item("item_1", 11);
    const { subject, prisma } = setup([existing]);
    prisma.workOrderItem.findMany.mockResolvedValueOnce([existing]);
    prisma.$transaction.mockRejectedValueOnce(new Error("simulated failure"));

    await expect(subject.updateComposition({ actorUserId: "user_1", workOrderId: "work_1", dto: { items: [{ id: "item_1", scope: "TOOTH", teeth: [11], workTypeId: "type_1" }, { scope: "TOOTH", teeth: [21], workTypeId: "type_1" }], toothConnections: [] } })).rejects.toThrow("simulated failure");
    expect(prisma.workOrderItem.create).not.toHaveBeenCalled();
    expect(prisma.workOrderItem.updateMany).not.toHaveBeenCalled();
  });

  it("preserves an existing custom WorkType snapshot during a shade-only edit", async () => {
    const existing = item("item_custom", 11, { workTypeId: null, workType: null, customWorkTypeSnapshot: { value: "Zirconiu personalizat" } });
    const { subject, prisma } = setup([existing]);
    prisma.workOrderItem.findMany.mockResolvedValueOnce([existing]);
    prisma.workOrderToothConnection.findMany.mockResolvedValueOnce([]);

    await subject.updateComposition({ actorUserId: "user_1", workOrderId: "work_1", dto: { items: [{ id: "item_custom", scope: "TOOTH", teeth: [11], workTypeId: null, shade: "A2" }], toothConnections: [] } });

    expect(prisma.workOrderItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ shade: "A2", customWorkTypeSnapshot: { value: "Zirconiu personalizat" } }) }));
  });

  it("preserves custom WorkType and implant-platform snapshots during notes and tooth edits", async () => {
    const existing = item("item_custom", 11, { workTypeId: null, workType: null, customWorkTypeSnapshot: { name: "Coroană custom" }, implantPlatform: "Alt tip", customImplantPlatformSnapshot: { value: "Platformă custom" } });
    const { subject, prisma } = setup([existing]);
    prisma.workOrderItem.findMany.mockResolvedValueOnce([existing]);
    prisma.workOrderToothConnection.findMany.mockResolvedValueOnce([]);

    await subject.updateComposition({ actorUserId: "user_1", workOrderId: "work_1", dto: { items: [{ id: "item_custom", scope: "TOOTH", teeth: [12], workTypeId: null, notes: "notă nouă", implantPlatform: "Alt tip" }], toothConnections: [] } });

    expect(prisma.workOrderItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ notes: "notă nouă", customWorkTypeSnapshot: { name: "Coroană custom" }, customImplantPlatformSnapshot: { value: "Platformă custom" } }) }));
  });

  it("rejects an empty canonical composition before touching items or connections", async () => {
    const existing = item("item_1", 11);
    const connection = { id: "connection-11-12", workOrderId: "work_1", toothA: 11, toothB: 12, createdAt: now };
    const { subject, prisma } = setup([existing], [connection]);

    await expect(subject.updateComposition({ actorUserId: "user_1", workOrderId: "work_1", dto: { items: [], toothConnections: [] } })).rejects.toThrow("Lucrarea trebuie să conțină cel puțin o componentă.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.workOrderItem.update).not.toHaveBeenCalled();
    expect(prisma.workOrderItem.updateMany).not.toHaveBeenCalled();
    expect(prisma.workOrderToothConnection.deleteMany).not.toHaveBeenCalled();
  });
});
