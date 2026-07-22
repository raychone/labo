import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import type { PermissionScope } from "./permission-registry.js";

export interface RoleListResponse {
  readonly roles: readonly {
    readonly description: string;
    readonly isActive: boolean;
    readonly isSystem: boolean;
    readonly key: string;
    readonly name: string;
  }[];
}

export interface PermissionListResponse {
  readonly permissions: readonly {
    readonly action: string;
    readonly description: string;
    readonly key: string;
    readonly resource: string;
    readonly scopes: readonly PermissionScope[];
  }[];
}

@Injectable()
export class RbacReadService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async listRoles(): Promise<RoleListResponse> {
    const roles = await this.prisma.role.findMany({
      orderBy: {
        key: "asc",
      },
      select: {
        description: true,
        isActive: true,
        isSystem: true,
        key: true,
        name: true,
      },
    });

    return { roles };
  }

  public async listPermissions(): Promise<PermissionListResponse> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: {
        key: "asc",
      },
      select: {
        action: true,
        description: true,
        key: true,
        resource: true,
        roles: {
          select: {
            scope: true,
          },
        },
      },
    });

    return {
      permissions: permissions.map((permission) => ({
        action: permission.action,
        description: permission.description,
        key: permission.key,
        resource: permission.resource,
        scopes: [...new Set(permission.roles.map((role) => role.scope))].sort(),
      })),
    };
  }
}
