import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ToothConnectionsService } from "./tooth-connections.service.js";

const now = new Date("2026-08-24T10:00:00.000Z");

function item(scope: string, teeth: number[] = [], archivedAt: Date | null = null) {
  return { archivedAt, scope, teeth: teeth.map((fdiTooth) => ({ fdiTooth })) };
}

function setup(items = [item("TOOTH", [11]), item("TOOTH", [12]), item("TOOTH", [21]), item("TOOTH", [41]), item("TOOTH", [31])]) {
  const authorizationService = {
    hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"] }),
    requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"] }),
  };
  const auditService = { record: vi.fn().mockResolvedValue(undefined) };
  const prisma = {
    workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "work_1", code: "WO-1" }) },
    workOrderItem: { findMany: vi.fn().mockResolvedValue(items) },
    workOrderToothConnection: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: "connection_1", toothA: 11, toothB: 12, workOrderId: "work_1" }),
      create: vi.fn().mockResolvedValue({ id: "connection_1", toothA: 11, toothB: 12, workOrderId: "work_1", createdAt: now }),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { authorizationService, auditService, prisma, subject: new ToothConnectionsService(authorizationService as never, auditService as never, prisma as never) };
}

describe("ToothConnectionsService", () => {
  it.each([
    [11, 12],
    [11, 21],
    [41, 31],
  ])("creates valid canonical connection %s-%s", async (toothA, toothB) => {
    const { subject, prisma, auditService } = setup();
    prisma.workOrderToothConnection.create.mockResolvedValueOnce({ id: "connection_1", toothA: Math.min(toothA, toothB), toothB: Math.max(toothA, toothB), workOrderId: "work_1", createdAt: now });

    const result = await subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA, toothB } });

    expect(result.workOrderId).toBe("work_1");
    expect(prisma.workOrderToothConnection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ workOrderId: "work_1" }) }));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.tooth_connection_added", metadata: expect.objectContaining({ toothNumbers: expect.any(Array) }) }));
  });

  it.each([[11, 13], [11, 31], [11, 99]])("rejects invalid pair %s-%s", async (toothA, toothB) => {
    const { subject, prisma } = setup();
    await expect(subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA, toothB } })).rejects.toThrow();
    expect(prisma.workOrderToothConnection.create).not.toHaveBeenCalled();
  });

  it("rejects a valid adjacent pair when either tooth is absent from active composition", async () => {
    const { subject, prisma } = setup([item("TOOTH", [11])]);
    await expect(subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA: 11, toothB: 12 } })).rejects.toThrow("compoziția canonică activă");
    expect(prisma.workOrderToothConnection.create).not.toHaveBeenCalled();
  });

  it("expands semantic arch scopes and does not require item-level fake teeth", async () => {
    const { subject, prisma } = setup([item("LOWER_ARCH"), item("UPPER_ARCH")]);
    await subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA: 18, toothB: 17 } });
    await subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA: 41, toothB: 31 } });
    expect(prisma.workOrderItem.findMany).toHaveBeenCalled();
  });

  it("does not let CASE alone imply all teeth", async () => {
    const { subject } = setup([item("CASE")]);
    await expect(subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA: 11, toothB: 12 } })).rejects.toThrow("compoziția canonică activă");
  });

  it("normalizes reversed pairs and maps duplicate persistence to a conflict", async () => {
    const { subject, prisma } = setup();
    prisma.workOrderToothConnection.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
    await expect(subject.create({ actorUserId: "user_1", workOrderId: "work_1", dto: { toothA: 12, toothB: 11 } })).rejects.toThrow("există deja");
    expect(prisma.workOrderToothConnection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toothA: 12, toothB: 11 }) }));
  });

  it("lists deterministic connections and removes with audit", async () => {
    const { subject, prisma, auditService } = setup();
    prisma.workOrderToothConnection.findMany.mockResolvedValueOnce([
      { id: "connection_2", toothA: 11, toothB: 21, workOrderId: "work_1", createdAt: now },
      { id: "connection_1", toothA: 11, toothB: 12, workOrderId: "work_1", createdAt: now },
    ]);
    const result = await subject.list("user_1", "work_1");
    expect(result).toHaveLength(2);

    await subject.remove({ actorUserId: "user_1", workOrderId: "work_1", connectionId: "connection_1" });
    expect(prisma.workOrderToothConnection.delete).toHaveBeenCalledWith({ where: { id: "connection_1" } });
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.tooth_connection_removed" }));
  });

  it("protects assigned-only unreadable work orders", async () => {
    const { subject, authorizationService, prisma } = setup();
    authorizationService.hasPermission.mockImplementation(async ({ permission }: { readonly permission: string }) => permission === "works.read_assigned"
      ? { allowed: true, effectiveScopes: ["ASSIGNED"] }
      : { allowed: false, effectiveScopes: [] });
    prisma.workOrder.findFirst.mockResolvedValueOnce(null);
    await expect(subject.list("assigned_user", "other_work_order")).rejects.toThrow("Lucrarea nu a fost găsită");
    expect(prisma.workOrderToothConnection.findMany).not.toHaveBeenCalled();
  });

  it("cleans orphaned connections from the whole active case composition", async () => {
    const { subject, prisma } = setup([item("TOOTH", [11]), item("TOOTH", [12])]);
    await subject.cleanupOrphanedConnections(prisma as never, "work_1");
    expect(prisma.workOrderToothConnection.deleteMany).toHaveBeenCalledWith({
      where: { workOrderId: "work_1", OR: [{ toothA: { notIn: [12, 11] } }, { toothB: { notIn: [12, 11] } }] },
    });
  });

  it("keeps teeth represented by another active item", async () => {
    const { subject, prisma } = setup([item("LOWER_ARCH"), item("TOOTH", [11])]);
    await subject.cleanupOrphanedConnections(prisma as never, "work_1");
    expect(prisma.workOrderToothConnection.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }));
  });
});
