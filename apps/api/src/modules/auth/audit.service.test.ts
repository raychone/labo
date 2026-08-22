import { describe, expect, it, vi } from "vitest";

import { AuditService } from "./audit.service.js";

describe("AuditService", () => {
  it("filters, paginates and redacts sensitive metadata", async () => {
    const count = vi.fn().mockResolvedValue(2);
    const findMany = vi.fn().mockResolvedValue([
      {
        action: "invoice.storno_created",
        actor: { displayName: "Manager" },
        actorUserId: "user_1",
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
        id: "audit_1",
        metadata: { after: { totalMinor: 0 }, token: "secret-value" },
        resourceId: "invoice_1",
        resourceType: "billing_document",
      },
    ]);
    const service = new AuditService({ auditLog: { count, findMany } } as never);

    const result = await service.list({ action: "storno", actor: "Manager", page: 2, pageSize: 1 });

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ action: { contains: "storno", mode: "insensitive" } }) });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 1, take: 1 }));
    expect(result).toMatchObject({ hasNextPage: false, page: 2, pageSize: 1, total: 2, totalPages: 2 });
    expect(result.items[0]).toMatchObject({ actorDisplayName: "Manager", action: "invoice.storno_created" });
    expect(result.items[0]?.metadata).toEqual({ after: { totalMinor: 0 }, token: "[redacted]" });
  });
});
