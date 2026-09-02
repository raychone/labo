import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { calculateTechnicianManeuverElementQuantity, calculateTechnicianManeuverTotalMinor, getCanonicalWorkOrderCompositionTeeth, isAdultFdiTooth, type AdultFdiTooth } from "@dental-lab/shared";

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
  "auditLog" | "technicianOperation" | "technicianOperationRate" | "technicianPerformedOperation" | "technicianPerformedOperationTooth" | "workOrder" | "workOrderItem"
>;

type WorkTypeFamilySource = { readonly name?: string | null; readonly probeFamily?: string | null; readonly symbol?: string | null } | null;

function inferProbeFamily(workType: WorkTypeFamilySource): string | null {
  if (!workType) return null;
  if (workType.probeFamily) return workType.probeFamily;
  const identity = `${workType.symbol ?? ""} ${workType.name ?? ""}`.toLocaleLowerCase("ro-RO");
  if (identity.includes("tf") || identity.includes("sf") || identity.includes("metalo") || identity.includes("metaloceramic")) return "MC";
  if (identity.includes("zrp") || identity.includes("zirconia placat")) return "ZRP";
  if (identity === "zr" || identity.includes(" zr ") || identity.includes("zircon")) return "ZR";
  if (identity.includes("protez") || identity.includes("lingură individuală")) return "PRO";
  return null;
}

function getAllowedOperationCategories(workTypes: readonly WorkTypeFamilySource[]): readonly string[] | null {
  const families = [...new Set(workTypes.map(inferProbeFamily).filter((family): family is string => family !== null))];
  // A legacy/custom work type may not have a probe family. Keep the catalog
  // usable in that case; known families are filtered strictly below.
  if (families.length === 0) return null;
  const categories = new Set<string>();
  for (const probeFamily of families) {
    if (probeFamily === "MC") categories.add("Coroană ceramică");
    if (probeFamily === "ZR" || probeFamily === "ZRP") categories.add("Coroană zirconiu");
    if (probeFamily === "PRO") categories.add("Altele");
  }
  return [...categories];
}

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

  public async listOperationOptions(technicianId?: string, workOrderId?: string): Promise<readonly TechnicianOperationOptionView[]> {
    const allowedCategories = await this.getAllowedOperationCategories(workOrderId);
    const operationWhere: Prisma.TechnicianOperationWhereInput = { isActive: true };
    if (allowedCategories !== null) operationWhere.category = { in: [...allowedCategories] };
    const operations = await this.prisma.technicianOperation.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      where: operationWhere,
    });

    if (!technicianId) return operations.map(toTechnicianOperationOptionView);
    const now = new Date();
    return Promise.all(operations.map(async (operation) => {
      const rate = await this.prisma.technicianOperationRate.findFirst({
        orderBy: { effectiveFrom: "desc" },
        where: { effectiveFrom: { lte: now }, operationId: operation.id, technicianId, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
      });
      return { ...toTechnicianOperationOptionView(operation), currency: rate?.currency ?? null, rateMinor: rate?.rateMinor ?? null };
    }));
  }

  public async getOperation(operationId: string): Promise<TechnicianOperationDetailView> {
    return toTechnicianOperationDetailView(await this.findOperationOrThrow(operationId));
  }

  public async createOperation(context: ActorContext, dto: TechnicianOperationMutationDto): Promise<TechnicianOperationDetailView> {
    const operation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.technicianOperation.create({
        data: {
          category: normalizeText(dto.category),
          code: normalizeCode(dto.code),
          createdByUserId: context.actorUserId,
          description: dto.description ?? null,
          name: normalizeText(dto.name),
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

    const operation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.technicianOperation.update({
        data: {
          category: normalizeText(dto.category),
          code: normalizeCode(dto.code),
          description: dto.description ?? null,
          name: normalizeText(dto.name),
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

      let created: PrismaTypes.TechnicianOperationRateGetPayload<{ include: typeof technicianOperationRateInclude }>;
      try {
        created = await tx.technicianOperationRate.create({
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
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Există deja o rată deschisă pentru acest tehnician și această manoperă.");
        }
        throw error;
      }

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
    const currency = dto.currency ?? "RON";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const payment = await this.prisma.$transaction(async (tx) => {
          await this.validateTechnician(tx, dto.technicianId);
          const [earned, alreadyPaid] = await Promise.all([
            tx.technicianPerformedOperation.aggregate({
              _sum: { earningMinor: true },
              where: { currency, performedAt: { lte: paidAt }, removedAt: null, technicianId: dto.technicianId },
            }),
            tx.technicianPayment.aggregate({
              _sum: { amountMinor: true },
              where: { currency, paidAt: { lte: paidAt }, technicianId: dto.technicianId },
            }),
          ]);
          const earnedMinor = earned._sum.earningMinor ?? 0;
          const alreadyPaidMinor = alreadyPaid._sum.amountMinor ?? 0;
          const availableMinor = earnedMinor - alreadyPaidMinor;
          if (availableMinor <= 0) {
            throw new BadRequestException("Tehnicianul nu are sold pozitiv disponibil pentru plată.");
          }
          if (dto.amountMinor > availableMinor) {
            throw new BadRequestException("Plata nu poate depăși câștigurile realizate până la data plății.");
          }

          const performedFindMany = (tx.technicianPerformedOperation as unknown as { findMany?: (args: unknown) => Promise<readonly { earningMinor: number; performedAt: Date }[]> }).findMany;
          const paymentFindMany = (tx.technicianPayment as unknown as { findMany?: (args: unknown) => Promise<readonly { amountMinor: number; paidAt: Date }[]> }).findMany;
          if (performedFindMany && paymentFindMany) {
            const [timelineEarnings, timelinePayments] = await Promise.all([
              performedFindMany({ where: { currency, removedAt: null, technicianId: dto.technicianId }, select: { earningMinor: true, performedAt: true } }),
              paymentFindMany({ where: { currency, technicianId: dto.technicianId }, select: { amountMinor: true, paidAt: true } }),
            ]);
            const events = [
              ...timelineEarnings.map((entry) => ({ amount: entry.earningMinor, at: entry.performedAt, kind: "earning" as const })),
              ...timelinePayments.map((entry) => ({ amount: entry.amountMinor, at: entry.paidAt, kind: "payment" as const })),
              { amount: dto.amountMinor, at: paidAt, kind: "payment" as const },
            ].sort((left, right) => left.at.getTime() - right.at.getTime() || (left.kind === "earning" ? -1 : 1));
            let earnedToDate = 0;
            let paidToDate = 0;
            for (const event of events) {
              if (event.kind === "earning") earnedToDate += event.amount;
              else {
                paidToDate += event.amount;
                if (paidToDate > earnedToDate) {
                  throw new BadRequestException("Plata ar face soldul istoric imposibil la data plății.");
                }
              }
            }
          }

          const created = await tx.technicianPayment.create({
            data: { amountMinor: dto.amountMinor, currency, createdByUserId: context.actorUserId, notes: dto.notes ?? null, paidAt, technicianId: dto.technicianId },
          });
          await this.recordAudit(tx, {
            action: "technician.payment.created",
            actorUserId: context.actorUserId,
            metadata: { amountMinor: created.amountMinor, currency: created.currency, paidAt: created.paidAt.toISOString(), technicianId: created.technicianId },
            requestMetadata: context.requestMetadata,
            resourceId: created.id,
            resourceType: "TECHNICIAN_PAYMENT",
          });
          return created;
        }, { isolationLevel: "Serializable" });
        return toPaymentView(payment);
      } catch (error) {
        if (isSerializationConflict(error) && attempt < 2) continue;
        if (isSerializationConflict(error)) throw new ConflictException("Plata nu a putut fi înregistrată din cauza unei alte plăți simultane. Reîncearcă.");
        throw error;
      }
    }
    throw new ConflictException("Plata nu a putut fi înregistrată. Reîncearcă.");
  }

  private async listEarningsForTechnician(query: TechnicianEarningsQueryDto): Promise<TechnicianEarningsSummaryView> {
    const period = query.period ?? "DAY";
    const { periodEnd, periodStart } = getEarningsPeriodBounds(period, query);
    const technicianId = query.technicianId?.trim() || undefined;

    const [technician, performedOperations, payments, cumulativePerformedOperations, cumulativePayments] = await Promise.all([
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
          ...(query.includeRemoved ? {} : { removedAt: null }),
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
      this.prisma.technicianPerformedOperation.findMany({
        include: technicianEarningsInclude,
        orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
        where: { removedAt: null, ...(technicianId ? { technicianId } : {}) },
      }),
      this.prisma.technicianPayment
        ? this.prisma.technicianPayment.findMany({
            orderBy: { paidAt: "asc" },
            where: { ...(technicianId ? { technicianId } : {}) },
          })
        : Promise.resolve([]),
    ]);

    return toTechnicianEarningsSummaryView({
      generatedAt: new Date(),
      performedOperations,
      payments,
      cumulativePerformedOperations,
      cumulativePayments,
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
      const workOrder = await tx.workOrder.findUnique({ select: { activeProbeCycleId: true, status: true, workType: { select: { name: true, probeFamily: true, symbol: true } }, items: { select: { workType: { select: { name: true, probeFamily: true, symbol: true } } }, where: { archivedAt: null } } }, where: { id: dto.workOrderId } });
      if (!workOrder || workOrder.status === "FINALIZATA") {
        throw new BadRequestException("Manopera nu poate fi adăugată pentru această stare a lucrării.");
      }
      const operation = await tx.technicianOperation.findFirst({
        select: { category: true, code: true, id: true, name: true },
        where: { id: dto.operationId, isActive: true },
      });
      if (!operation) {
        throw new BadRequestException("Technician operation not found or inactive.");
      }
      const allowedCategories = getAllowedOperationCategories([
        ...(workOrder.items ?? []).map((item) => item.workType),
        workOrder.workType,
      ]);
      if (allowedCategories !== null && !allowedCategories.includes(operation.category)) {
        throw new BadRequestException("Manopera nu este disponibilă pentru tipul acestei lucrări.");
      }

      const selectedTeeth = [...new Set(dto.selectedTeeth)];
      if (selectedTeeth.some((tooth) => !isAdultFdiTooth(tooth))) {
        throw new BadRequestException("Selectează doar dinți adulți FDI valizi.");
      }
      const validSelectedTeeth = selectedTeeth as AdultFdiTooth[];
      const items = await tx.workOrderItem.findMany({
        select: { archivedAt: true, scope: true, teeth: { select: { fdiTooth: true } } },
        where: { archivedAt: null, workOrderId: dto.workOrderId },
      });
      const allowedTeeth = new Set(getCanonicalWorkOrderCompositionTeeth(items.map((item) => ({
        archivedAt: item.archivedAt,
        scope: item.scope,
        teeth: item.teeth.map((tooth) => tooth.fdiTooth),
      }))));
      const isCaseLevel = allowedTeeth.size === 0 && items.some((item) => item.scope === "CASE");
      if (allowedTeeth.size === 0 && !isCaseLevel) {
        throw new BadRequestException("Lucrarea nu are dinți anatomici disponibili pentru această manoperă.");
      }
      if (!isCaseLevel && validSelectedTeeth.length === 0) {
        throw new BadRequestException("Selectează cel puțin un dinte adult FDI valid.");
      }
      const outsideComposition = validSelectedTeeth.filter((tooth) => !allowedTeeth.has(tooth));
      if (outsideComposition.length > 0) {
        throw new BadRequestException(`Dinții ${outsideComposition.join(", ")} nu fac parte din compoziția activă a lucrării.`);
      }
      const conflicts = validSelectedTeeth.length === 0 ? [] : await tx.technicianPerformedOperationTooth.findMany({
        select: { fdiTooth: true },
        where: { fdiTooth: { in: validSelectedTeeth }, operationId: dto.operationId, releasedAt: null, workOrderId: dto.workOrderId },
      });
      if (conflicts.length > 0) {
        const teeth = conflicts.map((conflict) => conflict.fdiTooth).sort((left, right) => left - right);
        const noun = teeth.length === 1 ? "dintele" : "dinții";
        throw new ConflictException(`Manopera „${operation.name}” este deja înregistrată pentru ${noun} ${teeth.join(", ")}.`);
      }

      const rate = await this.findApplicableRateOrThrow(tx, technicianId, dto.operationId, now);
      const quantity = isCaseLevel ? 1 : calculateTechnicianManeuverElementQuantity(validSelectedTeeth);
      const earningMinor = calculateTechnicianManeuverTotalMinor(quantity, rate.rateMinor);
      let created: PrismaTypes.TechnicianPerformedOperationGetPayload<{ include: typeof performedTechnicianOperationInclude }>;
      try {
        created = await tx.technicianPerformedOperation.create({
          data: {
            createdByUserId: context.actorUserId,
            currency: rate.currency,
            earningMinor,
            operationCodeSnapshot: operation.code,
            operationNameSnapshot: operation.name,
            notes: dto.notes ?? null,
            operationId: dto.operationId,
            performedAt: now,
            probeCycleId: workOrder.activeProbeCycleId,
            quantity,
            rateId: rate.id,
            rateMinorSnapshot: rate.rateMinor,
            technicianId,
            workOrderId: dto.workOrderId,
          },
          include: performedTechnicianOperationInclude,
        });
        if (validSelectedTeeth.length > 0) {
          await tx.technicianPerformedOperationTooth.createMany({
            data: validSelectedTeeth.map((fdiTooth) => ({ fdiTooth, operationId: dto.operationId, performedOperationId: created.id, workOrderId: dto.workOrderId })),
          });
        }
        created = await tx.technicianPerformedOperation.findUniqueOrThrow({
          include: performedTechnicianOperationInclude,
          where: { id: created.id },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException(`Manopera „${operation.name}” este deja înregistrată pentru unul dintre dinții selectați.`);
        }
        throw error;
      }

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.performedOperationCreated,
        actorUserId: context.actorUserId,
        metadata: {
          currency: created.currency,
          earningMinor: created.earningMinor,
          fdiTeeth: validSelectedTeeth,
          quantity,
          rateMinor: rate.rateMinor,
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
      if (existing.technicianId !== context.actorUserId) {
        throw new ForbiddenException("Poți elimina doar manopera înregistrată de tine.");
      }

      const updated = await tx.technicianPerformedOperation.update({
        data: {
          removalReason: dto.reason ?? null,
          removedAt: now,
          removedByUserId: context.actorUserId,
        },
        include: performedTechnicianOperationInclude,
        where: { id: performedOperationId },
      });
      await tx.technicianPerformedOperationTooth.updateMany({
        data: { releasedAt: now },
        where: { performedOperationId, releasedAt: null },
      });

      await this.recordAudit(tx, {
        action: TECHNICIAN_OPERATION_AUDIT_ACTIONS.performedOperationRemoved,
        actorUserId: context.actorUserId,
        metadata: {
          currency: existing.currency,
          earningMinor: existing.earningMinor,
          fdiTeeth: (existing.teeth ?? []).map((tooth) => tooth.fdiTooth),
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

  private async getAllowedOperationCategories(workOrderId?: string): Promise<readonly string[] | null> {
    if (!workOrderId) return null;
    const workOrder = await this.prisma.workOrder.findUnique({
      select: {
        items: { select: { workType: { select: { name: true, probeFamily: true, symbol: true } } }, where: { archivedAt: null } },
        workType: { select: { name: true, probeFamily: true, symbol: true } },
      },
      where: { id: workOrderId },
    });
    if (!workOrder) return [];
    return getAllowedOperationCategories([
      ...workOrder.items.map((item) => item.workType),
      workOrder.workType,
    ]);
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

function isSerializationConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
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
  before: Pick<Prisma.TechnicianOperationGetPayload<object>, "category" | "code" | "description" | "name">,
  after: Pick<Prisma.TechnicianOperationGetPayload<object>, "category" | "code" | "description" | "name">,
): readonly string[] {
  return (["category", "code", "description", "name"] as const).filter((field) => before[field] !== after[field]);
}
