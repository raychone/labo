import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService, doesScopeSatisfy } from "./authorization.service.js";

interface FakePermissionGrant {
  readonly key: string;
  readonly scope: "ALL" | "ASSIGNED" | "OWN_CLINIC" | "OWN_DELIVERY" | "OWN_STAGE";
}

interface FakeOverride extends FakePermissionGrant {
  readonly effect: "ALLOW" | "DENY";
}

function createAuthorizationService(input: {
  readonly isActive?: boolean;
  readonly overrides?: readonly FakeOverride[];
  readonly roleActive?: boolean;
  readonly rolePermissions?: readonly FakePermissionGrant[];
}): AuthorizationService {
  const user = input.isActive === false
    ? {
        isActive: false,
        permissionOverrides: [],
        roles: [],
      }
    : {
        isActive: true,
        permissionOverrides: (input.overrides ?? []).map((override) => ({
          effect: override.effect,
          permission: {
            key: override.key,
          },
          scope: override.scope,
        })),
        roles: [
          {
            role: {
              isActive: input.roleActive ?? true,
              permissions: (input.rolePermissions ?? []).map((grant) => ({
                permission: {
                  key: grant.key,
                },
                scope: grant.scope,
              })),
            },
          },
        ],
      };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaService;

  return new AuthorizationService(prisma);
}

describe("AuthorizationService", () => {
  it("denies users without roles", async () => {
    const service = createAuthorizationService({});

    await expect(service.hasPermission({
      permission: "users.create",
      requiredScope: "ALL",
      userId: "user_1",
    })).resolves.toMatchObject({ allowed: false });
  });

  it("denies inactive users", async () => {
    const service = createAuthorizationService({
      isActive: false,
      rolePermissions: [{ key: "users.create", scope: "ALL" }],
    });

    await expect(service.hasPermission({
      permission: "users.create",
      requiredScope: "ALL",
      userId: "user_1",
    })).resolves.toMatchObject({ allowed: false });
  });

  it("allows active role permissions and aggregates multiple scopes", async () => {
    const service = createAuthorizationService({
      rolePermissions: [
        { key: "files.read", scope: "ASSIGNED" },
        { key: "files.read", scope: "OWN_CLINIC" },
      ],
    });

    await expect(service.hasPermission({
      permission: "files.read",
      requiredScope: "ASSIGNED",
      userId: "user_1",
    })).resolves.toMatchObject({
      allowed: true,
      effectiveScopes: ["ASSIGNED", "OWN_CLINIC"],
    });
  });

  it("ignores inactive roles", async () => {
    const service = createAuthorizationService({
      roleActive: false,
      rolePermissions: [{ key: "users.create", scope: "ALL" }],
    });

    await expect(service.hasPermission({
      permission: "users.create",
      requiredScope: "ALL",
      userId: "user_1",
    })).resolves.toMatchObject({ allowed: false });
  });

  it("prioritizes DENY overrides over role grants", async () => {
    const service = createAuthorizationService({
      overrides: [{ effect: "DENY", key: "users.create", scope: "ALL" }],
      rolePermissions: [{ key: "users.create", scope: "ALL" }],
    });

    await expect(service.hasPermission({
      permission: "users.create",
      requiredScope: "ALL",
      userId: "user_1",
    })).resolves.toMatchObject({ allowed: false });
  });

  it("allows permission through ALLOW overrides", async () => {
    const service = createAuthorizationService({
      overrides: [{ effect: "ALLOW", key: "invoice.read", scope: "ALL" }],
    });

    await expect(service.hasPermission({
      permission: "invoice.read",
      requiredScope: "ALL",
      userId: "user_1",
    })).resolves.toMatchObject({ allowed: true });
  });

  it("treats ALL as satisfying every required scope", () => {
    expect(doesScopeSatisfy("ALL", "OWN_STAGE")).toBe(true);
  });

  it("does not treat distinct ownership scopes as interchangeable", () => {
    expect(doesScopeSatisfy("OWN_STAGE", "OWN_DELIVERY")).toBe(false);
  });

  it("denies missing permissions", async () => {
    const service = createAuthorizationService({
      rolePermissions: [{ key: "users.create", scope: "ALL" }],
    });

    await expect(service.requirePermission({
      permission: "invoice.create",
      requiredScope: "ALL",
      userId: "user_1",
    })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
