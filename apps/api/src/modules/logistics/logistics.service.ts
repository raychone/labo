import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  DeliveryPreparationGroupStatus,
  LogisticsEventType,
  WorkLogisticsStatus,
  WorkWorkflowExecutionStatus,
  type LogisticsLocationCode,
  type Prisma,
  type WorkLogisticsState,
} from "@prisma/client";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { LOGISTICS_AUDIT_ACTIONS, LOGISTICS_RESOURCE_TYPES } from "./logistics.constants.js";
import type {
  BlockWorkDto,
  CreateDeliveryPreparationGroupDto,
  DeliveryPreparationGroupsQueryDto,
  LogisticsCenterQueryDto,
  LogisticsTransitionDto,
  UpdateDeliveryPreparationGroupDto,
  UpdateLogisticsLocationDto,
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

type LogisticsCenterCategory = "ALL" | "INTRARI_ASTAZI" | "DE_VERIFICAT" | "IN_PRODUCTIE" | "NEASIGNATE" | "BLOCARE" | "URGENTE" | "INTARZIATE" | "FINALIZATE_AZI" | "DE_AMBALAT" | "IN_AMBALARE" | "GATA_DE_LIVRARE" | "NEFACTURATE";

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

type LogisticsTx = Prisma.TransactionClient;

@Injectable()
export class LogisticsService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async getCenter(actor: AuthenticatedUser, query: LogisticsCenterQueryDto): Promise<PaginatedLogisticsCenterResponse> {
    const actionContext = await this.createActionContext(actor.id);
    const now = new Date();
    const workOrders = await this.prisma.workOrder.findMany({
      include: logisticsWorkInclude,
      orderBy: this.toWorkOrderSort(query),
      where: this.toWorkWhere(query),
      take: 500,
    });
    const filtered = workOrders
      .map((work) => toLogisticsCenterItem(work, actionContext, now))
      .filter((item) => this.matchesComputedFilters(item, query));
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

  public async getCenterSummary(actor: AuthenticatedUser, query: LogisticsCenterQueryDto): Promise<LogisticsCenterSummary> {
    const actionContext = await this.createActionContext(actor.id);
    const now = new Date();
    const workOrders = await this.prisma.workOrder.findMany({
      include: logisticsWorkInclude,
      where: this.toWorkWhere({ ...query, page: 1, pageSize: 100, sortBy: "requestedDeliveryDate", sortDirection: "asc" }),
      take: 500,
    });
    return createLogisticsSummary(workOrders.map((work) => toLogisticsCenterItem(work, actionContext, now)));
  }

  public async getWorkLogistics(actor: AuthenticatedUser, workOrderId: string): Promise<WorkLogisticsView> {
    const work = await this.findWork(workOrderId);
    return toWorkLogisticsView(work, await this.createActionContext(actor.id), new Date());
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
      if (current.status === WorkLogisticsStatus.READY_FOR_DELIVERY) {
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

  public async confirmReadyForPacking(context: ActorContext, workOrderId: string, dto: LogisticsTransitionDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.prepare_work");
    const state = await this.prisma.$transaction(async (tx) => {
      const current = await this.ensureState(tx, workOrderId);
      this.assertVersion(current, dto.version);
      if (current.status === WorkLogisticsStatus.BLOCKED) {
        throw new BadRequestException("Deblochează lucrarea înainte de pregătirea pentru ambalare.");
      }
      await this.assertWorkflowCompletedOrOverride(tx, workOrderId, dto.workflowOverride === true);
      const updated = await tx.workLogisticsState.update({
        data: {
          physicalLocationCode: "RAFT_FINISARE",
          readyForPackingAt: new Date(),
          readyForPackingByUserId: context.actor.id,
          status: WorkLogisticsStatus.READY_FOR_PACKING,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        where: { id: current.id },
      });
      await this.recordLogisticsEvent(tx, context, workOrderId, updated.workCycleId, updated.id, LogisticsEventType.READY_FOR_PACKING_CONFIRMED, {
        newStatus: updated.status,
        oldStatus: current.status,
        workflowOverride: dto.workflowOverride === true,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, LOGISTICS_AUDIT_ACTIONS.readyForPackingConfirmed, workOrderId, {
        logisticsStateId: updated.id,
        newStatus: updated.status,
        oldStatus: current.status,
        workflowOverride: dto.workflowOverride === true,
        workId: workOrderId,
      });
      return updated;
    });
    return this.getWorkLogistics(context.actor, state.workOrderId);
  }

  public async startPacking(context: ActorContext, workOrderId: string, dto: LogisticsTransitionDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.prepare_work");
    const state = await this.transitionStatus(context, workOrderId, dto.version, WorkLogisticsStatus.READY_FOR_PACKING, WorkLogisticsStatus.PACKING, {
      eventType: LogisticsEventType.PACKING_STARTED,
      locationCode: "ZONA_AMBALARE",
      timestampField: "packingStartedAt",
      userField: "packingStartedByUserId",
      auditAction: LOGISTICS_AUDIT_ACTIONS.packingStarted,
    });
    return this.getWorkLogistics(context.actor, state.workOrderId);
  }

  public async completePacking(context: ActorContext, workOrderId: string, dto: LogisticsTransitionDto): Promise<WorkLogisticsView> {
    await this.ensurePermission(context.actor.id, "logistics.prepare_work");
    const state = await this.transitionStatus(context, workOrderId, dto.version, WorkLogisticsStatus.PACKING, WorkLogisticsStatus.READY_FOR_DELIVERY, {
      eventType: LogisticsEventType.PACKING_COMPLETED,
      locationCode: "GATA_LIVRARE",
      timestampField: "readyForDeliveryAt",
      userField: "readyForDeliveryByUserId",
      auditAction: LOGISTICS_AUDIT_ACTIONS.packingCompleted,
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
        tx.deliveryPreparationGroup.findUnique({ include: { items: { where: { isActive: true } } }, where: { id: groupId } }),
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
      const status = work.activeCycle?.logisticsState?.status ?? WorkLogisticsStatus.RECEIVED;
      if (!canAddWorkToPreparationGroup({
        groupClinicId: groupRecord.clinicId,
        groupStatus: groupRecord.status,
          hasActiveGroup: work.deliveryPreparationItems.some((item) => item.workCycleId === work.activeCycleId),
        workClinicId: work.clinicId,
        workLogisticsStatus: status,
      })) {
        throw new BadRequestException("Lucrarea trebuie să fie gata de livrare, fără grup activ și din aceeași clinică.");
      }
      await tx.deliveryPreparationItem.create({
        data: {
          addedByUserId: context.actor.id,
          groupId,
          workCycleId: work.activeCycleId,
          workOrderId,
        },
      });
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

  private async transitionStatus(
    context: ActorContext,
    workOrderId: string,
    version: number,
    expected: WorkLogisticsStatus,
    next: WorkLogisticsStatus,
    options: {
      readonly auditAction: string;
      readonly eventType: LogisticsEventType;
      readonly locationCode: LogisticsLocationCode;
      readonly timestampField: "packingStartedAt" | "readyForDeliveryAt";
      readonly userField: "packingStartedByUserId" | "readyForDeliveryByUserId";
    },
  ): Promise<WorkLogisticsState> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.ensureState(tx, workOrderId);
      this.assertVersion(current, version);
      if (current.status !== expected) {
        throw new BadRequestException(`Tranziția necesită statusul ${expected}.`);
      }
      const updated = await tx.workLogisticsState.update({
        data: {
          [options.timestampField]: new Date(),
          [options.userField]: context.actor.id,
          physicalLocationCode: options.locationCode,
          status: next,
          updatedByUserId: context.actor.id,
          version: { increment: 1 },
        },
        where: { id: current.id },
      });
      await this.recordLogisticsEvent(tx, context, workOrderId, updated.workCycleId, updated.id, options.eventType, {
        newStatus: next,
        oldStatus: current.status,
        workId: workOrderId,
      });
      await this.recordAudit(tx, context, options.auditAction, workOrderId, {
        logisticsStateId: updated.id,
        newStatus: next,
        oldStatus: current.status,
        workId: workOrderId,
      });
      return updated;
    });
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
    const status = work.activeCycle.workflowExecution?.status === WorkWorkflowExecutionStatus.ACTIVE ? WorkLogisticsStatus.IN_PRODUCTION : WorkLogisticsStatus.RECEIVED;
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

  private async assertWorkflowCompletedOrOverride(tx: LogisticsTx, workOrderId: string, override: boolean): Promise<void> {
    const execution = await tx.workWorkflowExecution.findFirst({ select: { status: true }, where: { workCycle: { activeForWorkOrder: { id: workOrderId } }, workOrderId } });
    if (execution?.status === WorkWorkflowExecutionStatus.COMPLETED) {
      return;
    }
    if (override) {
      return;
    }
    throw new BadRequestException("Fluxul lucrării trebuie finalizat sau confirmat explicit ca excepție.");
  }

  private async deriveNonBlockedStatus(tx: LogisticsTx, workOrderId: string): Promise<WorkLogisticsStatus> {
    const execution = await tx.workWorkflowExecution.findFirst({ select: { status: true }, where: { workCycle: { activeForWorkOrder: { id: workOrderId } }, workOrderId } });
    return execution?.status === WorkWorkflowExecutionStatus.COMPLETED ? WorkLogisticsStatus.READY_FOR_PACKING : WorkLogisticsStatus.IN_PRODUCTION;
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
    return {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.dateFrom || query.dateTo ? { requestedDeliveryDate: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {}),
      ...(query.logisticsStatus ? { activeCycle: { is: { logisticsState: { is: { status: query.logisticsStatus } } } } } : {}),
      ...(query.technicianId ? { activeCycle: { is: { workflowExecution: { is: { stages: { some: { assignedUserId: query.technicianId } } } } } } } : {}),
      ...(query.workflowStageKey ? { activeCycle: { is: { workflowExecution: { is: { currentStage: { is: { stageKeySnapshot: query.workflowStageKey } } } } } } } : {}),
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
    return this.matchesCategory(item, query.category);
  }

  private matchesCategory(item: ReturnType<typeof toLogisticsCenterItem>, category: LogisticsCenterCategory): boolean {
    if (category === "ALL") return true;
    if (category === "INTRARI_ASTAZI") return isToday(new Date(item.createdAt));
    if (category === "DE_VERIFICAT") return item.workflow.status === "COMPLETED" && item.logistics.status !== "READY_FOR_PACKING";
    if (category === "IN_PRODUCTIE") return item.logistics.status === "IN_PRODUCTION";
    if (category === "NEASIGNATE") return item.workflow.status === "ACTIVE" && item.workflow.assignedUserName === null;
    if (category === "BLOCARE") return item.logistics.status === "BLOCKED";
    if (category === "URGENTE") return item.priority === "URGENT";
    if (category === "INTARZIATE") return item.dueState === "OVERDUE";
    if (category === "FINALIZATE_AZI") return item.workflow.completedAt !== null && isToday(new Date(item.workflow.completedAt));
    if (category === "DE_AMBALAT") return item.logistics.status === "READY_FOR_PACKING";
    if (category === "IN_AMBALARE") return item.logistics.status === "PACKING";
    if (category === "GATA_DE_LIVRARE") return item.logistics.status === "READY_FOR_DELIVERY";
    return item.billing.documentId === null;
  }

  private assertVersion(record: { readonly version: number }, version: number): void {
    if (record.version !== version) {
      throw new ConflictException("Datele au fost modificate. Reîncarcă înainte de acțiune.");
    }
  }

  private async ensurePermission(userId: string, permission: "logistics.update_location" | "logistics.block_work" | "logistics.unblock_work" | "logistics.prepare_work" | "logistics.manage_groups"): Promise<void> {
    const result = await this.authorizationService.hasPermission({ permission, requiredScope: "ALL", userId });
    if (!result.allowed) {
      throw new ForbiddenException("Nu ai permisiunea necesară pentru această acțiune logistică.");
    }
  }

  private async createActionContext(userId: string): Promise<ActionContext> {
    const [canBlock, canManageGroups, canPrepare, canUnblock, canUpdateLocation] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "logistics.block_work", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.manage_groups", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.prepare_work", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.unblock_work", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "logistics.update_location", requiredScope: "ALL", userId }),
    ]);

    return {
      canBlock: canBlock.allowed,
      canManageGroups: canManageGroups.allowed,
      canPrepare: canPrepare.allowed,
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

  private async recordAudit(tx: LogisticsTx, context: ActorContext, action: string, resourceId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId,
      resourceType: action.includes("group") ? LOGISTICS_RESOURCE_TYPES.deliveryPreparationGroup : LOGISTICS_RESOURCE_TYPES.workLogistics,
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

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function canAddWorkToPreparationGroup(input: {
  readonly groupClinicId: string;
  readonly groupStatus: DeliveryPreparationGroupStatus;
  readonly hasActiveGroup: boolean;
  readonly workClinicId: string;
  readonly workLogisticsStatus: WorkLogisticsStatus;
}): boolean {
  return input.groupStatus === DeliveryPreparationGroupStatus.DRAFT
    && input.groupClinicId === input.workClinicId
    && !input.hasActiveGroup
    && input.workLogisticsStatus === WorkLogisticsStatus.READY_FOR_DELIVERY;
}
