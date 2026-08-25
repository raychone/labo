import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { DeliveryEventType, DeliveryFailureReasonCode, DeliveryStatus, Prisma, WorkLogisticsStatus } from "@prisma/client";

import type { ActorContext } from "./delivery.service.js";
import { DeliveryService } from "./delivery.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { DELIVERY_AUDIT_ACTIONS, DELIVERY_RESOURCE_TYPE } from "./delivery.constants.js";
import { STALE_DELIVERY_MESSAGE } from "../delivery-proof/delivery-proof.constants.js";
import { DeliveryProofService } from "../delivery-proof/delivery-proof.service.js";
import { B17_LOGISTICS_NOTIFICATION_EVENTS, getB17LogisticsNotificationKey } from "@dental-lab/shared";
import { DeliveryCodeService } from "./delivery-code.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CompleteDeliveryDto, FailDeliveryDto, RescheduleDeliveryDto } from "./dto/delivery.dto.js";
import { deliveryInclude, type DeliveryDetail, toDeliveryDetail } from "./delivery.view.js";

type DeliveryTx = Prisma.TransactionClient;

@Injectable()
export class DeliveryTransitionService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(DeliveryService) private readonly deliveryService: DeliveryService,
    @Inject(DeliveryProofService) private readonly deliveryProofService: DeliveryProofService,
    @Inject(DeliveryCodeService) private readonly deliveryCodeService: DeliveryCodeService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  public async pickup(context: ActorContext, deliveryId: string, version: number): Promise<DeliveryDetail> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDelivery(tx, deliveryId);
      await this.assertAction(context, current.courierUserId, "pickup");
      assertVersion(current.version, version);
      if (current.status !== DeliveryStatus.ASSIGNED) {
        throw new BadRequestException("Doar livrările atribuite pot fi preluate.");
      }
      for (const item of current.preparationGroup.items) {
        if (item.workOrder.technicalReadiness !== "PROBE_READY" && item.workOrder.technicalReadiness !== "FINAL_READY") {
          throw new BadRequestException("Doar lucrările marcate Probă gata sau Finalizată pot fi predate curierului.");
        }
      }
      const now = new Date();
      await tx.workLogisticsState.updateMany({
        data: { status: WorkLogisticsStatus.HANDED_TO_DELIVERY, updatedByUserId: context.actor.id, version: { increment: 1 } },
        where: { workCycleId: { in: current.preparationGroup.items.map((item) => item.workCycleId).filter((id): id is string => id !== null) } },
      });
      const updated = await tx.delivery.update({
        data: { pickedUpAt: now, pickedUpByUserId: context.actor.id, status: DeliveryStatus.PICKED_UP, updatedByUserId: context.actor.id, version: { increment: 1 } },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.record(tx, context, updated.id, DeliveryEventType.DELIVERY_PICKED_UP, DELIVERY_AUDIT_ACTIONS.pickedUp, current.status, updated.status);
      return updated;
    });
    return toDeliveryDetail(delivery, await this.deliveryService.createAccessContext(context.actor.id), new Date());
  }

  public async startTransit(context: ActorContext, deliveryId: string, version: number): Promise<DeliveryDetail> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDelivery(tx, deliveryId);
      await this.assertAction(context, current.courierUserId, "start_transit");
      assertVersion(current.version, version);
      if (current.status !== DeliveryStatus.PICKED_UP) {
        throw new BadRequestException("Doar livrările preluate pot intra în tranzit.");
      }
      const updated = await tx.delivery.update({
        data: { inTransitAt: new Date(), status: DeliveryStatus.IN_TRANSIT, updatedByUserId: context.actor.id, version: { increment: 1 } },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.record(tx, context, updated.id, DeliveryEventType.DELIVERY_IN_TRANSIT, DELIVERY_AUDIT_ACTIONS.startedTransit, current.status, updated.status);
      return updated;
    });
    return toDeliveryDetail(delivery, await this.deliveryService.createAccessContext(context.actor.id), new Date());
  }

  public async complete(context: ActorContext, deliveryId: string, dto: CompleteDeliveryDto): Promise<DeliveryDetail> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDelivery(tx, deliveryId);
      await this.assertAction(context, current.courierUserId, "complete");
      assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.IN_TRANSIT) {
        throw new BadRequestException("Doar livrările aflate în tranzit pot fi finalizate.");
      }
      const now = new Date();
      const proofResult = await this.deliveryProofService.createForCompletedDelivery(tx, context, current, dto, now);
      await tx.workLogisticsState.updateMany({
        data: { status: WorkLogisticsStatus.DELIVERED, updatedByUserId: context.actor.id, version: { increment: 1 } },
        where: { workCycleId: { in: current.preparationGroup.items.map((item) => item.workCycleId).filter((id): id is string => id !== null) } },
      });
      const updated = await tx.delivery.update({
        data: {
          deliveredAt: now,
          deliveredByUserId: context.actor.id,
          deliveryNotes: dto.deliveryNotes ?? null,
          recipientName: dto.recipientName,
          recipientRole: dto.recipientRole ?? null,
          status: DeliveryStatus.DELIVERED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await this.recordProof(tx, context, updated.id, proofResult.eventType, proofResult.auditAction, {
        ...proofResult.metadata,
        deliveryCode: updated.code,
        deliveryId: updated.id,
      });
      await this.record(tx, context, updated.id, DeliveryEventType.DELIVERY_COMPLETED, DELIVERY_AUDIT_ACTIONS.completed, current.status, updated.status);
      for (const item of updated.preparationGroup.items) await this.notificationsService.publishDeliveryInTransaction(tx, { deliveryId: updated.id, workOrderId: item.workOrderId, code: item.workOrder.code, patientName: item.workOrder.patientName, failed: false });
      return updated;
    });
    return toDeliveryDetail(delivery, await this.deliveryService.createAccessContext(context.actor.id), new Date());
  }

  public async fail(context: ActorContext, deliveryId: string, dto: FailDeliveryDto): Promise<DeliveryDetail> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDelivery(tx, deliveryId);
      await this.assertAction(context, current.courierUserId, "fail");
      assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.PICKED_UP && current.status !== DeliveryStatus.IN_TRANSIT) {
        throw new BadRequestException("Doar livrările preluate sau în tranzit pot fi marcate nereușite.");
      }
      if (dto.reasonCode === DeliveryFailureReasonCode.OTHER && !dto.failureDetails) {
        throw new BadRequestException("Pentru alt motiv trebuie completate detaliile.");
      }
      const updated = await tx.delivery.update({
        data: {
          failedAt: new Date(),
          failureDetails: dto.failureDetails ?? null,
          failureReasonCode: dto.reasonCode,
          status: DeliveryStatus.FAILED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      await tx.workOrder.updateMany({
        data: { requiresDelivery: true, updatedByUserId: context.actor.id, version: { increment: 1 } },
        where: { id: { in: current.preparationGroup.items.map((item) => item.workOrderId) } },
      });
      await this.record(tx, context, updated.id, DeliveryEventType.DELIVERY_FAILED, DELIVERY_AUDIT_ACTIONS.failed, current.status, updated.status);
      for (const item of updated.preparationGroup.items) await this.notificationsService.publishDeliveryInTransaction(tx, { deliveryId: updated.id, workOrderId: item.workOrderId, code: item.workOrder.code, patientName: item.workOrder.patientName, failed: true, failureReason: updated.failureDetails ?? updated.failureReasonCode });
      return updated;
    });
    return toDeliveryDetail(delivery, await this.deliveryService.createAccessContext(context.actor.id), new Date());
  }

  public async reschedule(context: ActorContext, deliveryId: string, dto: RescheduleDeliveryDto): Promise<DeliveryDetail> {
    const plannedDate = new Date(dto.plannedDate);
    if (Number.isNaN(plannedDate.getTime()) || plannedDate.getTime() <= Date.now()) {
      throw new BadRequestException("Replanificarea trebuie să fie în viitor.");
    }
    const delivery = await this.prisma.$transaction(async (tx) => {
      const current = await this.findDelivery(tx, deliveryId);
      await this.assertAll(context, "delivery.reschedule");
      assertVersion(current.version, dto.version);
      if (current.status !== DeliveryStatus.FAILED) {
        throw new BadRequestException("Doar livrările nereușite pot fi replanificate.");
      }
      const nextStatus = current.courierUserId ? DeliveryStatus.ASSIGNED : DeliveryStatus.PLANNED;
      const now = new Date();
      const historical = await tx.delivery.update({
        data: {
          rescheduledFor: plannedDate,
          isActive: false,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryInclude,
        where: { id: deliveryId },
      });
      const code = await this.deliveryCodeService.generate(tx, now);
      const retry = await tx.delivery.create({
        data: {
          assignedAt: current.courierUserId ? now : null,
          assignedByUserId: current.courierUserId ? context.actor.id : null,
          clinicId: current.clinicId,
          code,
          courierUserId: current.courierUserId,
          createdByUserId: context.actor.id,
          plannedDate,
          preparationGroupId: current.preparationGroupId,
          sequenceOrder: dto.sequenceOrder ?? current.sequenceOrder,
          status: nextStatus,
          updatedByUserId: context.actor.id,
        },
        include: deliveryInclude,
      });
      await this.record(tx, context, historical.id, DeliveryEventType.DELIVERY_RESCHEDULED, DELIVERY_AUDIT_ACTIONS.rescheduled, current.status, current.status);
      await this.record(tx, context, retry.id, DeliveryEventType.DELIVERY_CREATED, DELIVERY_AUDIT_ACTIONS.created, DeliveryStatus.PLANNED, retry.status);
      return retry;
    });
    return toDeliveryDetail(delivery, await this.deliveryService.createAccessContext(context.actor.id), new Date());
  }

  private async assertAction(context: ActorContext, courierUserId: string | null, action: "complete" | "fail" | "pickup" | "start_transit"): Promise<void> {
    const permission = `delivery.${action}` as const;
    const all = await this.authorizationService.hasPermission({ permission, requiredScope: "ALL", userId: context.actor.id });
    if (all.allowed) {
      return;
    }
    const own = await this.authorizationService.hasPermission({ permission, requiredScope: "OWN_DELIVERY", userId: context.actor.id });
    if (own.allowed && courierUserId === context.actor.id) {
      return;
    }
    throw new ForbiddenException("Nu ai acces la această livrare.");
  }

  private async assertAll(context: ActorContext, permission: "delivery.reschedule"): Promise<void> {
    const result = await this.authorizationService.hasPermission({ permission, requiredScope: "ALL", userId: context.actor.id });
    if (!result.allowed) {
      throw new ForbiddenException("Nu ai permisiune pentru această acțiune.");
    }
  }

  private async findDelivery(tx: DeliveryTx, deliveryId: string) {
    const delivery = await tx.delivery.findUnique({ include: deliveryInclude, where: { id: deliveryId } });
    if (!delivery) {
      throw new BadRequestException("Livrarea nu a fost găsită.");
    }
    return delivery;
  }

  private async record(tx: DeliveryTx, context: ActorContext, deliveryId: string, type: DeliveryEventType, action: string, oldStatus: DeliveryStatus, newStatus: DeliveryStatus): Promise<void> {
    const delivery = await tx.delivery.findUniqueOrThrow({
      select: { code: true, failureDetails: true, failureReasonCode: true, preparationGroup: { select: { items: { where: { isActive: true }, select: { workOrderId: true } } } } },
      where: { id: deliveryId },
    });
    const notificationEvent = type === DeliveryEventType.DELIVERY_COMPLETED
      ? B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryCompleted
      : type === DeliveryEventType.DELIVERY_FAILED
        ? B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryFailed
        : null;
    const workOrderIds = delivery.preparationGroup.items.map((item) => item.workOrderId);
    const metadata = {
      actorUserId: context.actor.id,
      deliveryCode: delivery.code,
      deliveryId,
      newStatus,
      oldStatus,
      ...(notificationEvent ? {
        notificationEvent,
        notificationKeys: workOrderIds.map((workOrderId) => getB17LogisticsNotificationKey(notificationEvent, { movementId: deliveryId, workOrderId })),
        ...(notificationEvent === B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryFailed ? { failureDetails: delivery.failureDetails, failureReasonCode: delivery.failureReasonCode } : {}),
      } : {}),
    };
    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId: deliveryId,
      resourceType: DELIVERY_RESOURCE_TYPE,
    };
    if (context.requestMetadata.ipAddress) {
      auditData.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      auditData.userAgent = context.requestMetadata.userAgent;
    }
    await tx.deliveryEvent.create({ data: { actorUserId: context.actor.id, deliveryId, metadata, type } });
    await tx.auditLog.create({
      data: auditData,
    });
  }

  private async recordProof(tx: DeliveryTx, context: ActorContext, deliveryId: string, type: DeliveryEventType, action: string, metadata: Prisma.InputJsonValue): Promise<void> {
    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId: deliveryId,
      resourceType: DELIVERY_RESOURCE_TYPE,
    };
    if (context.requestMetadata.ipAddress) {
      auditData.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      auditData.userAgent = context.requestMetadata.userAgent;
    }
    await tx.deliveryEvent.create({ data: { actorUserId: context.actor.id, deliveryId, metadata, type } });
    await tx.auditLog.create({ data: auditData });
  }
}

function assertVersion(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw new ConflictException(STALE_DELIVERY_MESSAGE);
  }
}
