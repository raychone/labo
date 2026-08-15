import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WorkFormTemplateKind, WorkStageEventType, WorkStageExecutionStatus, type Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { PatientsService } from "../patients/patients.service.js";
import { AuthorizationService, doesScopeSatisfy } from "../rbac/authorization.service.js";
import type { PermissionKey } from "../rbac/permission-registry.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "../settings/settings.constants.js";
import { WorkQrTokenService } from "../qr/work-qr-token.service.js";
import { PricingResolverService, type PricingResolution } from "../pricing/pricing-resolver.service.js";
import { WorkFormSubmissionValidationService } from "../work-forms/work-form-submission-validation.service.js";
import { WORK_FORM_SUBMISSIONS_RESOURCE_TYPE, WORK_FORMS_AUDIT_ACTIONS } from "../work-forms/work-forms.constants.js";
import { WorkflowExecutionService } from "../workflow-execution/workflow-execution.service.js";
import { WORK_ORDER_AUDIT_ACTIONS, WORK_ORDER_RESOURCE_TYPE } from "./works.constants.js";
import type {
  ClaimWorkDto,
  CreateNextWorkCycleDto,
  CreateWorkDto,
  ListClaimWorksQueryDto,
  ListWorksQueryDto,
  ReassignWorkDto,
  RecalculateWorkDeadlineDto,
  ReleaseWorkDto,
  SetManualWorkDeadlineDto,
  UpdateWorkDto,
  UpsertRealLabSheetDto,
  FinalizeRealLabSheetDto,
  WorkDeadlinePreviewDto,
} from "./dto/works.dto.js";
import { deadlineDataToPrisma, WorkDeadlineService } from "./work-deadline.service.js";
import type { WorkDeadlineData } from "./work-deadline.service.js";
import {
  EXECUTION_SNAPSHOT_VERSION,
  buildDeadlineSnapshot,
  buildExecutionContextSnapshot,
  buildPricingSnapshot,
  getPricingSourceLabel,
  getPricingSourceType,
  type ExecutionSnapshotSource,
} from "./work-execution-snapshot.js";
import { accumulateDeadlineDashboardSummary, createEmptyDeadlineDashboardSummary, isDeadlineInFilter } from "./work-deadline-visual.js";
import { WorkOrderCodeService } from "./work-order-code.service.js";
import {
  type PaginatedWorksView,
  type WorkDetailView,
  type WorkOrderRecord,
  createWorkClaimAccess,
  type WorkTypeFormOptionView,
  toWorkDetailView,
  toWorkSummaryView,
  toWorkTypeFormOptionView,
  type WorkAssignmentEventView,
  toWorkAssignmentEventView,
  type WorkClaimAccessViewInput,
  workCycleHistoryInclude,
  type WorkCyclesHistoryView,
  toWorkCyclesHistoryView,
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

type WorkDeadlinePrismaUpdate = ReturnType<typeof deadlineDataToPrisma>;

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;
type RealLabSheetSnapshot = Parameters<WorkFormSubmissionValidationService["validateValues"]>[0];

const WORK_ORDER_INCLUDE = {
  assignedTechnician: {
    select: {
      displayName: true,
      id: true,
      preferredColor: true,
    },
  },
  assignmentEvents: {
    include: {
      actor: {
        select: {
          displayName: true,
          id: true,
          preferredColor: true,
        },
      },
      newLegalEntity: {
        select: {
          code: true,
          displayName: true,
        },
      },
      newTechnician: {
        select: {
          displayName: true,
          id: true,
          preferredColor: true,
        },
      },
      previousLegalEntity: {
        select: {
          code: true,
          displayName: true,
        },
      },
      previousTechnician: {
        select: {
          displayName: true,
          id: true,
          preferredColor: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  },
  clinic: true,
  doctor: true,
  executionLegalEntity: {
    select: {
      code: true,
      displayName: true,
    },
  },
  activeCycle: {
    include: {
      executionSnapshot: {
        include: {
          executionLegalEntity: {
            select: {
              code: true,
              displayName: true,
              id: true,
            },
          },
          technician: {
            select: {
              displayName: true,
              id: true,
              preferredColor: true,
            },
          },
        },
      },
      logisticsState: {
        select: {
          status: true,
        },
      },
      workflowExecution: {
        include: {
          events: {
            include: {
              actor: {
                select: {
                  displayName: true,
                  id: true,
                  preferredColor: true,
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
                  preferredColor: true,
                },
              },
              startedBy: {
                select: {
                  displayName: true,
                  id: true,
                  preferredColor: true,
                },
              },
              assignedBy: {
                select: {
                  displayName: true,
                  id: true,
                  preferredColor: true,
                },
              },
              assignedUser: {
                select: {
                  displayName: true,
                  email: true,
                  id: true,
                  preferredColor: true,
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  },
  patient: true,
  workFormSubmissions: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    where: {
      templateKind: "GENERIC",
    },
  },
  workType: true,
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

const REAL_LAB_SHEET_TEMPLATE_INCLUDE = {
  fields: {
    orderBy: {
      sortOrder: "asc",
    },
  },
} as const;

const REAL_LAB_SHEET_WORK_INCLUDE = {
  activeCycle: true,
  assignedTechnician: {
    select: {
      id: true,
    },
  },
  doctor: {
    select: {
      displayName: true,
      id: true,
    },
  },
  patient: true,
  workType: {
    select: {
      id: true,
      name: true,
    },
  },
  cycles: {
    include: {
      doctor: {
        select: {
          displayName: true,
          id: true,
        },
      },
      workFormSubmissions: {
        include: {
          finalizedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          updatedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        where: {
          templateKind: "REAL_LAB_SHEET",
        },
      },
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

type RealLabSheetWorkRecord = Prisma.WorkOrderGetPayload<{ include: typeof REAL_LAB_SHEET_WORK_INCLUDE }>;
type RealLabSheetCycleRecord = RealLabSheetWorkRecord["cycles"][number];

type WorkFormValue = boolean | number | readonly string[] | string | null;
type WorkFormValues = Readonly<Record<string, WorkFormValue>>;
export interface RealLabSheetView {
  readonly canEdit: boolean;
  readonly canFinalize: boolean;
  readonly canMarkComplete: boolean;
  readonly cycleNumber: number;
  readonly fields: readonly {
    readonly key: string;
    readonly label: string;
    readonly helpText: string | null;
    readonly type: string;
    readonly required: boolean;
    readonly sortOrder: number;
    readonly placeholder: string | null;
    readonly defaultValue: WorkFormValue;
    readonly options: readonly { readonly label: string; readonly value: string }[];
    readonly validation: unknown;
    readonly sectionKey?: string | null;
    readonly sectionLabel?: string | null;
    readonly roleOwner?: string;
    readonly editableUntil?: string;
    readonly cycleScope?: string;
    readonly copyToNextCyclePolicy?: string;
    readonly printable?: boolean;
    readonly sourceKind?: string;
  }[];
  readonly finalizedAt: string | null;
  readonly finalizedBy: { readonly displayName: string; readonly publicId: string } | null;
  readonly isFinalized: boolean;
  readonly isReadOnly: boolean;
  readonly lastModifiedAt: string | null;
  readonly lastModifiedBy: { readonly displayName: string; readonly publicId: string } | null;
  readonly revision: number;
  readonly status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "FINALIZED";
  readonly submittedAt: string;
  readonly templateId: string | null;
  readonly templateKind: string;
  readonly templateName: string;
  readonly templateVersion: number;
  readonly updatedAt: string;
  readonly values: WorkFormValues;
  readonly workCycleId: string;
  readonly workOrderId: string;
}

@Injectable()
export class WorksService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PatientsService) private readonly patientsService: PatientsService,
    @Inject(WorkOrderCodeService) private readonly workOrderCodeService: WorkOrderCodeService,
    @Inject(WorkQrTokenService) private readonly workQrTokenService: WorkQrTokenService,
    @Inject(WorkFormSubmissionValidationService) private readonly workFormSubmissionValidationService: WorkFormSubmissionValidationService,
    @Inject(WorkflowExecutionService) private readonly workflowExecutionService: WorkflowExecutionService,
    @Inject(WorkDeadlineService) private readonly workDeadlineService: WorkDeadlineService,
    @Inject(PricingResolverService) private readonly pricingResolverService: PricingResolverService,
  ) {}

  public async listWorks(actorUserId: string, query: ListWorksQueryDto, includePricing: boolean): Promise<PaginatedWorksView> {
    const access = await this.createClaimAccess(actorUserId);
    return this.listWorksWithWhere(query, includePricing, access, await this.getVisibleWorkWhere(actorUserId), {});
  }

  public async listAvailableForClaim(actorUserId: string, query: ListClaimWorksQueryDto): Promise<PaginatedWorksView> {
    await this.authorizationService.requirePermission({
      permission: "works.claim.available.read",
      requiredScope: "ALL",
      userId: actorUserId,
    });
    const access = await this.createClaimAccess(actorUserId);
    return this.listWorksWithWhere(query, false, access, await this.getVisibleWorkWhere(actorUserId), { claimStatus: "UNCLAIMED" });
  }

  public async listMyClaimed(actorUserId: string, query: ListClaimWorksQueryDto): Promise<PaginatedWorksView> {
    await this.authorizationService.requirePermission({
      permission: "works.claim.own.read",
      requiredScope: "ASSIGNED",
      userId: actorUserId,
    });
    const access = await this.createClaimAccess(actorUserId);
    return this.listWorksWithWhere(query, false, access, await this.getVisibleWorkWhere(actorUserId), {
      assignedTechnicianId: actorUserId,
      claimStatus: "CLAIMED",
    });
  }

  private async listWorksWithWhere(
    query: ListWorksQueryDto,
    includePricing: boolean,
    access: WorkClaimAccessViewInput,
    visibilityWhere: Prisma.WorkOrderWhereInput,
    enforcedWhere: Prisma.WorkOrderWhereInput,
  ): Promise<PaginatedWorksView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const now = new Date();
    const where: Prisma.WorkOrderWhereInput = {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.claimStatus ? { claimStatus: query.claimStatus } : {}),
      ...(query.assignedTechnicianId ? { assignedTechnicianId: query.assignedTechnicianId } : {}),
      ...(query.executionLegalEntityCode ? { executionLegalEntity: { code: query.executionLegalEntityCode } } : {}),
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
      ...visibilityWhere,
      ...enforcedWhere,
    };

    const allMatchingWorkOrders = await this.prisma.workOrder.findMany({
      include: WORK_ORDER_INCLUDE,
      orderBy: {
        [query.sortBy]: query.sortDirection,
      },
      where,
    });
    const filteredWorkOrders = query.deadlineFilter
      ? allMatchingWorkOrders.filter((workOrder) => isDeadlineInFilter({
          effectiveDueAt: workOrder.effectiveDueAt?.toISOString() ?? null,
          mode: workOrder.deadlineMode,
          now: now.toISOString(),
        }, query.deadlineFilter ?? "ALL"))
      : allMatchingWorkOrders;
    const total = filteredWorkOrders.length;
    const workOrders = filteredWorkOrders.slice((page - 1) * pageSize, page * pageSize);

    return {
      deadlineDashboard: this.createDeadlineDashboardSummary(allMatchingWorkOrders, now),
      items: workOrders.map((workOrder) => toWorkSummaryView(workOrder, includePricing, access)),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  private createDeadlineDashboardSummary(workOrders: readonly WorkOrderRecord[], now: Date) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    return workOrders.reduce((summary, workOrder) => accumulateDeadlineDashboardSummary(summary, {
      effectiveDueAt: workOrder.effectiveDueAt?.toISOString() ?? null,
      mode: workOrder.deadlineMode,
      now: now.toISOString(),
    }, isCompletedOnTimeInWindow(workOrder, sevenDaysAgo)), createEmptyDeadlineDashboardSummary());
  }

  private async getVisibleWorkWhere(userId: string): Promise<Prisma.WorkOrderWhereInput> {
    const [readAll, readAssigned, readAvailable] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "works.read_all", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "works.read_assigned", userId }),
      this.authorizationService.hasPermission({ permission: "works.claim.available.read", requiredScope: "ALL", userId }),
    ]);

    if (readAll.allowed) {
      return {};
    }
    if (!readAssigned.allowed) {
      if (!readAvailable.allowed) {
        throw new ForbiddenException("Permission denied.");
      }
    }

    const scopes = readAssigned.effectiveScopes;
    const canReadAssigned = scopes.some((scope) => doesScopeSatisfy(scope, "ASSIGNED") || doesScopeSatisfy(scope, "OWN_STAGE"));

    if (!canReadAssigned && !readAvailable.allowed) {
      return { id: "__no_visible_work__" };
    }

    return {
      OR: [
        { assignedTechnicianId: userId },
        { claimedByUserId: userId },
        ...(readAvailable.allowed ? [{ claimStatus: "UNCLAIMED" as const }] : []),
        { activeCycle: { is: { workflowExecution: { is: { currentStage: { is: { assignedUserId: userId } } } } } } },
        { activeCycle: { is: { workflowExecution: { is: { stages: { some: { assignedUserId: userId } } } } } } },
      ],
    };
  }

  private async findVisibleWorkOrderOrThrow(userId: string, workOrderId: string): Promise<WorkOrderRecord> {
    const workOrder = await this.prisma.workOrder.findFirst({
      include: WORK_ORDER_INCLUDE,
      where: {
        AND: [{ id: workOrderId }, await this.getVisibleWorkWhere(userId)],
      },
    });

    if (!workOrder) {
      throw new NotFoundException("Work order was not found.");
    }

    return workOrder;
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

  public async getWork(actorUserId: string, workOrderId: string, includePricing: boolean): Promise<WorkDetailView> {
    const workOrder = await this.findVisibleWorkOrderOrThrow(actorUserId, workOrderId);
    return toWorkDetailView(workOrder, includePricing, await this.createClaimAccess(actorUserId));
  }

  public async listCycles(actorUserId: string, workOrderId: string, includePricing: boolean): Promise<WorkCyclesHistoryView> {
    await this.authorizationService.requirePermission({
      permission: "cycles.history.read",
      requiredScope: "ASSIGNED",
      userId: actorUserId,
    });
    const workOrder = await this.prisma.workOrder.findFirst({
      include: workCycleHistoryInclude,
      where: {
        AND: [{ id: workOrderId }, await this.getVisibleWorkWhere(actorUserId)],
      },
    });
    if (!workOrder) {
      throw new NotFoundException("Work order was not found.");
    }
    return toWorkCyclesHistoryView(workOrder, includePricing);
  }

  public async getRealLabSheet(actorUserId: string, workOrderId: string, cycleId: string): Promise<RealLabSheetView> {
    const { cycle, workOrder } = await this.findRealLabSheetContextOrThrow(workOrderId, cycleId);
    const isHistorical = cycle.status !== "ACTIVE" || workOrder.activeCycleId !== cycle.id;
    await this.requireRealLabSheetPermission(actorUserId, workOrder, isHistorical ? "work_forms.real.history.read" : "work_forms.real.read");

    return this.toRealLabSheetView(workOrder, cycle, await this.getActiveRealLabSheetTemplate(workOrder.workTypeId), actorUserId);
  }

  public async upsertRealLabSheet(context: ActorContext, workOrderId: string, cycleId: string, dto: UpsertRealLabSheetDto): Promise<RealLabSheetView> {
    const { cycle, workOrder } = await this.findRealLabSheetContextOrThrow(workOrderId, cycleId);
    await this.requireRealLabSheetPermission(context.actorUserId, workOrder, "work_forms.real.update");
    this.ensureCycleSheetEditable(workOrder, cycle);

    const template = await this.getActiveRealLabSheetTemplate(workOrder.workTypeId);
    if (!template) {
      throw new BadRequestException("Nu există o fișă de laborator activă pentru acest tip de lucrare.");
    }
    this.workFormSubmissionValidationService.ensureActiveTemplateMatches(template, dto.templateId, dto.templateVersion);

    const snapshot = this.workFormSubmissionValidationService.createSnapshot(template);
    const saveMode = dto.saveMode ?? "DRAFT";
    const values = this.workFormSubmissionValidationService.validateValues(snapshot, {
      ...dto.values,
      ...this.getRealLabSheetDerivedValues(workOrder, cycle),
    }, { enforceRequired: saveMode === "COMPLETE" });
    const existing = cycle.workFormSubmissions[0] ?? null;
    await this.assertExpectedRealLabSheetRevision(context, workOrder, cycle, existing, dto.expectedRevision);
    const nextStatus = saveMode === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
    const previousValues = existing ? existing.values as unknown as WorkFormValues : {};
    const changedFieldKeys = getChangedWorkFormValueKeys(previousValues, values);

    const updated = await this.prisma.$transaction(async (tx) => {
      const submission = existing
        ? await tx.workFormSubmission.update({
            data: {
              realLabSheetStatus: nextStatus,
              revision: {
                increment: 1,
              },
              schemaSnapshot: snapshot as unknown as Prisma.InputJsonObject,
              templateId: template.id,
              templateNameSnapshot: template.name,
              templateVersion: template.version,
              updatedByUserId: context.actorUserId,
              values: values as unknown as Prisma.InputJsonObject,
            },
            include: {
              finalizedBy: {
                select: {
                  displayName: true,
                  id: true,
                },
              },
              updatedBy: {
                select: {
                  displayName: true,
                  id: true,
                },
              },
            },
            where: {
              id: existing.id,
            },
          })
        : await tx.workFormSubmission.create({
            data: {
              schemaSnapshot: snapshot as unknown as Prisma.InputJsonObject,
              realLabSheetStatus: nextStatus,
              submittedByUserId: context.actorUserId,
              templateId: template.id,
              templateKind: WorkFormTemplateKind.REAL_LAB_SHEET,
              templateNameSnapshot: template.name,
              templateVersion: template.version,
              updatedByUserId: context.actorUserId,
              values: values as unknown as Prisma.InputJsonObject,
              workCycleId: cycle.id,
              workOrderId,
            },
            include: {
              finalizedBy: {
                select: {
                  displayName: true,
                  id: true,
                },
              },
              updatedBy: {
                select: {
                  displayName: true,
                  id: true,
                },
              },
            },
          });

      await this.recordFormAudit(tx, {
        action: saveMode === "COMPLETE"
          ? WORK_FORMS_AUDIT_ACTIONS.realLabSheetCompleted
          : existing
            ? WORK_FORMS_AUDIT_ACTIONS.realLabSheetDraftSaved
            : WORK_FORMS_AUDIT_ACTIONS.realLabSheetCreated,
        actorUserId: context.actorUserId,
        metadata: {
          changedFieldKeys,
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          previousRevision: existing?.revision ?? 0,
          status: nextStatus,
          templateId: template.id,
          templateVersion: template.version,
          workCode: workOrder.code,
          workId: workOrder.id,
        },
        requestMetadata: context.requestMetadata,
        resourceId: submission.id,
      });

      return submission;
    }).catch((error: unknown) => {
      if (isPrismaErrorCode(error, "P2002")) {
        throw new ConflictException("Fișa acestui ciclu există deja. Reîncarcă lucrarea.");
      }
      throw error;
    });

    return this.toRealLabSheetView(workOrder, { ...cycle, workFormSubmissions: [updated] }, template, context.actorUserId);
  }

  public async finalizeRealLabSheet(context: ActorContext, workOrderId: string, cycleId: string, dto: FinalizeRealLabSheetDto = {}): Promise<RealLabSheetView> {
    const { cycle, workOrder } = await this.findRealLabSheetContextOrThrow(workOrderId, cycleId);
    await this.requireRealLabSheetPermission(context.actorUserId, workOrder, "work_forms.real.finalize");
    this.ensureCycleSheetEditable(workOrder, cycle);

    const existing = cycle.workFormSubmissions[0] ?? null;
    if (!existing) {
      throw new BadRequestException("Salvează fișa de laborator înainte de finalizare.");
    }
    await this.assertExpectedRealLabSheetRevision(context, workOrder, cycle, existing, dto.expectedRevision);

    const snapshot = this.parseRealLabSheetSnapshot(existing.schemaSnapshot);
    this.workFormSubmissionValidationService.validateValues(snapshot, existing.values, { enforceRequired: true });

    const finalizedAt = new Date();
    const finalized = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.workFormSubmission.update({
        data: {
          finalizedAt,
          finalizedByUserId: context.actorUserId,
          realLabSheetStatus: "FINALIZED",
          revision: {
            increment: 1,
          },
          updatedByUserId: context.actorUserId,
        },
        include: {
          finalizedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          updatedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
        },
        where: {
          id: existing.id,
        },
      });
      await this.recordFormAudit(tx, {
        action: WORK_FORMS_AUDIT_ACTIONS.realLabSheetFinalized,
        actorUserId: context.actorUserId,
        metadata: {
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          previousRevision: existing.revision,
          status: "FINALIZED",
          templateId: existing.templateId,
          templateVersion: existing.templateVersion,
          workCode: workOrder.code,
          workId: workOrder.id,
        },
        requestMetadata: context.requestMetadata,
        resourceId: submission.id,
      });

      return submission;
    });

    return this.toRealLabSheetView(workOrder, { ...cycle, workFormSubmissions: [finalized] }, await this.getActiveRealLabSheetTemplate(workOrder.workTypeId), context.actorUserId);
  }

  public async createNextCycle(context: ActorContext, legalEntity: LegalEntityContext, workOrderId: string, dto: CreateNextWorkCycleDto, includePricing: boolean): Promise<WorkCyclesHistoryView> {
    await this.authorizationService.requirePermission({
      permission: "cycles.create_next",
      requiredScope: "ALL",
      userId: context.actorUserId,
    });
    const before = await this.findWorkOrderOrThrow(workOrderId);
    if (!before.activeCycle) {
      throw new ConflictException("Lucrarea nu are un ciclu activ.");
    }
    if (dto.expectedActiveCycleId && dto.expectedActiveCycleId !== before.activeCycle.id) {
      throw new ConflictException("Ciclul activ s-a schimbat. Reîncarcă lucrarea.");
    }
    const returnNotes = dto.notes ?? dto.reasonNotes ?? null;
    if (dto.reason === "OTHER" && !returnNotes) {
      throw new BadRequestException("Notele sunt obligatorii pentru Alt motiv.");
    }
    await this.validateClinic(this.prisma, dto.clinicId, true);
    await this.validateDoctor(this.prisma, dto.doctorId, dto.clinicId, true);

    const history = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM work_orders WHERE id = ${workOrderId} FOR UPDATE`;
      const fresh = await tx.workOrder.findUnique({
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      if (!fresh) {
        throw new NotFoundException("Work order was not found.");
      }
      if (!fresh.activeCycle) {
        throw new ConflictException("Lucrarea nu are un ciclu activ.");
      }
      if (dto.expectedActiveCycleId && dto.expectedActiveCycleId !== fresh.activeCycle.id) {
        throw new ConflictException("Ciclul activ s-a schimbat. Reîncarcă lucrarea.");
      }
      await this.validateClinic(tx, dto.clinicId, true);
      await this.validateDoctor(tx, dto.doctorId, dto.clinicId, true);
      const operationNow = new Date();
      const latestCycle = await tx.workCycle.findFirst({
        orderBy: { cycleNumber: "desc" },
        select: { cycleNumber: true },
        where: { workOrderId },
      });
      const nextCycleNumber = (latestCycle?.cycleNumber ?? 0) + 1;
      const deadline = await this.workDeadlineService.resolveForWork({
        client: tx,
        clinicId: dto.clinicId,
        doctorId: dto.doctorId,
        includeStartDay: false,
        legalEntity,
        now: operationNow,
        quantity: fresh.quantity,
        source: "MANUAL_RECALCULATION",
        startAt: operationNow,
        workTypeId: fresh.workTypeId,
      });
      const deadlineUpdate = deadlineDataToPrisma(deadline, fresh.deadlineRevision + 1);

      await tx.workCycle.update({
        data: {
          closedAt: operationNow,
          status: "CLOSED",
        },
        where: { id: fresh.activeCycle.id },
      });

      const createdCycle = await tx.workCycle.create({
        data: {
          createdByUserId: context.actorUserId,
          cycleNumber: nextCycleNumber,
          clinicId: dto.clinicId,
          deadlineEffectiveDueAtSnapshot: deadline.effectiveDueAt,
          deadlineModeSnapshot: deadline.deadlineMode,
          deadlineSnapshotJson: deadline.deadlineRuleSnapshot,
          doctorId: dto.doctorId,
          openedAt: operationNow,
          reason: dto.reason,
          reasonNotes: returnNotes,
          status: "ACTIVE",
          workOrderId,
        },
      });

      await tx.workOrder.update({
        data: {
          ...deadlineUpdate,
          activeCycleId: createdCycle.id,
          assignedTechnicianId: null,
          assignmentUpdatedAt: operationNow,
          claimedAt: null,
          claimedByUserId: null,
          claimRevision: { increment: 1 },
          claimSource: "MANAGER_RELEASE",
          claimStatus: "UNCLAIMED",
          clinicId: dto.clinicId,
          doctorId: dto.doctorId,
          executionLegalEntityId: null,
          releaseReason: `Ciclu nou: ${dto.reason}`,
          releasedAt: operationNow,
          releasedByUserId: context.actorUserId,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: { id: workOrderId },
      });

      await this.workflowExecutionService.createSnapshotForWork(tx, {
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        workCode: fresh.code,
        workCycleId: createdCycle.id,
        workOrderId,
        workTypeId: fresh.workTypeId,
      });

      const logisticsState = await tx.workLogisticsState.create({
        data: {
          physicalLocationCode: "RECEPTIE",
          status: "RECEIVED",
          workCycleId: createdCycle.id,
          workOrderId,
        },
      });
      await tx.logisticsEvent.create({
        data: {
          actorUserId: context.actorUserId,
          logisticsStateId: logisticsState.id,
          metadata: { cycleId: createdCycle.id, cycleNumber: createdCycle.cycleNumber, newStatus: "RECEIVED", workCode: fresh.code, workId: workOrderId },
          type: "WORK_RECEIVED",
          workCycleId: createdCycle.id,
          workOrderId,
        },
      });

      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.cycleClosed,
        actorUserId: context.actorUserId,
        metadata: { cycleId: fresh.activeCycle.id, cycleNumber: fresh.activeCycle.cycleNumber, workCode: fresh.code },
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.cycleCreated,
        actorUserId: context.actorUserId,
        metadata: {
          cycleId: createdCycle.id,
          cycleNumber: createdCycle.cycleNumber,
          clinicChanged: dto.clinicId !== fresh.clinicId,
          doctorChanged: dto.doctorId !== fresh.doctorId,
          clinicId: dto.clinicId,
          doctorId: dto.doctorId,
          previousCycleId: fresh.activeCycle.id,
          reason: dto.reason,
          workCode: fresh.code,
        },
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });

      const updatedHistory = await tx.workOrder.findUniqueOrThrow({
        include: workCycleHistoryInclude,
        where: { id: workOrderId },
      });
      return updatedHistory;
    }).catch((error: unknown) => {
      if (isPrismaErrorCode(error, "P2002")) {
        throw new ConflictException("Lucrarea are deja un ciclu activ pentru această operațiune.");
      }
      throw error;
    });

    return toWorkCyclesHistoryView(history, includePricing);
  }

  public async claimWork(context: ActorContext, workOrderId: string, dto: ClaimWorkDto): Promise<WorkDetailView> {
    await this.authorizationService.requirePermission({
      permission: "works.claim.create",
      requiredScope: "ASSIGNED",
      userId: context.actorUserId,
    });
    await this.authorizationService.requirePermission({
      permission: "works.execution_snapshot.create",
      requiredScope: "ASSIGNED",
      userId: context.actorUserId,
    });
    const legalEntity = await this.validateExecutionLegalEntity(this.prisma, dto.executionLegalEntityCode);
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.assertClaimRevision(before, dto.expectedClaimRevision);
    this.assertClaimable(before);

    const nextRevision = before.claimRevision + 1;
    const after = await this.prisma.$transaction(async (tx) => {
      const operationNow = new Date();
      const snapshot = await this.prepareExecutionSnapshot(tx, {
        actorUserId: context.actorUserId,
        claimedAt: operationNow,
        legalEntity,
        nextClaimRevision: nextRevision,
        requestMetadata: context.requestMetadata,
        source: "TECHNICIAN_FIRST_CLAIM",
        technicianId: context.actorUserId,
        workOrder: before,
      });
      const result = await tx.workOrder.updateMany({
        data: {
          ...(snapshot.deadlineUpdate ?? {}),
          assignedTechnicianId: context.actorUserId,
          assignmentUpdatedAt: operationNow,
          claimedAt: operationNow,
          claimedByUserId: context.actorUserId,
          claimRevision: { increment: 1 },
          claimSource: "TECHNICIAN_CLAIM",
          claimStatus: "CLAIMED",
          executionLegalEntityId: legalEntity.id,
          releaseReason: null,
          releasedAt: null,
          releasedByUserId: null,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: {
          claimRevision: dto.expectedClaimRevision,
          claimStatus: "UNCLAIMED",
          id: workOrderId,
        },
      });
      if (result.count !== 1) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.claimConflict,
          actorUserId: context.actorUserId,
          metadata: {
            expectedClaimRevision: dto.expectedClaimRevision,
            workCode: before.code,
          },
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
        });
        throw new ConflictException("Lucrarea a fost deja revendicată sau modificată. Reîncarcă lista.");
      }

      const workflowExecution = before.activeCycle?.workflowExecution ?? null;
      const currentStage = workflowExecution?.currentStageExecutionId
        ? workflowExecution.stages.find((stage) => stage.id === workflowExecution.currentStageExecutionId) ?? null
        : null;
      if (workflowExecution && currentStage && currentStage.status === WorkStageExecutionStatus.PENDING && currentStage.assignedUserId === null && await this.canAutoAssignClaimedStage(tx, context.actorUserId, currentStage.allowedRoleCodesSnapshot)) {
        await tx.workStageExecution.update({
          data: {
            assignedAt: operationNow,
            assignedByUserId: context.actorUserId,
            assignedUserId: context.actorUserId,
            version: { increment: 1 },
          },
          where: {
            id: currentStage.id,
          },
        });
        await tx.workWorkflowExecution.update({
          data: {
            version: { increment: 1 },
          },
          where: {
            id: workflowExecution.id,
          },
        });
        await tx.workStageEvent.create({
          data: {
            actorUserId: context.actorUserId,
            metadata: {
              assignedByUserId: context.actorUserId,
              assignedUserId: context.actorUserId,
              stageExecutionId: currentStage.id,
              stageKey: currentStage.stageKeySnapshot,
              stageOrder: currentStage.sortOrder,
              workCode: before.code,
              workId: workOrderId,
              workflowExecutionId: workflowExecution.id,
              workflowTemplateId: workflowExecution.workflowTemplateId,
              workflowTemplateVersion: workflowExecution.workflowTemplateVersion,
            },
            stageExecutionId: currentStage.id,
            type: WorkStageEventType.STAGE_ASSIGNED,
            workflowExecutionId: workflowExecution.id,
          },
        });
      }

      await tx.workAssignmentEvent.create({
        data: {
          actorUserId: context.actorUserId,
          executionSnapshotStatus: snapshot.status,
          executionSnapshotVersion: snapshot.version,
          eventType: "CLAIMED",
          newLegalEntityId: legalEntity.id,
          newTechnicianId: context.actorUserId,
          revision: nextRevision,
          workOrderId,
        },
      });
      const updated = await tx.workOrder.findUniqueOrThrow({
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.claimed,
        actorUserId: context.actorUserId,
        metadata: this.createAssignmentAuditMetadata(before, updated, "claim"),
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      await this.recordSnapshotAudit(tx, {
        action: snapshot.created ? WORK_ORDER_AUDIT_ACTIONS.executionSnapshotCreated : WORK_ORDER_AUDIT_ACTIONS.executionSnapshotReused,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
        snapshot,
        workCode: before.code,
      });
      if (snapshot.created) {
        await this.recordSnapshotAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.executionSnapshotLocked,
          actorUserId: context.actorUserId,
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
          snapshot,
          workCode: before.code,
        });
      }
      return updated;
    }).catch((error: unknown) => {
      if (isPrismaErrorCode(error, "P2002")) {
        throw new ConflictException("Contextul de execuție al lucrării a fost deja stabilit.");
      }
      throw error;
    });

    return toWorkDetailView(after, false, await this.createClaimAccess(context.actorUserId));
  }

  private async canAutoAssignClaimedStage(client: Prisma.TransactionClient | PrismaService, userId: string, allowedRoleCodesSnapshot: Prisma.JsonValue): Promise<boolean> {
    const startPermission = await this.authorizationService.hasPermission({
      permission: "workflow.start_stage",
      requiredScope: "OWN_STAGE",
      userId,
    });

    if (!startPermission.allowed) {
      return false;
    }

    const allowedRoleCodes = Array.isArray(allowedRoleCodesSnapshot)
      ? allowedRoleCodesSnapshot.filter((value): value is string => typeof value === "string")
      : [];

    if (allowedRoleCodes.length === 0) {
      return true;
    }

    const actorRoleCodes = await this.getActorRoleCodes(client, userId);
    return actorRoleCodes.some((roleCode) => allowedRoleCodes.includes(roleCode));
  }

  public async releaseWork(context: ActorContext, workOrderId: string, dto: ReleaseWorkDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.assertClaimRevision(before, dto.expectedClaimRevision);
    if (before.claimStatus !== "CLAIMED" || !before.assignedTechnicianId) {
      throw new BadRequestException("Lucrarea nu este revendicată.");
    }
    const canReleaseAny = await this.authorizationService.hasPermission({
      permission: "works.claim.release_any",
      requiredScope: "ALL",
      userId: context.actorUserId,
    });
    const canReleaseOwn = await this.authorizationService.hasPermission({
      permission: "works.claim.release_own",
      requiredScope: "ASSIGNED",
      userId: context.actorUserId,
    });
    if (!canReleaseAny.allowed && !(canReleaseOwn.allowed && before.assignedTechnicianId === context.actorUserId)) {
      throw new ForbiddenException("Nu ai permisiunea necesară pentru eliberarea lucrării.");
    }

    const nextRevision = before.claimRevision + 1;
    const source = canReleaseAny.allowed && before.assignedTechnicianId !== context.actorUserId ? "MANAGER_RELEASE" : "TECHNICIAN_RELEASE";
    const after = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workOrder.updateMany({
        data: {
          assignedTechnicianId: null,
          assignmentUpdatedAt: new Date(),
          claimedAt: null,
          claimedByUserId: null,
          claimRevision: { increment: 1 },
          claimSource: source,
          claimStatus: "UNCLAIMED",
          executionLegalEntityId: null,
          releasedAt: new Date(),
          releasedByUserId: context.actorUserId,
          releaseReason: dto.reason,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: {
          claimRevision: dto.expectedClaimRevision,
          claimStatus: "CLAIMED",
          id: workOrderId,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException("Responsabilitatea lucrării s-a schimbat. Reîncarcă detaliile.");
      }
      await tx.workAssignmentEvent.create({
        data: {
          actorUserId: context.actorUserId,
          executionSnapshotStatus: before.activeCycle?.executionSnapshot?.status ?? null,
          executionSnapshotVersion: before.activeCycle?.executionSnapshot?.version ?? null,
          eventType: "RELEASED",
          previousLegalEntityId: before.executionLegalEntityId,
          previousTechnicianId: before.assignedTechnicianId,
          reason: dto.reason,
          revision: nextRevision,
          workOrderId,
        },
      });
      const updated = await tx.workOrder.findUniqueOrThrow({
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.released,
        actorUserId: context.actorUserId,
        metadata: this.createAssignmentAuditMetadata(before, updated, dto.reason),
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      return updated;
    }).catch((error: unknown) => {
      if (isPrismaErrorCode(error, "P2002")) {
        throw new ConflictException("Contextul de execuție al lucrării a fost deja stabilit.");
      }
      throw error;
    });

    return toWorkDetailView(after, false, await this.createClaimAccess(context.actorUserId));
  }

  public async reassignWork(context: ActorContext, workOrderId: string, dto: ReassignWorkDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.assertClaimRevision(before, dto.expectedClaimRevision);
    const requiredPermission = before.claimStatus === "CLAIMED" ? "works.claim.reassign" : "works.claim.assign";
    await this.authorizationService.requirePermission({
      permission: requiredPermission,
      requiredScope: "ALL",
      userId: context.actorUserId,
    });
    await this.authorizationService.requirePermission({
      permission: "works.execution_snapshot.create",
      requiredScope: "ALL",
      userId: context.actorUserId,
    });
    const [legalEntity] = await Promise.all([
      this.validateExecutionLegalEntity(this.prisma, dto.executionLegalEntityCode),
      this.validateClaimTechnician(dto.technicianId),
    ]);
    if (before.activeCycle?.logisticsState?.status === "DELIVERED" || before.activeCycle?.logisticsState?.status === "HANDED_TO_DELIVERY") {
      throw new BadRequestException("Lucrarea livrată nu poate fi reasignată.");
    }

    const nextRevision = before.claimRevision + 1;
    const eventType = before.claimStatus === "CLAIMED" ? "REASSIGNED" : "ASSIGNED";
    const after = await this.prisma.$transaction(async (tx) => {
      const operationNow = new Date();
      const snapshot = await this.prepareExecutionSnapshot(tx, {
        actorUserId: context.actorUserId,
        claimedAt: before.claimedAt ?? operationNow,
        legalEntity,
        nextClaimRevision: nextRevision,
        requestMetadata: context.requestMetadata,
        source: "MANAGER_ASSIGNMENT",
        technicianId: dto.technicianId,
        workOrder: before,
      });
      const result = await tx.workOrder.updateMany({
        data: {
          ...(snapshot.deadlineUpdate ?? {}),
          assignedTechnicianId: dto.technicianId,
          assignmentUpdatedAt: operationNow,
          claimedAt: before.claimedAt ?? operationNow,
          claimedByUserId: before.claimedByUserId ?? context.actorUserId,
          claimRevision: { increment: 1 },
          claimSource: before.claimStatus === "CLAIMED" ? "MANAGER_REASSIGNMENT" : "MANAGER_ASSIGNMENT",
          claimStatus: "CLAIMED",
          executionLegalEntityId: legalEntity.id,
          releaseReason: null,
          releasedAt: null,
          releasedByUserId: null,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
        },
        where: {
          claimRevision: dto.expectedClaimRevision,
          id: workOrderId,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException("Responsabilitatea lucrării s-a schimbat. Reîncarcă detaliile.");
      }
      await tx.workAssignmentEvent.create({
        data: {
          actorUserId: context.actorUserId,
          executionSnapshotStatus: snapshot.status,
          executionSnapshotVersion: snapshot.version,
          eventType,
          newLegalEntityId: legalEntity.id,
          newTechnicianId: dto.technicianId,
          previousLegalEntityId: before.executionLegalEntityId,
          previousTechnicianId: before.assignedTechnicianId,
          reason: dto.reason,
          revision: nextRevision,
          workOrderId,
        },
      });
      const updated = await tx.workOrder.findUniqueOrThrow({
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      await this.recordAudit(tx, {
        action: before.claimStatus === "CLAIMED" ? WORK_ORDER_AUDIT_ACTIONS.reassigned : WORK_ORDER_AUDIT_ACTIONS.assigned,
        actorUserId: context.actorUserId,
        metadata: this.createAssignmentAuditMetadata(before, updated, dto.reason),
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      await this.recordSnapshotAudit(tx, {
        action: snapshot.created ? WORK_ORDER_AUDIT_ACTIONS.executionSnapshotCreated : WORK_ORDER_AUDIT_ACTIONS.executionSnapshotReused,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
        snapshot,
        workCode: before.code,
      });
      if (snapshot.created) {
        await this.recordSnapshotAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.executionSnapshotLocked,
          actorUserId: context.actorUserId,
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
          snapshot,
          workCode: before.code,
        });
      }
      return updated;
    });

    return toWorkDetailView(after, false, await this.createClaimAccess(context.actorUserId));
  }

  public async listAssignmentHistory(actorUserId: string, workOrderId: string): Promise<readonly WorkAssignmentEventView[]> {
    const permission = await this.authorizationService.requirePermission({
      permission: "works.claim.history.read",
      requiredScope: "ASSIGNED",
      userId: actorUserId,
    });
    const workOrder = await this.findWorkOrderOrThrow(workOrderId);
    if (!permission.effectiveScopes.includes("ALL") && workOrder.assignedTechnicianId !== actorUserId) {
      throw new ForbiddenException("Nu ai acces la istoricul responsabilității acestei lucrări.");
    }

    return workOrder.assignmentEvents.map(toWorkAssignmentEventView);
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
        data.workFormSubmissions = {
          create: preparedSubmission.data,
        };
      }

      const createdWorkOrder = await tx.workOrder.create({
        data,
        include: WORK_ORDER_INCLUDE,
      });

      const initialCycle = await tx.workCycle.create({
        data: {
          createdByUserId: context.actorUserId,
          cycleNumber: 1,
          clinicId: createdWorkOrder.clinicId,
          deadlineEffectiveDueAtSnapshot: createdWorkOrder.effectiveDueAt,
          deadlineModeSnapshot: createdWorkOrder.deadlineMode,
          ...(createdWorkOrder.deadlineRuleSnapshot !== null ? { deadlineSnapshotJson: createdWorkOrder.deadlineRuleSnapshot } : {}),
          doctorId: createdWorkOrder.doctorId,
          openedAt: operationNow,
          reason: "INITIAL",
          status: "ACTIVE",
          workOrderId: createdWorkOrder.id,
        },
      });

      await tx.workOrder.update({
        data: {
          activeCycleId: initialCycle.id,
        },
        where: {
          id: createdWorkOrder.id,
        },
      });

      await this.workflowExecutionService.createSnapshotForWork(tx, {
        actorUserId: context.actorUserId,
        workCycleId: initialCycle.id,
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

    return toWorkDetailView(workOrder, true, await this.createClaimAccess(context.actorUserId));
  }

  public async updateWork(context: ActorContext, legalEntity: LegalEntityContext, workOrderId: string, dto: UpdateWorkDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    const beforeGenericSubmission = getGenericWorkFormSubmission(before);
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
          existingSubmission: beforeGenericSubmission,
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
              templateKind: "GENERIC",
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
        const preparedUpdate = this.workFormSubmissionValidationService.prepareUpdateValues(beforeGenericSubmission, dto.workFormValues, {
          actorUserId: context.actorUserId,
          workCode: before.code,
          workId: workOrderId,
        });
        await tx.workFormSubmission.updateMany({
          data: preparedUpdate.data,
          where: {
            workOrderId,
            templateKind: "GENERIC",
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

    return toWorkDetailView(after, true, await this.createClaimAccess(context.actorUserId));
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

    return toWorkDetailView(after, true, await this.createClaimAccess(context.actorUserId));
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

    return toWorkDetailView(after, true, await this.createClaimAccess(context.actorUserId));
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

  private async findRealLabSheetContextOrThrow(workOrderId: string, cycleId: string): Promise<{ readonly cycle: RealLabSheetCycleRecord; readonly workOrder: RealLabSheetWorkRecord }> {
    const workOrder = await this.prisma.workOrder.findUnique({
      include: {
        ...REAL_LAB_SHEET_WORK_INCLUDE,
        cycles: {
          ...REAL_LAB_SHEET_WORK_INCLUDE.cycles,
          where: {
            id: cycleId,
          },
        },
      },
      where: {
        id: workOrderId,
      },
    });

    if (!workOrder) {
      throw new NotFoundException("Work order was not found.");
    }

    const cycle = workOrder.cycles[0] ?? null;
    if (!cycle) {
      throw new NotFoundException("Ciclul lucrării nu a fost găsit.");
    }

    return { cycle, workOrder };
  }

  private async getActiveRealLabSheetTemplate(workTypeId: string) {
    return this.prisma.workFormTemplate.findFirst({
      include: REAL_LAB_SHEET_TEMPLATE_INCLUDE,
      where: {
        kind: WorkFormTemplateKind.REAL_LAB_SHEET,
        status: "ACTIVE",
        workTypeId,
      },
    });
  }

  private async requireRealLabSheetPermission(actorUserId: string, workOrder: RealLabSheetWorkRecord, permission: PermissionKey): Promise<void> {
    const result = await this.authorizationService.requirePermission({
      permission,
      requiredScope: "ASSIGNED",
      userId: actorUserId,
    });

    if (result.effectiveScopes.includes("ALL")) {
      return;
    }

    if (result.effectiveScopes.includes("ASSIGNED") && workOrder.assignedTechnicianId === actorUserId) {
      return;
    }

    throw new ForbiddenException("Permission denied.");
  }

  private async hasRealLabSheetPermission(actorUserId: string, workOrder: RealLabSheetWorkRecord, permission: PermissionKey): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission,
      requiredScope: "ASSIGNED",
      userId: actorUserId,
    });
    if (!result.allowed) {
      return false;
    }
    return result.effectiveScopes.includes("ALL") || (result.effectiveScopes.includes("ASSIGNED") && workOrder.assignedTechnicianId === actorUserId);
  }

  private ensureCycleSheetEditable(workOrder: RealLabSheetWorkRecord, cycle: RealLabSheetCycleRecord): void {
    if (cycle.status !== "ACTIVE" || workOrder.activeCycleId !== cycle.id) {
      throw new ConflictException("Fișa unui ciclu istoric este read-only.");
    }
    if (cycle.workFormSubmissions[0]?.finalizedAt) {
      throw new ConflictException("Fișa acestui ciclu este finalizată și nu mai poate fi modificată.");
    }
  }

  private async assertExpectedRealLabSheetRevision(
    context: ActorContext,
    workOrder: RealLabSheetWorkRecord,
    cycle: RealLabSheetCycleRecord,
    submission: RealLabSheetCycleRecord["workFormSubmissions"][number] | null,
    expectedRevision: number | undefined,
  ): Promise<void> {
    if (expectedRevision === undefined) {
      return;
    }
    const currentRevision = submission?.revision ?? 0;
    if (expectedRevision === currentRevision) {
      return;
    }
    await this.recordFormAudit(this.prisma, {
      action: WORK_FORMS_AUDIT_ACTIONS.realLabSheetConflict,
      actorUserId: context.actorUserId,
      metadata: {
        currentRevision,
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        expectedRevision,
        workCode: workOrder.code,
        workId: workOrder.id,
      },
      requestMetadata: context.requestMetadata,
      resourceId: submission?.id ?? cycle.id,
    });
    throw new ConflictException("Fișa a fost modificată de alt utilizator. Reîncarcă înainte de salvare.");
  }

  private parseRealLabSheetSnapshot(value: Prisma.JsonValue): RealLabSheetSnapshot {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new BadRequestException("Snapshot-ul fișei de laborator este invalid.");
    }
    const fields = (value as { readonly fields?: unknown }).fields;
    if (!Array.isArray(fields)) {
      throw new BadRequestException("Snapshot-ul fișei de laborator este invalid.");
    }
    return { fields } as RealLabSheetSnapshot;
  }

  private getRealLabSheetDerivedValues(workOrder: RealLabSheetWorkRecord, cycle: RealLabSheetCycleRecord): WorkFormValues {
    return {
      doctor: cycle.doctor?.displayName ?? workOrder.doctor.displayName,
      lab_sheet_number: workOrder.code,
      patient: workOrder.patientName,
      work_type: workOrder.workType.name,
    };
  }

  private async toRealLabSheetView(
    workOrder: RealLabSheetWorkRecord,
    cycle: RealLabSheetCycleRecord,
    activeTemplate: Awaited<ReturnType<WorksService["getActiveRealLabSheetTemplate"]>>,
    actorUserId: string,
  ): Promise<RealLabSheetView> {
    const submission = cycle.workFormSubmissions[0] ?? null;
    const snapshot = submission
      ? submission.schemaSnapshot as { readonly fields?: readonly RealLabSheetView["fields"][number][] }
      : activeTemplate
        ? this.workFormSubmissionValidationService.createSnapshot(activeTemplate)
        : { fields: [] };
    const baseValues = submission
      ? submission.values as unknown as WorkFormValues
      : {};
    const values = {
      ...baseValues,
      ...this.getRealLabSheetDerivedValues(workOrder, cycle),
    };
    const isFinalized = Boolean(submission?.finalizedAt);
    const status = isFinalized ? "FINALIZED" : submission?.realLabSheetStatus ?? "NOT_STARTED";
    const isReadOnly = cycle.status !== "ACTIVE" || workOrder.activeCycleId !== cycle.id || isFinalized;
    const [canUpdate, canFinalize] = await Promise.all([
      this.hasRealLabSheetPermission(actorUserId, workOrder, "work_forms.real.update"),
      this.hasRealLabSheetPermission(actorUserId, workOrder, "work_forms.real.finalize"),
    ]);

    return {
      canEdit: !isReadOnly && canUpdate,
      canFinalize: !isReadOnly && canFinalize && submission !== null && status === "COMPLETE",
      canMarkComplete: !isReadOnly && canUpdate,
      cycleNumber: cycle.cycleNumber,
      fields: [...(snapshot.fields ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
      finalizedAt: submission?.finalizedAt?.toISOString() ?? null,
      finalizedBy: submission?.finalizedBy ? { displayName: submission.finalizedBy.displayName, publicId: submission.finalizedBy.id } : null,
      isFinalized,
      isReadOnly,
      lastModifiedAt: submission?.updatedAt.toISOString() ?? null,
      lastModifiedBy: submission?.updatedBy ? { displayName: submission.updatedBy.displayName, publicId: submission.updatedBy.id } : null,
      revision: submission?.revision ?? 0,
      status,
      submittedAt: submission?.submittedAt.toISOString() ?? new Date(0).toISOString(),
      templateId: submission?.templateId ?? activeTemplate?.id ?? null,
      templateKind: "REAL_LAB_SHEET",
      templateName: submission?.templateNameSnapshot ?? activeTemplate?.name ?? "Fișă laborator",
      templateVersion: submission?.templateVersion ?? activeTemplate?.version ?? 1,
      updatedAt: submission?.updatedAt.toISOString() ?? new Date(0).toISOString(),
      values,
      workCycleId: cycle.id,
      workOrderId: workOrder.id,
    };
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

  private createAssignmentAuditMetadata(before: WorkOrderRecord, after: WorkOrderRecord, reason: string): Prisma.InputJsonObject {
    return {
      newExecutionLegalEntityId: after.executionLegalEntityId,
      newRevision: after.claimRevision,
      newStatus: after.claimStatus,
      newTechnicianId: after.assignedTechnicianId,
      previousExecutionLegalEntityId: before.executionLegalEntityId,
      previousRevision: before.claimRevision,
      previousStatus: before.claimStatus,
      previousTechnicianId: before.assignedTechnicianId,
      reason,
      workCode: before.code,
    };
  }

  private async prepareExecutionSnapshot(
    tx: Prisma.TransactionClient,
    input: {
      readonly actorUserId: string;
      readonly claimedAt: Date;
      readonly legalEntity: { readonly code: "NC" | "NG"; readonly displayName: string; readonly id: string };
      readonly nextClaimRevision: number;
      readonly requestMetadata: RequestMetadata;
      readonly source: ExecutionSnapshotSource;
      readonly technicianId: string;
      readonly workOrder: WorkOrderRecord;
    },
  ): Promise<{
    readonly created: boolean;
    readonly deadlineMode: string | null;
    readonly deadlineUpdate: WorkDeadlinePrismaUpdate | null;
    readonly legalEntityCode: string;
    readonly pricingCurrency: string | null;
    readonly pricingSourceLabel: string | null;
    readonly pricingSourceType: string | null;
    readonly pricingTotalMinor: number | null;
    readonly pricingUnitPriceMinor: number | null;
    readonly status: "INVALID" | "LOCKED" | "NOT_CREATED";
    readonly version: number | null;
  }> {
    const activeCycle = input.workOrder.activeCycle;
    if (!activeCycle) {
      throw new ConflictException("Lucrarea nu are un ciclu activ.");
    }
    const existingSnapshot = activeCycle.executionSnapshot;
    if (existingSnapshot) {
      if (existingSnapshot.executionLegalEntityCode !== input.legalEntity.code) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.executionSnapshotEntityMismatchRejected,
          actorUserId: input.actorUserId,
          metadata: {
            attemptedLegalEntityCode: input.legalEntity.code,
            fixedLegalEntityCode: existingSnapshot.executionLegalEntityCode,
            snapshotVersion: existingSnapshot.version,
            workCode: input.workOrder.code,
          },
          requestMetadata: input.requestMetadata,
          resourceId: input.workOrder.id,
        });
        throw new ConflictException("Lucrarea are deja firma de execuție fixată și nu poate fi mutată prin claim.");
      }

      return {
        created: false,
        deadlineMode: existingSnapshot.deadlineMode,
        deadlineUpdate: null,
        legalEntityCode: existingSnapshot.executionLegalEntityCode,
        pricingCurrency: existingSnapshot.pricingCurrency,
        pricingSourceLabel: existingSnapshot.pricingSourceLabel,
        pricingSourceType: existingSnapshot.pricingSourceType,
        pricingTotalMinor: existingSnapshot.pricingTotalMinor,
        pricingUnitPriceMinor: existingSnapshot.pricingUnitPriceMinor,
        status: existingSnapshot.status,
        version: existingSnapshot.version,
      };
    }

    const technician = await tx.user.findUnique({
      select: {
        displayName: true,
        id: true,
      },
      where: {
        id: input.technicianId,
      },
    });
    if (!technician) {
      throw new BadRequestException("Tehnicianul selectat nu este activ.");
    }

    const pricing = await this.resolveExecutionPricing(tx, input);
    const deadline = await this.resolveExecutionDeadline(tx, input);
    const deadlineUpdate = deadlineDataToPrisma(deadline, input.workOrder.deadlineRevision + 1);
    const pricingSnapshot = buildPricingSnapshot(pricing, input.workOrder.workType.unit, input.claimedAt);
    const deadlineSnapshot = buildDeadlineSnapshot(deadline, input.claimedAt);
    const contextSnapshot = buildExecutionContextSnapshot({
      claim: {
        claimedAt: input.claimedAt,
        revision: input.nextClaimRevision,
        source: input.source,
      },
      legalEntity: {
        code: input.legalEntity.code as "NC" | "NG",
        displayName: input.legalEntity.displayName,
        publicId: input.legalEntity.id,
      },
      technician: {
        displayName: technician.displayName,
        publicId: technician.id,
      },
      work: {
        clinicName: input.workOrder.clinic.name,
        clinicPublicId: input.workOrder.clinic.id,
        doctorName: input.workOrder.doctor.displayName,
        doctorPublicId: input.workOrder.doctor.id,
        quantity: input.workOrder.quantity,
        workCode: input.workOrder.code,
        workTypeCode: input.workOrder.workType.code,
        workTypeName: input.workOrder.workType.name,
        workTypePublicId: input.workOrder.workType.id,
      },
    });

    await tx.workExecutionSnapshot.create({
      data: {
        claimRevision: input.nextClaimRevision,
        claimedAt: input.claimedAt,
        contextSnapshotJson: contextSnapshot,
        createdByUserId: input.actorUserId,
        deadlineEffectiveDueAt: deadline.effectiveDueAt,
        deadlineExecutionDays: deadline.deadlineExecutionDays,
        deadlineExplanation: deadline.deadlineExplanation,
        deadlineDueHour: deadline.deadlineDueHour,
        deadlineIncludeStartDay: deadline.deadlineIncludeStartDay,
        deadlineMode: deadline.deadlineMode,
        deadlineReasonCode: deadline.deadlineReasonCode,
        deadlineRuleVersion: EXECUTION_SNAPSHOT_VERSION,
        deadlineSnapshotJson: deadlineSnapshot,
        deadlineStartAt: deadline.deadlineStartAt,
        deadlineTimezone: deadline.deadlineTimezone,
        executionLegalEntityCode: input.legalEntity.code,
        executionLegalEntityId: input.legalEntity.id,
        pricingAgreementId: pricing.appliedAgreementId,
        pricingCatalogItemId: pricing.catalogItemId,
        pricingCurrency: pricing.currency,
        pricingQuantity: pricing.quantity.toString(),
        pricingRuleVersion: EXECUTION_SNAPSHOT_VERSION,
        pricingSnapshotJson: pricingSnapshot,
        pricingSourceLabel: getPricingSourceLabel(pricing),
        pricingSourceType: getPricingSourceType(pricing),
        pricingTotalMinor: pricing.totalPriceMinor,
        pricingUnit: input.workOrder.workType.unit,
        pricingUnitPriceMinor: pricing.finalUnitPriceMinor,
        snapshotCreatedAt: input.claimedAt,
        snapshotLockedAt: input.claimedAt,
        source: input.source,
        status: "LOCKED",
        technicianDisplayName: technician.displayName,
        technicianId: technician.id,
        version: EXECUTION_SNAPSHOT_VERSION,
        workCycleId: activeCycle.id,
        workOrderId: input.workOrder.id,
      },
    });

    await tx.workCycle.update({
      data: {
        deadlineEffectiveDueAtSnapshot: deadline.effectiveDueAt,
        deadlineModeSnapshot: deadline.deadlineMode,
        deadlineSnapshotJson: deadlineSnapshot,
        executionLegalEntityCodeSnapshot: input.legalEntity.code,
        executionLegalEntityId: input.legalEntity.id,
        executionLegalEntityNameSnapshot: input.legalEntity.displayName,
        executionSnapshotJson: contextSnapshot,
        executionSnapshotVersion: EXECUTION_SNAPSHOT_VERSION,
        pricingSnapshotJson: pricingSnapshot,
      },
      where: {
        id: activeCycle.id,
      },
    });

    if (deadline.deadlineMode === "UNRESOLVED") {
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.executionSnapshotDeadlineUnresolved,
        actorUserId: input.actorUserId,
        metadata: {
          legalEntityCode: input.legalEntity.code,
          reasonCode: deadline.deadlineReasonCode,
          snapshotVersion: EXECUTION_SNAPSHOT_VERSION,
          workCode: input.workOrder.code,
        },
        requestMetadata: input.requestMetadata,
        resourceId: input.workOrder.id,
      });
    }

    return {
      created: true,
      deadlineMode: deadline.deadlineMode,
      deadlineUpdate,
      legalEntityCode: input.legalEntity.code,
      pricingCurrency: pricing.currency,
      pricingSourceLabel: getPricingSourceLabel(pricing),
      pricingSourceType: getPricingSourceType(pricing),
      pricingTotalMinor: pricing.totalPriceMinor,
      pricingUnitPriceMinor: pricing.finalUnitPriceMinor,
      status: "LOCKED",
      version: EXECUTION_SNAPSHOT_VERSION,
    };
  }

  private async resolveExecutionPricing(
    tx: Prisma.TransactionClient,
    input: {
      readonly actorUserId: string;
      readonly claimedAt: Date;
      readonly legalEntity: { readonly code: "NC" | "NG"; readonly id: string };
      readonly requestMetadata: RequestMetadata;
      readonly workOrder: WorkOrderRecord;
    },
  ): Promise<PricingResolution> {
    try {
      return await this.pricingResolverService.resolve({
        clinicId: input.workOrder.clinicId,
        doctorId: input.workOrder.doctorId,
        evaluationDate: input.claimedAt,
        legalEntityCode: input.legalEntity.code,
        legalEntityId: input.legalEntity.id,
        quantity: input.workOrder.quantity,
        workTypeId: input.workOrder.workTypeId,
      }, tx);
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.executionSnapshotPricingUnresolved,
          actorUserId: input.actorUserId,
          metadata: {
            legalEntityCode: input.legalEntity.code,
            workCode: input.workOrder.code,
            workTypeId: input.workOrder.workTypeId,
          },
          requestMetadata: input.requestMetadata,
          resourceId: input.workOrder.id,
        });
        throw new ConflictException("Lucrarea nu poate fi preluată deoarece nu există un preț aplicabil pentru firma selectată.");
      }

      throw error;
    }
  }

  private async resolveExecutionDeadline(
    tx: Prisma.TransactionClient,
    input: {
      readonly claimedAt: Date;
      readonly legalEntity: { readonly code: "NC" | "NG"; readonly displayName: string; readonly id: string };
      readonly workOrder: WorkOrderRecord;
    },
  ): Promise<WorkDeadlineData> {
    if (input.workOrder.deadlineMode === "MANUAL" && input.workOrder.effectiveDueAt) {
      return this.createDeadlineDataFromExistingManualWork(input.workOrder, input.claimedAt);
    }

    return this.workDeadlineService.resolveForWork({
      client: tx,
      clinicId: input.workOrder.clinicId,
      doctorId: input.workOrder.doctorId,
      includeStartDay: input.workOrder.deadlineIncludeStartDay ?? false,
      legalEntity: input.legalEntity,
      now: input.claimedAt,
      quantity: input.workOrder.quantity,
      source: "FUTURE_TECH_CLAIM",
      startAt: input.claimedAt,
      workTypeId: input.workOrder.workTypeId,
    });
  }

  private createDeadlineDataFromExistingManualWork(workOrder: WorkOrderRecord, claimedAt: Date): WorkDeadlineData {
    return {
      calculatedDueAt: workOrder.calculatedDueAt,
      deadlineCalculatedAt: workOrder.deadlineCalculatedAt ?? claimedAt,
      deadlineDueHour: workOrder.deadlineDueHour ?? 17,
      deadlineDueMinute: workOrder.deadlineDueMinute ?? 0,
      deadlineExecutionDays: workOrder.deadlineExecutionDays,
      deadlineExplanation: workOrder.deadlineExplanation ?? "Termen manual păstrat la preluarea lucrării.",
      deadlineIncludeStartDay: workOrder.deadlineIncludeStartDay ?? false,
      deadlineLockedAt: workOrder.deadlineLockedAt ?? claimedAt,
      deadlineLockedReason: workOrder.deadlineLockedReason ?? "Termen manual păstrat în snapshotul de execuție.",
      deadlineMode: "MANUAL",
      deadlineReasonCode: workOrder.deadlineReasonCode,
      deadlineRuleSnapshot: (workOrder.deadlineRuleSnapshot ?? { version: 1, sourceType: "MANUAL" }) as Prisma.InputJsonObject,
      deadlineSource: "MANUAL_OVERRIDE",
      deadlineStartAt: workOrder.deadlineStartAt ?? claimedAt,
      deadlineTimezone: workOrder.deadlineTimezone ?? "Europe/Bucharest",
      effectiveDueAt: workOrder.effectiveDueAt,
      manualDueAt: workOrder.manualDueAt ?? workOrder.effectiveDueAt,
    };
  }

  private async recordSnapshotAudit(
    client: AuditClient,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
      readonly snapshot: {
        readonly deadlineMode: string | null;
        readonly legalEntityCode: string;
        readonly pricingCurrency: string | null;
        readonly pricingSourceLabel: string | null;
        readonly pricingSourceType: string | null;
        readonly pricingTotalMinor: number | null;
        readonly pricingUnitPriceMinor: number | null;
        readonly version: number | null;
      };
      readonly workCode: string;
    },
  ): Promise<void> {
    await this.recordAudit(client, {
      action: input.action,
      actorUserId: input.actorUserId,
      metadata: {
        deadlineMode: input.snapshot.deadlineMode,
        legalEntityCode: input.snapshot.legalEntityCode,
        pricingCurrency: input.snapshot.pricingCurrency,
        pricingSourceLabel: input.snapshot.pricingSourceLabel,
        pricingSourceType: input.snapshot.pricingSourceType,
        pricingTotalMinor: input.snapshot.pricingTotalMinor,
        pricingUnitPriceMinor: input.snapshot.pricingUnitPriceMinor,
        snapshotVersion: input.snapshot.version,
        workCode: input.workCode,
      },
      requestMetadata: input.requestMetadata,
      resourceId: input.resourceId,
    });
  }

  private async createClaimAccess(userId: string): Promise<WorkClaimAccessViewInput> {
    const [canClaim, canReleaseOwn, canReleaseAny, canReassign] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "works.claim.create", requiredScope: "ASSIGNED", userId }),
      this.authorizationService.hasPermission({ permission: "works.claim.release_own", requiredScope: "ASSIGNED", userId }),
      this.authorizationService.hasPermission({ permission: "works.claim.release_any", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "works.claim.reassign", requiredScope: "ALL", userId }),
    ]);

    return createWorkClaimAccess({
      canClaim: canClaim.allowed,
      canReassign: canReassign.allowed,
      canReleaseAny: canReleaseAny.allowed,
      canReleaseOwn: canReleaseOwn.allowed,
      userId,
    });
  }

  private assertClaimRevision(workOrder: WorkOrderRecord, expectedRevision: number): void {
    if (workOrder.claimRevision !== expectedRevision) {
      throw new ConflictException("Responsabilitatea lucrării s-a schimbat. Reîncarcă detaliile.");
    }
  }

  private assertClaimable(workOrder: WorkOrderRecord): void {
    if (workOrder.claimStatus !== "UNCLAIMED") {
      throw new ConflictException("Lucrarea este deja revendicată.");
    }
    const logisticsStatus = workOrder.activeCycle?.logisticsState?.status;
    if (logisticsStatus === "BLOCKED") {
      throw new BadRequestException("Lucrarea blocată nu poate fi revendicată.");
    }
    if (logisticsStatus === "HANDED_TO_DELIVERY" || logisticsStatus === "DELIVERED") {
      throw new BadRequestException("Lucrarea predată sau livrată nu poate fi revendicată.");
    }
  }

  private async validateExecutionLegalEntity(
    client: Prisma.TransactionClient | PrismaService,
    legalEntityCode: "NC" | "NG",
  ): Promise<{ readonly id: string; readonly code: "NC" | "NG"; readonly displayName: string }> {
    const legalEntity = await client.legalEntity.findUnique({
      select: {
        code: true,
        displayName: true,
        id: true,
        isActive: true,
      },
      where: {
        code: legalEntityCode,
      },
    });

    if (!legalEntity || !legalEntity.isActive || (legalEntity.code !== "NC" && legalEntity.code !== "NG")) {
      throw new BadRequestException("Alege o companie activă NC sau NG pentru execuție.");
    }

    return {
      code: legalEntity.code,
      displayName: legalEntity.displayName,
      id: legalEntity.id,
    };
  }

  private async validateClaimTechnician(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      select: {
        isActive: true,
      },
      where: {
        id: userId,
      },
    });
    if (!user?.isActive) {
      throw new BadRequestException("Tehnicianul selectat nu este activ.");
    }
    const permission = await this.authorizationService.hasPermission({
      permission: "works.claim.create",
      requiredScope: "ASSIGNED",
      userId,
    });
    if (!permission.allowed) {
      throw new BadRequestException("Utilizatorul selectat nu poate revendica lucrări.");
    }
  }

  private async getActorRoleCodes(client: Prisma.TransactionClient | PrismaService, userId: string): Promise<readonly string[]> {
    const user = await client.user.findUnique({
      select: {
        roles: {
          select: {
            role: {
              select: {
                isActive: true,
                key: true,
              },
            },
          },
        },
      },
      where: {
        id: userId,
      },
    });

    return (user?.roles ?? []).filter((role) => role.role.isActive).map((role) => role.role.key);
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

  private async recordFormAudit(
    client: AuditClient,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly metadata: Prisma.InputJsonObject;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
    },
  ): Promise<void> {
    await client.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        metadata: {
          ...input.metadata,
          actorUserId: input.actorUserId,
        },
        resourceId: input.resourceId,
        resourceType: WORK_FORM_SUBMISSIONS_RESOURCE_TYPE,
        ...(input.requestMetadata.ipAddress ? { ipAddress: input.requestMetadata.ipAddress } : {}),
        ...(input.requestMetadata.userAgent ? { userAgent: input.requestMetadata.userAgent } : {}),
      },
    });
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

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function getGenericWorkFormSubmission(workOrder: WorkOrderRecord): WorkOrderRecord["workFormSubmissions"][number] | null {
  return workOrder.workFormSubmissions?.find((submission) => submission.templateKind === "GENERIC") ?? null;
}

function getChangedWorkFormValueKeys(before: WorkFormValues, after: WorkFormValues): readonly string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
}

function isCompletedOnTimeInWindow(workOrder: WorkOrderRecord, windowStart: Date): boolean {
  const completedAt = workOrder.activeCycle?.workflowExecution?.completedAt;
  if (!completedAt || !workOrder.effectiveDueAt) {
    return false;
  }

  return completedAt.getTime() >= windowStart.getTime() && completedAt.getTime() <= workOrder.effectiveDueAt.getTime();
}
