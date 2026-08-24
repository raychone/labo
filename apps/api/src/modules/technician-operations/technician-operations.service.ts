import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { TECHNICIAN_MANEUVER_UNIT_LABELS_RO } from "@dental-lab/shared";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { TECHNICIAN_OPERATION_AUDIT_ACTIONS, TECHNICIAN_OPERATION_RESOURCE_TYPES } from "./technician-operations.constants.js";
import type {
  ListTechnicianOperationsQueryDto,
  CreateTechnicianPaymentDto,
  ListTechnicianRatesQueryDto,
  PerformTechnicianOperationDto,
  RemovePerformedTechnicianOperationDto,
  SetTechnicianRateDto,
  TechnicianEarningsQueryDto,
  TechnicianOperationMutationDto,
} from "./dto/technician-operations.dto.js";
import {
  performedTechnicianOperationInclude,
  technicianEarningsInclude,
  technicianOperationRateInclude,
  type PaginatedTechnicianOperationsView,
  type PerformedTechnicianOperationView,
  type TechnicianEarningsSummaryView,
  type TechnicianOperationDetailView,
  type TechnicianOperationOptionView,
  type TechnicianRateResolutionView,
  type TechnicianRateView,
  type TechnicianPaymentView,
  toPerformedTechnicianOperationView,
  toTechnicianEarningsSummaryView,
  toTechnicianOperationDetailView,
  toTechnicianOperationOptionView,
  toTechnicianOperationSummaryView,
  toTechnicianRateResolutionView,
  toTechnicianRateView,
} from "./technician-operations.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;
type PerformedOperationTx = Pick<
  Prisma.TransactionClient,
  "auditLog" | "technicianOperation" | "technicianOperationRate" | "technicianPerformedOperation" | "workOrder"
>;

@Injectable()
export class TechnicianOperationsService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async listOperations(query: ListTechnicianOperationsQueryDto): Promise<PaginatedTechnicianOperationsView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const where: Prisma.TechnicianOperationWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, operations] = await this.prisma.$transaction([
      this.prisma.technicianOperation.count({ where }),
      this.prisma.technicianOperation.findMany({
        orderBy: query.sortBy === "name" || query.sortBy === "code" ? { [query.sortBy]: query.sortDirection } : [{ sortOrder: "asc" }, { [query.sortBy]: query.sortDirection }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: operations.map(toTechnicianOperationSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async listOperationOptions(): Promise<readonly TechnicianOperationOptionView[]> {
    const operations = await this.prisma.technicianOperation.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      where: { isActive: true },
    });

    return operations.map(toTechnicianOperationOptionView);
  }

  public async getOperation(operationId: string): Promise<TechnicianOperationDetailView> {
    return toTechnicianOperationDetailView(await this.findOperationOrThrow(operationId));
  }

  public async createOperation(context: ActorContext, dto: TechnicianOperationMutationDto): Promise<TechnicianOperationDetailView> {
    if (!dto.pricingUnit) {
      throw new BadRequestException("Alege unitatea de tarifare a manoperei.");
    }
    const operation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.technicianOperation.create({
        data: {
          code: normalizeCode(dto.code),
          createdByUserId: context.actorUserId,
          description: dto.description ?? null,
          name: normalizeText(dto.name),
          pricingUnit: dto.pricingUnit ?? null,
          sortOrder: dto.sortOrder ?? 0,
          updatedByUserId: context.actorUserId,
        },
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.operationCreated,
        actorUserId: context.actorUserId,
        metadata: { code: created.code, name: created.name },
        requestMetadata: context.requestMetadata,
        resourceId: created.id,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.operation,
      });

      return created;
    });

    return toTechnicianOperationDetailView(operation);
  }

  public async updateOperation(context: ActorContext, operationId: string, dto: TechnicianOperationMutationDto): Promise<TechnicianOperationDetailView> {
    const before = await this.findOperationOrThrow(operationId);
    if (!before.isActive) {
      throw new BadRequestException("Archived technician operations must be restored before editing.");
    }

    const nextPricingUnit = dto.pricingUnit === undefined ? before.pricingUnit : dto.pricingUnit;
    const pricingUnitChanged = nextPricingUnit !== before.pricingUnit;
    if (pricingUnitChanged && before.pricingUnit !== null && !dto.confirmPricingUnitChange) {
      throw new BadRequestException("Confirmă explicit schimbarea unității de tarifare; tarifele active vor fi închise și trebuie configurate din nou.");
    }
    const operation = await this.prisma.$transaction(async (tx) => {
      if (pricingUnitChanged) {
        await tx.technicianOperationRate.updateMany({
          data: { validUntil: new Date() },
          where: { operationId, validUntil: null },
        });
      }
      const updated = await tx.technicianOperation.update({
        data: {
          code: normalizeCode(dto.code),
          description: dto.description ?? null,
          name: normalizeText(dto.name),
          ...(dto.pricingUnit === undefined ? {} : { pricingUnit: dto.pricingUnit }),
          ...(dto.sortOrder === undefined ? {} : { sortOrder: dto.sortOrder }),
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: { id: operationId },
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.operationUpdated,
        actorUserId: context.actorUserId,
        metadata: { changedFields: getChangedOperationFields(before, updated), code: updated.code },
        requestMetadata: context.requestMetadata,
        resourceId: operationId,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.operation,
      });

      if (pricingUnitChanged) {
        await this.recordAudit(tx, {
          action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.operationUnitChanged,
          actorUserId: context.actorUserId,
          metadata: {
            from: before.pricingUnit ? TECHNICIAN_MANEUVER_UNIT_LABELS_RO[before.pricingUnit as keyof typeof TECHNICIAN_MANEUVER_UNIT_LABELS_RO] : "Neclasificată",
            name: updated.name,
            to: updated.pricingUnit ? TECHNICIAN_MANEUVER_UNIT_LABELS_RO[updated.pricingUnit as keyof typeof TECHNICIAN_MANEUVER_UNIT_LABELS_RO] : "Neclasificată",
          },
          requestMetadata: context.requestMetadata,
          resourceId: operationId,
          resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.operation,
        });
      }

      return updated;
    });

    return toTechnicianOperationDetailView(operation);
  }

  public async archiveOperation(context: ActorContext, operationId: string): Promise<TechnicianOperationDetailView> {
    const before = await this.findOperationOrThrow(operationId);
    if (!before.isActive) {
      return toTechnicianOperationDetailView(before);
    }

    const operation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.technicianOperation.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          isActive: false,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: { id: operationId },
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.operationArchived,
        actorUserId: context.actorUserId,
        metadata: { code: before.code },
        requestMetadata: context.requestMetadata,
        resourceId: operationId,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.operation,
      });

      return updated;
    });

    return toTechnicianOperationDetailView(operation);
  }

  public async restoreOperation(context: ActorContext, operationId: string): Promise<TechnicianOperationDetailView> {
    const before = await this.findOperationOrThrow(operationId);
    if (before.isActive) {
      return toTechnicianOperationDetailView(before);
    }

    const operation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.technicianOperation.update({
        data: {
          archivedAt: null,
          archivedByUserId: null,
          isActive: true,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: { id: operationId },
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.operationRestored,
        actorUserId: context.actorUserId,
        metadata: { code: before.code },
        requestMetadata: context.requestMetadata,
        resourceId: operationId,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.operation,
      });

      return updated;
    });

    return toTechnicianOperationDetailView(operation);
  }

  public async listRates(query: ListTechnicianRatesQueryDto): Promise<readonly TechnicianRateView[]> {
    const asOf = query.asOf ? parseDate(query.asOf) : undefined;
    const rates = await this.prisma.technicianOperationRate.findMany({
      include: technicianOperationRateInclude,
      orderBy: [{ technician: { displayName: "asc" } }, { operation: { name: "asc" } }, { effectiveFrom: "desc" }],
      where: {
        ...(query.technicianId ? { technicianId: query.technicianId } : {}),
        ...(query.operationId ? { operationId: query.operationId } : {}),
        ...(asOf
          ? {
              effectiveFrom: { lte: asOf },
              OR: [{ validUntil: null }, { validUntil: { gt: asOf } }],
            }
          : { validUntil: null }),
      },
    });

    return rates.map(toTechnicianRateView);
  }

  public async setRate(context: ActorContext, dto: SetTechnicianRateDto): Promise<TechnicianRateView> {
    const effectiveFrom = dto.effectiveFrom ? parseDate(dto.effectiveFrom) : new Date();
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException("Invalid effectiveFrom value.");
    }

    const rate = await this.prisma.$transaction(async (tx) => {
      await this.validateTechnician(tx, dto.technicianId);
      await this.validateActiveOperation(tx, dto.operationId);

      const openRate = await tx.technicianOperationRate.findFirst({
        orderBy: { effectiveFrom: "desc" },
        where: {
          operationId: dto.operationId,
          technicianId: dto.technicianId,
          validUntil: null,
        },
      });

      if (openRate && openRate.effectiveFrom >= effectiveFrom) {
        throw new BadRequestException("A later or equal open technician rate already exists for this operation.");
      }

      if (openRate) {
        await tx.technicianOperationRate.update({
          data: { validUntil: effectiveFrom },
          where: { id: openRate.id },
        });
      }

      const created = await tx.technicianOperationRate.create({
        data: {
          createdByUserId: context.actorUserId,
          currency: dto.currency ?? "RON",
          effectiveFrom,
          operationId: dto.operationId,
          rateMinor: dto.rateMinor,
          technicianId: dto.technicianId,
        },
        include: technicianOperationRateInclude,
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.rateSet,
        actorUserId: context.actorUserId,
        metadata: {
          currency: created.currency,
          effectiveFrom: created.effectiveFrom.toISOString(),
          operationId: created.operationId,
          previousRateId: openRate?.id ?? null,
          rateMinor: created.rateMinor,
          technicianId: created.technicianId,
        },
        requestMetadata: context.requestMetadata,
        resourceId: created.id,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.rate,
      });

      return created;
    });

    return toTechnicianRateView(rate);
  }

  public async resolveRate(technicianId: string, operationId: string, asOf = new Date()): Promise<TechnicianRateResolutionView> {
    const rate = await this.prisma.technicianOperationRate.findFirst({
      include: technicianOperationRateInclude,
      orderBy: { effectiveFrom: "desc" },
      where: {
        effectiveFrom: { lte: asOf },
        operationId,
        technicianId,
        OR: [{ validUntil: null }, { validUntil: { gt: asOf } }],
      },
    });

    if (!rate) {
      throw new NotFoundException("No technician rate is configured for this operation at the requested time.");
    }

    return toTechnicianRateResolutionView(rate);
  }

  public async listPerformedOperations(context: ActorContext, workOrderId: string): Promise<readonly PerformedTechnicianOperationView[]> {
    await this.ensureTechnicianOwnsWork(this.prisma, context.actorUserId, workOrderId);

    const performedOperations = await this.prisma.technicianPerformedOperation.findMany({
      include: performedTechnicianOperationInclude,
      orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
      where: {
        removedAt: null,
        workOrderId,
      },
    });

    return performedOperations.map(toPerformedTechnicianOperationView);
  }

  public async listOwnEarnings(context: ActorContext, query: TechnicianEarningsQueryDto): Promise<TechnicianEarningsSummaryView> {
    return this.listEarningsForTechnician({ ...query, technicianId: context.actorUserId });
  }

  public async listManagerEarnings(query: TechnicianEarningsQueryDto): Promise<TechnicianEarningsSummaryView> {
    return this.listEarningsForTechnician(query);
  }

  public async createPayment(context: ActorContext, dto: CreateTechnicianPaymentDto): Promise<TechnicianPaymentView> {
    const paidAt = dto.paidAt ? parseDate(dto.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) throw new BadRequestException("Invalid payment date.");
    const payment = await this.prisma.$transaction(async (tx) => {
      await this.validateTechnician(tx, dto.technicianId);
      const [earned, alreadyPaid] = await Promise.all([
        tx.technicianPerformedOperation.aggregate({
          _sum: { earningMinor: true },
          where: {
            performedAt: { lte: paidAt },
            removedAt: null,
            technicianId: dto.technicianId,
          },
        }),
        tx.technicianPayment.aggregate({
          _sum: { amountMinor: true },
          where: { technicianId: dto.technicianId },
        }),
      ]);
      const earnedMinor = earned._sum.earningMinor ?? 0;
      const alreadyPaidMinor = alreadyPaid._sum.amountMinor ?? 0;
      if (alreadyPaidMinor + dto.amountMinor > earnedMinor) {
        throw new BadRequestException("Plata nu poate depăși câștigurile realizate până la data plății.");
      }

      const created = await tx.technicianPayment.create({
        data: { amountMinor: dto.amountMinor, currency: dto.currency ?? "RON", createdByUserId: context.actorUserId, notes: dto.notes ?? null, paidAt, technicianId: dto.technicianId },
      });
      await this.recordAudit(tx, { action: "technician.payment.created", actorUserId: context.actorUserId, metadata: { amountMinor: created.amountMinor, technicianId: created.technicianId }, requestMetadata: context.requestMetadata, resourceId: created.id, resourceType: "TECHNICIAN_PAYMENT" });
      return created;
    });
    return toPaymentView(payment);
  }

  private async listEarningsForTechnician(query: TechnicianEarningsQueryDto): Promise<TechnicianEarningsSummaryView> {
    const period = query.period ?? "DAY";
    const { periodEnd, periodStart } = getEarningsPeriodBounds(period, query);
    const technicianId = query.technicianId?.trim() || undefined;

    const [technician, performedOperations, payments] = await Promise.all([
      technicianId
        ? this.prisma.user.findUnique({
            select: { displayName: true, id: true },
            where: { id: technicianId },
          })
        : Promise.resolve(null),
      this.prisma.technicianPerformedOperation.findMany({
        include: technicianEarningsInclude,
        orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
        where: {
          performedAt: {
            gte: periodStart,
            lt: periodEnd,
          },
          removedAt: null,
          ...(technicianId ? { technicianId } : {}),
        },
      }),
      this.prisma.technicianPayment
        ? this.prisma.technicianPayment.findMany({
            orderBy: { paidAt: "desc" },
            where: {
              paidAt: { gte: periodStart, lt: periodEnd },
              ...(technicianId ? { technicianId } : {}),
            },
          })
        : Promise.resolve([]),
    ]);

    return toTechnicianEarningsSummaryView({
      generatedAt: new Date(),
      performedOperations,
      payments,
      period,
      periodEnd,
      periodStart,
      technician,
    });
  }

  public async performOperation(context: ActorContext, dto: PerformTechnicianOperationDto): Promise<PerformedTechnicianOperationView> {
    const now = new Date();

    const performedOperation = await this.prisma.$transaction(async (tx) => {
      const technicianId = await this.ensureTechnicianOwnsWork(tx, context.actorUserId, dto.workOrderId);
      const operation = await tx.technicianOperation.findFirst({
        select: { code: true, id: true, name: true },
        where: { id: dto.operationId, isActive: true },
      });
      if (!operation) {
        throw new BadRequestException("Technician operation not found or inactive.");
      }

      const existing = await tx.technicianPerformedOperation.findFirst({
        include: performedTechnicianOperationInclude,
        where: {
          operationId: dto.operationId,
          removedAt: null,
          technicianId,
          workOrderId: dto.workOrderId,
        },
      });
      if (existing) {
        throw new ConflictException("Technician operation is already selected for this work.");
      }

      const rate = await this.findApplicableRateOrThrow(tx, technicianId, dto.operationId, now);
      const created = await tx.technicianPerformedOperation.create({
        data: {
          createdByUserId: context.actorUserId,
          currency: rate.currency,
          earningMinor: rate.rateMinor,
          operationId: dto.operationId,
          performedAt: now,
          rateId: rate.id,
          technicianId,
          workOrderId: dto.workOrderId,
        },
        include: performedTechnicianOperationInclude,
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.performedOperationCreated,
        actorUserId: context.actorUserId,
        metadata: {
          currency: created.currency,
          earningMinor: created.earningMinor,
          operationCode: operation.code,
          operationId: created.operationId,
          rateId: created.rateId,
          technicianId: created.technicianId,
          workOrderId: created.workOrderId,
        },
        requestMetadata: context.requestMetadata,
        resourceId: created.id,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.performedOperation,
      });

      return created;
    });

    return toPerformedTechnicianOperationView(performedOperation);
  }

  public async removePerformedOperation(context: ActorContext, performedOperationId: string, dto: RemovePerformedTechnicianOperationDto): Promise<PerformedTechnicianOperationView> {
    const now = new Date();
    const performedOperation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.technicianPerformedOperation.findUnique({
        include: performedTechnicianOperationInclude,
        where: { id: performedOperationId },
      });
      if (!existing) {
        throw new NotFoundException("Performed technician operation not found.");
      }
      if (existing.removedAt) {
        return existing;
      }

      await this.ensureTechnicianOwnsWork(tx, context.actorUserId, existing.workOrderId);

      const updated = await tx.technicianPerformedOperation.update({
        data: {
          removalReason: dto.reason ?? null,
          removedAt: now,
          removedByUserId: context.actorUserId,
        },
        include: performedTechnicianOperationInclude,
        where: { id: performedOperationId },
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.performedOperationRemoved,
        actorUserId: context.actorUserId,
        metadata: {
          currency: existing.currency,
          earningMinor: existing.earningMinor,
          operationId: existing.operationId,
          rateId: existing.rateId,
          reason: dto.reason ?? null,
          technicianId: existing.technicianId,
          workOrderId: existing.workOrderId,
        },
        requestMetadata: context.requestMetadata,
        resourceId: existing.id,
        resourceType: TECHNICIAN_OPERATION_RESOURCE_TYPES.performedOperation,
      });

      return updated;
    });

    return toPerformedTechnicianOperationView(performedOperation);
  }

  private async findOperationOrThrow(operationId: string): Promise<Prisma.TechnicianOperationGetPayload<object>> {
    const operation = await this.prisma.technicianOperation.findUnique({ where: { id: operationId } });
    if (!operation) {
      throw new NotFoundException("Technician operation not found.");
    }
    return operation;
  }

  private async validateTechnician(tx: Prisma.TransactionClient, technicianId: string): Promise<void> {
    const technician = await tx.user.findFirst({
      select: { id: true },
      where: {
        id: technicianId,
        isActive: true,
        roles: {
          some: {
            role: {
              key: "TEHNICIAN",
            },
          },
        },
      },
    });

    if (!technician) {
      throw new BadRequestException("Technician not found or inactive.");
    }
  }

  private async validateActiveOperation(tx: Prisma.TransactionClient, operationId: string): Promise<void> {
    const operation = await tx.technicianOperation.findFirst({
      select: { id: true },
      where: { id: operationId, isActive: true },
    });

    if (!operation) {
      throw new BadRequestException("Technician operation not found or inactive.");
    }
  }

  private async ensureTechnicianOwnsWork(client: Pick<Prisma.TransactionClient, "workOrder"> | Pick<PrismaService, "workOrder">, actorUserId: string, workOrderId: string): Promise<string> {
    const workOrder = await client.workOrder.findUnique({
      select: {
        assignedTechnicianId: true,
        claimedByUserId: true,
        id: true,
      },
      where: { id: workOrderId },
    });

    if (!workOrder) {
      throw new NotFoundException("Work order not found.");
    }

    const technicianId = workOrder.assignedTechnicianId ?? workOrder.claimedByUserId;
    if (!technicianId || technicianId !== actorUserId) {
      throw new ForbiddenException("Only the assigned technician can manage performed operations for this work.");
    }

    return technicianId;
  }

  private async findApplicableRateOrThrow(tx: PerformedOperationTx, technicianId: string, operationId: string, asOf: Date): Promise<Prisma.TechnicianOperationRateGetPayload<object>> {
    const rate = await tx.technicianOperationRate.findFirst({
      orderBy: { effectiveFrom: "desc" },
      where: {
        effectiveFrom: { lte: asOf },
        operationId,
        technicianId,
        OR: [{ validUntil: null }, { validUntil: { gt: asOf } }],
      },
    });

    if (!rate) {
      throw new NotFoundException("No technician rate is configured for this operation at the requested time.");
    }

    return rate;
  }

  private async recordAudit(
    client: AuditClient,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly metadata?: Prisma.InputJsonValue;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
      readonly resourceType: string;
    },
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      actorUserId: input.actorUserId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    };

    if (input.metadata !== undefined) {
      data.metadata = input.metadata;
    }

    if (input.requestMetadata.ipAddress) {
      data.ipAddress = input.requestMetadata.ipAddress;
    }

    if (input.requestMetadata.userAgent) {
      data.userAgent = input.requestMetadata.userAgent;
    }

    await client.auditLog.create({ data });
  }
}

function toPaymentView(payment: Prisma.TechnicianPaymentGetPayload<object>): TechnicianPaymentView {
  return { amountMinor: payment.amountMinor, createdAt: payment.createdAt.toISOString(), createdByUserId: payment.createdByUserId, currency: payment.currency, id: payment.id, notes: payment.notes, paidAt: payment.paidAt.toISOString(), technicianId: payment.technicianId };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCode(value: string): string {
  return normalizeText(value).toUpperCase();
}

function parseDate(value: string): Date {
  return new Date(value);
}

function getEarningsPeriodBounds(
  period: "DAY" | "MONTH" | "YEAR",
  query: Pick<TechnicianEarningsQueryDto, "date" | "month">,
): { readonly periodEnd: Date; readonly periodStart: Date } {
  if (period === "YEAR") {
    const year = Number((query.month ?? new Date().toISOString().slice(0, 4)).slice(0, 4));
    const periodStart = new Date(Date.UTC(year, 0, 1));
    const periodEnd = new Date(Date.UTC(year + 1, 0, 1));
    if (Number.isNaN(periodStart.getTime())) throw new BadRequestException("Invalid earnings year.");
    return { periodEnd, periodStart };
  }
  if (period === "MONTH") {
    const month = query.month ?? new Date().toISOString().slice(0, 7);
    const [year, monthNumber] = month.split("-").map(Number);
    const periodStart = new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1));
    const periodEnd = new Date(Date.UTC(year ?? 0, monthNumber ?? 1, 1));
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new BadRequestException("Invalid earnings month.");
    }
    return { periodEnd, periodStart };
  }

  const date = query.date ?? new Date().toISOString().slice(0, 10);
  const periodStart = new Date(`${date}T00:00:00.000Z`);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    throw new BadRequestException("Invalid earnings date.");
  }
  return { periodEnd, periodStart };
}

function getChangedOperationFields(
  before: Pick<Prisma.TechnicianOperationGetPayload<object>, "code" | "description" | "name">,
  after: Pick<Prisma.TechnicianOperationGetPayload<object>, "code" | "description" | "name">,
): readonly string[] {
  return (["code", "description", "name"] as const).filter((field) => before[field] !== after[field]);
}
