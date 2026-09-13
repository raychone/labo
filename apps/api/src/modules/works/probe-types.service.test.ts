import { describe, expect, it, vi } from "vitest";

import { ProbeTypesService, toProbeTypeView } from "./probe-types.service.js";

describe("ProbeTypesService / B10", () => {
  it("keeps legacy identity internal while presenting the business probe name", () => {
    expect(toProbeTypeView({ id: "legacy-probe", isArchived: true, name: "Metal (legacy-demo_probe_type_mc_metal)", sortOrder: 1 })).toEqual({
      id: "legacy-probe",
      isArchived: true,
      name: "Metal",
      sortOrder: 1,
    });
  });

  it("keeps one global catalog and rejects archived types for new cycles", async () => {
    const prisma = {
      probeType: {
        findMany: vi.fn().mockResolvedValue([{ id: "pt-1", name: "Lingură", sortOrder: 0, isArchived: false }]),
        findFirst: vi.fn().mockResolvedValue({ id: "pt-2", name: "Biscuit", isArchived: true }),
      },
    } as never;
    const authorization = { requirePermission: vi.fn().mockResolvedValue(undefined) } as never;
    const service = new ProbeTypesService(authorization, { record: vi.fn() } as never, prisma);

    await expect(service.list("manager")).resolves.toEqual([{ id: "pt-1", name: "Lingură", sortOrder: 0, isArchived: false }]);
    await expect(service.requireSelectable("pt-2", prisma as never)).rejects.toThrow("arhivat");
    expect((authorization as { requirePermission: ReturnType<typeof vi.fn> }).requirePermission).toHaveBeenCalledWith({ permission: "probe_types.read", requiredScope: "ASSIGNED", userId: "manager" });
  });

  it("creates reverse WorkType associations without duplicates and marks them canonical", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const authorization = { requirePermission: vi.fn().mockResolvedValue(undefined) } as never;
    const audit = { record: vi.fn().mockResolvedValue(undefined) } as never;
    const service = new ProbeTypesService(authorization, audit, {
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        probeType: { create: vi.fn().mockResolvedValue({ id: "probe_miyo", isArchived: false, name: "Miyo", sortOrder: 2 }) },
        workType: { count: vi.fn().mockResolvedValue(2), updateMany },
        workTypeProbeType: { createMany },
      })),
    } as never);

    await service.create("manager", { name: "Miyo", sortOrder: 2, workTypeIds: ["wt_zr", "wt_mc", "wt_zr"] });

    expect(createMany).toHaveBeenCalledWith({ data: [
      { probeTypeId: "probe_miyo", sortOrder: 2, workTypeId: "wt_zr" },
      { probeTypeId: "probe_miyo", sortOrder: 2, workTypeId: "wt_mc" },
    ] });
    expect(updateMany).toHaveBeenCalledWith({ data: { probeApplicabilityConfigured: true }, where: { id: { in: ["wt_zr", "wt_mc"] } } });
  });

  it("replaces the same canonical probe mapping when edited from the probe", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const authorization = { requirePermission: vi.fn().mockResolvedValue(undefined) } as never;
    const service = new ProbeTypesService(authorization, { record: vi.fn().mockResolvedValue(undefined) } as never, {
      probeType: { findUnique: vi.fn().mockResolvedValue({ id: "probe_miyo", isArchived: false, name: "Miyo", sortOrder: 2, workTypes: [{ workTypeId: "wt_old" }] }) },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        probeType: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "probe_miyo", isArchived: false, name: "Miyo", sortOrder: 2, workTypes: [{ workTypeId: "wt_new" }] }),
          update: vi.fn().mockResolvedValue({ id: "probe_miyo", isArchived: false, name: "Miyo", sortOrder: 2 }),
        },
        workType: { count: vi.fn().mockResolvedValue(1), updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        workTypeProbeType: { createMany, deleteMany },
      })),
    } as never);

    const result = await service.update("manager", "probe_miyo", { workTypeIds: ["wt_new", "wt_new"] });

    expect(deleteMany).toHaveBeenCalledWith({ where: { probeTypeId: "probe_miyo" } });
    expect(createMany).toHaveBeenCalledWith({ data: [{ probeTypeId: "probe_miyo", sortOrder: 2, workTypeId: "wt_new" }] });
    expect(result.workTypeIds).toEqual(["wt_new"]);
  });
});
