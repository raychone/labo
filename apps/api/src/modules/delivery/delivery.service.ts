import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryEventType, DeliveryPreparationGroupStatus, DeliveryStatus, Prisma, WorkLogisticsStatus } from "@prisma/client";

import type { RequestMetadata, AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { PermissionKey } from "../rbac/permission-registry.js";
import { DeliveryCodeService } from "./delivery-code.service.js";
import { DELIVERY_AUDIT_ACTIONS, DELIVERY_RESOURCE_TYPE } from "./delivery.constants.js";
import type { AssignCourierDto, CreateDeliveryDto, ListDeliveriesQueryDto, UpdateDeliveryDto } from "./dto/delivery.dto.js";
import { deliveryInclude, type DeliveryAccessContext, type DeliveryDetail, type DeliveryRecord, type DeliverySummary, toDeliveryDetail, toDeliverySummary } from "./delivery.view.js";

export interface ActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

export interface PaginatedDeliveriesResponse {
  readonly items: readonly DeliverySummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CourierOption {
  readonly displayName: string;
  readonly id: string;
}

type DeliveryTx = Prisma.TransactionClient;

@Injectable()
export class DeliveryService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(DeliveryCodeService) private readonly deliveryCodeService: DeliveryCodeService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async listDeliveries(actor: AuthenticatedUser, query: ListDeliveriesQueryDto): Promise<PaginatedDeliveriesResponse> {
    const access = await this.createAccessContext(actor.id);
    const page = Math.max(query.page, 1);
    const pageSize = Math.min(query.pageSize, 100);
    const where = this.toDeliveryWhere(query, actor.id, access);
    const [total, deliveries] = await this.prisma.$transaction([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        include: deliveryInclude,
        orderBy: [{ [query.sortBy]: query.sortDirection }, { code: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);
    const now = new Date();

    return {
      items: deliveries.map((delivery) => toDeliverySummary(delivery, access, now)),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async getDelivery(actor: AuthenticatedUser, deliveryId: string): Promise<DeliveryDetail> {
    const access = await this.createAccessContext(actor.id);
    const delivery = await this.findDeliveryOrThrow(deliveryId);
    this.assertReadable(delivery, access);
    return toDeliveryDetail(delivery, access, new Date());
  }

  public async createDelivery(context: ActorContext, groupId: string, dto: CreateDeliveryDto): Promise<DeliveryDetail> {
    await this.assertPermission(context.actor.id, "delivery.create", "ALL");
    const plannedDate = parseIsoDate(dto.plannedDate);
    const delivery = await this.prisma.$transaction(async (tx) => {
      const group = await tx.deliveryPreparationGroup.findUnique({
        include: {
          clinic: true,
          deliveries: { where: { isActive: true } },
          items: {
            include: { workOrder: { include: { logisticsState: true } } },
            where: { isActive: true },
          },
        },
        where: { id: groupId },
      });
      if (!group) {
        throw new NotFoundException("Grupul de pregătire nu a fost găsit.");
      }
      if (group.status !== DeliveryPreparationGroupStatus.READY) {
        throw new BadRequestException("Doar grupurile marcate gata de livrare pot fi transformate în livrări.");
      }
      if (group.deliveries.length > 0) {
        throw new ConflictException("Grupul are deja o livrare activă.");
      }
      if (group.items.length === 0) {
        throw new BadRequestException("Grupul nu conține lucrări active.");
      }
      for (const item of group.items) {
        if (item.workOrder.clinicId !== group.clinicId) {
          throw new BadRequestException("Toate lucrările livrării trebuie să aparțină aceleiași clinici.");
        }
        if (item.workOrder.logisticsState?.status !== WorkLogisticsStatus.READY_FOR_DELIVERY) {
          throw new BadRequestException("Toate lucrările trebuie să fie gata de livrare.");
        }
      }

      if (dto.courierUserId) {
        await this.assertCourier(tx, dto.courierUserId);
      }

      const now = new Date();
      const code = await this.deliveryCodeService.generate(tx, now);
      const created = await tx.delivery.create({
        data: {
          assignedAt: dto.courierUserId ? now : null,
          assignedByUserId: dto.courierUserId ? context.actor.id : null,
          clinicId: group.clinicId,
          code,
          courierUserId: dto.courierUserId ?? null,
          createdByUserId: context.actor.id,
          plannedDate,
          preparationGroupId: group.id,
          sequenceOrder: dto.sequenceOrder ?? null,
          status: dto.courierUserId ? DeliveryStatus.ASSIGNED : DeliveryStatus.PLANNED,
          updatedByUserId: context.actor.id,
        },
        include: deliveryInclude,
      });
      await this.recordEvent(tx, created.id, DeliveryEventType.DELIVERY_CREATED, context.actor.id, {
        actorUserId: context.actor.id,
        deliveryCode: created.code,
        deliveryId: created.id,
        groupId: group.id,
        newCourierUserId: dto.courierUserId ?? null,
        newStatus: created.status,
      });
      if (dto.courierUserId) {
        await this.recordEvent(tx, created.id, DeliveryEventType.COURIER_ASSIGNED, context.actor.id, {
          actorUserId: context.actor.id,
          deliveryCode: created.code,
          deliveryId: created.id,
          groupId: group.id,
          newCourierUserId: dto.courierUserId,
        });
      }
      await this.recordAudit(tx, context, DELIVERY_AUDIT_ACTIONS.created, created.id, {
        deliveryCode: created.code,
        deliveryId: created.id,
        groupId: group.id,
        newCourierUserId: dto.courierUserId ?? null,
        newStatus: created.status,
      });
      return created;
    });
    const access = await this.createAccessContext(context.actor.id);
    return toDeliveryDetail(delivery, access, new Date());
  }

  public async updateDelivery(context: ActorContext, deliveryId: string, dto: UpdateDeliveryDto): Promise<DeliveryDetail> {
    await this.assertPermission(context.actor.id, "delivery.assign", "ALL");
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDeliveryInTx(tx, deliveryId);
      this.assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.PLANNED && current.status !== DeliveryStatus.ASSIGNED) {
        throw new BadRequestException("Planificarea poate fi modificată doar înainte de preluare.");
      }
      const data: Prisma.DeliveryUncheckedUpdateInput = {
        updatedByUserId: context.actor.id,
        version: { increment: 1 },
      };
      if (dto.plannedDate) {
        data.plannedDate = parseIsoDate(dto.plannedDate);
      }
      if (dto.sequenceOrder !== undefined) {
        data.sequenceOrder = dto.sequenceOrder;
      }
      const updated = await tx.delivery.update({
        data,
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.recordAudit(tx, context, DELIVERY_AUDIT_ACTIONS.updated, updated.id, {
        deliveryCode: updated.code,
        deliveryId: updated.id,
        newStatus: updated.status,
      });
      return updated;
    });
    return toDeliveryDetail(delivery, await this.createAccessContext(context.actor.id), new Date());
  }

  public async assignCourier(context: ActorContext, deliveryId: string, dto: AssignCourierDto): Promise<DeliveryDetail> {
    await this.assertPermission(context.actor.id, "delivery.assign", "ALL");
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDeliveryInTx(tx, deliveryId);
      this.assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.PLANNED && current.status !== DeliveryStatus.ASSIGNED) {
        throw new BadRequestException("Curierul poate fi modificat doar înainte de preluare.");
      }
      await this.assertCourier(tx, dto.courierUserId);
      const eventType = current.courierUserId ? DeliveryEventType.COURIER_REASSIGNED : DeliveryEventType.COURIER_ASSIGNED;
      const updated = await tx.delivery.update({
        data: {
          assignedAt: new Date(),
          assignedByUserId: context.actor.id,
          courierUserId: dto.courierUserId,
          status: DeliveryStatus.ASSIGNED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.recordEvent(tx, updated.id, eventType, context.actor.id, {
        actorUserId: context.actor.id,
        deliveryCode: updated.code,
        deliveryId: updated.id,
        newCourierUserId: dto.courierUserId,
        oldCourierUserId: current.courierUserId,
      });
      await this.recordAudit(tx, context, DELIVERY_AUDIT_ACTIONS.assigned, updated.id, {
        deliveryCode: updated.code,
        deliveryId: updated.id,
        newCourierUserId: dto.courierUserId,
        oldCourierUserId: current.courierUserId,
      });
      return updated;
    });
    return toDeliveryDetail(delivery, await this.createAccessContext(context.actor.id), new Date());
  }

  public async unassignCourier(context: ActorContext, deliveryId: string, dto: { readonly version: number }): Promise<DeliveryDetail> {
    await this.assertPermission(context.actor.id, "delivery.assign", "ALL");
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDeliveryInTx(tx, deliveryId);
      this.assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.PLANNED && current.status !== DeliveryStatus.ASSIGNED) {
        throw new BadRequestException("Curierul poate fi scos doar înainte de preluare.");
      }
      const updated = await tx.delivery.update({
        data: {
          assignedAt: null,
          assignedByUserId: null,
          courierUserId: null,
          status: DeliveryStatus.PLANNED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.recordEvent(tx, updated.id, DeliveryEventType.COURIER_UNASSIGNED, context.actor.id, {
        actorUserId: context.actor.id,
        deliveryCode: updated.code,
        deliveryId: updated.id,
        oldCourierUserId: current.courierUserId,
      });
      return updated;
    });
    return toDeliveryDetail(delivery, await this.createAccessContext(context.actor.id), new Date());
  }

  public async cancelDelivery(context: ActorContext, deliveryId: string, dto: { readonly version: number }): Promise<DeliveryDetail> {
    await this.assertPermission(context.actor.id, "delivery.cancel", "ALL");
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDeliveryInTx(tx, deliveryId);
      this.assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.PLANNED && current.status !== DeliveryStatus.ASSIGNED && current.status !== DeliveryStatus.FAILED) {
        throw new BadRequestException("Livrarea poate fi anulată doar înainte de finalizare.");
      }
      const updated = await tx.delivery.update({
        data: {
          cancelledAt: new Date(),
          cancelledByUserId: context.actor.id,
          isActive: false,
          status: DeliveryStatus.CANCELLED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.recordEvent(tx, updated.id, DeliveryEventType.DELIVERY_CANCELLED, context.actor.id, {
        actorUserId: context.actor.id,
        deliveryCode: updated.code,
        deliveryId: updated.id,
        oldStatus: current.status,
        newStatus: updated.status,
      });
      await this.recordAudit(tx, context, DELIVERY_AUDIT_ACTIONS.cancelled, updated.id, {
        deliveryCode: updated.code,
        deliveryId: updated.id,
        oldStatus: current.status,
        newStatus: updated.status,
      });
      return updated;
    });
    return toDeliveryDetail(delivery, await this.createAccessContext(context.actor.id), new Date());
  }

  public async listCourierOptions(): Promise<readonly CourierOption[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { displayName: "asc" },
      select: { displayName: true, id: true },
      where: {
        isActive: true,
        roles: {
          some: {
            role: { key: "CURIER" },
          },
        },
      },
    });
    return users;
  }

  public async createAccessContext(userId: string): Promise<DeliveryAccessContext> {
    const checks = await Promise.all([
      this.authorizationService.hasPermission({ permission: "delivery.assign", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "delivery.cancel", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "delivery.complete", requiredScope: "OWN_DELIVERY", userId }),
      this.authorizationService.hasPermission({ permission: "delivery.fail", requiredScope: "OWN_DELIVERY", userId }),
      this.authorizationService.hasPermission({ permission: "delivery.pickup", requiredScope: "OWN_DELIVERY", userId }),
      this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "delivery.reschedule", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "delivery.start_transit", requiredScope: "OWN_DELIVERY", userId }),
    ]);
    return {
      canAssign: checks[0].allowed,
      canCancel: checks[1].allowed,
      canComplete: checks[2].allowed || await this.hasAll(userId, "delivery.complete"),
      canFail: checks[3].allowed || await this.hasAll(userId, "delivery.fail"),
      canPickup: checks[4].allowed || await this.hasAll(userId, "delivery.pickup"),
      canReadBilling: checks[5].allowed,
      canReschedule: checks[6].allowed,
      canStartTransit: checks[7].allowed || await this.hasAll(userId, "delivery.start_transit"),
      canUnassign: checks[0].allowed,
      canUpdatePlan: checks[0].allowed,
      userId,
    };
  }

  private async hasAll(userId: string, permission: PermissionKey): Promise<boolean> {
    return (await this.authorizationService.hasPermission({ permission, requiredScope: "ALL", userId })).allowed;
  }

  private toDeliveryWhere(query: ListDeliveriesQueryDto, actorUserId: string, access: DeliveryAccessContext): Prisma.DeliveryWhereInput {
    const search = query.search?.trim();
    const today = startOfUtcDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return {
      ...(access.canAssign ? {} : { courierUserId: actorUserId }),
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(access.canAssign && query.courierUserId ? { courierUserId: query.courierUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.filter === "UNASSIGNED" ? { courierUserId: null, status: { in: [DeliveryStatus.PLANNED, DeliveryStatus.ASSIGNED] } } : {}),
      ...(query.filter === "TODAY" ? { plannedDate: { gte: today, lt: tomorrow } } : {}),
      ...(query.filter === "PICKED_UP" ? { status: DeliveryStatus.PICKED_UP } : {}),
      ...(query.filter === "IN_TRANSIT" ? { status: DeliveryStatus.IN_TRANSIT } : {}),
      ...(query.filter === "FAILED" ? { status: DeliveryStatus.FAILED } : {}),
      ...(query.filter === "DELIVERED" ? { status: DeliveryStatus.DELIVERED } : {}),
      ...(query.filter === "CANCELLED" ? { status: DeliveryStatus.CANCELLED } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            plannedDate: {
              ...(query.dateFrom ? { gte: parseIsoDate(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: parseIsoDate(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { preparationGroup: { code: { contains: search, mode: "insensitive" } } },
              { clinic: { name: { contains: search, mode: "insensitive" } } },
              { courier: { displayName: { contains: search, mode: "insensitive" } } },
              { preparationGroup: { items: { some: { workOrder: { code: { contains: search, mode: "insensitive" } } } } } },
            ],
          }
        : {}),
    };
  }

  private assertReadable(delivery: DeliveryRecord, access: DeliveryAccessContext): void {
    if (access.canAssign || delivery.courierUserId === access.userId) {
      return;
    }
    throw new ForbiddenException("Nu ai acces la această livrare.");
  }

  private async assertPermission(userId: string, permission: PermissionKey, requiredScope: "ALL" | "OWN_DELIVERY"): Promise<void> {
    const result = await this.authorizationService.hasPermission({ permission, requiredScope, userId });
    if (!result.allowed) {
      throw new ForbiddenException("Nu ai permisiune pentru această acțiune.");
    }
  }

  private async assertCourier(tx: DeliveryTx, courierUserId: string): Promise<void> {
    const user = await tx.user.findFirst({
      select: { id: true },
      where: { id: courierUserId, isActive: true, roles: { some: { role: { key: "CURIER" } } } },
    });
    if (!user) {
      throw new BadRequestException("Curierul selectat nu este activ.");
    }
  }

  private async findDeliveryOrThrow(deliveryId: string): Promise<DeliveryRecord> {
    const delivery = await this.prisma.delivery.findUnique({ include: deliveryInclude, where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException("Livrarea nu a fost găsită.");
    }
    return delivery;
  }

  private async findDeliveryInTx(tx: DeliveryTx, deliveryId: string): Promise<DeliveryRecord> {
    const delivery = await tx.delivery.findUnique({ include: deliveryInclude, where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException("Livrarea nu a fost găsită.");
    }
    return delivery;
  }

  private assertVersion(currentVersion: number, expectedVersion: number): void {
    if (currentVersion !== expectedVersion) {
      throw new ConflictException("Livrarea a fost modificată între timp. Reîncarcă datele.");
    }
  }

  private async recordEvent(tx: DeliveryTx, deliveryId: string, type: DeliveryEventType, actorUserId: string, metadata: Prisma.InputJsonValue): Promise<void> {
    await tx.deliveryEvent.create({
      data: { actorUserId, deliveryId, metadata, type },
    });
  }

  private async recordAudit(tx: DeliveryTx, context: ActorContext, action: string, deliveryId: string, metadata: Prisma.InputJsonValue): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId: deliveryId,
      resourceType: DELIVERY_RESOURCE_TYPE,
    };
    if (context.requestMetadata.ipAddress) {
      data.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      data.userAgent = context.requestMetadata.userAgent;
    }
    await tx.auditLog.create({
      data,
    });
  }
}

function parseIsoDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Data livrării este invalidă.");
  }
  return date;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
