import { describe, expect, it, vi } from "vitest";

import { NotificationsService } from "./notifications.service.js";

function createService() {
  const notification = { createMany: vi.fn().mockResolvedValue({ count: 2 }), findFirst: vi.fn(), count: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() };
  const prisma = { billingDocument: { findMany: vi.fn().mockResolvedValue([]) }, legalEntitySettings: { findMany: vi.fn().mockResolvedValue([]) }, notification, user: { findMany: vi.fn().mockResolvedValue([{ id: "manager-a" }, { id: "manager-b" }]) }, workType: { findMany: vi.fn().mockResolvedValue([]) }, workOrder: { findMany: vi.fn().mockResolvedValue([]) } };
  const authorization = { hasPermission: vi.fn().mockResolvedValue({ allowed: true }), requirePermission: vi.fn().mockResolvedValue(undefined) };
  return { authorization, notification, service: new NotificationsService(authorization as never, prisma as never) };
}

describe("NotificationsService", () => {
  it("materializes one recipient-specific row per eligible manager with a database dedupe key", async () => {
    const { notification, service } = createService();
    await service.publishUnpricedWorkType({ id: "wt-1", name: "Coroană" });
    expect(notification.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: expect.arrayContaining([
      expect.objectContaining({ recipientUserId: "manager-a", dedupeKey: "work_type:wt-1:pricing_required" }),
      expect.objectContaining({ recipientUserId: "manager-b", dedupeKey: "work_type:wt-1:pricing_required" }),
    ]) }));
  });

  it("resolves all matching recipients only through the business resolution method", async () => {
    const { notification, service } = createService();
    await service.resolveUnpricedWorkType("wt-1");
    expect(notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { resolvedAt: expect.any(Date) }, where: { dedupeKey: "work_type:wt-1:pricing_required", resolvedAt: null, type: "NEW_UNPRICED_WORK_TYPE_REQUIRES_MANAGER_PRICING" } }));
  });

  it("keeps availability resolution shared while read state remains per recipient", async () => {
    const { notification, service } = createService();
    await service.resolveAvailability("wo-1");
    expect(notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { resolvedAt: expect.any(Date) }, where: expect.objectContaining({ resolvedAt: null }) }));
  });

  it("reconciles a currency-safe large outstanding balance without duplicating an active episode", async () => {
    const { authorization, notification, service } = createService();
    const serviceWithPrisma = service as never as { reconcileBilling: () => Promise<void> };
    const internal = service as never as { prisma: { legalEntitySettings: { findMany: ReturnType<typeof vi.fn> }; workOrder: { findMany: ReturnType<typeof vi.fn> }; billingDocument: { findMany: ReturnType<typeof vi.fn> }; user: { findMany: ReturnType<typeof vi.fn> } } };
    internal.prisma.legalEntitySettings = { findMany: vi.fn().mockResolvedValue([{ currency: "RON", largeOutstandingThresholdMinor: 10000, legalEntityId: "legal_1" }]) };
    internal.prisma.workOrder.findMany = vi.fn().mockResolvedValue([]);
    internal.prisma.billingDocument.findMany = vi.fn().mockResolvedValue([{ clinicId: "clinic_1", clinicNameSnapshot: "Clinica", currency: "RON", legalEntityId: "legal_1", payments: [{ amountMinor: 0, cancelledAt: null }], status: "ISSUED", totalMinor: 12000, type: "INVOICE", stornoOfDocumentId: null }]);
    notification.findFirst.mockResolvedValue(null);

    await serviceWithPrisma.reconcileBilling();

    expect(authorization.hasPermission).toHaveBeenCalled();
    expect(notification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ type: "LARGE_OUTSTANDING_BALANCE", resourceId: "clinic_1" })]), skipDuplicates: true }));
  });
});
