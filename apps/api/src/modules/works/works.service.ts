import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { PatientsService } from "../patients/patients.service.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "../settings/settings.constants.js";
import { WorkQrTokenService } from "../qr/work-qr-token.service.js";
import { WorkFormSubmissionValidationService } from "../work-forms/work-form-submission-validation.service.js";
import { WorkflowExecutionService } from "../workflow-execution/workflow-execution.service.js";
import { WORK_ORDER_AUDIT_ACTIONS, WORK_ORDER_RESOURCE_TYPE } from "./works.constants.js";
import type { CreateWorkDto, ListWorksQueryDto, RecalculateWorkDeadlineDto, SetManualWorkDeadlineDto, UpdateWorkDto, WorkDeadlinePreviewDto } from "./dto/works.dto.js";
import { deadlineDataToPrisma, WorkDeadlineService } from "./work-deadline.service.js";
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
  patient: true,
  workFormSubmission: true,
  workType: true,
  workflowExecution: {
    include: {
      events: {
        include: {
          actor: {
            select: {
              displayName: true,
              id: true,
            },
          },
        },
      },
      stages: {
        include: {
          completedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          startedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          assignedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          assignedUser: {
            select: {
              displayName: true,
              email: true,
              id: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

const WORK_ORDER_MUTATION_FIELDS = [
  "clinicId",
  "doctorId",
  "workTypeId",
  "patientId",
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
    @Inject(PatientsService) private readonly patientsService: PatientsService,
    @Inject(WorkOrderCodeService) private readonly workOrderCodeService: WorkOrderCodeService,
    @Inject(WorkQrTokenService) private readonly workQrTokenService: WorkQrTokenService,
    @Inject(WorkFormSubmissionValidationService) private readonly workFormSubmissionValidationService: WorkFormSubmissionValidationService,
    @Inject(WorkflowExecutionService) private readonly workflowExecutionService: WorkflowExecutionService,
    @Inject(WorkDeadlineService) private readonly workDeadlineService: WorkDeadlineService,
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

  public async previewDeadline(legalEntity: LegalEntityContext, dto: WorkDeadlinePreviewDto, canSetManualDeadline: boolean) {
    await this.validateClinic(this.prisma, dto.clinicId, true);
    await this.validateDoctor(this.prisma, dto.doctorId, dto.clinicId, true);
    await this.validateWorkType(this.prisma, dto.workTypeId, true);
    if (dto.manualDueAt && !canSetManualDeadline) {
      throw new BadRequestException("Nu ai permisiunea necesară pentru termen manual.");
    }

    return this.workDeadlineService.preview({
      clinicId: dto.clinicId,
      doctorId: dto.doctorId,
      legalEntity,
      ...(dto.manualDueAt !== undefined ? { manualDueAt: dto.manualDueAt } : {}),
      now: new Date(),
      quantity: dto.quantity,
      ...(dto.startAt !== undefined ? { startAt: dto.startAt } : {}),
      workTypeId: dto.workTypeId,
    });
  }

  public async createWork(context: ActorContext, legalEntity: LegalEntityContext, dto: CreateWorkDto, canSetManualDeadline: boolean): Promise<WorkDetailView> {
    const requestedDeliveryDate = parseDateOnly(dto.requestedDeliveryDate, true);
    const operationNow = new Date();
    const manualDueAt = dto.manualDueAt ? new Date(dto.manualDueAt) : null;
    if (manualDueAt && !canSetManualDeadline) {
      throw new BadRequestException("Nu ai permisiunea necesară pentru termen manual.");
    }

    const workOrder = await this.prisma.$transaction(async (tx) => {
      await this.validateClinic(tx, dto.clinicId, true);
      await this.validateDoctor(tx, dto.doctorId, dto.clinicId, true);
      this.rejectConflictingPatientPayload(dto.patientId, dto.patientName);
      const patient = await this.patientsService.findActivePatientOrThrow(tx, dto.patientId);
      const workType = await this.validateWorkType(tx, dto.workTypeId, true);
      const pricing = await this.createPricingSnapshot(tx, workType.basePriceMinor, dto.quantity);
      const deadline = await this.workDeadlineService.resolveForWork({
        clinicId: dto.clinicId,
        doctorId: dto.doctorId,
        legalEntity,
        manualDueAt,
        now: operationNow,
        quantity: dto.quantity,
        source: manualDueAt ? "MANUAL_OVERRIDE" : "CREATION",
        startAt: operationNow,
        workTypeId: dto.workTypeId,
      });
      const code = await this.workOrderCodeService.generate(tx);
      const qrToken = await this.workQrTokenService.generate(tx);
      const preparedSubmission = await this.workFormSubmissionValidationService.prepareCreate(tx, {
        actorUserId: context.actorUserId,
        submission: dto.workFormSubmission,
        workCode: code,
        workTypeId: dto.workTypeId,
      });

      const data: Prisma.WorkOrderUncheckedCreateInput = {
        baseUnitPriceMinor: pricing.baseUnitPriceMinor,
        clinicId: dto.clinicId,
        code,
        createdByUserId: context.actorUserId,
        currency: pricing.currency,
        ...deadlineDataToPrisma(deadline, 1),
        doctorId: dto.doctorId,
        patientId: patient.id,
        patientName: toPatientSnapshotName(patient),
        priority: dto.priority,
        qrToken,
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
      if (preparedSubmission) {
        data.workFormSubmission = {
          create: preparedSubmission.data,
        };
      }

      const createdWorkOrder = await tx.workOrder.create({
        data,
        include: WORK_ORDER_INCLUDE,
      });

      await this.workflowExecutionService.createSnapshotForWork(tx, {
        actorUserId: context.actorUserId,
        ...(dto.expectedWorkflowTemplateId ? { expectedWorkflowTemplateId: dto.expectedWorkflowTemplateId } : {}),
        ...(dto.expectedWorkflowTemplateVersion ? { expectedWorkflowTemplateVersion: dto.expectedWorkflowTemplateVersion } : {}),
        requestMetadata: context.requestMetadata,
        workCode: createdWorkOrder.code,
        workOrderId: createdWorkOrder.id,
        workTypeId: createdWorkOrder.workTypeId,
      });

      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: this.createAuditMetadata(createdWorkOrder),
        requestMetadata: context.requestMetadata,
        resourceId: createdWorkOrder.id,
      });
      await this.recordAudit(tx, {
        action: deadline.deadlineMode === "UNRESOLVED" ? WORK_ORDER_AUDIT_ACTIONS.deadlineUnresolved : WORK_ORDER_AUDIT_ACTIONS.deadlineCreated,
        actorUserId: context.actorUserId,
        metadata: this.createDeadlineAuditMetadata(null, createdWorkOrder, deadline.deadlineReasonCode ?? "creation"),
        requestMetadata: context.requestMetadata,
        resourceId: createdWorkOrder.id,
      });
      if (preparedSubmission) {
        await this.workFormSubmissionValidationService.recordSubmissionAudit(tx, {
          action: preparedSubmission.audit.action,
          actorUserId: context.actorUserId,
          metadata: {
            ...preparedSubmission.audit.metadata,
            workId: createdWorkOrder.id,
          },
          requestMetadata: context.requestMetadata,
          resourceId: createdWorkOrder.id,
        });
      }

      return tx.workOrder.findUniqueOrThrow({
        include: WORK_ORDER_INCLUDE,
        where: {
          id: createdWorkOrder.id,
        },
      });
    });

    return toWorkDetailView(workOrder, true);
  }

  public async updateWork(context: ActorContext, legalEntity: LegalEntityContext, workOrderId: string, dto: UpdateWorkDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.rejectConflictingPatientPayload(dto.patientId, dto.patientName);
    const data = await this.toUpdateData(before, dto, context.actorUserId);
    const isWorkTypeChanging = dto.workTypeId !== undefined && dto.workTypeId !== before.workTypeId;

    if (isWorkTypeChanging && dto.confirmWorkTypeChange !== true) {
      throw new BadRequestException("Schimbarea tipului de lucrare trebuie confirmată explicit.");
    }

    if (!isWorkTypeChanging && dto.workFormSubmission !== undefined) {
      throw new BadRequestException("Versiunea formularului nu poate fi schimbată pentru același tip de lucrare.");
    }

    if (Object.keys(data).length <= 2 && dto.workFormValues === undefined && dto.workFormSubmission === undefined) {
      throw new BadRequestException("No work order fields were provided.");
    }

    const candidateChangedFields = WORK_ORDER_MUTATION_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(dto, field) && isDtoFieldChanged(before, dto, field));
    const shouldRecalculateDeadline = this.workDeadlineService.shouldRecalculate(candidateChangedFields, before.deadlineLockedAt !== null);
    if (shouldRecalculateDeadline) {
      if (dto.expectedDeadlineRevision === undefined) {
        throw new BadRequestException("expectedDeadlineRevision este obligatoriu pentru modificări care pot recalcula termenul.");
      }
      this.workDeadlineService.assertExpectedRevision(before.deadlineRevision, dto.expectedDeadlineRevision);
    }

    const deadline = shouldRecalculateDeadline
      ? await this.workDeadlineService.resolveForWork({
          clinicId: dto.clinicId ?? before.clinicId,
          doctorId: dto.doctorId ?? before.doctorId,
          includeStartDay: before.deadlineIncludeStartDay ?? false,
          legalEntity,
          now: new Date(),
          quantity: dto.quantity ?? before.quantity,
          source: "WORK_UPDATE",
          startAt: before.deadlineStartAt ?? before.createdAt,
          workTypeId: dto.workTypeId ?? before.workTypeId,
        })
      : null;
    if (deadline) {
      Object.assign(data, deadlineDataToPrisma(deadline, before.deadlineRevision + 1));
    }

    const after = await this.prisma.$transaction(async (tx) => {
      if (isWorkTypeChanging) {
        const replacement = await this.workFormSubmissionValidationService.prepareReplaceForWorkTypeChange(tx, {
          actorUserId: context.actorUserId,
          existingSubmission: before.workFormSubmission,
          newSubmission: dto.workFormSubmission,
          nextWorkTypeId: dto.workTypeId ?? before.workTypeId,
          oldWorkTypeId: before.workTypeId,
          workCode: before.code,
          workId: workOrderId,
        });

        if (replacement.deleteExisting) {
          await tx.workFormSubmission.deleteMany({
            where: {
              workOrderId,
            },
          });
        }

        if (replacement.create) {
          await tx.workFormSubmission.create({
            data: {
              ...replacement.create,
              workOrderId,
            },
          });
        }

        if (replacement.audit) {
          await this.workFormSubmissionValidationService.recordSubmissionAudit(tx, {
            action: replacement.audit.action,
            actorUserId: context.actorUserId,
            metadata: replacement.audit.metadata,
            requestMetadata: context.requestMetadata,
            resourceId: workOrderId,
          });
        }
      } else if (dto.workFormValues !== undefined) {
        const preparedUpdate = this.workFormSubmissionValidationService.prepareUpdateValues(before.workFormSubmission, dto.workFormValues, {
          actorUserId: context.actorUserId,
          workCode: before.code,
          workId: workOrderId,
        });
        await tx.workFormSubmission.update({
          data: preparedUpdate.data,
          where: {
            workOrderId,
          },
        });

        if (preparedUpdate.audit) {
          await this.workFormSubmissionValidationService.recordSubmissionAudit(tx, {
            action: preparedUpdate.audit.action,
            actorUserId: context.actorUserId,
            metadata: preparedUpdate.audit.metadata,
            requestMetadata: context.requestMetadata,
            resourceId: workOrderId,
          });
        }
      }

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
      if (deadline) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.updatedWithDeadlineRecalculation,
          actorUserId: context.actorUserId,
          metadata: this.createDeadlineAuditMetadata(before, updatedWorkOrder, "work_update", changedFields),
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
        });
      }

      return updatedWorkOrder;
    });

    return toWorkDetailView(after, true);
  }

  public async recalculateDeadline(context: ActorContext, legalEntity: LegalEntityContext, workOrderId: string, dto: RecalculateWorkDeadlineDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.workDeadlineService.assertExpectedRevision(before.deadlineRevision, dto.expectedRevision);
    if (before.deadlineLockedAt !== null) {
      throw new BadRequestException("Termenul manual locked nu poate fi recalculat automat.");
    }
    const operationNow = new Date();
    const deadline = await this.workDeadlineService.resolveForWork({
      clinicId: before.clinicId,
      doctorId: before.doctorId,
      includeStartDay: dto.includeStartDay ?? before.deadlineIncludeStartDay ?? false,
      legalEntity,
      now: operationNow,
      quantity: before.quantity,
      source: "MANUAL_RECALCULATION",
      startAt: before.deadlineStartAt ?? before.createdAt,
      workTypeId: before.workTypeId,
    });
    const after = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        data: {
          ...deadlineDataToPrisma(deadline, before.deadlineRevision + 1),
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      await this.recordAudit(tx, {
        action: deadline.deadlineMode === "UNRESOLVED" ? WORK_ORDER_AUDIT_ACTIONS.deadlineUnresolved : WORK_ORDER_AUDIT_ACTIONS.deadlineRecalculated,
        actorUserId: context.actorUserId,
        metadata: this.createDeadlineAuditMetadata(before, updated, "manual_recalculation"),
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      return updated;
    });

    return toWorkDetailView(after, true);
  }

  public async setManualDeadline(context: ActorContext, legalEntity: LegalEntityContext, workOrderId: string, dto: SetManualWorkDeadlineDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.workDeadlineService.assertExpectedRevision(before.deadlineRevision, dto.expectedRevision);
    const operationNow = new Date();
    const deadline = await this.workDeadlineService.resolveForWork({
      clinicId: before.clinicId,
      doctorId: before.doctorId,
      includeStartDay: before.deadlineIncludeStartDay ?? false,
      legalEntity,
      manualDueAt: new Date(dto.dueAt),
      now: operationNow,
      quantity: before.quantity,
      source: "MANUAL_OVERRIDE",
      startAt: before.deadlineStartAt ?? before.createdAt,
      workTypeId: before.workTypeId,
    });
    const after = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        data: {
          ...deadlineDataToPrisma({
            ...deadline,
            deadlineLockedReason: dto.reason ?? deadline.deadlineLockedReason,
          }, before.deadlineRevision + 1),
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.deadlineManualSet,
        actorUserId: context.actorUserId,
        metadata: this.createDeadlineAuditMetadata(before, updated, dto.reason ?? "manual_override"),
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      return updated;
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

    if (dto.patientId !== undefined) {
      const patient = await this.patientsService.findActivePatientOrThrow(this.prisma, dto.patientId);
      data.patientId = patient.id;
      data.patientName = toPatientSnapshotName(patient);
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
      case "patientId":
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
      patientId: workOrder.patientId,
      totalPriceMinor: workOrder.totalPriceMinor,
      workTypeId: workOrder.workTypeId,
    };
  }

  private createDeadlineAuditMetadata(before: WorkOrderRecord | null, after: WorkOrderRecord, reason: string, triggerFields: readonly string[] = []): Prisma.InputJsonObject {
    return {
      newEffectiveDueAt: after.effectiveDueAt?.toISOString() ?? null,
      newMode: after.deadlineMode,
      newRevision: after.deadlineRevision,
      previousEffectiveDueAt: before?.effectiveDueAt?.toISOString() ?? null,
      previousMode: before?.deadlineMode ?? null,
      previousRevision: before?.deadlineRevision ?? 0,
      reason,
      triggerFields,
      workCode: after.code,
    };
  }

  private rejectConflictingPatientPayload(patientId: string | undefined, patientName: string | undefined): void {
    if (patientId !== undefined && patientName !== undefined) {
      throw new BadRequestException("Trimite fie pacient existent, fie nume legacy, nu ambele.");
    }
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

export function toPatientSnapshotName(patient: { readonly firstName: string; readonly lastName: string }): string {
  return `${patient.firstName} ${patient.lastName}`.trim();
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

function isDtoFieldChanged(before: WorkOrderRecord, dto: UpdateWorkDto, field: (typeof WORK_ORDER_MUTATION_FIELDS)[number]): boolean {
  const value = dto[field];
  if (value === undefined) {
    return false;
  }

  if (field === "requestedDeliveryDate" && typeof value === "string") {
    return before.requestedDeliveryDate.getTime() !== parseDateOnly(value, true).getTime();
  }

  return before[field] !== value;
}
