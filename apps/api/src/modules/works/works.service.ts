import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "../settings/settings.constants.js";
import { WORK_ORDER_AUDIT_ACTIONS, WORK_ORDER_RESOURCE_TYPE } from "./works.constants.js";
import type { CreateWorkDto, ListWorksQueryDto, UpdateWorkDto } from "./dto/works.dto.js";
import { WorkOrderCodeService } from "./work-order-code.service.js";
import {
  type PaginatedWorksView,
  type WorkDetailView,
  type WorkOrderRecord,
  type WorkTypeFormOptionView,
  toWorkDetailView,
  toWorkSummaryView,
  toWorkTypeFormOptionView,
} from "./works.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

interface PricingSnapshot {
  readonly baseUnitPriceMinor: number;
  readonly currency: string;
  readonly totalPriceMinor: number;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

const WORK_ORDER_INCLUDE = {
  clinic: true,
  doctor: true,
  workType: true,
} as const satisfies Prisma.WorkOrderInclude;

const WORK_ORDER_MUTATION_FIELDS = [
  "clinicId",
  "doctorId",
  "workTypeId",
  "patientName",
  "patientReference",
  "quantity",
  "priority",
  "requestedDeliveryDate",
  "externalReference",
  "internalNotes",
  "clinicalNotes",
] as const satisfies readonly (keyof UpdateWorkDto)[];

@Injectable()
export class WorksService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkOrderCodeService) private readonly workOrderCodeService: WorkOrderCodeService,
  ) {}

  public async listWorks(query: ListWorksQueryDto, includePricing: boolean): Promise<PaginatedWorksView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const where: Prisma.WorkOrderWhereInput = {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            requestedDeliveryDate: {
              ...(query.dateFrom ? { gte: parseDateOnly(query.dateFrom, false) } : {}),
              ...(query.dateTo ? { lte: parseDateOnly(query.dateTo, false) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { patientName: { contains: search, mode: "insensitive" } },
              { patientReference: { contains: search, mode: "insensitive" } },
              { externalReference: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, workOrders] = await this.prisma.$transaction([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        include: WORK_ORDER_INCLUDE,
        orderBy: {
          [query.sortBy]: query.sortDirection,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: workOrders.map((workOrder) => toWorkSummaryView(workOrder, includePricing)),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async listWorkTypeFormOptions(): Promise<readonly WorkTypeFormOptionView[]> {
    const workTypes = await this.prisma.workType.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        code: true,
        id: true,
        name: true,
        unit: true,
      },
      where: {
        isActive: true,
      },
    });

    return workTypes.map(toWorkTypeFormOptionView);
  }

  public async getWork(workOrderId: string, includePricing: boolean): Promise<WorkDetailView> {
    const workOrder = await this.findWorkOrderOrThrow(workOrderId);
    return toWorkDetailView(workOrder, includePricing);
  }

  public async createWork(context: ActorContext, dto: CreateWorkDto): Promise<WorkDetailView> {
    const requestedDeliveryDate = parseDateOnly(dto.requestedDeliveryDate, true);

    const workOrder = await this.prisma.$transaction(async (tx) => {
      await this.validateClinic(tx, dto.clinicId, true);
      await this.validateDoctor(tx, dto.doctorId, dto.clinicId, true);
      const workType = await this.validateWorkType(tx, dto.workTypeId, true);
      const pricing = await this.createPricingSnapshot(tx, workType.basePriceMinor, dto.quantity);
      const code = await this.workOrderCodeService.generate(tx);

      const data: Prisma.WorkOrderUncheckedCreateInput = {
        baseUnitPriceMinor: pricing.baseUnitPriceMinor,
        clinicId: dto.clinicId,
        code,
        createdByUserId: context.actorUserId,
        currency: pricing.currency,
        doctorId: dto.doctorId,
        patientName: dto.patientName,
        priority: dto.priority,
        quantity: dto.quantity,
        requestedDeliveryDate,
        status: "REGISTERED",
        totalPriceMinor: pricing.totalPriceMinor,
        updatedByUserId: context.actorUserId,
        workTypeId: dto.workTypeId,
      };

      assignNullableCreateValue(data, "clinicalNotes", dto.clinicalNotes);
      assignNullableCreateValue(data, "externalReference", dto.externalReference);
      assignNullableCreateValue(data, "internalNotes", dto.internalNotes);
      assignNullableCreateValue(data, "patientReference", dto.patientReference);

      const createdWorkOrder = await tx.workOrder.create({
        data,
        include: WORK_ORDER_INCLUDE,
      });

      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: this.createAuditMetadata(createdWorkOrder),
        requestMetadata: context.requestMetadata,
        resourceId: createdWorkOrder.id,
      });

      return createdWorkOrder;
    });

    return toWorkDetailView(workOrder, true);
  }

  public async updateWork(context: ActorContext, workOrderId: string, dto: UpdateWorkDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    const data = await this.toUpdateData(before, dto, context.actorUserId);

    if (Object.keys(data).length <= 2) {
      throw new BadRequestException("No work order fields were provided.");
    }

    const after = await this.prisma.$transaction(async (tx) => {
      const updatedWorkOrder = await tx.workOrder.update({
        data,
        include: WORK_ORDER_INCLUDE,
        where: {
          id: workOrderId,
        },
      });

      const changedFields = this.getChangedFields(before, updatedWorkOrder);
      if (changedFields.length > 0) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: {
            changedFields,
            code: before.code,
            status: updatedWorkOrder.status,
          },
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
        });
      }

      return updatedWorkOrder;
    });

    return toWorkDetailView(after, true);
  }

  private async findWorkOrderOrThrow(workOrderId: string): Promise<WorkOrderRecord> {
    const workOrder = await this.prisma.workOrder.findUnique({
      include: WORK_ORDER_INCLUDE,
      where: {
        id: workOrderId,
      },
    });

    if (!workOrder) {
      throw new NotFoundException("Work order was not found.");
    }

    return workOrder;
  }

  private async toUpdateData(before: WorkOrderRecord, dto: UpdateWorkDto, actorUserId: string): Promise<Prisma.WorkOrderUncheckedUpdateInput> {
    const data: Prisma.WorkOrderUncheckedUpdateInput = {
      updatedByUserId: actorUserId,
      version: {
        increment: 1,
      },
    };

    const nextClinicId = dto.clinicId ?? before.clinicId;
    const nextDoctorId = dto.doctorId ?? before.doctorId;
    const nextQuantity = dto.quantity ?? before.quantity;

    if (dto.clinicId !== undefined) {
      await this.validateClinic(this.prisma, dto.clinicId, true);
      data.clinicId = dto.clinicId;
    }

    if (dto.doctorId !== undefined || dto.clinicId !== undefined) {
      await this.validateDoctor(this.prisma, nextDoctorId, nextClinicId, dto.doctorId !== undefined);
      data.doctorId = nextDoctorId;
    }

    if (dto.workTypeId !== undefined) {
      const workType = await this.validateWorkType(this.prisma, dto.workTypeId, true);
      const pricing = await this.createPricingSnapshot(this.prisma, workType.basePriceMinor, nextQuantity);
      data.workTypeId = dto.workTypeId;
      data.baseUnitPriceMinor = pricing.baseUnitPriceMinor;
      data.currency = pricing.currency;
      data.totalPriceMinor = pricing.totalPriceMinor;
    } else if (dto.quantity !== undefined) {
      data.totalPriceMinor = calculateTotalPriceMinor(before.baseUnitPriceMinor, dto.quantity);
    }

    for (const field of WORK_ORDER_MUTATION_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(dto, field)) {
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
    data: Prisma.WorkOrderUncheckedUpdateInput,
    field: (typeof WORK_ORDER_MUTATION_FIELDS)[number],
    value: number | string | null,
  ): void {
    switch (field) {
      case "clinicId":
      case "doctorId":
      case "workTypeId":
        return;
      case "clinicalNotes":
      case "externalReference":
      case "internalNotes":
      case "patientReference":
        data[field] = typeof value === "number" ? null : value;
        return;
      case "patientName":
        if (typeof value === "string") {
          data.patientName = value;
        }
        return;
      case "priority":
        if (value === "NORMAL" || value === "URGENT") {
          data.priority = value;
        }
        return;
      case "quantity":
        if (typeof value === "number") {
          data.quantity = value;
        }
        return;
      case "requestedDeliveryDate":
        if (typeof value === "string") {
          data.requestedDeliveryDate = parseDateOnly(value, true);
        }
        return;
    }
  }

  private async validateClinic(client: Prisma.TransactionClient | PrismaService, clinicId: string, requireActive: boolean): Promise<void> {
    const clinic = await client.clinic.findUnique({
      select: {
        isActive: true,
      },
      where: {
        id: clinicId,
      },
    });

    if (!clinic) {
      throw new BadRequestException("Clinic was not found.");
    }

    if (requireActive && !clinic.isActive) {
      throw new BadRequestException("Clinic must be active.");
    }
  }

  private async validateDoctor(
    client: Prisma.TransactionClient | PrismaService,
    doctorId: string,
    clinicId: string,
    requireActive: boolean,
  ): Promise<void> {
    const doctor = await client.doctor.findUnique({
      select: {
        clinicId: true,
        isActive: true,
      },
      where: {
        id: doctorId,
      },
    });

    if (!doctor) {
      throw new BadRequestException("Doctor was not found.");
    }

    if (doctor.clinicId !== clinicId) {
      throw new BadRequestException("Doctor must belong to the selected clinic.");
    }

    if (requireActive && !doctor.isActive) {
      throw new BadRequestException("Doctor must be active.");
    }
  }

  private async validateWorkType(
    client: Prisma.TransactionClient | PrismaService,
    workTypeId: string,
    requireActive: boolean,
  ): Promise<{ readonly basePriceMinor: number }> {
    const workType = await client.workType.findUnique({
      select: {
        basePriceMinor: true,
        isActive: true,
      },
      where: {
        id: workTypeId,
      },
    });

    if (!workType) {
      throw new BadRequestException("Work type was not found.");
    }

    if (requireActive && !workType.isActive) {
      throw new BadRequestException("Work type must be active.");
    }

    return workType;
  }

  private async createPricingSnapshot(client: Prisma.TransactionClient | PrismaService, baseUnitPriceMinor: number, quantity: number): Promise<PricingSnapshot> {
    const settings = await client.laboratorySettings.upsert({
      create: {
        ...DEFAULT_LABORATORY_SETTINGS,
        key: SETTINGS_SINGLETON_KEY,
      },
      update: {},
      where: {
        key: SETTINGS_SINGLETON_KEY,
      },
    });

    return {
      baseUnitPriceMinor,
      currency: settings.currency,
      totalPriceMinor: calculateTotalPriceMinor(baseUnitPriceMinor, quantity),
    };
  }

  private getChangedFields(before: WorkOrderRecord, after: WorkOrderRecord): readonly (typeof WORK_ORDER_MUTATION_FIELDS)[number][] {
    return WORK_ORDER_MUTATION_FIELDS.filter((field) => {
      if (field === "requestedDeliveryDate") {
        return before.requestedDeliveryDate.getTime() !== after.requestedDeliveryDate.getTime();
      }

      return before[field] !== after[field];
    });
  }

  private createAuditMetadata(workOrder: WorkOrderRecord): Prisma.InputJsonObject {
    return {
      baseUnitPriceMinor: workOrder.baseUnitPriceMinor,
      clinicId: workOrder.clinicId,
      code: workOrder.code,
      currency: workOrder.currency,
      doctorId: workOrder.doctorId,
      priority: workOrder.priority,
      quantity: workOrder.quantity,
      status: workOrder.status,
      totalPriceMinor: workOrder.totalPriceMinor,
      workTypeId: workOrder.workTypeId,
    };
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
      resourceType: WORK_ORDER_RESOURCE_TYPE,
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

export function calculateTotalPriceMinor(baseUnitPriceMinor: number, quantity: number): number {
  const total = baseUnitPriceMinor * quantity;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new BadRequestException("Work order price snapshot is invalid.");
  }

  return total;
}

export function assignNullableCreateValue(
  data: Prisma.WorkOrderUncheckedCreateInput,
  field: "clinicalNotes" | "externalReference" | "internalNotes" | "patientReference",
  value: string | null | undefined,
): void {
  if (value !== undefined) {
    data[field] = value;
  }
}

export function parseDateOnly(value: string, rejectPast: boolean): Date {
  const datePart = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new BadRequestException("Date must use ISO date format.");
  }

  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Date is invalid.");
  }

  if (rejectPast) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (date.getTime() < today.getTime()) {
      throw new BadRequestException("Requested delivery date cannot be in the past.");
    }
  }

  return date;
}
