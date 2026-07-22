import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PasswordService } from "../auth/password.service.js";
import { SessionService } from "../auth/session.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { ADMIN_CAPABILITY_CHECKS, USER_RESOURCE_TYPE, USERS_AUDIT_ACTIONS } from "./users.constants.js";
import type { CreateUserDto, ListUsersQueryDto, ReplaceUserRolesDto, ResetUserPasswordDto, UpdateUserDto } from "./dto/users.dto.js";
import { type PaginatedUsersView, type UserDetailView, toUserDetailView, toUserSummaryView } from "./users.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim();
}

function uniqueRoleKeys(roleKeys: readonly string[]): readonly string[] {
  return [...new Set(roleKeys.map((roleKey) => roleKey.trim()).filter(Boolean))].sort();
}

@Injectable()
export class UsersService {
  public constructor(
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(PasswordService)
    private readonly passwordService: PasswordService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(SessionService)
    private readonly sessionService: SessionService,
  ) {}

  public async listUsers(query: ListUsersQueryDto): Promise<PaginatedUsersView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.roleKey
        ? {
            roles: {
              some: {
                role: {
                  key: query.roleKey,
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          [query.sortBy]: query.sortDirection,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: users.map(toUserSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async getUser(userId: string): Promise<UserDetailView> {
    const user = await this.findUserDetailsOrThrow(userId);
    const activeSessionCount = await this.sessionService.countActiveForUser(userId);

    return toUserDetailView(user, activeSessionCount);
  }

  public async createUser(context: ActorContext, dto: CreateUserDto): Promise<UserDetailView> {
    const email = normalizeEmail(dto.email);
    const displayName = normalizeName(dto.displayName);
    const roleKeys = uniqueRoleKeys(dto.roleKeys);
    const passwordHash = await this.passwordService.hash(dto.temporaryPassword);
    const roles = await this.findActiveRolesOrThrow(roleKeys);

    const user = await this.prisma.$transaction(async (tx) => {
      await this.assertEmailAvailable(email, undefined, tx);

      const createdUser = await tx.user.create({
        data: {
          displayName,
          email,
          isActive: dto.isActive,
          mustChangePassword: true,
          passwordHash,
          roles: {
            create: roles.map((role) => ({
              assignedByUserId: context.actorUserId,
              roleId: role.id,
            })),
          },
        },
      });

      await this.recordAudit(tx, {
        action: USERS_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: { email, isActive: dto.isActive, roleKeys },
        requestMetadata: context.requestMetadata,
        resourceId: createdUser.id,
      });

      return createdUser;
    });

    return this.getUser(user.id);
  }

  public async updateUser(context: ActorContext, userId: string, dto: UpdateUserDto): Promise<UserDetailView> {
    const existingUser = await this.findUserOrThrow(userId);
    const email = dto.email === undefined ? existingUser.email : normalizeEmail(dto.email);
    const displayName = dto.displayName === undefined ? existingUser.displayName : normalizeName(dto.displayName);
    const emailChanged = email !== existingUser.email;

    await this.prisma.$transaction(async (tx) => {
      if (emailChanged) {
        await this.assertEmailAvailable(email, userId, tx);
      }

      await tx.user.update({
        data: {
          displayName,
          email,
          version: {
            increment: 1,
          },
        },
        where: {
          id: userId,
        },
      });

      await this.recordAudit(tx, {
        action: USERS_AUDIT_ACTIONS.updated,
        actorUserId: context.actorUserId,
        metadata: {
          after: { displayName, email },
          before: { displayName: existingUser.displayName, email: existingUser.email },
          fieldsChanged: [
            ...(displayName !== existingUser.displayName ? ["displayName"] : []),
            ...(emailChanged ? ["email"] : []),
          ],
        },
        requestMetadata: context.requestMetadata,
        resourceId: userId,
      });
    });

    if (emailChanged) {
      const revokedCount = await this.sessionService.revokeAllForUser(userId);
      await this.recordAudit(this.prisma, {
        action: USERS_AUDIT_ACTIONS.sessionsRevoked,
        actorUserId: context.actorUserId,
        metadata: { reason: "email_changed", revokedCount },
        requestMetadata: context.requestMetadata,
        resourceId: userId,
      });
    }

    return this.getUser(userId);
  }

  public async disableUser(context: ActorContext, userId: string): Promise<UserDetailView> {
    const user = await this.findUserOrThrow(userId);

    if (user.isActive) {
      await this.assertCanRemoveAdministratorCapability(userId);
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          data: {
            isActive: false,
            version: {
              increment: 1,
            },
          },
          where: {
            id: userId,
          },
        });
        await this.recordAudit(tx, {
          action: USERS_AUDIT_ACTIONS.disabled,
          actorUserId: context.actorUserId,
          requestMetadata: context.requestMetadata,
          resourceId: userId,
        });
      });
    }

    const revokedCount = await this.sessionService.revokeAllForUser(userId);
    if (revokedCount > 0) {
      await this.recordAudit(this.prisma, {
        action: USERS_AUDIT_ACTIONS.sessionsRevoked,
        actorUserId: context.actorUserId,
        metadata: { reason: "user_disabled", revokedCount },
        requestMetadata: context.requestMetadata,
        resourceId: userId,
      });
    }

    return this.getUser(userId);
  }

  public async enableUser(context: ActorContext, userId: string): Promise<UserDetailView> {
    const user = await this.findUserOrThrow(userId);

    if (!user.isActive) {
      await this.prisma.user.update({
        data: {
          isActive: true,
          version: {
            increment: 1,
          },
        },
        where: {
          id: userId,
        },
      });
      await this.recordAudit(this.prisma, {
        action: USERS_AUDIT_ACTIONS.enabled,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: userId,
      });
    }

    return this.getUser(userId);
  }

  public async replaceRoles(context: ActorContext, userId: string, dto: ReplaceUserRolesDto): Promise<UserDetailView> {
    const user = await this.findUserOrThrow(userId);
    const roleKeys = uniqueRoleKeys(dto.roleKeys);
    const roles = await this.findActiveRolesOrThrow(roleKeys);
    const existingRoleKeys = user.roles.map((entry) => entry.role.key).sort();
    const addedRoleKeys = roleKeys.filter((roleKey) => !existingRoleKeys.includes(roleKey));
    const removedRoleKeys = existingRoleKeys.filter((roleKey) => !roleKeys.includes(roleKey));

    if (user.isActive && removedRoleKeys.length > 0) {
      const keepsAdminCapability = await this.doRolesProvideAdministratorCapability(roleKeys);
      if (!keepsAdminCapability) {
        await this.assertCanRemoveAdministratorCapability(userId);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId,
        },
      });
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            assignedByUserId: context.actorUserId,
            roleId: role.id,
            userId,
          })),
        });
      }
      await tx.user.update({
        data: {
          version: {
            increment: 1,
          },
        },
        where: {
          id: userId,
        },
      });
      await this.recordAudit(tx, {
        action: USERS_AUDIT_ACTIONS.rolesUpdated,
        actorUserId: context.actorUserId,
        metadata: { addedRoleKeys, removedRoleKeys, roleKeys },
        requestMetadata: context.requestMetadata,
        resourceId: userId,
      });
    });

    return this.getUser(userId);
  }

  public async resetPassword(context: ActorContext, userId: string, dto: ResetUserPasswordDto): Promise<UserDetailView> {
    await this.findUserOrThrow(userId);
    const passwordHash = await this.passwordService.hash(dto.temporaryPassword);

    await this.prisma.user.update({
      data: {
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        passwordHash,
        version: {
          increment: 1,
        },
      },
      where: {
        id: userId,
      },
    });
    const revokedCount = await this.sessionService.revokeAllForUser(userId);
    await this.recordAudit(this.prisma, {
      action: USERS_AUDIT_ACTIONS.passwordReset,
      actorUserId: context.actorUserId,
      metadata: { revokedCount },
      requestMetadata: context.requestMetadata,
      resourceId: userId,
    });

    return this.getUser(userId);
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  private async findUserDetailsOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      include: {
        permissionOverrides: {
          include: {
            permission: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  private async assertEmailAvailable(
    email: string,
    currentUserId: string | undefined,
    prisma: Pick<Prisma.TransactionClient, "user">,
  ): Promise<void> {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException("Email is already used by another user.");
    }
  }

  private async findActiveRolesOrThrow(roleKeys: readonly string[]) {
    if (roleKeys.length === 0) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: {
        isActive: true,
        key: {
          in: [...roleKeys],
        },
      },
    });
    const foundRoleKeys = new Set(roles.map((role) => role.key));
    const missingRoleKeys = roleKeys.filter((roleKey) => !foundRoleKeys.has(roleKey));

    if (missingRoleKeys.length > 0) {
      throw new BadRequestException(`Invalid or inactive roles: ${missingRoleKeys.join(", ")}.`);
    }

    return roles;
  }

  private async assertCanRemoveAdministratorCapability(userId: string): Promise<void> {
    const isAdministrator = await this.authorizationService.hasAllPermissions(userId, ADMIN_CAPABILITY_CHECKS);
    if (!isAdministrator) {
      return;
    }

    const activeAdministratorCount = await this.countActiveAdministrators();
    if (activeAdministratorCount <= 1) {
      throw new UnprocessableEntityException("At least one active administrator must remain.");
    }
  }

  private async countActiveAdministrators(): Promise<number> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
      },
      where: {
        isActive: true,
      },
    });
    const checks = await Promise.all(
      users.map((user) => this.authorizationService.hasAllPermissions(user.id, ADMIN_CAPABILITY_CHECKS)),
    );

    return checks.filter(Boolean).length;
  }

  private async doRolesProvideAdministratorCapability(roleKeys: readonly string[]): Promise<boolean> {
    if (roleKeys.length === 0) {
      return false;
    }

    const permissions = await this.prisma.rolePermission.findMany({
      include: {
        permission: true,
        role: true,
      },
      where: {
        role: {
          isActive: true,
          key: {
            in: [...roleKeys],
          },
        },
        scope: "ALL",
      },
    });
    const grantedKeys = new Set(permissions.map((permission) => permission.permission.key));

    return ADMIN_CAPABILITY_CHECKS.every((check) => grantedKeys.has(check.permission));
  }

  private async recordAudit(
    prisma: AuditClient,
    event: {
      readonly action: string;
      readonly actorUserId: string;
      readonly metadata?: Prisma.InputJsonValue;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
    },
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: event.action,
      actorUserId: event.actorUserId,
      resourceId: event.resourceId,
      resourceType: USER_RESOURCE_TYPE,
    };

    if (event.metadata !== undefined) {
      data.metadata = event.metadata;
    }

    if (event.requestMetadata.ipAddress) {
      data.ipAddress = event.requestMetadata.ipAddress;
    }

    if (event.requestMetadata.userAgent) {
      data.userAgent = event.requestMetadata.userAgent;
    }

    await prisma.auditLog.create({
      data,
    });
  }
}
