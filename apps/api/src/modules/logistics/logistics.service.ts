import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { Buffer } from "node:buffer";
import {
  CourierRouteEventType,
  CourierRouteStatus,
  DeliveryPreparationGroupStatus,
  LogisticsEventType,
  PickupRequestStatus,
  WorkLogisticsStatus,
  WorkWorkflowExecutionStatus,
  type Prisma,
  type WorkLogisticsState,
} from "@prisma/client";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { CreateWorkDto } from "../works/dto/works.dto.js";
import { WorksService } from "../works/works.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { LOGISTICS_ATTACHMENT_LIMITS, LOGISTICS_AUDIT_ACTIONS, LOGISTICS_RESOURCE_TYPES } from "./logistics.constants.js";
import type {
  BlockWorkDto,
  CancelPickupRequestDto,
  CourierRoutesQueryDto,
  CreateDeliveryPreparationGroupDto,
  CreateCourierRouteDto,
  CreateLogisticsWorkBodyDto,
  CreatePickupRequestDto,
  DeliveryPreparationGroupsQueryDto,
  LogisticsCenterQueryDto,
  LogisticsTransitionDto,
  RecordCourierRouteStopOutcomeDto,
  UpdateDeliveryPreparationGroupDto,
  UpdateLogisticsLocationDto,
  UpdateLogisticsWorkActionsDto,
  UpdatePickupRequestDto,
  UpdateCourierRouteDto,
} from "./dto/logistics.dto.js";
import {
  type ActionContext,
  type DeliveryPreparationGroupRecord,
  type DeliveryPreparationGroupDetail,
  type DeliveryPreparationGroupSummary,
  type LogisticsCenterItem,
  type LogisticsCenterSummary,
  type LogisticsWorkRecord,
  type WorkLogisticsView,
  createLogisticsSummary,
  deliveryPreparationGroupInclude,
  logisticsWorkInclude,
  toDeliveryPreparationGroupDetail,
  toDeliveryPreparationGroupSummary,
  toLogisticsCenterItem,
  toWorkLogisticsView,
} from "./logistics.view.js";
import type { CourierOption } from "@dental-lab/shared";

type LogisticsCenterCategory = "ALL" | "INTRARI_ASTAZI" | "DE_VERIFICAT" | "IN_PRODUCTIE" | "NEASIGNATE" | "BLOCARE" | "URGENTE" | "INTARZIATE" | "FINALIZATE_AZI" | "DE_AMBALAT" | "IN_AMBALARE" | "GATA_DE_LIVRARE" | "NEFACTURATE" | "IN_ASTEPTARE" | "DE_LIVRAT" | "DE_RIDICAT";

function isWithinDays(value: string, days: 1 | 2 | 3): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  const difference = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  return difference >= 0 && difference <= days;
}

export interface PaginatedLogisticsCenterResponse {
  readonly items: readonly LogisticsCenterItem[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

interface ActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

export interface UploadedAttachmentFile {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly originalname: string;
  readonly size: number;
}

export interface WorkAttachmentSummary {
  readonly fileName: string;
  readonly id: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly uploadedAt: string;
}

export interface LogisticsWorkCreateResponse {
  readonly attachments: readonly WorkAttachmentSummary[];
  readonly work: Awaited<ReturnType<WorksService["createWork"]>>;
}

export interface FastTransportInput {
  readonly direction: "DELIVERY" | "PICKUP";
  readonly courierUserId?: string | null;
  readonly version: number;
}

export interface PickupRequestView {
  readonly address: string | null;
  readonly cancelledAt: string | null;
  readonly clinic: {
    readonly id: string;
    readonly name: string;
  };
  readonly createdAt: string;
  readonly doctor: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly exactTime: string | null;
  readonly id: string;
  readonly notes: string | null;
  readonly phone: string | null;
  readonly scheduledDate: string;
  readonly scheduleLabel: string;
  readonly scheduleType: "EXACT" | "RANGE";
  readonly status: "SCHEDULED" | "CANCELLED";
  readonly statusLabel: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly windowEndTime: string | null;
  readonly windowStartTime: string | null;
}

export interface CourierRouteStopView {
  readonly addressOverride: string | null;
  readonly id: string;
  readonly outcomeAt: string | null;
  readonly outcomeByUserName: string | null;
  readonly outcomeNotes: string | null;
  readonly outcomeStatus: string;
  readonly phoneOverride: string | null;
  readonly pickupRequestId: string | null;
  readonly stopOrder: number;
  readonly type: string;
  readonly workOrderId: string | null;
}

export interface CourierRouteView {
  readonly completedAt: string | null;
  readonly courier: { readonly id: string; readonly name: string } | null;
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly notes: string | null;
  readonly routeDate: string;
  readonly routeNumber: string;
  readonly startedAt: string | null;
  readonly status: string;
  readonly stops: readonly CourierRouteStopView[];
  readonly updatedAt: string;
  readonly version: number;
}

export interface PaginatedCourierRoutesResponse {
  readonly items: readonly CourierRouteView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

const courierRouteInclude = {
  courier: { select: { displayName: true, id: true } },
  stops: {
    include: {
      outcomeBy: { select: { displayName: true } },
      pickupRequest: { select: { address: true, clinic: { select: { addressLine1: true, addressLine2: true, city: true, name: true, phone: true, postalCode: true } }, exactTime: true, phone: true, scheduledDate: true, windowEndTime: true, windowStartTime: true } },
      workOrder: { select: { clinic: { select: { addressLine1: true, addressLine2: true, city: true, name: true, phone: true, postalCode: true } }, code: true, patientName: true } },
    },
    orderBy: { stopOrder: "asc" },
  },
} as const satisfies Prisma.CourierRouteInclude;

type CourierRouteRecord = Prisma.CourierRouteGetPayload<{ include: typeof courierRouteInclude }>;

type LogisticsTx = Prisma.TransactionClient;

@Injectable()
export class LogisticsService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorksService) private readonly worksService: WorksService,
    @Inject(NotificationsService) private readonly notificationsService?: NotificationsService,
  ) {}

  public async fastDelegate(context: ActorContext, workOrderId: string, input: FastTransportInput): Promise<{ readonly direction: FastTransportInput["direction"]; readonly id: string; readonly workOrderId: string; readonly status: string }> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const result = await this.prisma.$transaction(async (tx) => {
      const work = await tx.workOrder.findUnique({ include: { activeCycle: { include: { logisticsState: true } } }, where: { id: workOrderId } });
      if (!work) throw new NotFoundException("Lucrarea nu a fost găsită.");
      if ((work.activeCycle?.logisticsState?.version ?? work.version) !== input.version) throw new ConflictException("Datele logistice au fost modificate. Reîncarcă înainte de acțiune.");
      if (input.direction === "DELIVERY" && work.technicalReadiness !== "PROBE_READY" && work.technicalReadiness !== "FINAL_READY") {
        throw new BadRequestException("Doar lucrările marcate Probă gata sau Finalizată pot fi trimise către clinică.");
      }
      const requiresField = input.direction === "DELIVERY" ? "requiresDelivery" : "requiresPickup";
      const isReadyForDelivery = input.direction === "DELIVERY" && (work.technicalReadiness === "PROBE_READY" || work.technicalReadiness === "FINAL_READY");
      if (!work[requiresField] && !isReadyForDelivery) throw new ConflictException("Lucrarea este deja în lista curentă sau nu mai necesită această operațiune.");
      const existing = await tx.courierRouteStop.findFirst({
        where: {
          outcomeStatus: "PENDING",
          type: input.direction === "DELIVERY" ? "DELIVERY" : "PICKUP",
          workOrderId,
          route: { status: { in: ["DRAFT", "ASSIGNED", "IN_PROGRESS"] } },
        },
      });
      if (existing) throw new ConflictException("Lucrarea este deja în lista de traseu.");
      await tx.workOrder.update({ data: { [requiresField]: true, updatedByUserId: context.actor.id, version: { increment: 1 } }, where: { id: workOrderId } });
      return { direction: input.direction, id: workOrderId, status: "QUEUED", workOrderId };
    });
    return result;
  }

  public async createWorkWithAttachments(
    context: ActorContext,
    legalEntity: LegalEntityContext,
    body: CreateLogisticsWorkBodyDto,
    files: readonly UploadedAttachmentFile[],
  ): Promise<LogisticsWorkCreateResponse> {
    await this.ensurePermission(context.actor.id, "works.create");
    await this.ensurePermission(context.actor.id, "files.upload");
    const dto = await this.parseCreateWorkDto(body.work);
    this.validateAttachments(files);
    const canSetManualDeadline = await this.canSetManualDeadline(context.actor.id);
    const work = await this.worksService.createWork({ actorUserId: context.actor.id, requestMetadata: context.requestMetadata }, legalEntity, dto, canSetManualDeadline);
    const attachments = await this.saveAttachments(context, work.id, files);

    return { attachments, work };
  }

  public async listPickupRequests(actor: AuthenticatedUser, query: LogisticsCenterQueryDto): Promise<readonly PickupRequestView[]> {
    await this.ensurePermission(actor.id, "pickup.read");
    const pickups = await this.prisma.pickupRequest.findMany({
      include: { clinic: true, doctor: true },
      orderBy: [{ scheduledDate: "asc" }, { exactTime: "asc" }, { windowStartTime: "asc" }, { createdAt: "asc" }],
      where: this.toPickupWhere(query),
      take: 200,
    });
    return pickups.map((pickup) => this.toPickupRequestView(pickup));
  }

  public async createPickupRequest(context: ActorContext, dto: CreatePickupRequestDto): Promise<PickupRequestView> {
    await this.ensurePermission(context.actor.id, "pickup.create");
    const schedule = this.parsePickupSchedule(dto);
    await this.ensurePickupClinicDoctor(dto.clinicId, dto.doctorId);
    const pickup = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pickupRequest.create({
        data: {
          address: dto.address ?? null,
          clinicId: dto.clinicId,
          doctorId: dto.doctorId ?? null,
          exactTime: schedule.exactTime,
          notes: dto.notes ?? null,
          phone: dto.phone ?? null,
          scheduledDate: schedule.scheduledDate,
          scheduleType: schedule.scheduleType,
          windowEndTime: schedule.windowEndTime,
          windowStartTime: schedule.windowStartTime,
          createdByUserId: context.actor.id,
        },
        include: { clinic: true, doctor: true },
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.pickupCreated, created.id, this.toPickupAuditMetadata(created));
      return created;
    });
    return this.toPickupRequestView(pickup);
  }

  public async updatePickupRequest(context: ActorContext, pickupId: string, dto: UpdatePickupRequestDto): Promise<PickupRequestView> {
    await this.ensurePermission(context.actor.id, "pickup.update");
    const schedule = this.parsePickupSchedule(dto);
    await this.ensurePickupClinicDoctor(dto.clinicId, dto.doctorId);
    const pickup = await this.prisma.$transaction(async (tx) => {
      const current = await tx.pickupRequest.findUnique({ include: { clinic: true, doctor: true }, where: { id: pickupId } });
      if (!current) {
        throw new NotFoundException("Cererea de ridicare nu a fost găsită.");
      }
      if (current.status === PickupRequestStatus.CANCELLED) {
        throw new BadRequestException("Cererea de ridicare anulată nu poate fi modificată.");
      }
      this.assertVersion(current, dto.version);
      const updated = await tx.pickupRequest.update({
        data: {
          address: dto.address ?? null,
          clinicId: dto.clinicId,
          doctorId: dto.doctorId ?? null,
          exactTime: schedule.exactTime,
          notes: dto.notes ?? null,
          phone: dto.phone ?? null,
          scheduledDate: schedule.scheduledDate,
          scheduleType: schedule.scheduleType,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
          windowEndTime: schedule.windowEndTime,
          windowStartTime: schedule.windowStartTime,
        },
        include: { clinic: true, doctor: true },
        where: { id: pickupId },
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.pickupUpdated, updated.id, {
        after: this.toPickupAuditMetadata(updated),
        before: this.toPickupAuditMetadata(current),
      });
      return updated;
    });
    return this.toPickupRequestView(pickup);
  }

  public async cancelPickupRequest(context: ActorContext, pickupId: string, dto: CancelPickupRequestDto): Promise<PickupRequestView> {
    await this.ensurePermission(context.actor.id, "pickup.cancel");
    const pickup = await this.prisma.$transaction(async (tx) => {
      const current = await tx.pickupRequest.findUnique({ include: { clinic: true, doctor: true }, where: { id: pickupId } });
      if (!current) {
        throw new NotFoundException("Cererea de ridicare nu a fost găsită.");
      }
      if (current.status === PickupRequestStatus.CANCELLED) {
        throw new BadRequestException("Cererea de ridicare este deja anulată.");
      }
      this.assertVersion(current, dto.version);
      const updated = await tx.pickupRequest.update({
        data: {
          cancelledAt: new Date(),
          cancelledByUserId: context.actor.id,
          status: PickupRequestStatus.CANCELLED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: { clinic: true, doctor: true },
        where: { id: pickupId },
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.pickupCancelled, updated.id, {
        after: this.toPickupAuditMetadata(updated),
        before: this.toPickupAuditMetadata(current),
      });
      return updated;
    });
    return this.toPickupRequestView(pickup);
  }

  public async createRoute(context: ActorContext, dto: CreateCourierRouteDto): Promise<CourierRouteView> {
    await this.ensureRoutePermission(context.actor.id, "routes.create");
    if (dto.courierUserId) {
      await this.ensurePermission(context.actor.id, "routes.assign");
    }
    const routeDate = startOfUtcDay(dto.routeDate);
    const pickupWorkIds = dto.stops.filter((stop) => stop.type === "PICKUP" && stop.workOrderId).map((stop) => stop.workOrderId as string);
    if (pickupWorkIds.length > 0) {
      const pickupWorks = await this.prisma.workOrder.findMany({ select: { id: true }, where: { id: { in: pickupWorkIds }, requiresPickup: true } });
      if (pickupWorks.length !== new Set(pickupWorkIds).size) {
        throw new BadRequestException("Stopurile de ridicare trebuie să fie lucrări marcate pentru ridicare sau cereri standalone.");
      }
    }
    const stops = this.toRouteStopCreates(dto.stops);
    const workOrderIds = dto.stops.map((stop) => stop.workOrderId).filter((id): id is string => Boolean(id));
    const pickupRequestIds = dto.stops.map((stop) => stop.pickupRequestId).filter((id): id is string => Boolean(id));
    if (workOrderIds.length > 0 || pickupRequestIds.length > 0) {
      // A completed stop is historical and must not block a later cycle or a
      // new delivery. Only a pending stop still owns the item in the route
      // pipeline; failed outcomes are also allowed to re-enter logistics.
      const existing = await this.prisma.courierRouteStop.findFirst({
        where: {
          outcomeStatus: "PENDING",
          route: { status: { in: [CourierRouteStatus.DRAFT, CourierRouteStatus.ASSIGNED, CourierRouteStatus.IN_PROGRESS] } },
          OR: [{ workOrderId: { in: workOrderIds } }, { pickupRequestId: { in: pickupRequestIds } }],
        },
      });
      if (existing) throw new ConflictException("Acest item este deja inclus într-o listă de traseu.");
    }
    const route = await this.prisma.$transaction(async (tx) => {
      const routeNumber = await this.nextRouteNumber(tx, routeDate);
      // The operational centre uses this unnamed draft as a persistent staging
      // list. Adding an item to that list must not mark it as already routed;
      // the flags are consumed only when the draft is turned into a real route.
      const isFutureRoutesList = !dto.courierUserId && dto.name === "Lista pentru viitoarele trasee";
      const created = await tx.courierRoute.create({
        data: {
          courierUserId: dto.courierUserId ?? null,
          createdByUserId: context.actor.id,
          name: dto.name,
          notes: dto.notes ?? null,
          routeDate,
          routeNumber,
          status: dto.courierUserId ? CourierRouteStatus.ASSIGNED : CourierRouteStatus.DRAFT,
          stops: { create: stops },
        },
        include: courierRouteInclude,
      });
      if (!isFutureRoutesList) {
        await Promise.all(dto.stops.filter((stop): stop is typeof dto.stops[number] & { readonly workOrderId: string } => Boolean(stop.workOrderId)).map((stop) => tx.workOrder.update({
          data: {
            ...(stop.type === "DELIVERY" ? { requiresDelivery: false } : { requiresPickup: false }),
            updatedByUserId: context.actor.id,
            version: { increment: 1 },
          },
          where: { id: stop.workOrderId },
        })));
      }
      await this.recordRouteEvent(tx, context, created.id, CourierRouteEventType.ROUTE_CREATED, {
        routeDate: created.routeDate.toISOString().slice(0, 10),
        routeId: created.id,
        routeNumber: created.routeNumber,
        stopCount: created.stops.length,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.routeCreated, created.id, this.toRouteAuditMetadata(created));
      return created;
    });
    const view = this.toCourierRouteView(route);
    if (route.courierUserId) {
      await this.notificationsService?.publishRouteReceived({ routeId: route.id, routeNumber: route.routeNumber, routeDate: route.routeDate.toISOString().slice(0, 10), stopCount: route.stops.length, courierUserId: route.courierUserId });
    }
    return view;
  }

  public async listRoutes(actor: AuthenticatedUser, query: CourierRoutesQueryDto): Promise<PaginatedCourierRoutesResponse> {
    const canReadAll = await this.hasRoutePermission(actor.id, "routes.read", "ALL");
    const canReadOwn = canReadAll || await this.hasPermission(actor.id, "routes.read", "OWN_DELIVERY");
    if (!canReadOwn) {
      throw new ForbiddenException("Nu ai permisiunea necesară pentru trasee.");
    }
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const where = this.toRouteWhere(query, actor.id, canReadAll);
    const [total, routes] = await Promise.all([
      this.prisma.courierRoute.count({ where }),
      this.prisma.courierRoute.findMany({
        include: courierRouteInclude,
        orderBy: [{ routeDate: "asc" }, { routeNumber: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);
    return {
      items: routes.map((route) => this.toCourierRouteView(route)),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async updateRoute(context: ActorContext, routeId: string, dto: UpdateCourierRouteDto): Promise<CourierRouteView> {
    await this.ensureRoutePermission(context.actor.id, "routes.update");
    if (dto.courierUserId) await this.ensurePermission(context.actor.id, "routes.assign");
    const stops = this.toRouteStopCreates(dto.stops);
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.courierRoute.findUnique({ where: { id: routeId }, select: { name: true, status: true, version: true } });
      if (!current) throw new NotFoundException("Traseul nu a fost găsit.");
      if (current.version !== dto.version) throw new ConflictException("Traseul a fost modificat între timp.");
      const route = await tx.courierRoute.update({
        data: {
          courierUserId: dto.courierUserId ?? null,
          name: dto.name,
          notes: dto.notes ?? null,
          routeDate: startOfUtcDay(dto.routeDate),
          ...(current.status === CourierRouteStatus.DRAFT || current.status === CourierRouteStatus.ASSIGNED
            ? { status: dto.courierUserId ? CourierRouteStatus.ASSIGNED : CourierRouteStatus.DRAFT }
            : {}),
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
          stops: { deleteMany: {}, create: stops },
        },
        include: courierRouteInclude,
        where: { id: routeId },
      });
      const isFutureRoutesList = !dto.courierUserId && dto.name === "Lista pentru viitoarele trasee";
      if (!isFutureRoutesList) {
        await Promise.all(dto.stops.filter((stop): stop is typeof dto.stops[number] & { readonly workOrderId: string } => Boolean(stop.workOrderId)).map((stop) => tx.workOrder.update({
          data: {
            ...(stop.type === "DELIVERY" ? { requiresDelivery: false } : { requiresPickup: false }),
            updatedByUserId: context.actor.id,
            version: { increment: 1 },
          },
          where: { id: stop.workOrderId },
        })));
      }
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.routeUpdated, route.id, this.toRouteAuditMetadata(route));
      return route;
    });
    const view = this.toCourierRouteView(updated);
    if (updated.courierUserId && dto.courierUserId) {
      await this.notificationsService?.publishRouteReceived({ routeId: updated.id, routeNumber: updated.routeNumber, routeDate: updated.routeDate.toISOString().slice(0, 10), stopCount: updated.stops.length, courierUserId: updated.courierUserId });
    }
    return view;
  }

  public async deleteRoute(context: ActorContext, routeId: string): Promise<void> {
    await this.ensurePermission(context.actor.id, "routes.cancel");
    await this.prisma.$transaction(async (tx) => {
      const route = await tx.courierRoute.findUnique({ include: courierRouteInclude, where: { id: routeId } });
      if (!route) throw new NotFoundException("Traseul nu a fost găsit.");
      if (route.status !== CourierRouteStatus.DRAFT && route.status !== CourierRouteStatus.ASSIGNED) {
        throw new ConflictException("Traseul nu mai poate fi șters după începerea execuției.");
      }
      await Promise.all(route.stops.filter((stop) => stop.workOrderId).map((stop) => tx.workOrder.update({
        data: {
          ...(stop.type === "DELIVERY" ? { requiresDelivery: true } : { requiresPickup: true }),
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        where: { id: stop.workOrderId as string },
      })));
      await this.recordRouteEvent(tx, context, route.id, CourierRouteEventType.ROUTE_CANCELLED, {
        routeId: route.id,
        routeNumber: route.routeNumber,
        stopCount: route.stops.length,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.routeCancelled, route.id, this.toRouteAuditMetadata(route));
      await tx.courierRoute.delete({ where: { id: route.id } });
    });
  }

  public async startRoute(context: ActorContext, routeId: string): Promise<CourierRouteView> {
    const now = new Date();
    const route = await this.prisma.$transaction(async (tx) => {
      const current = await tx.courierRoute.findUnique({ include: courierRouteInclude, where: { id: routeId } });
      if (!current) throw new NotFoundException("Traseul nu a fost găsit.");
      await this.assertRouteExecutionAccess(context.actor.id, current.courierUserId);
      const canStartUnassignedDraft = !current.courierUserId
        && current.status === CourierRouteStatus.DRAFT
        && await this.hasPermission(context.actor.id, "routes.execute_own", "ALL");
      if (current.status !== CourierRouteStatus.ASSIGNED && !canStartUnassignedDraft) {
        throw new ConflictException("Acest traseu nu poate fi pornit acum.");
      }
      const previous = current.courierUserId ? await tx.courierRoute.findFirst({
        select: { routeNumber: true },
        where: {
          courierUserId: current.courierUserId,
          status: { notIn: [CourierRouteStatus.COMPLETED, CourierRouteStatus.CANCELLED] },
          OR: [
            { routeDate: { lt: current.routeDate } },
            { routeDate: current.routeDate, routeNumber: { lt: current.routeNumber } },
          ],
        },
        orderBy: [{ routeDate: "asc" }, { routeNumber: "asc" }],
      }) : null;
      if (previous) {
        throw new ConflictException("Finalizează traseul anterior înainte să începi acest traseu.");
      }
      return tx.courierRoute.update({
        data: { startedAt: now, status: CourierRouteStatus.IN_PROGRESS, updatedByUserId: context.actor.id, version: { increment: 1 } },
        include: courierRouteInclude,
        where: { id: routeId },
      });
    });
    return this.toCourierRouteView(route);
  }

  public async recordRouteStopOutcome(context: ActorContext, routeId: string, stopId: string, dto: RecordCourierRouteStopOutcomeDto): Promise<CourierRouteView> {
    const now = new Date();
    const route = await this.prisma.$transaction(async (tx) => {
      const current = await tx.courierRoute.findUnique({ include: courierRouteInclude, where: { id: routeId } });
      if (!current) {
        throw new NotFoundException("Traseul nu a fost găsit.");
      }
      await this.assertRouteExecutionAccess(context.actor.id, current.courierUserId);
      const stop = current.stops.find((item) => item.id === stopId);
      if (!stop) {
        throw new NotFoundException("Stopul nu a fost găsit.");
      }
      this.assertStopOutcome(stop.type, dto.outcomeStatus);
      const canCorrect = await this.hasPermission(context.actor.id, "routes.execute_own", "ALL");
      const isCorrection = stop.outcomeStatus !== "PENDING";
      if (isCorrection && !canCorrect) {
        throw new ConflictException("Stopul are deja rezultat.");
      }
      await tx.courierRouteStop.update({
        data: {
          failureReason: dto.failureReason ?? null,
          outcomeAt: now,
          outcomeByUserId: context.actor.id,
          outcomeNotes: dto.notes ?? null,
          outcomeStatus: dto.outcomeStatus,
        },
        where: { id: stopId },
      });
      if (stop.workOrderId) {
        await tx.workOrder.update({
          data: {
            ...(stop.type === "DELIVERY" ? { requiresDelivery: dto.outcomeStatus === "NOT_DELIVERED" } : { requiresPickup: dto.outcomeStatus === "NOT_PICKED_UP" }),
            updatedByUserId: context.actor.id,
            version: { increment: 1 },
          },
          where: { id: stop.workOrderId },
        });
        if (stop.type === "DELIVERY" && dto.outcomeStatus === "DELIVERED" && tx.workLogisticsState?.updateMany) {
          await tx.workLogisticsState.updateMany({
            data: { status: WorkLogisticsStatus.DELIVERED, updatedByUserId: context.actor.id, version: { increment: 1 } },
            where: { workOrderId: stop.workOrderId, workCycle: { status: "ACTIVE" } },
          });
        }
        if (stop.type === "DELIVERY" && (dto.outcomeStatus === "DELIVERED" || dto.outcomeStatus === "NOT_DELIVERED")) {
          await tx.delivery.updateMany({
            data: { isActive: false, updatedByUserId: context.actor.id, version: { increment: 1 } },
            where: { isActive: true, preparationGroup: { items: { some: { workOrderId: stop.workOrderId } } } },
          });
          await tx.deliveryPreparationItem.updateMany({
            data: { isActive: false, removedAt: now, removedByUserId: context.actor.id },
            where: { workOrderId: stop.workOrderId, isActive: true },
          });
        }
      }
      const allDone = current.stops.every((item) => item.id === stopId ? dto.outcomeStatus !== "PENDING" : item.outcomeStatus !== "PENDING");
      const updated = await tx.courierRoute.update({
        data: {
          ...(allDone ? { completedAt: now, status: CourierRouteStatus.COMPLETED } : { startedAt: current.startedAt ?? now, status: CourierRouteStatus.IN_PROGRESS }),
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: courierRouteInclude,
        where: { id: routeId },
      });
      await this.recordRouteEvent(tx, context, routeId, isCorrection ? CourierRouteEventType.STOP_OUTCOME_CORRECTED : CourierRouteEventType.STOP_OUTCOME_RECORDED, {
        outcomeStatus: dto.outcomeStatus,
        routeId,
        stopId,
        stopOrder: stop.stopOrder,
        type: stop.type,
      });
      await this.recordAudit(tx, context, isCorrection ? LOGISTICS_AUDIT_ACTIONS.routeStopOutcomeCorrected : LOGISTICS_AUDIT_ACTIONS.routeStopOutcomeRecorded, routeId, {
        after: this.toRouteAuditMetadata(updated),
        before: this.toRouteAuditMetadata(current),
        stopId,
      });
      return updated;
    });
    return this.toCourierRouteView(route);
  }

  public async getCenter(actor: AuthenticatedUser, query: LogisticsCenterQueryDto): Promise<PaginatedLogisticsCenterResponse> {
    const actionContext = await this.createActionContext(actor.id);
    const now = new Date();
    const workOrders = await this.prisma.workOrder.findMany({
      include: logisticsWorkInclude,
      orderBy: this.toWorkOrderSort(query),
      where: this.toWorkWhere(query),
    });
    const filtered = workOrders
      .map((work) => toLogisticsCenterItem(work, actionContext, now))
      .filter((item) => this.matchesComputedFilters(item, query));
    filtered.sort((left, right) => logisticsActionPriority(left) - logisticsActionPriority(right) || new Date(left.requestedDeliveryDate).getTime() - new Date(right.requestedDeliveryDate).getTime());
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      page,
      pageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
      pageSize,
      total: filtered.length,
    };
  }

  public async listCourierOptions(): Promise<readonly CourierOption[]> {
    return this.prisma.user.findMany({
      orderBy: { displayName: "asc" },
      select: { displayName: true, id: true },
      where: { isActive: true, roles: { some: { role: { key: "CURIER" } } } },
    });
  }

  public async getCenterSummary(actor: AuthenticatedUser, query: LogisticsCenterQueryDto): Promise<LogisticsCenterSummary> {
    const actionContext = await this.createActionContext(actor.id);
    const now = new Date();
    const { deliveryHorizonDays: _deliveryHorizonDays, pickupHorizonDays: _pickupHorizonDays, ...summaryBaseQuery } = query;
    const summaryQuery: LogisticsCenterQueryDto = {
      ...summaryBaseQuery,
      category: "ALL",
      page: 1,
      pageSize: 100,
      sortBy: "requestedDeliveryDate",
      sortDirection: "asc",
    };
    const workOrders = await this.prisma.workOrder.findMany({
      include: logisticsWorkInclude,
      where: this.toWorkWhere(summaryQuery),
    });
    // KPI-urile must match the rows returned by the corresponding category.
    // Only "Toate" is restricted to actionable logistics work; overdue and
    // operational-state categories also include rows that are not currently
    // actionable (for example a received work with an overdue deadline).
    const items = workOrders.map((work) => toLogisticsCenterItem(work, actionContext, now));
    const toPickup = await this.prisma.pickupRequest.count({ where: this.toPickupWhere(query) });
    const summary = createLogisticsSummary(items, toPickup);
    const toDeliver = items.filter(
      (item) => this.matchesCategory(item, "DE_LIVRAT") && (!query.deliveryHorizonDays || isWithinDays(item.requestedDeliveryDate, query.deliveryHorizonDays)),
    ).length;
    return { ...summary, toDeliver };
  }

  public async getWorkLogistics(actor: AuthenticatedUser, workOrderId: string): Promise<WorkLogisticsView> {
    const work = await this.findWork(workOrderId);
    return toWorkLogisticsView(work, await this.createActionContext(actor.id), new Date());
  }

  public async updateWorkActions(context: ActorContext, workOrderId: string, dto: UpdateLogisticsWorkActionsDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.update_location");
    const current = await this.findWork(workOrderId);
    const updated = await this.prisma.workOrder.update({
      data: {
        ...(dto.logisticsNote !== undefined ? { logisticsNote: dto.logisticsNote } : {}),
        ...(dto.marker !== undefined ? { logisticsMarker: dto.marker } : {}),
        ...(dto.requiresDelivery !== undefined ? { requiresDelivery: dto.requiresDelivery, ...(dto.requiresDelivery ? { requiresPickup: false } : {}) } : {}),
        ...(dto.requiresPickup !== undefined ? { requiresPickup: dto.requiresPickup, ...(dto.requiresPickup ? { requiresDelivery: false } : {}) } : {}),
        updatedByUserId: context.actor.id,
        version: { increment: 1 },
      },
      where: { id: workOrderId },
    });
    await this.prisma.auditLog.create({
      data: {
        action: LOGISTICS_AUDIT_ACTIONS.workActionsUpdated,
        actorUserId: context.actor.id,
        metadata: { after: { logisticsMarker: updated.logisticsMarker, logisticsNote: updated.logisticsNote, requiresDelivery: updated.requiresDelivery, requiresPickup: updated.requiresPickup }, before: { logisticsMarker: current.logisticsMarker, logisticsNote: current.logisticsNote, requiresDelivery: current.requiresDelivery, requiresPickup: current.requiresPickup } },
        resourceId: workOrderId,
        resourceType: LOGISTICS_RESOURCE_TYPES.workLogistics,
      },
    });
    return this.getWorkLogistics(context.actor, workOrderId);
  }

  public async updateLocation(context: ActorContext, workOrderId: string, dto: UpdateLogisticsLocationDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.update_location");
    const state = await this.prisma.$transaction(async (tx) => {
      const current = await this.ensureState(tx, workOrderId);
      this.assertVersion(current, dto.version);
      const updated = await tx.workLogisticsState.update({
        data: {
          physicalLocationCode: dto.locationCode,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        where: { id: current.id },
      });
      await this.recordLogisticsEvent(tx, context, workOrderId, updated.workCycleId, updated.id, LogisticsEventType.LOCATION_UPDATED, {
        newLocation: dto.locationCode,
        oldLocation: current.physicalLocationCode,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.locationUpdated, workOrderId, {
        logisticsStateId: updated.id,
        newLocation: dto.locationCode,
        oldLocation: current.physicalLocationCode,
        workId: workOrderId,
      });
      return updated;
    });
    return this.getWorkLogistics(context.actor, state.workOrderId);
  }

  public async blockWork(context: ActorContext, workOrderId: string, dto: BlockWorkDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.block_work");
    const state = await this.prisma.$transaction(async (tx) => {
      const current = await this.ensureState(tx, workOrderId);
      this.assertVersion(current, dto.version);
      if (current.status === WorkLogisticsStatus.HANDED_TO_DELIVERY || current.status === WorkLogisticsStatus.DELIVERED) {
        throw new BadRequestException("Lucrările gata de livrare nu pot fi blocate în acest task.");
      }
      const updated = await tx.workLogisticsState.update({
        data: {
          blockedAt: new Date(),
          blockedByUserId: context.actor.id,
          blockedReasonCode: dto.reasonCode,
          blockedReasonNotes: dto.reasonNotes ?? null,
          status: WorkLogisticsStatus.BLOCKED,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        where: { id: current.id },
      });
      await this.recordLogisticsEvent(tx, context, workOrderId, updated.workCycleId, updated.id, LogisticsEventType.WORK_BLOCKED, {
        newStatus: updated.status,
        oldStatus: current.status,
        reasonCode: dto.reasonCode,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.workBlocked, workOrderId, {
        logisticsStateId: updated.id,
        newStatus: updated.status,
        oldStatus: current.status,
        reasonCode: dto.reasonCode,
        workId: workOrderId,
      });
      return updated;
    });
    return this.getWorkLogistics(context.actor, state.workOrderId);
  }

  public async unblockWork(context: ActorContext, workOrderId: string, dto: LogisticsTransitionDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.unblock_work");
    const state = await this.prisma.$transaction(async (tx) => {
      const current = await this.ensureState(tx, workOrderId);
      this.assertVersion(current, dto.version);
      if (current.status !== WorkLogisticsStatus.BLOCKED) {
        throw new BadRequestException("Lucrarea nu este blocată.");
      }
      const targetStatus = await this.deriveNonBlockedStatus(tx, workOrderId);
      const updated = await tx.workLogisticsState.update({
        data: {
          blockedAt: null,
          blockedByUserId: null,
          blockedReasonCode: null,
          blockedReasonNotes: null,
          status: targetStatus,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        where: { id: current.id },
      });
      await this.recordLogisticsEvent(tx, context, workOrderId, updated.workCycleId, updated.id, LogisticsEventType.WORK_UNBLOCKED, {
        newStatus: targetStatus,
        oldStatus: current.status,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.workUnblocked, workOrderId, {
        logisticsStateId: updated.id,
        newStatus: targetStatus,
        oldStatus: current.status,
        workId: workOrderId,
      });
      return updated;
    });
    return this.getWorkLogistics(context.actor, state.workOrderId);
  }

  public async listGroups(query: DeliveryPreparationGroupsQueryDto): Promise<readonly DeliveryPreparationGroupSummary[]> {
    const groups = await this.prisma.deliveryPreparationGroup.findMany({
      include: deliveryPreparationGroupInclude,
      orderBy: [{ status: "asc" }, { plannedDate: "asc" }, { createdAt: "desc" }],
      where: {
        ...(query.clinicId ? { clinicId: query.clinicId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
    });
    return groups.map(toDeliveryPreparationGroupSummary);
  }

  public async getGroup(actor: AuthenticatedUser, groupId: string): Promise<DeliveryPreparationGroupDetail> {
    const group = await this.findGroup(groupId);
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(actor.id), new Date());
  }

  public async createGroup(context: ActorContext, dto: CreateDeliveryPreparationGroupDto): Promise<DeliveryPreparationGroupDetail> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const group = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.findUnique({ select: { id: true }, where: { id: dto.clinicId } });
      if (!clinic) {
        throw new BadRequestException("Clinica nu există.");
      }
      const code = await this.generateGroupCode(tx);
      const created = await tx.deliveryPreparationGroup.create({
        data: {
          clinicId: dto.clinicId,
          code,
          createdByUserId: context.actor.id,
          notes: dto.notes ?? null,
          plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : null,
          updatedByUserId: context.actor.id,
        },
        include: deliveryPreparationGroupInclude,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.groupCreated, created.id, {
        clinicId: created.clinicId,
        groupId: created.id,
      });
      return created;
    });
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(context.actor.id), new Date());
  }

  public async updateGroup(context: ActorContext, groupId: string, dto: UpdateDeliveryPreparationGroupDto): Promise<DeliveryPreparationGroupDetail> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const group = await this.prisma.$transaction(async (tx) => {
      const current = await tx.deliveryPreparationGroup.findUnique({ where: { id: groupId } });
      if (!current) {
        throw new NotFoundException("Grupul nu a fost găsit.");
      }
      this.assertVersion(current, dto.version);
      if (current.status !== DeliveryPreparationGroupStatus.DRAFT) {
        throw new BadRequestException("Doar grupurile în pregătire pot fi editate.");
      }
      const updated = await tx.deliveryPreparationGroup.update({
        data: {
          notes: dto.notes ?? null,
          plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : null,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        include: deliveryPreparationGroupInclude,
        where: { id: groupId },
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.groupUpdated, updated.id, {
        clinicId: updated.clinicId,
        groupId: updated.id,
      });
      return updated;
    });
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(context.actor.id), new Date());
  }

  public async addWorkToGroup(context: ActorContext, groupId: string, workOrderId: string): Promise<DeliveryPreparationGroupDetail> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const group = await this.prisma.$transaction(async (tx) => {
      const [groupRecord, work] = await Promise.all([
        tx.deliveryPreparationGroup.findUnique({ include: { items: true }, where: { id: groupId } }),
        tx.workOrder.findUnique({
          include: {
            activeCycle: { include: { logisticsState: true } },
            deliveryPreparationItems: { where: { isActive: true } },
          },
          where: { id: workOrderId },
        }),
      ]);
      if (!groupRecord || !work) {
        throw new NotFoundException("Grupul sau lucrarea nu a fost găsită.");
      }
      if (work.technicalReadiness !== "PROBE_READY" && work.technicalReadiness !== "FINAL_READY") {
        throw new BadRequestException("Adaugă în livrare doar o lucrare marcată Probă gata sau Finalizată.");
      }
      if (!canAddWorkToPreparationGroup({
        groupClinicId: groupRecord.clinicId,
        groupStatus: groupRecord.status,
          hasActiveGroup: work.deliveryPreparationItems.some((item) => item.workCycleId === work.activeCycleId),
        workClinicId: work.clinicId ?? "",
        technicalReadiness: work.technicalReadiness,
      })) {
        throw new BadRequestException("Lucrarea trebuie să fie gata de livrare, fără grup activ și din aceeași clinică.");
      }
      const existingGroupItem = groupRecord.items.find((item) => item.workOrderId === workOrderId) ?? null;
      if (existingGroupItem) {
        await tx.deliveryPreparationItem.update({
          data: { addedByUserId: context.actor.id, isActive: true, removedAt: null, removedByUserId: null, workCycleId: work.activeCycleId },
          where: { id: existingGroupItem.id },
        });
      } else {
        await tx.deliveryPreparationItem.create({
          data: {
            addedByUserId: context.actor.id,
            groupId,
            workCycleId: work.activeCycleId,
            workOrderId,
          },
        });
      }
      await this.recordLogisticsEvent(tx, context, workOrderId, work.activeCycleId, work.activeCycle?.logisticsState?.id ?? null, LogisticsEventType.WORK_ADDED_TO_DELIVERY_GROUP, {
        clinicId: groupRecord.clinicId,
        groupId,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.workAddedToGroup, groupId, {
        clinicId: groupRecord.clinicId,
        groupId,
        workId: workOrderId,
      });
      return this.findGroupInTx(tx, groupId);
    });
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(context.actor.id), new Date());
  }

  public async removeWorkFromGroup(context: ActorContext, groupId: string, workOrderId: string): Promise<DeliveryPreparationGroupDetail> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const group = await this.prisma.$transaction(async (tx) => {
      const groupRecord = await tx.deliveryPreparationGroup.findUnique({ where: { id: groupId } });
      if (!groupRecord) {
        throw new NotFoundException("Grupul nu a fost găsit.");
      }
      if (groupRecord.status !== DeliveryPreparationGroupStatus.DRAFT) {
        throw new BadRequestException("Doar grupurile în pregătire pot fi modificate.");
      }
      await tx.deliveryPreparationItem.updateMany({
        data: {
          isActive: false,
          removedAt: new Date(),
          removedByUserId: context.actor.id,
        },
        where: { groupId, isActive: true, workOrderId },
      });
      await this.recordLogisticsEvent(tx, context, workOrderId, null, null, LogisticsEventType.WORK_REMOVED_FROM_DELIVERY_GROUP, {
        groupId,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.workRemovedFromGroup, groupId, {
        groupId,
        workId: workOrderId,
      });
      return this.findGroupInTx(tx, groupId);
    });
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(context.actor.id), new Date());
  }

  public async markGroupReady(context: ActorContext, groupId: string): Promise<DeliveryPreparationGroupDetail> {
    return this.changeGroupStatus(context, groupId, DeliveryPreparationGroupStatus.READY, LOGISTICS_AUDIT_ACTIONS.groupMarkedReady);
  }

  public async cancelGroup(context: ActorContext, groupId: string): Promise<DeliveryPreparationGroupDetail> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const group = await this.prisma.$transaction(async (tx) => {
      const current = await tx.deliveryPreparationGroup.findUnique({ where: { id: groupId } });
      if (!current) {
        throw new NotFoundException("Grupul nu a fost găsit.");
      }
      await tx.deliveryPreparationItem.updateMany({
        data: { isActive: false, removedAt: new Date(), removedByUserId: context.actor.id },
        where: { groupId, isActive: true },
      });
      const updated = await tx.deliveryPreparationGroup.update({
        data: { status: DeliveryPreparationGroupStatus.CANCELLED, updatedByUserId: context.actor.id, version: { increment: 1 } },
        include: deliveryPreparationGroupInclude,
        where: { id: groupId },
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.groupCancelled, groupId, { clinicId: updated.clinicId, groupId });
      return updated;
    });
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(context.actor.id), new Date());
  }

  private async changeGroupStatus(context: ActorContext, groupId: string, status: DeliveryPreparationGroupStatus, auditAction: string): Promise<DeliveryPreparationGroupDetail> {
    await this.ensurePermission(context.actor.id, "logistics.manage_groups");
    const group = await this.prisma.$transaction(async (tx) => {
      const current = await tx.deliveryPreparationGroup.findUnique({ include: { items: { where: { isActive: true } } }, where: { id: groupId } });
      if (!current) {
        throw new NotFoundException("Grupul nu a fost găsit.");
      }
      if (current.status !== DeliveryPreparationGroupStatus.DRAFT || current.items.length === 0) {
        throw new BadRequestException("Doar grupurile în pregătire cu lucrări pot fi marcate gata.");
      }
      const updated = await tx.deliveryPreparationGroup.update({
        data: { status, updatedByUserId: context.actor.id, version: { increment: 1 } },
        include: deliveryPreparationGroupInclude,
        where: { id: groupId },
      });
      await this.recordAudit(tx, context, auditAction, groupId, { clinicId: updated.clinicId, groupId });
      return updated;
    });
    return toDeliveryPreparationGroupDetail(group, await this.createActionContext(context.actor.id), new Date());
  }

  private async ensureState(tx: LogisticsTx, workOrderId: string): Promise<WorkLogisticsState> {
      const work = await tx.workOrder.findUnique({ include: { activeCycle: { include: { logisticsState: true, workflowExecution: true } } }, where: { id: workOrderId } });
    if (!work) {
      throw new NotFoundException("Lucrarea nu a fost găsită.");
    }
    if (!work.activeCycle) {
      throw new ConflictException("Lucrarea nu are un ciclu activ.");
    }
    if (work.activeCycle.logisticsState) {
      return work.activeCycle.logisticsState;
    }
    const status = work.activeCycle.workflowExecution?.status === WorkWorkflowExecutionStatus.ACTIVE
        ? WorkLogisticsStatus.IN_PRODUCTION
        : WorkLogisticsStatus.RECEIVED;
    const state = await tx.workLogisticsState.create({
      data: {
        physicalLocationCode: status === WorkLogisticsStatus.IN_PRODUCTION ? "PRODUCTIE" : "RECEPTIE",
        status,
        workCycleId: work.activeCycle.id,
        workOrderId,
      },
    });
    await tx.logisticsEvent.create({
      data: {
        logisticsStateId: state.id,
        metadata: { newStatus: status, workId: workOrderId },
        type: LogisticsEventType.WORK_RECEIVED,
        workCycleId: work.activeCycle.id,
        workOrderId,
      },
    });
    return state;
  }

  private async deriveNonBlockedStatus(tx: LogisticsTx, workOrderId: string): Promise<WorkLogisticsStatus> {
    const work = await tx.workOrder.findUnique({ select: { technicalReadiness: true }, where: { id: workOrderId } });
    return work?.technicalReadiness === "PROBE_READY" || work?.technicalReadiness === "FINAL_READY" ? WorkLogisticsStatus.RECEIVED : WorkLogisticsStatus.IN_PRODUCTION;
  }

  private async findWork(workOrderId: string): Promise<LogisticsWorkRecord> {
    const work = await this.prisma.workOrder.findUnique({ include: logisticsWorkInclude, where: { id: workOrderId } });
    if (!work) {
      throw new NotFoundException("Lucrarea nu a fost găsită.");
    }
    return work;
  }

  private async findGroup(groupId: string): Promise<DeliveryPreparationGroupRecord> {
    const group = await this.prisma.deliveryPreparationGroup.findUnique({ include: deliveryPreparationGroupInclude, where: { id: groupId } });
    if (!group) {
      throw new NotFoundException("Grupul nu a fost găsit.");
    }
    return group;
  }

  private async findGroupInTx(tx: LogisticsTx, groupId: string): Promise<DeliveryPreparationGroupRecord> {
    const group = await tx.deliveryPreparationGroup.findUnique({ include: deliveryPreparationGroupInclude, where: { id: groupId } });
    if (!group) {
      throw new NotFoundException("Grupul nu a fost găsit.");
    }
    return group;
  }

  private toWorkWhere(query: LogisticsCenterQueryDto): Prisma.WorkOrderWhereInput {
    const search = query.search?.trim();
    const dateRange = toRequestedDeliveryRange(query);
    const horizonDays = query.category === "DE_LIVRAT"
      ? query.deliveryHorizonDays
      : query.category === "DE_RIDICAT"
        ? query.pickupHorizonDays
        : undefined;
    const horizonRange = toHorizonDateRange(horizonDays);
    const and: Prisma.WorkOrderWhereInput[] = [];
    if (query.logisticsStatus) {
      and.push({ activeCycle: { is: { logisticsState: { is: { status: query.logisticsStatus } } } } });
    }
    if (query.technicianId) {
      and.push({ activeCycle: { is: { workflowExecution: { is: { stages: { some: { assignedUserId: query.technicianId } } } } } } });
    }
    if (query.workflowStageKey) {
      and.push({ activeCycle: { is: { workflowExecution: { is: { currentStage: { is: { stageKeySnapshot: query.workflowStageKey } } } } } } });
    }
    // A work kept in a draft/list is still a candidate for the route builder.
    // A completed delivery, however, must leave the operational queue until a
    // later probe/return makes it ready again. Pending stops in assigned or
    // active routes also remain hidden from the source queue.
    and.push({
      NOT: {
        courierRouteStops: {
          some: {
            outcomeStatus: "PENDING",
            route: { status: { in: [CourierRouteStatus.ASSIGNED, CourierRouteStatus.IN_PROGRESS] } },
          },
        },
      },
    });
    if (dateRange) {
      // Finalized works belong to the day they were completed; other works remain date-filtered by deadline.
      and.push({
        OR: [
          { requestedDeliveryDate: dateRange },
          { completedAt: dateRange, status: "FINALIZATA" },
        ],
      });
    }
    if (horizonRange) {
      and.push({ requestedDeliveryDate: horizonRange });
    }
    return {
      ...(and.length > 0 ? { AND: and } : {}),
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
      ...(query.receptionUserId ? { createdByUserId: query.receptionUserId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(search ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { patientName: { contains: search, mode: "insensitive" } },
          { patientReference: { contains: search, mode: "insensitive" } },
          { clinic: { name: { contains: search, mode: "insensitive" } } },
          { doctor: { displayName: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    };
  }

  private toPickupWhere(query: LogisticsCenterQueryDto): Prisma.PickupRequestWhereInput {
    const dateRanges = [toScheduledDateRange(query), toHorizonDateRange(query.pickupHorizonDays)].filter(
      (range): range is Prisma.DateTimeFilter => range !== null,
    );
    const and: Prisma.PickupRequestWhereInput[] = [
      // A successfully completed pickup is historical and must not be offered
      // again. A failed/uncompleted pickup remains reusable for a new route.
      { routeStops: { none: { outcomeStatus: "PICKED_UP" } } },
      { routeStops: { none: { outcomeStatus: "PENDING", route: { status: { in: [CourierRouteStatus.ASSIGNED, CourierRouteStatus.IN_PROGRESS] } } } } },
    ];
    for (const scheduledDate of dateRanges) {
      and.push({ scheduledDate });
    }
    return {
      status: PickupRequestStatus.SCHEDULED,
      AND: and,
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.receptionUserId ? { createdByUserId: query.receptionUserId } : {}),
    };
  }

  private toWorkOrderSort(query: LogisticsCenterQueryDto): Prisma.WorkOrderOrderByWithRelationInput {
    if (query.sortBy === "workCode") {
      return { code: query.sortDirection };
    }
    if (query.sortBy === "priority") {
      return { priority: query.sortDirection };
    }
    return { [query.sortBy]: query.sortDirection };
  }

  private matchesComputedFilters(item: ReturnType<typeof toLogisticsCenterItem>, query: LogisticsCenterQueryDto): boolean {
    if (query.dueState && item.dueState !== query.dueState) {
      return false;
    }
    if (query.billingStatus && item.billing.documentStatus !== query.billingStatus && item.billing.paymentStatus !== query.billingStatus) {
      return false;
    }
    if (query.category === "DE_LIVRAT" && query.deliveryHorizonDays && !isWithinDays(item.requestedDeliveryDate, query.deliveryHorizonDays)) {
      return false;
    }
    if (query.category === "DE_RIDICAT" && query.pickupHorizonDays && !isWithinDays(item.requestedDeliveryDate, query.pickupHorizonDays)) {
      return false;
    }
    return this.matchesCategory(item, query.category);
  }

  private matchesCategory(item: ReturnType<typeof toLogisticsCenterItem>, category: LogisticsCenterCategory): boolean {
    if (category === "ALL") return true;
    if (category === "INTRARI_ASTAZI") return isToday(new Date(item.createdAt));
    if (category === "DE_VERIFICAT") return item.workflow.status === "COMPLETED" && item.technicalReadiness === null;
    if (category === "IN_PRODUCTIE") return item.logistics.status === "IN_PRODUCTION";
    if (category === "NEASIGNATE") return item.workflow.status === "ACTIVE" && item.workflow.assignedUserName === null;
    if (category === "BLOCARE") return item.logistics.status === "BLOCKED";
    if (category === "URGENTE") return item.priority === "URGENT";
    if (category === "INTARZIATE") return item.dueState === "OVERDUE";
    if (category === "FINALIZATE_AZI") return item.workflow.completedAt !== null && isToday(new Date(item.workflow.completedAt));
    if (category === "IN_ASTEPTARE") return item.operationalStatus === "IN_ASTEPTARE";
    if (category === "DE_LIVRAT") return item.requiresLogisticsAction && (item.requiresDelivery || item.logisticsActionReasons.includes("READY_FOR_PROBE_DELIVERY") || item.logisticsActionReasons.includes("READY_FOR_FINAL_DELIVERY"));
    if (category === "DE_RIDICAT") return item.requiresLogisticsAction && item.requiresPickup;
    return item.billing.documentId === null;
  }

  private assertVersion(record: { readonly version: number }, version: number): void {
    if (record.version !== version) {
      throw new ConflictException("Datele au fost modificate. Reîncarcă înainte de acțiune.");
    }
  }

  private async parseCreateWorkDto(value: string): Promise<CreateWorkDto> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException("Datele lucrării nu sunt JSON valid.");
    }

    const dto = plainToInstance(CreateWorkDto, parsed);
    const errors = await validate(dto, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException("Datele lucrării nu sunt valide.");
    }
    return dto;
  }

  private validateAttachments(files: readonly UploadedAttachmentFile[]): void {
    if (files.length > LOGISTICS_ATTACHMENT_LIMITS.maxFiles) {
      throw new BadRequestException(`Poți încărca maximum ${LOGISTICS_ATTACHMENT_LIMITS.maxFiles} fișiere.`);
    }

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > LOGISTICS_ATTACHMENT_LIMITS.maxTotalBytes) {
      throw new BadRequestException("Fișierele depășesc limita totală permisă.");
    }

    for (const file of files) {
      const fileName = file.originalname.trim();
      if (!fileName || fileName.length > 255) {
        throw new BadRequestException("Numele fișierului este invalid.");
      }
      if (file.size <= 0 || file.size > LOGISTICS_ATTACHMENT_LIMITS.maxFileBytes || !file.buffer || file.buffer.length !== file.size) {
        throw new BadRequestException("Fișierul este gol sau depășește limita permisă.");
      }
      if (!LOGISTICS_ATTACHMENT_LIMITS.allowedMimeTypes.includes(file.mimetype as (typeof LOGISTICS_ATTACHMENT_LIMITS.allowedMimeTypes)[number])) {
        throw new BadRequestException("Tipul fișierului nu este permis.");
      }
    }
  }

  private async saveAttachments(context: ActorContext, workOrderId: string, files: readonly UploadedAttachmentFile[]): Promise<readonly WorkAttachmentSummary[]> {
    if (files.length === 0) {
      return [];
    }

    const attachments = await this.prisma.$transaction(async (tx) => {
      const created: Prisma.WorkAttachmentGetPayload<object>[] = [];
      for (const file of files) {
        const content = new Uint8Array(file.buffer.byteLength);
        content.set(file.buffer);
        const attachment = await tx.workAttachment.create({
          data: {
            content,
            fileName: file.originalname.trim(),
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedByUserId: context.actor.id,
            workOrderId,
          },
        });
        await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.attachmentUploaded, attachment.id, {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          workId: workOrderId,
        });
        created.push(attachment);
      }
      return created;
    });

    return attachments.map((attachment) => ({
      fileName: attachment.fileName,
      id: attachment.id,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedAt: attachment.uploadedAt.toISOString(),
    }));
  }

  private async canSetManualDeadline(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "works.deadline.set_manual",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }

  private parsePickupSchedule(dto: CreatePickupRequestDto): {
    readonly exactTime: string | null;
    readonly scheduledDate: Date;
    readonly scheduleType: "EXACT" | "RANGE";
    readonly windowEndTime: string | null;
    readonly windowStartTime: string | null;
  } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.scheduledDate)) {
      throw new BadRequestException("Data ridicării trebuie să fie în format YYYY-MM-DD.");
    }
    const scheduledDate = new Date(`${dto.scheduledDate}T00:00:00.000Z`);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.toISOString().slice(0, 10) !== dto.scheduledDate) {
      throw new BadRequestException("Data ridicării nu este validă.");
    }

    if (dto.scheduleType === "EXACT") {
      const exactTime = this.parsePickupTime(dto.exactTime, "Ora exactă este obligatorie.");
      if (dto.windowStartTime || dto.windowEndTime) {
        throw new BadRequestException("Ridicarea cu oră exactă nu poate avea interval orar.");
      }
      return { exactTime, scheduledDate, scheduleType: "EXACT", windowEndTime: null, windowStartTime: null };
    }

    const windowStartTime = this.parsePickupTime(dto.windowStartTime, "Ora de început este obligatorie.");
    const windowEndTime = this.parsePickupTime(dto.windowEndTime, "Ora de final este obligatorie.");
    if (dto.exactTime) {
      throw new BadRequestException("Ridicarea pe interval nu poate avea oră exactă.");
    }
    if (this.timeToMinutes(windowStartTime) >= this.timeToMinutes(windowEndTime)) {
      throw new BadRequestException("Intervalul de ridicare trebuie să aibă ora de început înaintea orei de final.");
    }
    return { exactTime: null, scheduledDate, scheduleType: "RANGE", windowEndTime, windowStartTime };
  }

  private parsePickupTime(value: string | null | undefined, missingMessage: string): string {
    if (!value) {
      throw new BadRequestException(missingMessage);
    }
    if (!/^\d{2}:\d{2}$/.test(value)) {
      throw new BadRequestException("Ora ridicării trebuie să fie în format HH:mm.");
    }
    const parts = value.split(":").map(Number);
    const hour = parts[0];
    const minute = parts[1];
    if (hour === undefined || minute === undefined) {
      throw new BadRequestException("Ora ridicării nu este validă.");
    }
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new BadRequestException("Ora ridicării nu este validă.");
    }
    return value;
  }

  private timeToMinutes(value: string): number {
    const [hour = 0, minute = 0] = value.split(":").map(Number);
    return hour * 60 + minute;
  }

  private async ensurePickupClinicDoctor(clinicId: string, doctorId?: string | null): Promise<void> {
    const [clinic, doctor] = await Promise.all([
      this.prisma.clinic.findFirst({ select: { id: true }, where: { id: clinicId, isActive: true } }),
      doctorId ? this.prisma.doctor.findFirst({ select: { id: true }, where: { clinicId, id: doctorId, isActive: true } }) : Promise.resolve(null),
    ]);
    if (!clinic) {
      throw new BadRequestException("Clinica selectată nu este validă.");
    }
    if (doctorId && !doctor) {
      throw new BadRequestException("Medicul selectat nu este valid pentru clinica aleasă.");
    }
  }

  private toPickupRequestView(pickup: Prisma.PickupRequestGetPayload<{ include: { clinic: true; doctor: true } }>): PickupRequestView {
    const exactTime = pickup.exactTime;
    const windowStartTime = pickup.windowStartTime;
    const windowEndTime = pickup.windowEndTime;
    const clinicAddress = [pickup.clinic.addressLine1, pickup.clinic.addressLine2, pickup.clinic.postalCode, pickup.clinic.city].filter(Boolean).join(", ") || null;
    return {
      cancelledAt: pickup.cancelledAt?.toISOString() ?? null,
      address: pickup.address ?? clinicAddress,
      clinic: { id: pickup.clinic.id, name: pickup.clinic.name },
      createdAt: pickup.createdAt.toISOString(),
      doctor: pickup.doctor ? { id: pickup.doctor.id, name: pickup.doctor.displayName } : null,
      exactTime,
      id: pickup.id,
      notes: pickup.notes,
      scheduledDate: pickup.scheduledDate.toISOString().slice(0, 10),
      scheduleLabel: pickup.scheduleType === "EXACT" ? exactTime ?? "-" : `${windowStartTime ?? "-"}-${windowEndTime ?? "-"}`,
      scheduleType: pickup.scheduleType,
      status: pickup.status,
      statusLabel: pickup.status === PickupRequestStatus.CANCELLED ? "Anulată" : "Programată",
      updatedAt: pickup.updatedAt.toISOString(),
      version: pickup.version,
      windowEndTime,
      windowStartTime,
      phone: pickup.phone ?? pickup.clinic.phone ?? pickup.clinic.contactPersonPhone,
    };
  }

  private toPickupAuditMetadata(pickup: Prisma.PickupRequestGetPayload<{ include: { clinic: true; doctor: true } }>): Prisma.InputJsonObject {
    return {
      clinicId: pickup.clinicId,
      doctorId: pickup.doctorId,
      exactTime: pickup.exactTime,
      pickupId: pickup.id,
      scheduledDate: pickup.scheduledDate.toISOString().slice(0, 10),
      scheduleType: pickup.scheduleType,
      status: pickup.status,
      version: pickup.version,
      windowEndTime: pickup.windowEndTime,
      windowStartTime: pickup.windowStartTime,
    };
  }

  private toRouteStopCreates(stops: readonly CreateCourierRouteDto["stops"][number][]): Prisma.CourierRouteStopCreateWithoutRouteInput[] {
    const seen = new Set<string>();
    return stops.map((stop, index) => {
      if (stop.type === "DELIVERY") {
        if (!stop.workOrderId || stop.pickupRequestId) {
          throw new BadRequestException("Stopul de livrare trebuie să conțină doar lucrare.");
        }
        const key = `DELIVERY:${stop.workOrderId}`;
        if (seen.has(key)) {
          throw new BadRequestException("Lucrarea este deja în traseu.");
        }
        seen.add(key);
        return { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, stopNotes: stop.stopNotes ?? null, stopOrder: index + 1, type: "DELIVERY", workOrder: { connect: { id: stop.workOrderId } } };
      }
      if ((!stop.pickupRequestId && !stop.workOrderId) || (stop.pickupRequestId && stop.workOrderId)) {
        throw new BadRequestException("Stopul de ridicare trebuie să conțină o lucrare bifată sau o cerere de ridicare.");
      }
      const key = `PICKUP:${stop.pickupRequestId ?? stop.workOrderId}`;
      if (seen.has(key)) {
        throw new BadRequestException("Ridicarea este deja în traseu.");
      }
      seen.add(key);
      return stop.pickupRequestId
        ? { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, stopNotes: stop.stopNotes ?? null, pickupRequest: { connect: { id: stop.pickupRequestId } }, stopOrder: index + 1, type: "PICKUP" }
        : { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, stopNotes: stop.stopNotes ?? null, workOrder: { connect: { id: stop.workOrderId as string } }, stopOrder: index + 1, type: "PICKUP" };
    });
  }

  private async nextRouteNumber(tx: LogisticsTx, routeDate: Date): Promise<string> {
    const count = await tx.courierRoute.count({ where: { routeDate } });
    const yy = String(routeDate.getUTCFullYear()).slice(-2);
    const mm = String(routeDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(routeDate.getUTCDate()).padStart(2, "0");
    return `TR-${yy}${mm}${dd}-${String(count + 1).padStart(2, "0")}`;
  }

  private toRouteWhere(query: CourierRoutesQueryDto, actorUserId: string, canReadAll: boolean): Prisma.CourierRouteWhereInput {
    const routeDate = toDateRange(query.exactDate, query.dateFrom, query.dateTo);
    return {
      ...(canReadAll ? (query.courierUserId ? { courierUserId: query.courierUserId } : {}) : { courierUserId: actorUserId }),
      ...(query.status ? { status: query.status } : {}),
      ...(routeDate ? { routeDate } : {}),
    };
  }

  private async assertRouteExecutionAccess(userId: string, courierUserId: string | null): Promise<void> {
    if (await this.hasPermission(userId, "routes.execute_own", "ALL")) {
      return;
    }
    if (courierUserId === userId && await this.hasPermission(userId, "routes.execute_own", "OWN_DELIVERY")) {
      return;
    }
    throw new ForbiddenException("Nu ai acces la acest traseu.");
  }

  private assertStopOutcome(type: "DELIVERY" | "PICKUP", outcome: string): void {
    if (type === "DELIVERY" && outcome !== "DELIVERED" && outcome !== "NOT_DELIVERED") {
      throw new BadRequestException("Stopul de livrare acceptă doar livrat sau nelivrat.");
    }
    if (type === "PICKUP" && outcome !== "PICKED_UP" && outcome !== "NOT_PICKED_UP") {
      throw new BadRequestException("Stopul de ridicare acceptă doar ridicat sau neridicat.");
    }
  }

  private toCourierRouteView(route: CourierRouteRecord): CourierRouteView {
    return {
      completedAt: route.completedAt?.toISOString() ?? null,
      courier: route.courier ? { id: route.courier.id, name: route.courier.displayName } : null,
      createdAt: route.createdAt.toISOString(),
      id: route.id,
      name: route.name,
      notes: route.notes,
      routeDate: route.routeDate.toISOString().slice(0, 10),
      routeNumber: route.routeNumber,
      startedAt: route.startedAt?.toISOString() ?? null,
      status: route.status,
      stops: route.stops.map((stop) => ({
        addressOverride: stop.addressOverride ?? this.toRouteStopAddress(stop),
        id: stop.id,
        outcomeAt: stop.outcomeAt?.toISOString() ?? null,
        outcomeByUserName: stop.outcomeBy?.displayName ?? null,
        failureReason: stop.failureReason,
        outcomeNotes: stop.outcomeNotes,
        outcomeStatus: stop.outcomeStatus,
        phoneOverride: stop.phoneOverride ?? this.toRouteStopPhone(stop),
        pickupRequestId: stop.pickupRequestId,
        stopOrder: stop.stopOrder,
        stopNotes: stop.stopNotes,
        targetLabel: this.toRouteStopTargetLabel(stop),
        type: stop.type,
        workOrderId: stop.workOrderId,
      })),
      updatedAt: route.updatedAt.toISOString(),
      version: route.version,
    };
  }

  private toRouteStopTargetLabel(stop: CourierRouteRecord["stops"][number]): string {
    if (stop.type === "DELIVERY") {
      return stop.workOrder ? `${stop.workOrder.code} · ${stop.workOrder.patientName}` : "Livrare";
    }
    if (stop.workOrder) {
      return `${stop.workOrder.code} · ${stop.workOrder.patientName}`;
    }
    if (!stop.pickupRequest) {
      return "Ridicare";
    }
    const time = stop.pickupRequest.exactTime ?? [stop.pickupRequest.windowStartTime, stop.pickupRequest.windowEndTime].filter(Boolean).join("-");
    return `${stop.pickupRequest.clinic.name}${time ? ` · ${time}` : ""}`;
  }

  private toRouteStopAddress(stop: CourierRouteRecord["stops"][number]): string | null {
    const source = stop.type === "PICKUP" && stop.pickupRequest
      ? { address: stop.pickupRequest.address, clinic: stop.pickupRequest.clinic }
      : { address: null, clinic: stop.workOrder?.clinic };
    if (source.address) return source.address;
    const clinic = source.clinic;
    if (!clinic) return null;
    return [clinic.addressLine1, clinic.addressLine2, clinic.postalCode, clinic.city].filter(Boolean).join(", ") || null;
  }

  private toRouteStopPhone(stop: CourierRouteRecord["stops"][number]): string | null {
    if (stop.type === "PICKUP" && stop.pickupRequest?.phone) return stop.pickupRequest.phone;
    return stop.workOrder?.clinic?.phone ?? stop.pickupRequest?.clinic.phone ?? null;
  }

  private toRouteAuditMetadata(route: CourierRouteRecord): Prisma.InputJsonObject {
    return {
      courierUserId: route.courierUserId,
      routeDate: route.routeDate.toISOString().slice(0, 10),
      routeId: route.id,
      routeNumber: route.routeNumber,
      status: route.status,
      stopOrder: route.stops.map((stop) => ({ pickupRequestId: stop.pickupRequestId, stopOrder: stop.stopOrder, type: stop.type, workOrderId: stop.workOrderId })),
      version: route.version,
    };
  }

  private async ensurePermission(userId: string, permission: "files.upload" | "works.create" | "pickup.create" | "pickup.read" | "pickup.update" | "pickup.cancel" | "routes.assign" | "routes.cancel" | "routes.create" | "routes.read" | "logistics.update_location" | "logistics.block_work" | "logistics.unblock_work" | "logistics.manage_groups"): Promise<void> {
    const result = await this.authorizationService.hasPermission({ permission, requiredScope: "ALL", userId });
    if (!result.allowed) {
      throw new ForbiddenException("Nu ai permisiunea necesară pentru această acțiune logistică.");
    }
  }

  private async ensureRoutePermission(userId: string, permission: "routes.create" | "routes.update"): Promise<void> {
    if (await this.hasRoutePermission(userId, permission, "ALL")) return;
    throw new ForbiddenException("Nu ai permisiunea necesară pentru această acțiune logistică.");
  }

  private async hasPermission(userId: string, permission: "routes.execute_own" | "routes.read", requiredScope: "ALL" | "OWN_DELIVERY"): Promise<boolean> {
    return (await this.authorizationService.hasPermission({ permission, requiredScope, userId })).allowed;
  }

  private async hasRoutePermission(userId: string, permission: "routes.create" | "routes.read" | "routes.update", requiredScope: "ALL"): Promise<boolean> {
    const direct = await this.authorizationService.hasPermission({ permission, requiredScope, userId });
    if (direct.allowed) return true;
    return (await this.authorizationService.hasPermission({ permission: "logistics.center.read", requiredScope: "ALL", userId })).allowed;
  }

  private async createActionContext(userId: string): Promise<ActionContext> {
    const [canBlock, canManageGroups, canUnblock, canUpdateLocation] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "logistics.block_work", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.manage_groups", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.unblock_work", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.update_location", requiredScope: "ALL", userId }),
    ]);

    return {
      canBlock: canBlock.allowed,
      canManageGroups: canManageGroups.allowed,
      canUnblock: canUnblock.allowed,
      canUpdateLocation: canUpdateLocation.allowed,
    };
  }

  private async generateGroupCode(tx: LogisticsTx): Promise<string> {
    const result = await tx.$queryRaw<readonly { readonly nextval: bigint }[]>`SELECT nextval('delivery_preparation_group_code_seq')`;
    const sequence = Number(result[0]?.nextval ?? 1n);
    return `PG-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, "0")}`;
  }

  private async recordLogisticsEvent(
    tx: LogisticsTx,
    context: ActorContext,
    workOrderId: string,
    workCycleId: string | null,
    logisticsStateId: string | null,
    type: LogisticsEventType,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await tx.logisticsEvent.create({
      data: {
        actorUserId: context.actor.id,
        logisticsStateId,
        metadata,
        type,
        workCycleId,
        workOrderId,
      },
    });
  }

  private async recordRouteEvent(tx: LogisticsTx, context: ActorContext, routeId: string, type: CourierRouteEventType, metadata: Prisma.InputJsonObject): Promise<void> {
    await tx.courierRouteEvent.create({
      data: {
        actorUserId: context.actor.id,
        metadata,
        routeId,
        type,
      },
    });
  }

  private async recordAudit(tx: LogisticsTx, context: ActorContext, action: string, resourceId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId,
      resourceType: action === LOGISTICS_AUDIT_ACTIONS.attachmentUploaded
        ? LOGISTICS_RESOURCE_TYPES.workAttachment
        : action.startsWith("route.")
          ? LOGISTICS_RESOURCE_TYPES.courierRoute
        : action.startsWith("pickup.")
          ? LOGISTICS_RESOURCE_TYPES.pickupRequest
        : action.includes("group")
          ? LOGISTICS_RESOURCE_TYPES.deliveryPreparationGroup
          : LOGISTICS_RESOURCE_TYPES.workLogistics,
    };
    if (context.requestMetadata.ipAddress) {
      data.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      data.userAgent = context.requestMetadata.userAgent;
    }
    await tx.auditLog.create({ data });
  }
}

function logisticsActionPriority(item: ReturnType<typeof toLogisticsCenterItem>): number {
  if (item.logisticsActionReasons.includes("FAILED_DELIVERY")) return 0;
  if (item.dueState === "OVERDUE") return 1;
  if (item.priority === "URGENT") return 2;
  if (item.dueState === "DUE_SOON") return 3;
  if (item.logisticsActionReasons.includes("READY_FOR_PROBE_DELIVERY") || item.logisticsActionReasons.includes("READY_FOR_FINAL_DELIVERY")) return 4;
  return 5;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function toRequestedDeliveryRange(query: LogisticsCenterQueryDto): Prisma.DateTimeFilter | null {
  return toDateRange(query.exactDate, query.dateFrom, query.dateTo);
}

function toScheduledDateRange(query: LogisticsCenterQueryDto): Prisma.DateTimeFilter | null {
  return toDateRange(query.exactDate, query.dateFrom, query.dateTo);
}

function toHorizonDateRange(days?: number): Prisma.DateTimeFilter | null {
  if (!days) {
    return null;
  }
  const start = startOfUtcDay(new Date().toISOString());
  return { gte: start, lt: addUtcDays(start, days + 1) };
}

function toDateRange(exactDate?: string, dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | null {
  if (exactDate) {
    const start = startOfUtcDay(exactDate);
    return { gte: start, lt: addUtcDays(start, 1) };
  }
  const range: Prisma.DateTimeFilter = {};
  if (dateFrom) {
    range.gte = startOfUtcDay(dateFrom);
  }
  if (dateTo) {
    range.lt = addUtcDays(startOfUtcDay(dateTo), 1);
  }
  return Object.keys(range).length > 0 ? range : null;
}

function startOfUtcDay(value: string): Date {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function canAddWorkToPreparationGroup(input: {
  readonly groupClinicId: string;
  readonly groupStatus: DeliveryPreparationGroupStatus;
  readonly hasActiveGroup: boolean;
  readonly workClinicId: string;
  readonly technicalReadiness: "PROBE_READY" | "FINAL_READY" | null;
}): boolean {
  return input.groupStatus === DeliveryPreparationGroupStatus.DRAFT
    && input.groupClinicId === input.workClinicId
    && !input.hasActiveGroup
    && (input.technicalReadiness === "PROBE_READY" || input.technicalReadiness === "FINAL_READY");
}
