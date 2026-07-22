import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
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

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

const WORK_TYPE_MUTATION_FIELDS = ["basePriceMinor", "description", "name", "unit"] as const satisfies readonly (keyof UpdateWorkTypeDto)[];

@Injectable()
export class WorkTypesService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkTypeCodeService) private readonly workTypeCodeService: WorkTypeCodeService,
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
    return toWorkTypeDetailView(workType);
  }

  public async createWorkType(context: ActorContext, dto: CreateWorkTypeDto): Promise<WorkTypeDetailView> {
    const workType = await this.prisma.$transaction(async (tx) => {
      const code = await this.workTypeCodeService.generate(tx);
      const data: Prisma.WorkTypeUncheckedCreateInput = {
        basePriceMinor: dto.basePriceMinor,
        code,
        createdByUserId: context.actorUserId,
        name: dto.name,
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
        metadata: { basePriceMinor: dto.basePriceMinor, code, name: dto.name },
        requestMetadata: context.requestMetadata,
        resourceId: createdWorkType.id,
      });

      return createdWorkType;
    });

    return toWorkTypeDetailView(workType);
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
        },
      });
      const changedFields = this.getChangedFields(before, updatedWorkType);

      if (changedFields.length > 0) {
        const priceChanged = before.basePriceMinor !== updatedWorkType.basePriceMinor;
        await this.recordAudit(tx, {
          action: priceChanged ? WORK_TYPES_AUDIT_ACTIONS.priceUpdated : WORK_TYPES_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: {
            changedFields,
            code: before.code,
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
        metadata: { code: workType.code },
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
        metadata: { code: workType.code },
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
      case "description":
        data.description = typeof value === "number" ? null : value;
        return;
      case "name":
        if (typeof value === "string") {
          data.name = value;
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
