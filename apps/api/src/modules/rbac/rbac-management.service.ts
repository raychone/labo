import { Inject, Injectable } from "@nestjs/common";
import type { PermissionEffect, Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { PermissionKey, PermissionScope, RbacRoleKey } from "./permission-registry.js";
import { RBAC_AUDIT_ACTIONS, RBAC_RESOURCE_TYPES } from "./rbac.constants.js";

export interface RbacChangeMetadata {
  readonly actorUserId?: string;
  readonly requestMetadata?: RequestMetadata;
}

export interface PermissionOverrideInput extends RbacChangeMetadata {
  readonly effect: PermissionEffect;
  readonly permission: PermissionKey;
  readonly reason?: string;
  readonly scope: PermissionScope;
  readonly userId: string;
}

function createAuditInput(input: {
  readonly action: string;
  readonly actorUserId?: string;
  readonly metadata: Prisma.InputJsonValue;
  readonly requestMetadata?: RequestMetadata;
  readonly resourceId: string;
  readonly resourceType: string;
}) {
  return {
    action: input.action,
    metadata: input.metadata,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
  };
}

@Injectable()
export class RbacManagementService {
  public constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  public async assignRole(
    userId: string,
    roleKey: RbacRoleKey,
    metadata: RbacChangeMetadata,
  ): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: {
        key: roleKey,
      },
    });

    await this.prisma.userRole.upsert({
      create: {
        roleId: role.id,
        userId,
        ...(metadata.actorUserId ? { assignedByUserId: metadata.actorUserId } : {}),
      },
      update: {
        ...(metadata.actorUserId ? { assignedByUserId: metadata.actorUserId } : {}),
      },
      where: {
        userId_roleId: {
          roleId: role.id,
          userId,
        },
      },
    });
    await this.auditService.record(createAuditInput({
      action: RBAC_AUDIT_ACTIONS.roleAssigned,
      metadata: { roleKey, userId },
      resourceId: role.id,
      resourceType: RBAC_RESOURCE_TYPES.userRole,
      ...(metadata.actorUserId ? { actorUserId: metadata.actorUserId } : {}),
      ...(metadata.requestMetadata ? { requestMetadata: metadata.requestMetadata } : {}),
    }));
  }

  public async removeRole(
    userId: string,
    roleKey: RbacRoleKey,
    metadata: RbacChangeMetadata,
  ): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: {
        key: roleKey,
      },
    });

    await this.prisma.userRole.deleteMany({
      where: {
        roleId: role.id,
        userId,
      },
    });
    await this.auditService.record(createAuditInput({
      action: RBAC_AUDIT_ACTIONS.roleRemoved,
      metadata: { roleKey, userId },
      resourceId: role.id,
      resourceType: RBAC_RESOURCE_TYPES.userRole,
      ...(metadata.actorUserId ? { actorUserId: metadata.actorUserId } : {}),
      ...(metadata.requestMetadata ? { requestMetadata: metadata.requestMetadata } : {}),
    }));
  }

  public async upsertPermissionOverride(input: PermissionOverrideInput): Promise<void> {
    const permission = await this.prisma.permission.findUniqueOrThrow({
      where: {
        key: input.permission,
      },
    });
    const existingOverride = await this.prisma.userPermissionOverride.findUnique({
      where: {
        userId_permissionId_effect_scope: {
          effect: input.effect,
          permissionId: permission.id,
          scope: input.scope,
          userId: input.userId,
        },
      },
    });

    await this.prisma.userPermissionOverride.upsert({
      create: {
        effect: input.effect,
        permissionId: permission.id,
        scope: input.scope,
        userId: input.userId,
        ...(input.actorUserId ? { assignedByUserId: input.actorUserId } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      update: {
        ...(input.actorUserId ? { assignedByUserId: input.actorUserId } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      },
      where: {
        userId_permissionId_effect_scope: {
          effect: input.effect,
          permissionId: permission.id,
          scope: input.scope,
          userId: input.userId,
        },
      },
    });
    await this.auditService.record(createAuditInput({
      action: existingOverride
        ? RBAC_AUDIT_ACTIONS.permissionOverrideUpdated
        : RBAC_AUDIT_ACTIONS.permissionOverrideCreated,
      metadata: {
        effect: input.effect,
        permission: input.permission,
        scope: input.scope,
        userId: input.userId,
      },
      resourceId: permission.id,
      resourceType: RBAC_RESOURCE_TYPES.permissionOverride,
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
    }));
  }

  public async removePermissionOverride(input: PermissionOverrideInput): Promise<void> {
    const permission = await this.prisma.permission.findUniqueOrThrow({
      where: {
        key: input.permission,
      },
    });

    await this.prisma.userPermissionOverride.deleteMany({
      where: {
        effect: input.effect,
        permissionId: permission.id,
        scope: input.scope,
        userId: input.userId,
      },
    });
    await this.auditService.record(createAuditInput({
      action: RBAC_AUDIT_ACTIONS.permissionOverrideRemoved,
      metadata: {
        effect: input.effect,
        permission: input.permission,
        scope: input.scope,
        userId: input.userId,
      },
      resourceId: permission.id,
      resourceType: RBAC_RESOURCE_TYPES.permissionOverride,
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
    }));
  }
}
