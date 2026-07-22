import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { PermissionEffect, PermissionScope as PrismaPermissionScope } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import type { PermissionKey, PermissionScope } from "./permission-registry.js";

export interface PermissionCheckInput {
  readonly permission: PermissionKey;
  readonly requiredScope?: PermissionScope;
  readonly userId: string;
}

export interface PermissionCheckResult {
  readonly allowed: boolean;
  readonly effectiveScopes: readonly PermissionScope[];
  readonly permission: PermissionKey;
}

export interface EffectivePermission {
  readonly key: PermissionKey;
  readonly scopes: readonly PermissionScope[];
}

export interface EffectivePermissionSnapshot {
  readonly permissions: readonly EffectivePermission[];
}

type AuthorizationUser = {
  readonly isActive: boolean;
  readonly permissionOverrides: readonly {
    readonly effect: PermissionEffect;
    readonly permission: {
      readonly key: string;
    };
    readonly scope: PrismaPermissionScope;
  }[];
  readonly roles: readonly {
    readonly role: {
      readonly isActive: boolean;
      readonly permissions: readonly {
        readonly permission: {
          readonly key: string;
        };
        readonly scope: PrismaPermissionScope;
      }[];
    };
  }[];
};

function isKnownPermissionKey(value: string): value is PermissionKey {
  return value.includes(".");
}

function toPermissionScope(scope: PrismaPermissionScope): PermissionScope {
  return scope;
}

function uniqueScopes(scopes: readonly PermissionScope[]): readonly PermissionScope[] {
  return [...new Set(scopes)].sort();
}

export function doesScopeSatisfy(grantedScope: PermissionScope, requiredScope: PermissionScope): boolean {
  return grantedScope === "ALL" || grantedScope === requiredScope;
}

@Injectable()
export class AuthorizationService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async hasPermission(input: PermissionCheckInput): Promise<PermissionCheckResult> {
    const effectivePermissions = await this.getEffectivePermissions(input.userId);
    const permission = effectivePermissions.permissions.find((entry) => entry.key === input.permission);
    const requiredScope = input.requiredScope;
    const effectiveScopes = permission?.scopes ?? [];
    const allowed = requiredScope
      ? effectiveScopes.some((scope) => doesScopeSatisfy(scope, requiredScope))
      : effectiveScopes.length > 0;

    return {
      allowed,
      effectiveScopes,
      permission: input.permission,
    };
  }

  public async requirePermission(input: PermissionCheckInput): Promise<PermissionCheckResult> {
    const result = await this.hasPermission(input);

    if (!result.allowed) {
      throw new ForbiddenException("Permission denied.");
    }

    return result;
  }

  public async getEffectivePermissions(userId: string): Promise<EffectivePermissionSnapshot> {
    const user = await this.prisma.user.findUnique({
      include: {
        permissionOverrides: {
          include: {
            permission: true,
          },
        },
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
      where: {
        id: userId,
      },
    });

    if (!user?.isActive) {
      return { permissions: [] };
    }

    return {
      permissions: this.calculateEffectivePermissions(user),
    };
  }

  public async hasAllPermissions(userId: string, checks: readonly Omit<PermissionCheckInput, "userId">[]): Promise<boolean> {
    const effectivePermissions = await this.getEffectivePermissions(userId);

    return checks.every((check) => {
      const permission = effectivePermissions.permissions.find((entry) => entry.key === check.permission);
      const effectiveScopes = permission?.scopes ?? [];

      const requiredScope = check.requiredScope;

      return requiredScope
        ? effectiveScopes.some((scope) => doesScopeSatisfy(scope, requiredScope))
        : effectiveScopes.length > 0;
    });
  }

  private calculateEffectivePermissions(user: AuthorizationUser): readonly EffectivePermission[] {
    const roleScopesByPermission = new Map<PermissionKey, Set<PermissionScope>>();

    for (const userRole of user.roles) {
      if (!userRole.role.isActive) {
        continue;
      }

      for (const rolePermission of userRole.role.permissions) {
        if (isKnownPermissionKey(rolePermission.permission.key)) {
          const scopes = roleScopesByPermission.get(rolePermission.permission.key) ?? new Set<PermissionScope>();
          scopes.add(toPermissionScope(rolePermission.scope));
          roleScopesByPermission.set(rolePermission.permission.key, scopes);
        }
      }
    }

    const denyOverrides = user.permissionOverrides.filter((override) => override.effect === "DENY");
    const allowOverrides = user.permissionOverrides.filter((override) => override.effect === "ALLOW");
    const effectiveScopesByPermission = new Map(roleScopesByPermission);

    for (const override of allowOverrides) {
      if (!isKnownPermissionKey(override.permission.key)) {
        continue;
      }

      const scopes = effectiveScopesByPermission.get(override.permission.key) ?? new Set<PermissionScope>();
      scopes.add(toPermissionScope(override.scope));
      effectiveScopesByPermission.set(override.permission.key, scopes);
    }

    for (const override of denyOverrides) {
      if (!isKnownPermissionKey(override.permission.key)) {
        continue;
      }

      const deniedScope = toPermissionScope(override.scope);
      const scopes = effectiveScopesByPermission.get(override.permission.key);

      if (!scopes) {
        continue;
      }

      if (deniedScope === "ALL") {
        effectiveScopesByPermission.delete(override.permission.key);
        continue;
      }

      scopes.delete(deniedScope);

      if (scopes.size === 0) {
        effectiveScopesByPermission.delete(override.permission.key);
      }
    }

    return [...effectiveScopesByPermission.entries()]
      .map(([key, scopes]) => ({
        key,
        scopes: uniqueScopes([...scopes]),
      }))
      .sort((left, right) => left.key.localeCompare(right.key));
  }
}
