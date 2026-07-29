import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { LegalEntity } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { LegalEntityCode } from "./dto/organization-context.dto.js";
import { ORGANIZATION_CONTEXT_AUDIT_ACTIONS, ORGANIZATION_CONTEXT_RESOURCE_TYPES } from "./organization-context.constants.js";
import { toLegalEntityContext, toOrganizationContextView, type LegalEntityContext, type OrganizationContextView } from "./organization-context.view.js";

interface ResolveContextInput {
  readonly sessionId: string;
  readonly userId: string;
}

interface SwitchContextInput extends ResolveContextInput {
  readonly code: LegalEntityCode;
  readonly requestMetadata: RequestMetadata;
}

type SessionWithLegalEntity = {
  readonly activeLegalEntity: Pick<LegalEntity, "code" | "displayName" | "id" | "isActive"> | null;
  readonly activeLegalEntityId: string | null;
  readonly expiresAt: Date;
  readonly id: string;
  readonly revokedAt: Date | null;
  readonly userId: string;
};

@Injectable()
export class OrganizationContextService {
  public constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  public async getContext(input: ResolveContextInput): Promise<OrganizationContextView> {
    const canSwitch = await this.canSwitchContext(input.userId);
    const available = await this.findActiveLegalEntities();
    const active = await this.resolveOrInitializeActiveContext(input, available);

    return toOrganizationContextView({
      active,
      available,
      canSwitch,
    });
  }

  public async switchContext(input: SwitchContextInput): Promise<OrganizationContextView> {
    await this.authorizationService.requirePermission({
      permission: "organization_context.switch",
      requiredScope: "ALL",
      userId: input.userId,
    });

    const target = await this.prisma.legalEntity.findFirst({
      select: {
        code: true,
        displayName: true,
        id: true,
        isActive: true,
      },
      where: {
        code: input.code,
        isActive: true,
      },
    });

    if (!target) {
      throw new NotFoundException("Firma selectată nu este disponibilă.");
    }

    const previousSession = await this.findUsableSession(input);

    if (!previousSession) {
      throw new ForbiddenException("Sesiunea curentă nu este disponibilă.");
    }

    const updateResult = await this.prisma.session.updateMany({
      data: {
        activeLegalEntityId: target.id,
      },
      where: {
        expiresAt: {
          gt: new Date(),
        },
        id: input.sessionId,
        revokedAt: null,
        userId: input.userId,
      },
    });

    if (updateResult.count !== 1) {
      throw new ForbiddenException("Sesiunea curentă nu este disponibilă.");
    }

    await this.auditService.record({
      action: ORGANIZATION_CONTEXT_AUDIT_ACTIONS.switched,
      actorUserId: input.userId,
      metadata: {
        fromCode: previousSession.activeLegalEntity?.isActive === true ? previousSession.activeLegalEntity.code : null,
        sessionId: input.sessionId,
        source: "shell",
        toCode: target.code,
      },
      requestMetadata: input.requestMetadata,
      resourceId: input.sessionId,
      resourceType: ORGANIZATION_CONTEXT_RESOURCE_TYPES.session,
    });

    return this.getContext(input);
  }

  public async requireActiveContext(input: ResolveContextInput): Promise<LegalEntityContext> {
    const available = await this.findActiveLegalEntities();
    const active = await this.resolveOrInitializeActiveContext(input, available);

    if (!active) {
      throw new UnprocessableEntityException("Este necesară selectarea firmei active.");
    }

    return active;
  }

  private async canSwitchContext(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "organization_context.switch",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }

  private async findActiveLegalEntities(): Promise<readonly Pick<LegalEntity, "code" | "displayName" | "id">[]> {
    return this.prisma.legalEntity.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { code: "asc" },
      ],
      select: {
        code: true,
        displayName: true,
        id: true,
      },
      where: {
        isActive: true,
      },
    });
  }

  private async resolveOrInitializeActiveContext(
    input: ResolveContextInput,
    activeEntities: readonly Pick<LegalEntity, "code" | "displayName" | "id">[],
  ): Promise<LegalEntityContext | null> {
    const session = await this.findUsableSession(input);

    if (!session) {
      throw new ForbiddenException("Sesiunea curentă nu este disponibilă.");
    }

    if (session.activeLegalEntity?.isActive === true) {
      return toLegalEntityContext(session.activeLegalEntity);
    }

    if (session.activeLegalEntityId) {
      await this.clearInactiveContext(input);
    }

    const defaultEntity = activeEntities[0];

    if (!defaultEntity) {
      throw new UnprocessableEntityException("Nu există firme active configurate.");
    }

    await this.prisma.session.updateMany({
      data: {
        activeLegalEntityId: defaultEntity.id,
      },
      where: {
        expiresAt: {
          gt: new Date(),
        },
        id: input.sessionId,
        revokedAt: null,
        userId: input.userId,
      },
    });

    return toLegalEntityContext(defaultEntity);
  }

  private async findUsableSession(input: ResolveContextInput): Promise<SessionWithLegalEntity | null> {
    return this.prisma.session.findFirst({
      include: {
        activeLegalEntity: {
          select: {
            code: true,
            displayName: true,
            id: true,
            isActive: true,
          },
        },
      },
      where: {
        expiresAt: {
          gt: new Date(),
        },
        id: input.sessionId,
        revokedAt: null,
        userId: input.userId,
      },
    });
  }

  private async clearInactiveContext(input: ResolveContextInput): Promise<void> {
    await this.prisma.session.updateMany({
      data: {
        activeLegalEntityId: null,
      },
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
    });
  }
}
