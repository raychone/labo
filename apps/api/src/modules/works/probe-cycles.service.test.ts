import { describe, expect, it, vi } from "vitest";

import { ProbeCyclesService } from "./probe-cycles.service.js";

describe("ProbeCyclesService / B10", () => {
  function createAuthorization() {
    return { hasPermission: vi.fn().mockResolvedValue({ allowed: true }), requirePermission: vi.fn().mockResolvedValue(undefined) } as never;
  }

  it("allows ACTIVE ProbeCycle correction and records the historical names", async () => {
    const audit = { record: vi.fn() };
    const cycle = { id: "cycle-1", sequence: 1, status: "ACTIVE" as const, probeTypeId: "pt-1", probeTypeNameSnapshot: "Lingură", openedAt: new Date("2026-08-24T08:00:00.000Z"), completedAt: null, deadlineAt: new Date("2026-08-25T08:00:00.000Z"), probeType: { id: "pt-1", name: "Lingură", sortOrder: 0, isArchived: false } };
    const prisma = { workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1" }) }, probeCycle: { findFirst: vi.fn().mockResolvedValue(cycle), update: vi.fn().mockResolvedValue({ ...cycle, probeTypeId: "pt-2", probeTypeNameSnapshot: "Biscuit", probeType: { ...cycle.probeType, id: "pt-2", name: "Biscuit" } }) } } as never;
    const service = new ProbeCyclesService(createAuthorization(), audit as never, prisma, { requireSelectable: vi.fn().mockResolvedValue({ id: "pt-2", name: "Biscuit" }) } as never);

    await expect(service.selectProbeType({ actorUserId: "reception", workOrderId: "wo-1", cycleId: "cycle-1", dto: { probeTypeId: "pt-2" } })).resolves.toMatchObject({ probeTypeNameSnapshot: "Biscuit" });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ previousProbeTypeName: "Lingură", nextProbeTypeName: "Biscuit" }) }));
  });

  it("rejects correction of a COMPLETED ProbeCycle", async () => {
    const prisma = { workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1" }) }, probeCycle: { findFirst: vi.fn().mockResolvedValue({ status: "COMPLETED", probeTypeId: "pt-1", probeTypeNameSnapshot: "Lingură" }), update: vi.fn() } };
    const service = new ProbeCyclesService(createAuthorization(), { record: vi.fn() } as never, prisma as never, { requireSelectable: vi.fn().mockResolvedValue({ id: "pt-2", name: "Biscuit" }) } as never);

    await expect(service.selectProbeType({ actorUserId: "manager", workOrderId: "wo-1", cycleId: "cycle-1", dto: { probeTypeId: "pt-2" } })).rejects.toThrow("Tipul unei probe finalizate nu mai poate fi modificat.");
    expect(prisma.probeCycle.update).not.toHaveBeenCalled();
  });

  it("rejects a second active cycle and never bypasses the selected global catalog", async () => {
    const prisma = {
      workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-26-0001" }), findUnique: vi.fn().mockResolvedValue({ activeProbeCycleId: "cycle-1" }) },
      probeCycle: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(prisma)),
    } as never;
    const authorization = { hasPermission: vi.fn().mockResolvedValue({ allowed: true }), requirePermission: vi.fn().mockResolvedValue(undefined) } as never;
    const types = { requireSelectable: vi.fn().mockResolvedValue({ id: "pt-1", name: "Lingură" }) } as never;
    const service = new ProbeCyclesService(authorization, { record: vi.fn() } as never, prisma, types);

    await expect(service.createNextActiveAfterReception({ actorUserId: "reception", workOrderId: "wo-1", probeTypeId: "pt-1", deadlineAt: "2026-08-25T10:00:00.000Z", returnedAfterCompletedCycle: true })).rejects.toThrow("deja o probă activă");
    expect((types as { requireSelectable: ReturnType<typeof vi.fn> }).requireSelectable).toHaveBeenCalledWith("pt-1", prisma);
  });

  it("rolls back the created candidate when the active-pointer compare-and-set loses", async () => {
    const created: string[] = [];
    const tx = {
      workOrder: { findUnique: vi.fn().mockResolvedValue({ activeProbeCycleId: null, status: "IN_ASTEPTARE", technicalReadiness: "PROBE_READY" }) },
      probeCycle: {
        findMany: vi.fn().mockResolvedValue([{ id: "cycle-1", completionOutcome: "PROBE_READY", sequence: 0, status: "COMPLETED" }]),
        create: vi.fn().mockImplementation(async () => { created.push("candidate"); return { id: "cycle-2", sequence: 1, status: "ACTIVE", probeTypeNameSnapshot: "Biscuit", openedAt: new Date(), completedAt: null, deadlineAt: new Date(), probeType: { id: "pt-1", name: "Biscuit", sortOrder: 0, isArchived: false } }; }),
      },
      workOrderUpdateCount: 0,
      workOrderUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    const prisma = {
      workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1" }) },
      $transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => {
        try { return await callback({ workOrder: { ...tx.workOrder, updateMany: tx.workOrderUpdateMany }, probeCycle: tx.probeCycle }); } catch (error) { created.length = 0; throw error; }
      }),
    } as never;
    const service = new ProbeCyclesService(createAuthorization(), { record: vi.fn() } as never, prisma, { requireSelectable: vi.fn().mockResolvedValue({ id: "pt-1", name: "Biscuit" }) } as never);

    await expect(service.createNextActiveAfterReception({ actorUserId: "reception", workOrderId: "wo-1", probeTypeId: "pt-1", deadlineAt: "2026-08-25T10:00:00.000Z", returnedAfterCompletedCycle: true })).rejects.toThrow("modificată simultan");
    expect(tx.workOrderUpdateMany).toHaveBeenCalled();
    expect(created).toEqual([]);
  });

  it("releases a received return to the technician queue and publishes the probe notification", async () => {
    const audit = { record: vi.fn() };
    const notifications = { publishProbeAvailable: vi.fn().mockResolvedValue(undefined), publishNewProbe: vi.fn().mockResolvedValue(undefined) };
    const probeType = { id: "pt-2", code: "LINGURA", name: "Lingură", sortOrder: 0, isArchived: false };
    const cycle = {
      id: "cycle-2",
      sequence: 2,
      status: "ACTIVE" as const,
      probeType,
      probeTypes: [{ probeType }],
      probeTypeNameSnapshot: "Lingură",
      openedAt: new Date("2026-08-26T08:00:00.000Z"),
      completedAt: null,
      deadlineAt: new Date("2026-08-29T08:00:00.000Z"),
    };
    const tx = {
      workOrder: {
        findUnique: vi.fn().mockResolvedValue({ activeProbeCycleId: null, status: "IN_ASTEPTARE", technicalReadiness: "PROBE_READY" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      probeCycle: {
        findMany: vi.fn().mockResolvedValue([{ id: "cycle-1", completionOutcome: "PROBE_READY", sequence: 0, status: "COMPLETED" }]),
        create: vi.fn().mockResolvedValue({ ...cycle, sequence: 1 }),
        update: vi.fn(),
      },
    };
    const prisma = {
      workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1", patientName: "Pacient Test", items: [] }) },
      $transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)),
    } as never;
    const service = new ProbeCyclesService(createAuthorization(), audit as never, prisma, { requireSelectable: vi.fn().mockResolvedValue(probeType) } as never, notifications as never);

    await expect(service.createNextActiveAfterReception({ actorUserId: "reception", workOrderId: "wo-1", probeTypeId: "pt-2", deadlineAt: "2026-08-29T08:00:00.000Z", returnedAfterCompletedCycle: true })).resolves.toMatchObject({ id: "cycle-2", sequence: 1 });
    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ activeProbeCycleId: "cycle-2", claimStatus: "UNCLAIMED", assignedTechnicianId: null, status: "RECEPTIE", technicalReadiness: null }),
      where: expect.objectContaining({ activeProbeCycleId: null, status: { not: "FINALIZATA" } }),
    }));
    expect(notifications.publishProbeAvailable).toHaveBeenCalledWith(expect.objectContaining({ workOrderId: "wo-1", sequence: 1, probeTypeName: "Lingură" }));
    expect(notifications.publishNewProbe).toHaveBeenCalledWith(expect.objectContaining({ workOrderId: "wo-1", sequence: 1, probeTypeName: "Lingură" }));
  });

  it("updates only the active probe deadline and synchronizes the current projection", async () => {
    const cycle = { id: "cycle-1", sequence: 1, status: "ACTIVE" as const, probeTypeId: "pt-1", probeTypeNameSnapshot: "Lingură", openedAt: new Date(), completedAt: null, deadlineAt: new Date("2026-08-25T10:00:00.000Z"), probeType: { id: "pt-1", name: "Lingură", sortOrder: 0, isArchived: false } };
    const workOrder = { id: "wo-1", code: "WO-1", status: "IN_LUCRU", activeProbeCycleId: "cycle-1", deadlineRevision: 2 };
    const tx = { probeCycle: { update: vi.fn().mockResolvedValue({ ...cycle, deadlineAt: new Date("2026-08-26T10:00:00.000Z") }) }, workOrder: { update: vi.fn() } };
    const prisma = { workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1" }), findUnique: vi.fn().mockResolvedValue(workOrder) }, probeCycle: { findFirst: vi.fn().mockResolvedValue(cycle) }, $transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)) } as never;
    const audit = { record: vi.fn() };
    const service = new ProbeCyclesService(createAuthorization(), audit as never, prisma, { requireSelectable: vi.fn() } as never);
    await expect(service.updateActiveDeadline({ actorUserId: "reception", workOrderId: "wo-1", cycleId: "cycle-1", deadlineAt: "2026-08-26T10:00:00.000Z" })).resolves.toMatchObject({ deadlineAt: "2026-08-26T10:00:00.000Z" });
    expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ effectiveDueAt: new Date("2026-08-26T10:00:00.000Z") }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.probe_deadline_changed" }));
  });

  it("rejects current deadline mutation after finalization", async () => {
    const cycle = { id: "cycle-1", status: "ACTIVE" as const, deadlineAt: new Date(), probeType: { id: "pt-1", name: "Lingură", sortOrder: 0, isArchived: false }, sequence: 1, probeTypeId: "pt-1", probeTypeNameSnapshot: "Lingură", openedAt: new Date(), completedAt: null };
    const prisma = { workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1" }), findUnique: vi.fn().mockResolvedValue({ status: "FINALIZATA", activeProbeCycleId: "cycle-1" }) }, probeCycle: { findFirst: vi.fn().mockResolvedValue(cycle) } } as never;
    const service = new ProbeCyclesService(createAuthorization(), { record: vi.fn() } as never, prisma, { requireSelectable: vi.fn() } as never);
    await expect(service.updateActiveDeadline({ actorUserId: "manager", workOrderId: "wo-1", cycleId: "cycle-1", deadlineAt: "2026-08-26T10:00:00.000Z" })).rejects.toThrow("finalizarea lucrării");
  });

  it("closes the active cycle as probe-ready and releases the case atomically", async () => {
    const audit = { record: vi.fn() };
    const activeCycle = { id: "cycle-1", sequence: 1, probeTypeNameSnapshot: "Lingură", deadlineAt: new Date("2026-08-25T10:00:00.000Z") };
    const tx = {
      probeCycle: { findFirst: vi.fn().mockResolvedValue(activeCycle), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workOrder: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workAssignmentEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1", status: "IN_LUCRU", activeProbeCycleId: "cycle-1", claimStatus: "CLAIMED", claimedByUserId: "tech-1", executionLegalEntityId: "entity-1", claimRevision: 3 }) },
      $transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)),
    } as never;
    const service = new ProbeCyclesService(createAuthorization(), audit as never, prisma, {} as never);

    await service.markProbeReady({ actorUserId: "tech-1", workOrderId: "wo-1" });

    expect(tx.probeCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ completionOutcome: "PROBE_READY", status: "COMPLETED" }) }));
    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ technicalReadiness: "PROBE_READY", activeProbeCycleId: null, claimStatus: "UNCLAIMED" }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.probe_ready" }));
  });

  it("closes the active cycle as terminal finalization and hides it from normal probe history", async () => {
    const audit = { record: vi.fn() };
    const notifications = { publishFinal: vi.fn().mockResolvedValue(undefined), publishBillingCandidate: vi.fn().mockResolvedValue(undefined) };
    const activeCycle = { id: "cycle-1", sequence: 2, probeTypeNameSnapshot: "Biscuit" };
    const tx = {
      probeCycle: { findFirst: vi.fn().mockResolvedValue(activeCycle), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workOrder: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workAssignmentEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1", status: "IN_LUCRU", activeProbeCycleId: "cycle-1", claimStatus: "CLAIMED", claimedByUserId: "tech-1", executionLegalEntityId: null, claimRevision: 4 }) },
      $transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)),
    } as never;
    const service = new ProbeCyclesService(createAuthorization(), audit as never, prisma, {} as never, notifications as never);

    await service.finalizeWork({ actorUserId: "tech-1", workOrderId: "wo-1" });

    expect(tx.probeCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ completionOutcome: "FINALIZED", status: "COMPLETED" }) }));
    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ technicalReadiness: "FINAL_READY", status: "FINALIZATA", finalizedAt: expect.any(Date) }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "work_order.finalized" }));
    expect(notifications.publishFinal).toHaveBeenCalledTimes(1);
    expect(notifications.publishBillingCandidate).toHaveBeenCalledTimes(1);
  });

  it("rejects a repeated finalization before it can create another cycle or notification", async () => {
    const prisma = {
      workOrder: { findFirst: vi.fn().mockResolvedValue({ id: "wo-1", code: "WO-1", status: "FINALIZATA", activeProbeCycleId: null, claimStatus: "CLAIMED", claimedByUserId: "tech-1" }) },
    } as never;
    const notifications = { publishFinal: vi.fn(), publishBillingCandidate: vi.fn() };
    const service = new ProbeCyclesService(createAuthorization(), { record: vi.fn() } as never, prisma, {} as never, notifications as never);

    await expect(service.finalizeWork({ actorUserId: "tech-1", workOrderId: "wo-1" })).rejects.toThrow("deja finalizată");
    expect(notifications.publishFinal).not.toHaveBeenCalled();
    expect(notifications.publishBillingCandidate).not.toHaveBeenCalled();
  });
});
