import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";

import { AuthorizationService } from "./authorization.service.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { REQUIRED_PERMISSION_METADATA_KEY } from "./rbac.constants.js";
import type { RequiredPermissionMetadata } from "./require-permission.decorator.js";
import { RequirePermission } from "./require-permission.decorator.js";

function createContext(userId?: string): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => function handler(): void {},
    switchToHttp: () => ({
      getRequest: () => ({
        auth: userId
          ? {
              user: {
                id: userId,
              },
            }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

function createReflector(metadata?: RequiredPermissionMetadata): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(metadata),
  } as unknown as Reflector;
}

describe("PermissionsGuard", () => {
  it("allows public endpoints without permission metadata", async () => {
    const service = {
      requirePermission: vi.fn(),
    } as unknown as AuthorizationService;
    const guard = new PermissionsGuard(service, createReflector());

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it("returns 401 when permission metadata exists without authenticated identity", async () => {
    const service = {
      requirePermission: vi.fn(),
    } as unknown as AuthorizationService;
    const guard = new PermissionsGuard(service, createReflector({
      permission: "users.read",
      requiredScope: "ALL",
    }));

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("delegates permission checks for authenticated users", async () => {
    const service = {
      requirePermission: vi.fn().mockResolvedValue({
        allowed: true,
        effectiveScopes: ["ALL"],
        permission: "users.read",
      }),
    } as unknown as AuthorizationService;
    const guard = new PermissionsGuard(service, createReflector({
      permission: "users.read",
      requiredScope: "ALL",
    }));

    await expect(guard.canActivate(createContext("user_1"))).resolves.toBe(true);
    expect(service.requirePermission).toHaveBeenCalledWith({
      permission: "users.read",
      requiredScope: "ALL",
      userId: "user_1",
    });
  });
});

describe("RequirePermission", () => {
  it("stores typed permission metadata", () => {
    class TestController {
      @RequirePermission("users.read", "ALL")
      public read(): void {
        return undefined;
      }
    }
    const metadata = Reflect.getMetadata(REQUIRED_PERMISSION_METADATA_KEY, TestController.prototype.read) as RequiredPermissionMetadata;

    expect(metadata).toStrictEqual({
      permission: "users.read",
      requiredScope: "ALL",
    });
  });
});
