import { describe, expect, it, vi } from "vitest";

import { ProbeTypesService } from "./probe-types.service.js";

describe("ProbeTypesService / B10", () => {
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
    expect((authorization as { requirePermission: ReturnType<typeof vi.fn> }).requirePermission).toHaveBeenCalledWith({ permission: "probe_types.read", requiredScope: "ALL", userId: "manager" });
  });
});
