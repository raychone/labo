import { ConflictException, Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import {
  getCanonicalWorkOrderCompositionTeeth,
  compareNormalizedToothConnections,
  isAdjacentAdultFdiPair,
  normalizeConnectionPair,
  POSTMEETING_AUDIT_ACTIONS,
  type ToothConnectionView,
} from "@dental-lab/shared";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { getVisibleWorkWhere } from "./work-readability.js";
import type { CreateToothConnectionDto } from "./dto/tooth-connections.dto.js";

const TOOTH_CONNECTION_INCLUDE = {
  workOrder: { select: { code: true } },
} satisfies PrismaTypes.WorkOrderToothConnectionInclude;
const ACTIVE_COMPOSITION_INCLUDE = {
  select: { archivedAt: true, scope: true, teeth: { select: { fdiTooth: true } } },
} satisfies PrismaTypes.WorkOrderItemFindManyArgs;

type ToothConnectionRecord = PrismaTypes.WorkOrderToothConnectionGetPayload<{ include: typeof TOOTH_CONNECTION_INCLUDE }>;

@Injectable()
export class ToothConnectionsService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async list(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<readonly ToothConnectionView[]> {
    await this.findReadableWorkOrder(actorUserId, workOrderId, legalEntity);
    const connections = await this.prisma.workOrderToothConnection.findMany({
      orderBy: [{ toothA: "asc" }, { toothB: "asc" }],
      where: { workOrderId },
    });
    return connections.map(toToothConnectionView).sort(compareNormalizedToothConnections);
  }

  public async create(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly dto: CreateToothConnectionDto;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<ToothConnectionView> {
    await this.authorizationService.requirePermission({ permission: "works.connections.manage", requiredScope: "ALL", userId: input.actorUserId });
    const workOrder = await this.findReadableWorkOrder(input.actorUserId, input.workOrderId, input.legalEntity);
    const pair = normalizeConnectionPair(input.dto.toothA, input.dto.toothB);
    if (!pair || !isAdjacentAdultFdiPair(input.dto.toothA, input.dto.toothB)) {
      throw new BadRequestException("Conexiunea este permisă doar între doi dinți adulți FDI adiacenți din aceeași arcadă.");
    }

    const items = await this.prisma.workOrderItem.findMany({
      ...ACTIVE_COMPOSITION_INCLUDE,
      where: { archivedAt: null, workOrderId: input.workOrderId },
    });
    const presentTeeth = new Set(getCanonicalWorkOrderCompositionTeeth(items.map((item) => ({
      archivedAt: item.archivedAt,
      scope: item.scope,
      teeth: item.teeth.map((tooth) => tooth.fdiTooth),
    }))));
    if (!presentTeeth.has(pair.toothA) || !presentTeeth.has(pair.toothB)) {
      throw new BadRequestException("Ambii dinți trebuie să facă parte din compoziția canonică activă a lucrării.");
    }

    let connection: ToothConnectionRecord;
    try {
      connection = await this.prisma.workOrderToothConnection.create({
        data: { toothA: pair.toothA, toothB: pair.toothB, workOrderId: input.workOrderId },
        include: TOOTH_CONNECTION_INCLUDE,
      });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) throw new ConflictException("Această conexiune există deja în lucrare.");
      throw error;
    }
    await this.auditService.record({
      action: POSTMEETING_AUDIT_ACTIONS.toothConnectionAdded,
      actorUserId: input.actorUserId,
      metadata: { toothNumbers: [pair.toothA, pair.toothB], workOrderLabel: workOrder.code },
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
      resourceId: connection.id,
      resourceType: "work_order_tooth_connection",
    });
    return toToothConnectionView(connection);
  }

  public async remove(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly connectionId: string;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<{ readonly removed: true }> {
    await this.authorizationService.requirePermission({ permission: "works.connections.manage", requiredScope: "ALL", userId: input.actorUserId });
    const workOrder = await this.findReadableWorkOrder(input.actorUserId, input.workOrderId, input.legalEntity);
    const connection = await this.prisma.workOrderToothConnection.findFirst({ where: { id: input.connectionId, workOrderId: input.workOrderId } });
    if (!connection) throw new NotFoundException("Conexiunea nu a fost găsită în această lucrare.");
    await this.prisma.workOrderToothConnection.delete({ where: { id: input.connectionId } });
    await this.auditService.record({
      action: POSTMEETING_AUDIT_ACTIONS.toothConnectionRemoved,
      actorUserId: input.actorUserId,
      metadata: { toothNumbers: [connection.toothA, connection.toothB], workOrderLabel: workOrder.code },
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
      resourceId: input.connectionId,
      resourceType: "work_order_tooth_connection",
    });
    return { removed: true };
  }

  public async cleanupOrphanedConnections(tx: Prisma.TransactionClient, workOrderId: string): Promise<void> {
    const items = await tx.workOrderItem.findMany({
      ...ACTIVE_COMPOSITION_INCLUDE,
      where: { workOrderId },
    });
    const presentTeeth = getCanonicalWorkOrderCompositionTeeth(items.map((item) => ({
      archivedAt: item.archivedAt,
      scope: item.scope,
      teeth: item.teeth.map((tooth) => tooth.fdiTooth),
    })));
    if (presentTeeth.length === 0) {
      await tx.workOrderToothConnection.deleteMany({ where: { workOrderId } });
      return;
    }
    await tx.workOrderToothConnection.deleteMany({
      where: {
        workOrderId,
        OR: [{ toothA: { notIn: [...presentTeeth] } }, { toothB: { notIn: [...presentTeeth] } }],
      },
    });
  }

  private async findReadableWorkOrder(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<{ readonly id: string; readonly code: string }> {
    const visibleWhere = await getVisibleWorkWhere(this.authorizationService, actorUserId);
    const workOrder = await this.prisma.workOrder.findFirst({
      select: { code: true, id: true },
      where: { AND: [{ id: workOrderId }, visibleWhere, ...(legalEntity ? [{ executionLegalEntityId: legalEntity.id }] : [])] },
    });
    if (!workOrder) throw new NotFoundException("Lucrarea nu a fost găsită.");
    return workOrder;
  }
}

export function toToothConnectionView(connection: Pick<ToothConnectionRecord, "createdAt" | "id" | "toothA" | "toothB" | "workOrderId">): ToothConnectionView {
  return { createdAt: connection.createdAt.toISOString(), id: connection.id, toothA: connection.toothA as ToothConnectionView["toothA"], toothB: connection.toothB as ToothConnectionView["toothB"], workOrderId: connection.workOrderId };
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
