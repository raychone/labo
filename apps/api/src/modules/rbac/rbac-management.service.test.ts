import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../auth/audit.service.js";
import type { PrismaService } from "../database/prisma.service.js";
import { RBAC_AUDIT_ACTIONS } from "./rbac.constants.js";
import { RbacManagementService } from "./rbac-management.service.js";

describe("RbacManagementService", () => {
  it("audits role assignments", async () => {
    const auditService = {
      record: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;
    const prisma = {
      role: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "role_1", key: "MANAGER" }),
      },
      userRole: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new RbacManagementService(auditService, prisma);

    await service.assignRole("user_1", "MANAGER", {
      actorUserId: "actor_1",
    });

    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
      action: RBAC_AUDIT_ACTIONS.roleAssigned,
      actorUserId: "actor_1",
    }));
  });

  it("audits permission override creation", async () => {
    const auditService = {
      record: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;
    const prisma = {
      permission: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "permission_1", key: "users.create" }),
      },
      userPermissionOverride: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new RbacManagementService(auditService, prisma);

    await service.upsertPermissionOverride({
      effect: "DENY",
      permission: "users.create",
      scope: "ALL",
      userId: "user_1",
    });

    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
      action: RBAC_AUDIT_ACTIONS.permissionOverrideCreated,
    }));
  });
});
