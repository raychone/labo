import type { PermissionEffect, PermissionScope } from "@prisma/client";

export interface UserRoleView {
  readonly key: string;
  readonly name: string;
}

export interface UserSummaryView {
  readonly createdAt: string;
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
  readonly preferredColor: string | null;
  readonly roles: readonly UserRoleView[];
  readonly updatedAt: string;
}

export interface UserPermissionOverrideView {
  readonly effect: PermissionEffect;
  readonly permissionKey: string;
  readonly reason: string | null;
  readonly scope: PermissionScope;
}

export interface UserDetailView extends UserSummaryView {
  readonly activeSessionCount: number;
  readonly passwordChangedAt: string;
  readonly permissionOverrides: readonly UserPermissionOverrideView[];
  readonly version: number;
}

export interface PaginatedUsersView {
  readonly items: readonly UserSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

interface UserWithRoles {
  readonly createdAt: Date;
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
  readonly preferredColor: string | null;
  readonly roles: readonly {
    readonly role: {
      readonly key: string;
      readonly name: string;
    };
  }[];
  readonly updatedAt: Date;
}

interface UserWithDetails extends UserWithRoles {
  readonly passwordChangedAt: Date;
  readonly permissionOverrides: readonly {
    readonly effect: PermissionEffect;
    readonly permission: {
      readonly key: string;
    };
    readonly reason: string | null;
    readonly scope: PermissionScope;
  }[];
  readonly version: number;
}

function toRoleView(role: { readonly key: string; readonly name: string }): UserRoleView {
  return {
    key: role.key,
    name: role.name,
  };
}

export function toUserSummaryView(user: UserWithRoles): UserSummaryView {
  return {
    createdAt: user.createdAt.toISOString(),
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    preferredColor: user.preferredColor,
    roles: user.roles.map((entry) => toRoleView(entry.role)).sort((left, right) => left.name.localeCompare(right.name)),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toUserDetailView(user: UserWithDetails, activeSessionCount: number): UserDetailView {
  return {
    ...toUserSummaryView(user),
    activeSessionCount,
    passwordChangedAt: user.passwordChangedAt.toISOString(),
    permissionOverrides: user.permissionOverrides
      .map((override) => ({
        effect: override.effect,
        permissionKey: override.permission.key,
        reason: override.reason,
        scope: override.scope,
      }))
      .sort((left, right) => left.permissionKey.localeCompare(right.permissionKey)),
    version: user.version,
  };
}
