import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { BusinessCalendarService } from "../deadlines/business-calendar.service.js";
import { DEADLINE_DEFAULT_TIMEZONE } from "../deadlines/deadline.constants.js";
import { DeadlineEngineService } from "../deadlines/deadline-engine.service.js";
import { PRICING_AUDIT_ACTIONS, PRICING_RESOURCE_TYPES } from "./pricing.constants.js";
import type {
  ExecutionTimeRuleDto,
  PriceCatalogItemDto,
  PricingAgreementDto,
  PricingAgreementRuleDto,
  PricingAgreementsQueryDto,
  PricingCatalogQueryDto,
  ResolvePreviewDto,
} from "./dto/pricing.dto.js";
import { PricingResolverService, applyPricingAdjustment } from "./pricing-resolver.service.js";
import {
  type PaginatedPricingAgreementsView,
  type PaginatedPricingCatalogView,
  type PriceCatalogItemDetailView,
  type PricingAgreementDetailView,
  priceCatalogItemInclude,
  pricingAgreementInclude,
  toPriceCatalogItemDetailView,
  toPriceCatalogItemSummaryView,
  toPricingAgreementDetailView,
  toPricingAgreementSummaryView,
} from "./pricing.view.js";

interface LegalEntityContextInput {
  readonly code: string;
  readonly id: string;
}

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

@Injectable()
export class PricingService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BusinessCalendarService) private readonly businessCalendar: BusinessCalendarService,
    @Inject(DeadlineEngineService) private readonly deadlineEngine: DeadlineEngineService,
    @Inject(PricingResolverService) private readonly pricingResolver: PricingResolverService,
  ) {}

  public async listCatalog(legalEntity: LegalEntityContextInput, query: PricingCatalogQueryDto): Promise<PaginatedPricingCatalogView> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = this.toCatalogWhere(legalEntity.id, query);
    const [total, items] = await this.prisma.$transaction([
      this.prisma.priceCatalogItem.count({ where }),
      this.prisma.priceCatalogItem.findMany({
        include: priceCatalogItemInclude,
        orderBy: [
          { [query.sortBy ?? "sortOrder"]: query.sortDirection ?? "asc" },
          { displayName: "asc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: items.map(toPriceCatalogItemSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async getCatalogItem(legalEntity: LegalEntityContextInput, catalogItemId: string): Promise<PriceCatalogItemDetailView> {
    return toPriceCatalogItemDetailView(await this.findCatalogItemOrThrow(legalEntity.id, catalogItemId));
  }

  public async createCatalogItem(context: ActorContext, legalEntity: LegalEntityContextInput, dto: PriceCatalogItemDto): Promise<PriceCatalogItemDetailView> {
    await this.validateWorkType(dto.workTypeId);
    await this.ensureNoActiveCatalogItem(legalEntity.id, dto.workTypeId);

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.priceCatalogItem.create({
        data: {
          category: normalizeText(dto.category),
          createdByUserId: context.actorUserId,
          displayName: normalizeText(dto.displayName),
          isActive: dto.isActive ?? true,
          legalEntityId: legalEntity.id,
          notes: dto.notes ?? null,
          sortOrder: dto.sortOrder ?? 0,
          standardPriceMinor: dto.standardPriceMinor,
          unit: dto.unit,
          updatedByUserId: context.actorUserId,
          workTypeId: dto.workTypeId,
        },
        include: priceCatalogItemInclude,
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.catalogItemCreated,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        metadata: { standardPriceMinor: dto.standardPriceMinor, workTypeId: dto.workTypeId },
        requestMetadata: context.requestMetadata,
        resourceId: created.id,
        resourceType: PRICING_RESOURCE_TYPES.catalogItem,
      });
      return created;
    });

    return toPriceCatalogItemDetailView(item);
  }

  public async updateCatalogItem(context: ActorContext, legalEntity: LegalEntityContextInput, catalogItemId: string, dto: PriceCatalogItemDto): Promise<PriceCatalogItemDetailView> {
    const before = await this.findCatalogItemOrThrow(legalEntity.id, catalogItemId);
    await this.validateWorkType(dto.workTypeId);
    if (dto.workTypeId !== before.workTypeId || (dto.isActive ?? before.isActive) !== before.isActive) {
      await this.ensureNoActiveCatalogItem(legalEntity.id, dto.workTypeId, catalogItemId);
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.priceCatalogItem.update({
        data: {
          category: normalizeText(dto.category),
          displayName: normalizeText(dto.displayName),
          isActive: dto.isActive ?? before.isActive,
          notes: dto.notes ?? null,
          sortOrder: dto.sortOrder ?? before.sortOrder,
          standardPriceMinor: dto.standardPriceMinor,
          unit: dto.unit,
          updatedByUserId: context.actorUserId,
          workTypeId: dto.workTypeId,
        },
        include: priceCatalogItemInclude,
        where: { id: catalogItemId },
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.catalogItemUpdated,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        metadata: { changedFields: getChangedCatalogFields(before, updated) },
        requestMetadata: context.requestMetadata,
        resourceId: catalogItemId,
        resourceType: PRICING_RESOURCE_TYPES.catalogItem,
      });
      return updated;
    });

    return toPriceCatalogItemDetailView(item);
  }

  public async archiveCatalogItem(context: ActorContext, legalEntity: LegalEntityContextInput, catalogItemId: string): Promise<PriceCatalogItemDetailView> {
    const before = await this.findCatalogItemOrThrow(legalEntity.id, catalogItemId);
    if (!before.isActive) {
      return toPriceCatalogItemDetailView(before);
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.priceCatalogItem.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          isActive: false,
          updatedByUserId: context.actorUserId,
        },
        include: priceCatalogItemInclude,
        where: { id: catalogItemId },
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.catalogItemArchived,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        requestMetadata: context.requestMetadata,
        resourceId: catalogItemId,
        resourceType: PRICING_RESOURCE_TYPES.catalogItem,
      });
      return updated;
    });

    return toPriceCatalogItemDetailView(item);
  }

  public async restoreCatalogItem(context: ActorContext, legalEntity: LegalEntityContextInput, catalogItemId: string): Promise<PriceCatalogItemDetailView> {
    const before = await this.findCatalogItemOrThrow(legalEntity.id, catalogItemId);
    await this.ensureNoActiveCatalogItem(legalEntity.id, before.workTypeId, catalogItemId);

    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.priceCatalogItem.update({
        data: {
          archivedAt: null,
          archivedByUserId: null,
          isActive: true,
          updatedByUserId: context.actorUserId,
        },
        include: priceCatalogItemInclude,
        where: { id: catalogItemId },
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.catalogItemRestored,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        requestMetadata: context.requestMetadata,
        resourceId: catalogItemId,
        resourceType: PRICING_RESOURCE_TYPES.catalogItem,
      });
      return updated;
    });

    return toPriceCatalogItemDetailView(item);
  }

  public async replaceExecutionRules(context: ActorContext, legalEntity: LegalEntityContextInput, catalogItemId: string, rules: readonly ExecutionTimeRuleDto[]): Promise<PriceCatalogItemDetailView> {
    await this.findCatalogItemOrThrow(legalEntity.id, catalogItemId);
    validateExecutionRules(rules);

    const item = await this.prisma.$transaction(async (tx) => {
      await tx.executionTimeRule.deleteMany({ where: { priceCatalogItemId: catalogItemId } });
      if (rules.length > 0) {
        await tx.executionTimeRule.createMany({
          data: rules.map((rule, index) => ({
            createdByUserId: context.actorUserId,
            executionDays: rule.requiresManualDueDate ? null : rule.executionDays ?? null,
            isActive: rule.isActive ?? true,
            maxQuantity: rule.maxQuantity ?? null,
            minQuantity: rule.minQuantity,
            priceCatalogItemId: catalogItemId,
            priority: rule.priority ?? index,
            requiresManualDueDate: rule.requiresManualDueDate,
            updatedByUserId: context.actorUserId,
          })),
        });
      }
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.executionRulesReplaced,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        metadata: { ruleCount: rules.length },
        requestMetadata: context.requestMetadata,
        resourceId: catalogItemId,
        resourceType: PRICING_RESOURCE_TYPES.catalogItem,
      });
      return tx.priceCatalogItem.findUniqueOrThrow({ include: priceCatalogItemInclude, where: { id: catalogItemId } });
    });

    return toPriceCatalogItemDetailView(item);
  }

  public async listAgreements(legalEntity: LegalEntityContextInput, query: PricingAgreementsQueryDto): Promise<PaginatedPricingAgreementsView> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = this.toAgreementWhere(legalEntity.id, query);
    const [total, agreements] = await this.prisma.$transaction([
      this.prisma.pricingAgreement.count({ where }),
      this.prisma.pricingAgreement.findMany({
        include: pricingAgreementInclude,
        orderBy: [
          { [query.sortBy ?? "updatedAt"]: query.sortDirection ?? "desc" },
          { name: "asc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: agreements.map(toPricingAgreementSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async getAgreement(legalEntity: LegalEntityContextInput, agreementId: string): Promise<PricingAgreementDetailView> {
    return toPricingAgreementDetailView(await this.findAgreementOrThrow(legalEntity.id, agreementId));
  }

  public async createAgreement(context: ActorContext, legalEntity: LegalEntityContextInput, dto: PricingAgreementDto): Promise<PricingAgreementDetailView> {
    await this.validateAgreementSubject(dto);
    await this.validateAgreementOverlap(legalEntity.id, dto);

    const agreement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pricingAgreement.create({
        data: this.toAgreementCreateData(context.actorUserId, legalEntity.id, dto),
        include: pricingAgreementInclude,
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.agreementCreated,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        metadata: { clinicId: created.clinicId, doctorId: created.doctorId, subjectType: created.subjectType },
        requestMetadata: context.requestMetadata,
        resourceId: created.id,
        resourceType: PRICING_RESOURCE_TYPES.agreement,
      });
      return created;
    });

    return toPricingAgreementDetailView(agreement);
  }

  public async updateAgreement(context: ActorContext, legalEntity: LegalEntityContextInput, agreementId: string, dto: PricingAgreementDto): Promise<PricingAgreementDetailView> {
    const before = await this.findAgreementOrThrow(legalEntity.id, agreementId);
    await this.validateAgreementSubject(dto);
    await this.validateAgreementOverlap(legalEntity.id, dto, agreementId);

    const agreement = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pricingAgreement.update({
        data: {
          ...this.toAgreementUpdateData(context.actorUserId, dto),
          updatedByUserId: context.actorUserId,
        },
        include: pricingAgreementInclude,
        where: { id: agreementId },
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.agreementUpdated,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        metadata: { changedFields: getChangedAgreementFields(before, updated) },
        requestMetadata: context.requestMetadata,
        resourceId: agreementId,
        resourceType: PRICING_RESOURCE_TYPES.agreement,
      });
      return updated;
    });

    return toPricingAgreementDetailView(agreement);
  }

  public async replaceAgreementRules(context: ActorContext, legalEntity: LegalEntityContextInput, agreementId: string, rules: readonly PricingAgreementRuleDto[]): Promise<PricingAgreementDetailView> {
    await this.findAgreementOrThrow(legalEntity.id, agreementId);
    await this.validateAgreementRules(legalEntity.id, rules);

    const agreement = await this.prisma.$transaction(async (tx) => {
      await tx.pricingAgreementRule.deleteMany({ where: { pricingAgreementId: agreementId } });
      if (rules.length > 0) {
        await tx.pricingAgreementRule.createMany({
          data: rules.map((rule) => toAgreementRuleCreateInput(agreementId, rule)),
        });
      }
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.agreementRulesReplaced,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        metadata: { ruleCount: rules.length },
        requestMetadata: context.requestMetadata,
        resourceId: agreementId,
        resourceType: PRICING_RESOURCE_TYPES.agreement,
      });
      return tx.pricingAgreement.findUniqueOrThrow({ include: pricingAgreementInclude, where: { id: agreementId } });
    });

    return toPricingAgreementDetailView(agreement);
  }

  public async archiveAgreement(context: ActorContext, legalEntity: LegalEntityContextInput, agreementId: string): Promise<PricingAgreementDetailView> {
    await this.findAgreementOrThrow(legalEntity.id, agreementId);
    const agreement = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pricingAgreement.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          isActive: false,
          updatedByUserId: context.actorUserId,
        },
        include: pricingAgreementInclude,
        where: { id: agreementId },
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.agreementArchived,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        requestMetadata: context.requestMetadata,
        resourceId: agreementId,
        resourceType: PRICING_RESOURCE_TYPES.agreement,
      });
      return updated;
    });
    return toPricingAgreementDetailView(agreement);
  }

  public async restoreAgreement(context: ActorContext, legalEntity: LegalEntityContextInput, agreementId: string): Promise<PricingAgreementDetailView> {
    const before = await this.findAgreementOrThrow(legalEntity.id, agreementId);
    await this.validateAgreementOverlap(legalEntity.id, {
      clinicId: before.clinicId,
      doctorId: before.doctorId,
      isActive: true,
      name: before.name,
      notes: before.notes,
      subjectType: before.subjectType,
      validFrom: before.validFrom.toISOString(),
      validUntil: before.validUntil?.toISOString() ?? null,
    }, agreementId);

    const agreement = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.pricingAgreement.update({
        data: {
          archivedAt: null,
          archivedByUserId: null,
          isActive: true,
          updatedByUserId: context.actorUserId,
        },
        include: pricingAgreementInclude,
        where: { id: agreementId },
      });
      await this.recordAudit(tx, {
        action: PRICING_AUDIT_ACTIONS.agreementRestored,
        actorUserId: context.actorUserId,
        legalEntityCode: legalEntity.code,
        requestMetadata: context.requestMetadata,
        resourceId: agreementId,
        resourceType: PRICING_RESOURCE_TYPES.agreement,
      });
      return updated;
    });
    return toPricingAgreementDetailView(agreement);
  }

  public async resolvePreview(legalEntity: LegalEntityContextInput, dto: ResolvePreviewDto) {
    const evaluationDate = dto.evaluationDate ? parseDateOnly(dto.evaluationDate) : new Date();
    const resolution = await this.pricingResolver.resolve({
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      evaluationDate,
      legalEntityCode: legalEntity.code,
      legalEntityId: legalEntity.id,
      quantity: dto.quantity,
      workTypeId: dto.workTypeId,
    });

    const deadlinePreview = dto.startAt
      ? await this.resolveDeadlinePreview(legalEntity.id, dto.startAt, dto.includeStartDay ?? false, resolution.executionTimeRules, dto.quantity)
      : null;

    return {
      adjustment: resolution.adjustment,
      appliedRuleScope: resolution.appliedRuleScope,
      currency: resolution.currency,
      deadlinePreview,
      evaluationDate: evaluationDate.toISOString().slice(0, 10),
      executionTimeRule: resolution.executionTimeRule
        ? {
            executionDays: resolution.executionTimeRule.executionDays,
            label: resolution.executionTimeRule.requiresManualDueDate
              ? "Termen manual"
              : `${resolution.executionTimeRule.executionDays} zile`,
            maxQuantity: resolution.executionTimeRule.maxQuantity,
            minQuantity: resolution.executionTimeRule.minQuantity,
            requiresManualDueDate: resolution.executionTimeRule.requiresManualDueDate,
          }
        : null,
      explanation: resolution.explanation,
      finalUnitPriceMinor: resolution.finalUnitPriceMinor,
      quantity: resolution.quantity,
      source: resolution.appliedAgreementType === "DOCTOR" ? "Medic" : resolution.appliedAgreementType === "CLINIC" ? "Clinică" : "Catalog standard",
      standardUnitPriceMinor: resolution.standardUnitPriceMinor,
      totalPriceMinor: resolution.totalPriceMinor,
      workTypeId: resolution.workTypeId,
    };
  }

  private async resolveDeadlinePreview(
    legalEntityId: string,
    startAt: string,
    includeStartDay: boolean,
    rules: readonly {
      readonly executionDays: number | null;
      readonly isActive: boolean;
      readonly maxQuantity: number | null;
      readonly minQuantity: number;
      readonly priority: number;
      readonly requiresManualDueDate: boolean;
    }[],
    quantity: number,
  ) {
    const settings = await this.prisma.legalEntitySettings.findUnique({
      select: { timezone: true },
      where: { legalEntityId },
    });
    const timezone = settings?.timezone ?? DEADLINE_DEFAULT_TIMEZONE;
    const calendar = this.businessCalendar.getRomanianBusinessCalendar();
    const result = this.deadlineEngine.calculate({
      calendar,
      includeStartDay,
      quantity,
      rules,
      startAt,
      timezone,
    });

    if (result.reason === "INVALID_START_DATE" || result.reason === "INVALID_TIMEZONE" || result.reason === "INVALID_QUANTITY" || result.reason === "INVALID_CALENDAR" || result.reason === "INVALID_DUE_TIME") {
      throw new BadRequestException(result.explanation);
    }

    return result;
  }

  private toCatalogWhere(legalEntityId: string, query: PricingCatalogQueryDto): Prisma.PriceCatalogItemWhereInput {
    const search = query.search?.trim();
    return {
      legalEntityId,
      ...(query.active === undefined ? {} : { isActive: query.active }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { workType: { code: { contains: search, mode: "insensitive" } } },
              { workType: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
  }

  private toAgreementWhere(legalEntityId: string, query: PricingAgreementsQueryDto): Prisma.PricingAgreementWhereInput {
    const date = query.date ? parseDateOnly(query.date) : null;
    const search = query.search?.trim();
    return {
      legalEntityId,
      ...(query.active === undefined ? {} : { isActive: query.active }),
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(date ? { validFrom: { lte: date }, OR: [{ validUntil: null }, { validUntil: { gte: date } }] } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { clinic: { name: { contains: search, mode: "insensitive" } } },
              { doctor: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
  }

  private async findCatalogItemOrThrow(legalEntityId: string, catalogItemId: string) {
    const item = await this.prisma.priceCatalogItem.findFirst({
      include: priceCatalogItemInclude,
      where: { id: catalogItemId, legalEntityId },
    });
    if (!item) {
      throw new NotFoundException("Serviciul din catalog nu a fost găsit pentru firma activă.");
    }
    return item;
  }

  private async findAgreementOrThrow(legalEntityId: string, agreementId: string) {
    const agreement = await this.prisma.pricingAgreement.findFirst({
      include: pricingAgreementInclude,
      where: { id: agreementId, legalEntityId },
    });
    if (!agreement) {
      throw new NotFoundException("Acordul comercial nu a fost găsit pentru firma activă.");
    }
    return agreement;
  }

  private async validateWorkType(workTypeId: string): Promise<void> {
    const workType = await this.prisma.workType.findUnique({ where: { id: workTypeId } });
    if (!workType) {
      throw new BadRequestException("Tipul de lucrare nu există.");
    }
  }

  private async ensureNoActiveCatalogItem(legalEntityId: string, workTypeId: string, exceptId?: string): Promise<void> {
    const existing = await this.prisma.priceCatalogItem.findFirst({
      where: {
        archivedAt: null,
        isActive: true,
        legalEntityId,
        workTypeId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (existing) {
      throw new BadRequestException("Există deja un serviciu activ pentru firma activă și tipul de lucrare.");
    }
  }

  private async validateAgreementSubject(dto: PricingAgreementDto): Promise<void> {
    if (dto.subjectType === "CLINIC") {
      if (!dto.clinicId || dto.doctorId) {
        throw new BadRequestException("Acordul de clinică cere clinică și nu acceptă medic.");
      }
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, isActive: true } });
      if (!clinic) {
        throw new BadRequestException("Clinica nu există sau este arhivată.");
      }
      return;
    }

    if (!dto.doctorId || dto.clinicId) {
      throw new BadRequestException("Acordul de medic cere medic și nu acceptă clinică separată.");
    }
    const doctor = await this.prisma.doctor.findFirst({ where: { id: dto.doctorId, isActive: true } });
    if (!doctor) {
      throw new BadRequestException("Medicul nu există sau este arhivat.");
    }
  }

  private async validateAgreementOverlap(legalEntityId: string, dto: PricingAgreementDto, exceptId?: string): Promise<void> {
    const validFrom = parseDateOnly(dto.validFrom);
    const validUntil = dto.validUntil ? parseDateOnly(dto.validUntil) : null;
    if (validUntil && validUntil < validFrom) {
      throw new BadRequestException("Data de sfârșit nu poate fi înainte de data de început.");
    }
    if (dto.isActive === false) {
      return;
    }
    const overlap = await this.prisma.pricingAgreement.findFirst({
      where: {
        archivedAt: null,
        isActive: true,
        legalEntityId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        subjectType: dto.subjectType,
        ...(dto.subjectType === "CLINIC" ? { clinicId: dto.clinicId ?? "" } : { doctorId: dto.doctorId ?? "" }),
        validFrom: { lte: validUntil ?? new Date("9999-12-31T00:00:00.000Z") },
        OR: [
          { validUntil: null },
          { validUntil: { gte: validFrom } },
        ],
      },
    });
    if (overlap) {
      throw new BadRequestException("Există deja un acord activ cu perioadă suprapusă pentru același subiect.");
    }
  }

  private async validateAgreementRules(legalEntityId: string, rules: readonly PricingAgreementRuleDto[]): Promise<void> {
    for (const rule of rules) {
      validateRuleShape(rule);
      if (rule.scope === "ITEM" && rule.priceCatalogItemId) {
        const item = await this.prisma.priceCatalogItem.findFirst({
          where: { id: rule.priceCatalogItemId, legalEntityId },
        });
        if (!item) {
          throw new BadRequestException("Regula referă un serviciu care nu aparține firmei active.");
        }
        const result = applyPricingAdjustment(item.standardPriceMinor, {
          adjustmentPercentageBasisPoints: rule.adjustmentPercentageBasisPoints ?? null,
          adjustmentType: rule.adjustmentType,
          adjustmentValueMinor: rule.adjustmentValueMinor ?? null,
          overridePriceMinor: rule.overridePriceMinor ?? null,
        });
        if (result < 0) {
          throw new BadRequestException("Regula produce un preț negativ pentru serviciul ales.");
        }
      }
    }
  }

  private toAgreementCreateData(actorUserId: string, legalEntityId: string, dto: PricingAgreementDto): Prisma.PricingAgreementUncheckedCreateInput {
    return {
      clinicId: dto.subjectType === "CLINIC" ? dto.clinicId ?? null : null,
      createdByUserId: actorUserId,
      doctorId: dto.subjectType === "DOCTOR" ? dto.doctorId ?? null : null,
      isActive: dto.isActive ?? true,
      legalEntityId,
      name: normalizeText(dto.name),
      notes: dto.notes ?? null,
      subjectType: dto.subjectType,
      updatedByUserId: actorUserId,
      validFrom: parseDateOnly(dto.validFrom),
      validUntil: dto.validUntil ? parseDateOnly(dto.validUntil) : null,
    };
  }

  private toAgreementUpdateData(actorUserId: string, dto: PricingAgreementDto): Prisma.PricingAgreementUncheckedUpdateInput {
    return {
      clinicId: dto.subjectType === "CLINIC" ? dto.clinicId ?? null : null,
      doctorId: dto.subjectType === "DOCTOR" ? dto.doctorId ?? null : null,
      isActive: dto.isActive ?? true,
      name: normalizeText(dto.name),
      notes: dto.notes ?? null,
      subjectType: dto.subjectType,
      updatedByUserId: actorUserId,
      validFrom: parseDateOnly(dto.validFrom),
      validUntil: dto.validUntil ? parseDateOnly(dto.validUntil) : null,
    };
  }

  private async recordAudit(
    client: AuditClient,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly legalEntityCode: string;
      readonly metadata?: Prisma.InputJsonValue;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
      readonly resourceType: string;
    },
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      actorUserId: input.actorUserId,
      metadata: {
        legalEntityCode: input.legalEntityCode,
        ...(typeof input.metadata === "object" && input.metadata !== null && !Array.isArray(input.metadata) ? input.metadata : {}),
      },
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    };

    if (input.requestMetadata.ipAddress) {
      data.ipAddress = input.requestMetadata.ipAddress;
    }

    if (input.requestMetadata.userAgent) {
      data.userAgent = input.requestMetadata.userAgent;
    }

    await client.auditLog.create({
      data,
    });
  }
}

export function validateExecutionRules(rules: readonly ExecutionTimeRuleDto[]): void {
  const activeRules = rules.filter((rule) => rule.isActive ?? true).sort((left, right) => left.minQuantity - right.minQuantity);
  for (const rule of rules) {
    if (rule.maxQuantity !== undefined && rule.maxQuantity !== null && rule.maxQuantity < rule.minQuantity) {
      throw new BadRequestException("Intervalul de cantitate este invalid.");
    }
    if (rule.requiresManualDueDate && rule.executionDays !== undefined && rule.executionDays !== null) {
      throw new BadRequestException("Regula manuală nu poate avea zile de execuție.");
    }
    if (!rule.requiresManualDueDate && (rule.executionDays === undefined || rule.executionDays === null || rule.executionDays < 1)) {
      throw new BadRequestException("Regula automată cere zile de execuție pozitive.");
    }
  }
  for (let index = 1; index < activeRules.length; index += 1) {
    const previous = activeRules[index - 1];
    const current = activeRules[index];
    if (previous && current && (previous.maxQuantity === null || previous.maxQuantity === undefined || current.minQuantity <= previous.maxQuantity)) {
      throw new BadRequestException("Intervalele active de timp nu se pot suprapune.");
    }
  }
}

function validateRuleShape(rule: PricingAgreementRuleDto): void {
  if (rule.scope === "ALL" && (rule.priceCatalogItemId || rule.category)) {
    throw new BadRequestException("Regula ALL nu acceptă serviciu sau categorie.");
  }
  if (rule.scope === "CATEGORY" && (!rule.category || rule.priceCatalogItemId)) {
    throw new BadRequestException("Regula CATEGORY cere categorie și nu acceptă serviciu.");
  }
  if (rule.scope === "ITEM" && (!rule.priceCatalogItemId || rule.category)) {
    throw new BadRequestException("Regula ITEM cere serviciu și nu acceptă categorie.");
  }
  if (rule.adjustmentType === "FIXED_AMOUNT" && (rule.adjustmentValueMinor === undefined || rule.adjustmentValueMinor === null || rule.adjustmentPercentageBasisPoints !== undefined || rule.overridePriceMinor !== undefined)) {
    throw new BadRequestException("Reducerea fixă cere doar valoare minoră.");
  }
  if (rule.adjustmentType === "PERCENTAGE" && (rule.adjustmentPercentageBasisPoints === undefined || rule.adjustmentPercentageBasisPoints === null || rule.adjustmentValueMinor !== undefined || rule.overridePriceMinor !== undefined)) {
    throw new BadRequestException("Reducerea procentuală cere doar basis points.");
  }
  if (rule.adjustmentType === "OVERRIDE_PRICE" && (rule.overridePriceMinor === undefined || rule.overridePriceMinor === null || rule.adjustmentValueMinor !== undefined || rule.adjustmentPercentageBasisPoints !== undefined)) {
    throw new BadRequestException("Override cere doar preț final.");
  }
}

function toAgreementRuleCreateInput(pricingAgreementId: string, rule: PricingAgreementRuleDto): Prisma.PricingAgreementRuleUncheckedCreateInput {
  return {
    adjustmentPercentageBasisPoints: rule.adjustmentType === "PERCENTAGE" ? rule.adjustmentPercentageBasisPoints ?? null : null,
    adjustmentType: rule.adjustmentType,
    adjustmentValueMinor: rule.adjustmentType === "FIXED_AMOUNT" ? rule.adjustmentValueMinor ?? null : null,
    category: rule.scope === "CATEGORY" ? normalizeText(rule.category ?? "") : null,
    overridePriceMinor: rule.adjustmentType === "OVERRIDE_PRICE" ? rule.overridePriceMinor ?? null : null,
    priceCatalogItemId: rule.scope === "ITEM" ? rule.priceCatalogItemId ?? null : null,
    pricingAgreementId,
    scope: rule.scope,
  };
}

function parseDateOnly(value: string): Date {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Data nu este validă.");
  }
  return date;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function getChangedCatalogFields(before: { readonly category: string; readonly displayName: string; readonly isActive: boolean; readonly notes: string | null; readonly sortOrder: number; readonly standardPriceMinor: number; readonly unit: string; readonly workTypeId: string }, after: { readonly category: string; readonly displayName: string; readonly isActive: boolean; readonly notes: string | null; readonly sortOrder: number; readonly standardPriceMinor: number; readonly unit: string; readonly workTypeId: string }): readonly string[] {
  return ["category", "displayName", "isActive", "notes", "sortOrder", "standardPriceMinor", "unit", "workTypeId"].filter((field) => before[field as keyof typeof before] !== after[field as keyof typeof after]);
}

function getChangedAgreementFields(before: { readonly clinicId: string | null; readonly doctorId: string | null; readonly isActive: boolean; readonly name: string; readonly notes: string | null; readonly subjectType: string; readonly validFrom: Date; readonly validUntil: Date | null }, after: { readonly clinicId: string | null; readonly doctorId: string | null; readonly isActive: boolean; readonly name: string; readonly notes: string | null; readonly subjectType: string; readonly validFrom: Date; readonly validUntil: Date | null }): readonly string[] {
  return ["clinicId", "doctorId", "isActive", "name", "notes", "subjectType"].filter((field) => before[field as keyof typeof before] !== after[field as keyof typeof after])
    .concat(before.validFrom.getTime() !== after.validFrom.getTime() ? ["validFrom"] : [])
    .concat((before.validUntil?.getTime() ?? null) !== (after.validUntil?.getTime() ?? null) ? ["validUntil"] : []);
}
