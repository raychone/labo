import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { B16_NOTIFICATION_EVENTS, getB16WorkTypePricingNotificationKey } from "@dental-lab/shared";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { WORK_TYPE_RESOURCE_TYPE, WORK_TYPES_AUDIT_ACTIONS } from "./work-types.constants.js";
import type { CreateWorkTypeDto, ListWorkTypesQueryDto, UpdateWorkTypeDto } from "./dto/work-types.dto.js";
import { WorkTypeCodeService } from "./work-type-code.service.js";
import {
  type PaginatedWorkTypesView,
  type WorkTypeDetailView,
  type WorkTypeOptionView,
  toWorkTypeDetailView,
  toWorkTypeOptionView,
  toWorkTypeSummaryView,
} from "./work-types.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<PrismaTypes.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

const WORK_TYPE_MUTATION_FIELDS = ["basePriceMinor", "colorHex", "description", "name", "symbol", "unit"] as const satisfies readonly (keyof UpdateWorkTypeDto)[];

@Injectable()
export class WorkTypesService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkTypeCodeService) private readonly workTypeCodeService: WorkTypeCodeService,
    @Optional() @Inject(NotificationsService) private readonly notificationsService?: NotificationsService,
  ) {}

  public async listWorkTypes(query: ListWorkTypesQueryDto): Promise<PaginatedWorkTypesView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const where: Prisma.WorkTypeWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { symbol: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, workTypes] = await this.prisma.$transaction([
      this.prisma.workType.count({ where }),
      this.prisma.workType.findMany({
        orderBy: {
          [query.sortBy]: query.sortDirection,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: workTypes.map(toWorkTypeSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async listWorkTypeOptions(): Promise<readonly WorkTypeOptionView[]> {
    const workTypes = await this.prisma.workType.findMany({
      orderBy: {
        name: "asc",
      },
      where: {
        isActive: true,
      },
    });

    return workTypes.map(toWorkTypeOptionView);
  }

  public async getWorkType(workTypeId: string): Promise<WorkTypeDetailView> {
    const workType = await this.findWorkTypeOrThrow(workTypeId);
    if (workType.basePriceMinor === null) await this.notificationsService?.publishUnpricedWorkType(workType);
    return toWorkTypeDetailView(workType);
  }

  public async createWorkType(context: ActorContext, dto: CreateWorkTypeDto): Promise<WorkTypeDetailView> {
    const workType = await this.prisma.$transaction(async (tx) => {
      const code = await this.workTypeCodeService.generate(tx);
      const data: PrismaTypes.WorkTypeUncheckedCreateInput = {
        basePriceMinor: dto.basePriceMinor,
        colorHex: dto.colorHex ?? null,
        code,
        createdByUserId: context.actorUserId,
        name: dto.name,
        symbol: dto.symbol,
        unit: dto.unit,
        updatedByUserId: context.actorUserId,
      };

      if (dto.description !== undefined) {
        data.description = dto.description;
      }

      const createdWorkType = await tx.workType.create({ data });

      await this.recordAudit(tx, {
        action: WORK_TYPES_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: { basePriceMinor: dto.basePriceMinor, code, colorHex: dto.colorHex ?? null, name: dto.name, symbol: dto.symbol },
        requestMetadata: context.requestMetadata,
        resourceId: createdWorkType.id,
      });

      return createdWorkType;
    });

    await this.notificationsService?.publishNewWorkType(workType);
    return toWorkTypeDetailView(workType);
  }

  public async saveOperationalNameToCatalog(context: ActorContext, name: string): Promise<{ readonly code: string; readonly id: string; readonly name: string; readonly symbol: string; readonly unit: string }> {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (normalizedName.length < 2 || normalizedName.length > 160) {
      throw new BadRequestException("Denumirea personalizată trebuie să aibă între 2 și 160 de caractere.");
    }
    const key = normalizedName.toLocaleLowerCase("ro-RO");
    const digest = createHash("sha256").update(key).digest("hex").slice(0, 16).toUpperCase();
    const code = `CU-${digest}`;
    const symbol = `custom-${digest}`;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.workType.findFirst({ where: { name: { equals: normalizedName, mode: "insensitive" } } });
        if (existing) return { code: existing.code, id: existing.id, name: existing.name, symbol: existing.symbol, unit: existing.unit };
        const created = await tx.workType.create({
          data: { basePriceMinor: null, code, createdByUserId: context.actorUserId, name: normalizedName, symbol, unit: "UNIT", updatedByUserId: context.actorUserId },
        });
        await this.recordAudit(tx, {
          action: WORK_TYPES_AUDIT_ACTIONS.intakeCatalogCreated,
          actorUserId: context.actorUserId,
          metadata: {
            catalogName: normalizedName,
            code: created.code,
            notificationEvent: B16_NOTIFICATION_EVENTS.newUnpricedWorkTypeRequiresManagerPricing,
            notificationKey: getB16WorkTypePricingNotificationKey(created.id),
            priceConfigured: false,
            symbol: created.symbol,
          },
          requestMetadata: context.requestMetadata,
          resourceId: created.id,
        });
        return { code: created.code, id: created.id, name: created.name, symbol: created.symbol, unit: created.unit };
      }, { isolationLevel: "Serializable" });
      await this.notificationsService?.publishUnpricedWorkType({ id: result.id, name: result.name });
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.workType.findFirst({ where: { code } });
        if (existing) return { code: existing.code, id: existing.id, name: existing.name, symbol: existing.symbol, unit: existing.unit };
        throw new ConflictException("Tipul personalizat există deja, dar nu a putut fi reutilizat automat.");
      }
      throw error;
    }
  }

  public async updateWorkType(context: ActorContext, workTypeId: string, dto: UpdateWorkTypeDto): Promise<WorkTypeDetailView> {
    const before = await this.findWorkTypeOrThrow(workTypeId);

    if (!before.isActive) {
      throw new BadRequestException("Archived work types must be restored before editing.");
    }

    const data = this.toUpdateData(dto, context.actorUserId);
    if (Object.keys(data).length <= 2) {
      throw new BadRequestException("No work type fields were provided.");
    }

    const after = await this.prisma.$transaction(async (tx) => {
      const updatedWorkType = await tx.workType.update({
        data,
        where: {
          id: workTypeId,
          ...(before.basePriceMinor === null ? { basePriceMinor: null } : {}),
        },
      });
      const changedFields = this.getChangedFields(before, updatedWorkType);

      if (before.basePriceMinor === null && updatedWorkType.basePriceMinor !== null) {
        const eligibleItems = await tx.workOrderItem.findMany({
          select: { workOrder: { select: { code: true } } },
          where: {
            archivedAt: null,
            baseUnitPriceMinor: null,
            commercialSnapshot: { equals: Prisma.JsonNull },
            totalPriceMinor: null,
            workOrder: { invoicedDocumentId: null },
            workTypeId,
          },
        });
        const propagation = await tx.workOrderItem.updateMany({
          data: {
            baseUnitPriceMinor: updatedWorkType.basePriceMinor,
            currency: "RON",
            totalPriceMinor: updatedWorkType.basePriceMinor,
          },
          where: {
            archivedAt: null,
            baseUnitPriceMinor: null,
            commercialSnapshot: { equals: Prisma.JsonNull },
            totalPriceMinor: null,
            workOrder: { invoicedDocumentId: null },
            workTypeId,
          },
        });
        await this.recordAudit(tx, {
          action: WORK_TYPES_AUDIT_ACTIONS.catalogPriceConfigured,
          actorUserId: context.actorUserId,
          metadata: {
            affectedItemCount: propagation.count,
            affectedWorkOrderCodes: eligibleItems.map((item) => item.workOrder.code).slice(0, 100),
            currency: "RON",
            newPriceMinor: updatedWorkType.basePriceMinor,
            notificationEvent: B16_NOTIFICATION_EVENTS.newUnpricedWorkTypeRequiresManagerPricing,
            notificationKey: getB16WorkTypePricingNotificationKey(workTypeId),
            previousPriceState: "UNCONFIGURED",
            workTypeId,
            workTypeName: updatedWorkType.name,
          },
          requestMetadata: context.requestMetadata,
          resourceId: workTypeId,
        });
      }

      if (changedFields.length > 0) {
        const priceChanged = before.basePriceMinor !== updatedWorkType.basePriceMinor;
        await this.recordAudit(tx, {
          action: priceChanged ? WORK_TYPES_AUDIT_ACTIONS.priceUpdated : WORK_TYPES_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: {
            changedFields,
            code: before.code,
            symbol: before.symbol,
            ...(priceChanged
              ? {
                  newBasePriceMinor: updatedWorkType.basePriceMinor,
                  oldBasePriceMinor: before.basePriceMinor,
                }
              : {}),
          },
          requestMetadata: context.requestMetadata,
          resourceId: workTypeId,
        });
      }

      return updatedWorkType;
    });

    if (before.basePriceMinor === null && after.basePriceMinor !== null) await this.notificationsService?.resolveUnpricedWorkType(workTypeId);
    return toWorkTypeDetailView(after);
  }

  public async archiveWorkType(context: ActorContext, workTypeId: string): Promise<WorkTypeDetailView> {
    const workType = await this.findWorkTypeOrThrow(workTypeId);

    if (!workType.isActive) {
      return toWorkTypeDetailView(workType);
    }

    const archivedWorkType = await this.prisma.$transaction(async (tx) => {
      const updatedWorkType = await tx.workType.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          isActive: false,
          updatedByUserId: context.actorUserId,
          version: {
            increment: 1,
          },
        },
        where: {
          id: workTypeId,
        },
      });

      await this.recordAudit(tx, {
        action: WORK_TYPES_AUDIT_ACTIONS.archived,
        actorUserId: context.actorUserId,
          metadata: { code: workType.code, symbol: workType.symbol },
        requestMetadata: context.requestMetadata,
        resourceId: workTypeId,
      });

      return updatedWorkType;
    });

    return toWorkTypeDetailView(archivedWorkType);
  }

  public async restoreWorkType(context: ActorContext, workTypeId: string): Promise<WorkTypeDetailView> {
    const workType = await this.findWorkTypeOrThrow(workTypeId);

    if (workType.isActive) {
      return toWorkTypeDetailView(workType);
    }

    const restoredWorkType = await this.prisma.$transaction(async (tx) => {
      const updatedWorkType = await tx.workType.update({
        data: {
          archivedAt: null,
          archivedByUserId: null,
          isActive: true,
          updatedByUserId: context.actorUserId,
          version: {
            increment: 1,
          },
        },
        where: {
          id: workTypeId,
        },
      });

      await this.recordAudit(tx, {
        action: WORK_TYPES_AUDIT_ACTIONS.restored,
        actorUserId: context.actorUserId,
        metadata: { code: workType.code, symbol: workType.symbol },
        requestMetadata: context.requestMetadata,
        resourceId: workTypeId,
      });

      return updatedWorkType;
    });

    return toWorkTypeDetailView(restoredWorkType);
  }

  private async findWorkTypeOrThrow(workTypeId: string): Promise<Prisma.WorkTypeGetPayload<object>> {
    const workType = await this.prisma.workType.findUnique({
      where: {
        id: workTypeId,
      },
    });

    if (!workType) {
      throw new NotFoundException("Work type was not found.");
    }

    return workType;
  }

  private toUpdateData(dto: UpdateWorkTypeDto, actorUserId: string): Prisma.WorkTypeUncheckedUpdateInput {
    const data: Prisma.WorkTypeUncheckedUpdateInput = {
      updatedByUserId: actorUserId,
      version: {
        increment: 1,
      },
    };

    for (const field of WORK_TYPE_MUTATION_FIELDS) {
      if (!(field in dto)) {
        continue;
      }

      const value = dto[field];
      if (value === undefined) {
        continue;
      }

      this.assignUpdateValue(data, field, value);
    }

    return data;
  }

  private assignUpdateValue(
    data: Prisma.WorkTypeUncheckedUpdateInput,
    field: (typeof WORK_TYPE_MUTATION_FIELDS)[number],
    value: number | string | null,
  ): void {
    switch (field) {
      case "basePriceMinor":
        if (typeof value === "number") {
          data.basePriceMinor = value;
        }
        return;
      case "colorHex":
        data.colorHex = typeof value === "string" ? value : null;
        return;
      case "description":
        data.description = typeof value === "number" ? null : value;
        return;
      case "name":
        if (typeof value === "string") {
          data.name = value;
        }
        return;
      case "symbol":
        if (typeof value === "string") {
          data.symbol = value;
        }
        return;
      case "unit":
        if (value === "UNIT") {
          data.unit = value;
        }
        return;
    }
  }

  private getChangedFields(
    before: Prisma.WorkTypeGetPayload<object>,
    after: Prisma.WorkTypeGetPayload<object>,
  ): readonly (typeof WORK_TYPE_MUTATION_FIELDS)[number][] {
    return WORK_TYPE_MUTATION_FIELDS.filter((field) => before[field] !== after[field]);
  }

  private async recordAudit(
    client: AuditClient,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly metadata?: Prisma.InputJsonValue;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
    },
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      actorUserId: input.actorUserId,
      resourceId: input.resourceId,
      resourceType: WORK_TYPE_RESOURCE_TYPE,
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
