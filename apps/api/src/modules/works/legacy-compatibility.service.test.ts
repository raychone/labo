import { describe, expect, it, vi } from "vitest";

import { LegacyCompatibilityService } from "./legacy-compatibility.service.js";

const now = new Date("2026-08-24T10:00:00.000Z");

function canonicalItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item_1",
    workOrderId: "work_1",
    sortOrder: 0,
    scope: "TEETH" as const,
    workTypeId: "type_1",
    customWorkTypeSnapshot: null,
    shade: "A2",
    implantPlatform: null,
    customImplantPlatformSnapshot: null,
    restorationType: null,
    technicalCodeNotes: null,
    notes: null,
    baseUnitPriceMinor: 1000,
    totalPriceMinor: 1000,
    currency: "RON",
    commercialSnapshot: { source: "canonical" },
    archivedAt: null,
    archivedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    workType: { code: "WT", id: "type_1", name: "Zirconiu", symbol: "Zr" },
    teeth: [
      { id: "tooth_11", workOrderItemId: "item_1", fdiTooth: 11, sortOrder: 0, createdAt: now },
      { id: "tooth_12", workOrderItemId: "item_1", fdiTooth: 12, sortOrder: 1, createdAt: now },
    ],
    ...overrides,
  };
}

function workOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "work_1",
    code: "WO-2026-000001",
    shade: "A2",
    implantPlatform: "Alpha",
    technicalCodeNotes: "legacy code",
    quantity: 3,
    baseUnitPriceMinor: 3500,
    totalPriceMinor: 10500,
    currency: "RON",
    workType: { code: "WT", id: "type_1", name: "Zirconiu", symbol: "Zr" },
    workFormSubmissions: [{ values: { teeth: ["11", "12", "21"], restoration_type: "cimentată" } }],
    items: [],
    cycles: [{ id: "cycle_1", cycleNumber: 1, status: "CLOSED", openedAt: now, closedAt: now }],
    ...overrides,
  };
}

function createService(initialWorkOrder: unknown) {
  const authorizationService = {
    hasPermission: vi.fn().mockImplementation(async ({ permission }: { readonly permission: string }) => {
      if (permission === "works.read_assigned") return { allowed: true, effectiveScopes: ["ASSIGNED"] };
      return { allowed: false, effectiveScopes: [] };
    }),
  };
  const prisma = {
    workOrder: { findFirst: vi.fn().mockResolvedValue(initialWorkOrder) },
  };
  return {
    prisma,
    subject: new LegacyCompatibilityService(authorizationService as never, prisma as never),
  };
}

describe("LegacyCompatibilityService", () => {
  it("projects legacy multi-tooth data as one ambiguous historical item", async () => {
    const { subject } = createService(workOrder());

    const result = await subject.getComposition("user_1", "work_1");

    expect(result.source).toBe("LEGACY");
    expect(result.classification).toBe("LEGACY_AMBIGUOUS");
    expect(result.legacyItem).toMatchObject({ id: "legacy:work_1", teeth: [12, 11, 21], quantity: 3, totalPriceMinor: 10500 });
    expect(result.canonicalItems).toEqual([]);
    expect(result.legacyItem?.exactSemanticScope).toBe(false);
    expect(result.cycles[0]).toMatchObject({ source: "LEGACY", exactProbeInterpretation: false, cycleNumber: 1 });
  });

  it("uses active canonical items and does not double-count legacy commercial values", async () => {
    const { subject } = createService(workOrder({ items: [canonicalItem()] }));

    const result = await subject.getComposition("user_1", "work_1");

    expect(result.source).toBe("CANONICAL");
    expect(result.classification).toBe("MIXED");
    expect(result.canonicalItems).toHaveLength(1);
    expect(result.legacyItem).toBeNull();
    expect(result.commercial.source).toBe("CANONICAL_ITEMS");
    expect(result.identity).toEqual({ singleWorkOrder: true, code: "WO-2026-000001", qrIdentityPreserved: true });
  });

  it("does not resurrect legacy data when canonical items exist only archived", async () => {
    const { subject } = createService(workOrder({ items: [canonicalItem({ archivedAt: now })] }));

    const result = await subject.getComposition("user_1", "work_1");

    expect(result.classification).toBe("CANONICAL_ARCHIVED");
    expect(result.archivedCanonicalItemCount).toBe(1);
    expect(result.legacyItem).toBeNull();
    expect(result.legacyProjectionAllowed).toBe(false);
  });

  it("applies the existing readability predicate and legal-entity context", async () => {
    const { subject, prisma } = createService(workOrder());

    await subject.getComposition("user_1", "work_1", { code: "CDT", displayName: "CDT", id: "legal_cdt" });

    expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ executionLegalEntityId: "legal_cdt" })]) }),
    }));
  });

  it("rejects an unreadable work order without exposing composition", async () => {
    const { subject, prisma } = createService(null);

    await expect(subject.getComposition("user_1", "other_work")).rejects.toThrow("Lucrarea nu a fost găsită");
    expect(prisma.workOrder.findFirst).toHaveBeenCalled();
  });
});
