import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma, WorkFormTemplateKind, WorkStageEventType, WorkStageExecutionStatus, type WorkStatus } from "@prisma/client";
import { Buffer } from "node:buffer";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { normalizePatientName, PatientsService } from "../patients/patients.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { PermissionKey } from "../rbac/permission-registry.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "../settings/settings.constants.js";
import { WorkQrTokenService } from "../qr/work-qr-token.service.js";
import { PricingResolverService, type PricingResolution } from "../pricing/pricing-resolver.service.js";
import { WorkFormSubmissionValidationService } from "../work-forms/work-form-submission-validation.service.js";
import { B17_LOGISTICS_NOTIFICATION_EVENTS, getB17LogisticsNotificationKey } from "@dental-lab/shared";
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
  SetWorkStatusDto,
  SetManualWorkDeadlineDto,
  UpdateTechnicianWorkDetailsDto,
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
import { getVisibleWorkWhere } from "./work-readability.js";
import {
  getCanonicalWorkOrderCompositionTeeth,
  isAdjacentAdultFdiPair,
  normalizeConnectionPair,
  validateWorkOrderItemScope,
  type WorkOrderItemInput,
  URGENCY_LEVELS,
  URGENCY_LABELS_RO,
  URGENCY_SURCHARGE_PERCENT,
} from "@dental-lab/shared";
import type { CreateWorkOrderItemDto } from "./dto/work-order-items.dto.js";
import { LOGISTICS_ATTACHMENT_LIMITS } from "../logistics/logistics.constants.js";
import type { UploadedAttachmentFile } from "../logistics/logistics.service.js";
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
  readonly baseUnitPriceMinor: number | null;
  readonly currency: string;
  readonly totalPriceMinor: number | null;
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
  activeProbeCycle: {
    include: {
      probeType: true,
      probeTypes: { include: { probeType: true }, orderBy: { sortOrder: "asc" } },
    },
  },
  probeCycles: {
    include: {
      probeType: true,
      probeTypes: { include: { probeType: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sequence: "asc" },
    where: { status: "COMPLETED" },
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
  items: {
    include: { teeth: true, workType: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    where: { archivedAt: null },
  },
  toothConnections: {
    orderBy: [{ toothA: "asc" }, { toothB: "asc" }],
  },
  attachments: {
    orderBy: {
      uploadedAt: "asc",
    },
    select: {
      fileName: true,
      id: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

const WORK_ORDER_DEADLINE_SELECT = {
  activeCycle: {
    select: {
      workflowExecution: {
        select: {
          completedAt: true,
        },
      },
    },
  },
  deadlineMode: true,
  effectiveDueAt: true,
  id: true,
} as const satisfies Prisma.WorkOrderSelect;

type WorkOrderDeadlineRecord = {
  readonly activeCycle: { readonly workflowExecution: { readonly completedAt: Date | null } | null } | null;
  readonly deadlineMode: WorkOrderRecord["deadlineMode"];
  readonly effectiveDueAt: Date | null;
};

const WORK_ORDER_MUTATION_FIELDS = [
  "clinicId",
  "doctorId",
  "workTypeId",
  "patientName",
  "patientReference",
  "shade",
  "quantity",
  "priority",
  "urgency",
  "requestedDeliveryDate",
  "externalReference",
  "internalNotes",
  "implantPlatform",
  "clinicalNotes",
  "technicalCodeNotes",
] as const satisfies readonly (keyof UpdateWorkDto)[];

const TECHNICIAN_DETAIL_FIELDS = [
  "clinicalNotes",
  "internalNotes",
  "technicalCodeNotes",
] as const satisfies readonly (keyof UpdateTechnicianWorkDetailsDto)[];

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
    @Optional() @Inject(NotificationsService) private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Late-bind the execution company for works that were claimed before the
   * clinic had CDT/NG configured. Claiming remains non-blocking; billing gets
   * a complete immutable context when the work reaches its first probe or is
   * finalized.
   */
  public async ensureLateExecutionContext(
    tx: Prisma.TransactionClient,
    workOrderId: string,
    actorUserId: string,
    requestMetadata: RequestMetadata = {},
    occurredAt = new Date(),
    requestedLegalEntityCode?: "CDT" | "NG",
  ): Promise<void> {
    const work = await tx.workOrder.findUnique({ include: WORK_ORDER_INCLUDE, where: { id: workOrderId } });
    if (!work?.activeCycle || work.activeCycle.executionSnapshot) return;

    const clinic = work.clinicId
      ? await tx.clinic.findUnique({ select: { legalEntity: { select: { code: true, displayName: true, id: true, isActive: true } } }, where: { id: work.clinicId } })
      : null;
    const clinicEntity = clinic?.legalEntity;
    const entityCode = requestedLegalEntityCode
      ?? (clinicEntity?.code === "CDT" || clinicEntity?.code === "NG"
      ? clinicEntity.code
      : work.executionLegalEntity?.code === "CDT" || work.executionLegalEntity?.code === "NG"
        ? work.executionLegalEntity.code
        : null);
    const technicianId = work.claimedByUserId ?? work.assignedTechnicianId;
    if (!entityCode) throw new ConflictException("Selectează firma CDT sau NG înainte de a marca lucrarea ca Probă gata sau Finalizată.");
    if (!technicianId) throw new ConflictException("Lucrarea nu are tehnicianul responsabil pentru fixarea firmei de execuție.");

    const legalEntity = await this.validateExecutionLegalEntity(tx, entityCode);
    try {
      const snapshot = await this.prepareExecutionSnapshot(tx, {
        actorUserId,
        claimedAt: work.claimedAt ?? occurredAt,
        legalEntity,
        nextClaimRevision: work.claimRevision,
        requestMetadata,
        source: "ADMIN_REPAIR",
        technicianId,
        workOrder: work,
      });
      await tx.workOrder.update({
        data: { ...(snapshot.deadlineUpdate ?? {}), executionLegalEntityId: legalEntity.id, updatedByUserId: actorUserId, version: { increment: 1 } },
        where: { id: workOrderId },
      });
    } catch (error) {
      // Missing pricing configuration must not stop production. The work can
      // still finish, and remains visible as unavailable for billing until a
      // manager configures pricing.
      if (!(error instanceof ConflictException) || !error.message.includes("nu există un preț aplicabil")) throw error;
    }
  }

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
    return this.listWorksWithWhere(query, false, access, await this.getVisibleWorkWhere(actorUserId), { claimStatus: "UNCLAIMED", technicalReadiness: null });
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
      ...(query.urgency ? { urgency: query.urgency } : {}),
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
              { shade: { contains: search, mode: "insensitive" } },
              { externalReference: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...visibilityWhere,
      ...enforcedWhere,
    };

    const dashboardRows = await this.prisma.workOrder.findMany({
      select: WORK_ORDER_DEADLINE_SELECT,
      where,
    });
    const filteredDashboardRows = query.deadlineFilter
      ? dashboardRows.filter((workOrder) => isDeadlineInFilter({
          effectiveDueAt: workOrder.effectiveDueAt?.toISOString() ?? null,
          mode: workOrder.deadlineMode,
          now: now.toISOString(),
        }, query.deadlineFilter ?? "ALL"))
      : dashboardRows;
    const total = query.deadlineFilter
      ? filteredDashboardRows.length
      : await this.prisma.workOrder.count({ where });
    const pageIds = query.deadlineFilter
      ? filteredDashboardRows.slice((page - 1) * pageSize, page * pageSize).map((workOrder) => workOrder.id)
      : undefined;
    const fetchedWorkOrders = await this.prisma.workOrder.findMany({
      ...(pageIds ? { where: { id: { in: pageIds } } } : { where }),
      include: WORK_ORDER_INCLUDE,
      orderBy: {
        [query.sortBy]: query.sortDirection,
      },
      ...(pageIds ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    });
    const workOrders = pageIds
      ? fetchedWorkOrders.filter((workOrder) => pageIds.includes(workOrder.id))
      : fetchedWorkOrders;

    return {
      deadlineDashboard: this.createDeadlineDashboardSummary(dashboardRows, now),
      items: workOrders.map((workOrder) => toWorkSummaryView(workOrder, includePricing, access)),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  private createDeadlineDashboardSummary(workOrders: readonly WorkOrderDeadlineRecord[], now: Date) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    return workOrders.reduce((summary, workOrder) => accumulateDeadlineDashboardSummary(summary, {
      effectiveDueAt: workOrder.effectiveDueAt?.toISOString() ?? null,
      mode: workOrder.deadlineMode,
      now: now.toISOString(),
    }, isCompletedOnTimeInWindow(workOrder, sevenDaysAgo)), createEmptyDeadlineDashboardSummary());
  }

  private async getVisibleWorkWhere(userId: string): Promise<Prisma.WorkOrderWhereInput> {
    return getVisibleWorkWhere(this.authorizationService, userId);
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

  public async listWorkTypeFormOptions(actorUserId?: string): Promise<readonly WorkTypeFormOptionView[]> {
    const workTypes = await this.prisma.workType.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        colorHex: true,
        code: true,
        id: true,
        name: true,
        probeFamily: true,
        probeTypeCodes: true,
        allowedAddOns: true,
        exclusiveGroup: true,
        symbol: true,
        unit: true,
      },
      where: {
        isActive: true,
        // The technical seed keeps the Excel/pricing catalog separate from
        // the older creative/technical work-type catalog.  The latter may be
        // needed for historical records, but must not produce duplicate or
        // invented choices in the reception/logistics work form.
        symbol: { startsWith: "PRICE-" },
      },
    });

    const canReadPricing = actorUserId === undefined
      ? true
      : (await this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId: actorUserId })).allowed;
    return workTypes.map(toWorkTypeFormOptionView).map((option) => canReadPricing || !option.allowedAddOns
      ? option
      : { ...option, allowedAddOns: option.allowedAddOns.map((addOn) => ({ ...addOn, amountMinor: null })) });
  }

  public async getWork(actorUserId: string, workOrderId: string, includePricing: boolean): Promise<WorkDetailView> {
    const workOrder = await this.findVisibleWorkOrderOrThrow(actorUserId, workOrderId);
    return toWorkDetailView(workOrder, includePricing, await this.createClaimAccess(actorUserId));
  }

  public async addAttachments(context: ActorContext, workOrderId: string, files: readonly UploadedAttachmentFile[]) {
    await this.findVisibleWorkOrderOrThrow(context.actorUserId, workOrderId);
    if (files.length === 0 || files.length > LOGISTICS_ATTACHMENT_LIMITS.maxFiles || files.reduce((total, file) => total + file.size, 0) > LOGISTICS_ATTACHMENT_LIMITS.maxTotalBytes) {
      throw new BadRequestException("Fișierele nu respectă limitele permise.");
    }
    for (const file of files) {
      if (!file.originalname.trim() || file.size <= 0 || file.size > LOGISTICS_ATTACHMENT_LIMITS.maxFileBytes || !LOGISTICS_ATTACHMENT_LIMITS.allowedMimeTypes.includes(file.mimetype as (typeof LOGISTICS_ATTACHMENT_LIMITS.allowedMimeTypes)[number])) {
        throw new BadRequestException("Fișierul nu este valid sau nu este permis.");
      }
    }

    const attachments = await this.prisma.$transaction(async (tx) => {
      const created = [] as Array<{ fileName: string; id: string; mimeType: string; sizeBytes: number; uploadedAt: Date }>;
      for (const file of files) {
        const content = Buffer.from(file.buffer);
        const attachment = await tx.workAttachment.create({
          data: {
            content,
            fileName: file.originalname.trim(),
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedByUserId: context.actorUserId,
            workOrderId,
          },
          select: { fileName: true, id: true, mimeType: true, sizeBytes: true, uploadedAt: true },
        });
        await tx.auditLog.create({
          data: {
            action: "logistics.attachment_uploaded",
            actorUserId: context.actorUserId,
            metadata: { fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, workId: workOrderId },
            resourceId: attachment.id,
            resourceType: "work_attachment",
          },
        });
        created.push(attachment);
      }
      return created;
    });

    return attachments.map((attachment) => ({ ...attachment, uploadedAt: attachment.uploadedAt.toISOString() }));
  }

  public async getAttachment(actorUserId: string, workOrderId: string, attachmentId: string) {
    await this.findVisibleWorkOrderOrThrow(actorUserId, workOrderId);
    const attachment = await this.prisma.workAttachment.findFirst({ where: { id: attachmentId, workOrderId } });
    if (!attachment) {
      throw new NotFoundException("Fișierul nu a fost găsit.");
    }
    return attachment;
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
    const nextClinicId = dto.clinicId ?? null;
    const nextDoctorId = dto.doctorId ?? null;
    await this.validateClinic(this.prisma, nextClinicId, true);
    await this.validateDoctor(this.prisma, nextDoctorId, nextClinicId, true);

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
      await this.validateClinic(tx, nextClinicId, true);
      await this.validateDoctor(tx, nextDoctorId, nextClinicId, true);
      const operationNow = new Date();
      const latestCycle = await tx.workCycle.findFirst({
        orderBy: { cycleNumber: "desc" },
        select: { cycleNumber: true },
        where: { workOrderId },
      });
      const nextCycleNumber = (latestCycle?.cycleNumber ?? 0) + 1;
      const deadline = await this.workDeadlineService.resolveForWork({
        client: tx,
        clinicId: nextClinicId,
        doctorId: nextDoctorId,
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
          clinicId: nextClinicId,
          deadlineEffectiveDueAtSnapshot: deadline.effectiveDueAt,
          deadlineModeSnapshot: deadline.deadlineMode,
          deadlineSnapshotJson: deadline.deadlineRuleSnapshot,
          doctorId: nextDoctorId,
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
          clinicId: nextClinicId,
          doctorId: nextDoctorId,
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
          clinicChanged: nextClinicId !== fresh.clinicId,
          doctorChanged: nextDoctorId !== fresh.doctorId,
          clinicId: nextClinicId,
          doctorId: nextDoctorId,
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
    const before = await this.findWorkOrderOrThrow(workOrderId);
    this.assertClaimRevision(before, dto.expectedClaimRevision);
    this.assertClaimable(before);
    const inlineClinicLegalEntityCode = (before.clinic as typeof before.clinic & { readonly legalEntity?: { readonly code: string } | null } | null)?.legalEntity?.code;
    const clinicLegalEntity = inlineClinicLegalEntityCode
      ? null
      : before.clinicId
        ? await this.prisma.clinic.findUnique({ select: { legalEntity: { select: { code: true } } }, where: { id: before.clinicId } })
        : null;
    const clinicLegalEntityCode = inlineClinicLegalEntityCode ?? clinicLegalEntity?.legalEntity?.code;
    // The claim dialog may explicitly select the execution company. Previously
    // this value was silently ignored and the clinic's collaboration was used,
    // leaving the active cycle without the company/pricing snapshot expected
    // by billing when the work was later finalized.
    const requestedLegalEntityCode = dto.executionLegalEntityCode ?? clinicLegalEntityCode;
    const legalEntity = requestedLegalEntityCode === "CDT" || requestedLegalEntityCode === "NG"
      ? await this.validateExecutionLegalEntity(this.prisma, requestedLegalEntityCode)
      : null;
    if (!before.activeCycle) {
      throw new ConflictException("Lucrarea nu are un ciclu activ.");
    }

    const nextRevision = before.claimRevision + 1;
    const after = await this.prisma.$transaction(async (tx) => {
      const operationNow = new Date();
      let snapshot: Awaited<ReturnType<WorksService["prepareExecutionSnapshot"]>> | null = null;
      if (legalEntity) {
        try {
          snapshot = await this.prepareExecutionSnapshot(tx, {
            actorUserId: context.actorUserId,
            claimedAt: operationNow,
            legalEntity,
            nextClaimRevision: nextRevision,
            requestMetadata: context.requestMetadata,
            source: "TECHNICIAN_FIRST_CLAIM",
            technicianId: context.actorUserId,
            workOrder: before,
          });
        } catch (error) {
          if (!(error instanceof ConflictException) || !error.message.includes("nu există un preț aplicabil")) throw error;
          // Claiming work must not be blocked by pricing setup. The execution
          // snapshot will be created once the manager configures the clinic/pricing.
        }
      }
      const result = await tx.workOrder.updateMany({
        data: {
          ...(snapshot?.deadlineUpdate ?? {}),
          assignedTechnicianId: context.actorUserId,
          assignmentUpdatedAt: operationNow,
          claimedAt: operationNow,
          claimedByUserId: context.actorUserId,
          claimRevision: { increment: 1 },
          claimSource: "TECHNICIAN_CLAIM",
          claimStatus: "CLAIMED",
          completedAt: null,
          completedByUserId: null,
          executionLegalEntityId: legalEntity?.id ?? null,
          releaseReason: null,
          releasedAt: null,
          releasedByUserId: null,
          status: "IN_LUCRU",
          statusChangedAt: operationNow,
          statusChangedByUserId: context.actorUserId,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
          waitingStartedAt: null,
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
          executionSnapshotStatus: snapshot?.status ?? null,
          executionSnapshotVersion: snapshot?.version ?? null,
          eventType: "CLAIMED",
          newLegalEntityId: legalEntity?.id ?? null,
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
      if (snapshot) {
        await this.recordSnapshotAudit(tx, {
          action: snapshot.created ? WORK_ORDER_AUDIT_ACTIONS.executionSnapshotCreated : WORK_ORDER_AUDIT_ACTIONS.executionSnapshotReused,
          actorUserId: context.actorUserId,
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
          snapshot,
          workCode: before.code,
        });
      }
      if (snapshot?.created) {
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

    await this.notificationsService?.resolveAvailability(workOrderId);
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
      const operationNow = new Date();
      const result = await tx.workOrder.updateMany({
        data: {
          assignedTechnicianId: null,
          assignmentUpdatedAt: operationNow,
          claimedAt: null,
          claimedByUserId: null,
          claimRevision: { increment: 1 },
          claimSource: source,
          claimStatus: "UNCLAIMED",
          completedAt: before.status === "FINALIZATA" ? before.completedAt : null,
          completedByUserId: before.status === "FINALIZATA" ? before.completedByUserId : null,
          executionLegalEntityId: null,
          releasedAt: operationNow,
          releasedByUserId: context.actorUserId,
          releaseReason: dto.reason,
          ...(before.status === "FINALIZATA"
            ? {}
            : {
                status: "RECEPTIE" as const,
                statusChangedAt: operationNow,
                statusChangedByUserId: context.actorUserId,
                waitingStartedAt: null,
              }),
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
          completedAt: null,
          completedByUserId: null,
          executionLegalEntityId: legalEntity.id,
          releaseReason: null,
          releasedAt: null,
          releasedByUserId: null,
          status: "IN_LUCRU",
          statusChangedAt: operationNow,
          statusChangedByUserId: context.actorUserId,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
          waitingStartedAt: null,
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

  public async setWorkStatus(context: ActorContext, workOrderId: string, dto: SetWorkStatusDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    await this.ensureCanChangeStatus(context.actorUserId, before);
    const statusPermission = await this.authorizationService.hasPermission({ permission: "works.change_status", userId: context.actorUserId });
    const isGlobalStatusEditor = statusPermission.effectiveScopes.includes("ALL");
    if (dto.status === "FINALIZATA" && !isGlobalStatusEditor) {
      throw new ConflictException("Folosește acțiunea canonică «Finalizată» pentru a închide ciclul tehnic și a trimite lucrarea la facturare.");
    }
    if (!isGlobalStatusEditor) this.assertAllowedStatusTransition(before.status, dto.status);
    if (!isGlobalStatusEditor && (dto.status === "IN_LUCRU" || dto.status === "IN_ASTEPTARE") && before.claimStatus !== "CLAIMED") {
      throw new BadRequestException("Lucrarea trebuie preluată înainte de această stare.");
    }

    const operationNow = new Date();
    const after = await this.prisma.$transaction(async (tx) => {
      if (isGlobalStatusEditor && dto.status === "FINALIZATA" && before.activeProbeCycleId) {
        await tx.probeCycle.updateMany({
          data: { completedAt: operationNow, completedByUserId: context.actorUserId, completionOutcome: "FINALIZED", status: "COMPLETED", version: { increment: 1 } },
          where: { id: before.activeProbeCycleId, status: "ACTIVE" },
        });
      }
      const updated = await tx.workOrder.update({
        data: {
          ...(isGlobalStatusEditor && dto.status === "FINALIZATA" ? { activeProbeCycleId: null } : {}),
          ...(isGlobalStatusEditor ? { assignedTechnicianId: null, claimStatus: "UNCLAIMED" as const, claimedAt: null, claimedByUserId: null } : {}),
          completedAt: dto.status === "FINALIZATA" ? operationNow : null,
          completedByUserId: dto.status === "FINALIZATA" ? context.actorUserId : null,
          finalizedAt: dto.status === "FINALIZATA" ? operationNow : null,
          status: dto.status,
          statusChangedAt: operationNow,
          statusChangedByUserId: context.actorUserId,
          technicalReadiness: dto.status === "FINALIZATA" ? "FINAL_READY" : null,
          updatedByUserId: context.actorUserId,
          version: { increment: 1 },
          waitingStartedAt: dto.status === "IN_ASTEPTARE" ? operationNow : null,
        },
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.statusChanged,
        actorUserId: context.actorUserId,
        metadata: {
          completedAt: updated.completedAt?.toISOString() ?? null,
          completedByUserId: updated.completedByUserId,
          newStatus: updated.status,
          previousStatus: before.status,
          reason: dto.reason ?? null,
          statusChangedAt: operationNow.toISOString(),
          workCode: before.code,
        },
        requestMetadata: context.requestMetadata,
        resourceId: workOrderId,
      });
      return updated;
    });

    return toWorkDetailView(after as WorkOrderRecord, false, await this.createClaimAccess(context.actorUserId));
  }

  public async updateTechnicianDetails(context: ActorContext, workOrderId: string, dto: UpdateTechnicianWorkDetailsDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    await this.ensureCanUpdateTechnicalDetails(context.actorUserId, before);

    const hasClinicalNotes = Object.prototype.hasOwnProperty.call(dto, "clinicalNotes");
    const hasInternalNotes = Object.prototype.hasOwnProperty.call(dto, "internalNotes");
    const hasTechnicalCodeNotes = Object.prototype.hasOwnProperty.call(dto, "technicalCodeNotes");
    if (!hasClinicalNotes && !hasInternalNotes && !hasTechnicalCodeNotes) {
      throw new BadRequestException("No technician detail fields were provided.");
    }

    const data: Prisma.WorkOrderUpdateInput = {
      updatedBy: { connect: { id: context.actorUserId } },
      version: { increment: 1 },
      ...(hasClinicalNotes ? { clinicalNotes: dto.clinicalNotes ?? null } : {}),
      ...(hasInternalNotes ? { internalNotes: dto.internalNotes ?? null } : {}),
      ...(hasTechnicalCodeNotes ? { technicalCodeNotes: dto.technicalCodeNotes ?? null } : {}),
    };

    const after = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        data,
        include: WORK_ORDER_INCLUDE,
        where: { id: workOrderId },
      });

      const changedFields = this.getTechnicianDetailChangedFields(before, updated);
      if (changedFields.length > 0) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.technicalDetailsUpdated,
          actorUserId: context.actorUserId,
          metadata: {
            changedFields,
            code: before.code,
            status: updated.status,
          },
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
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
    const clinicId = dto.clinicId ?? null;
    const doctorId = dto.doctorId ?? null;
    await this.validateClinic(this.prisma, clinicId, true);
    await this.validateDoctor(this.prisma, doctorId, clinicId, true);
    await this.validateWorkType(this.prisma, dto.workTypeId, true);
    if (dto.manualDueAt && !canSetManualDeadline) {
      throw new BadRequestException("Nu ai permisiunea necesară pentru termen manual.");
    }

    return this.workDeadlineService.preview({
      clinicId,
      doctorId,
      legalEntity,
      ...(dto.manualDueAt !== undefined ? { manualDueAt: dto.manualDueAt } : {}),
      ...(dto.manualDueTimeSet !== undefined ? { manualDueTimeSet: dto.manualDueTimeSet } : {}),
      now: new Date(),
      quantity: dto.quantity,
      ...(dto.startAt !== undefined ? { startAt: dto.startAt } : {}),
      workTypeId: dto.workTypeId,
    });
  }

  public async createWork(context: ActorContext, legalEntity: LegalEntityContext, dto: CreateWorkDto, canSetManualDeadline: boolean): Promise<WorkDetailView> {
    const requestedDeliveryDate = parseDateOnly(dto.requestedDeliveryDate, true);
    const operationNow = new Date();
    // The requested date is the only deadline source for a newly registered work.
    // When the form omits the time, keep the date at midnight instead of falling
    // back to the calculated/template deadline.
    // A requested delivery date is part of the normal reception data. Only an
    // explicit manualDueAt is a privileged deadline override.
    const manualDueAt = dto.manualDueAt ? new Date(dto.manualDueAt) : null;
    if (manualDueAt && !canSetManualDeadline) {
      throw new BadRequestException("Nu ai permisiunea necesară pentru termen manual.");
    }

    const aggregateItems = dto.items?.length ? dto.items : null;
    const legacyWorkTypeId = dto.workTypeId ?? aggregateItems?.[0]?.workTypeId ?? null;
    if (!legacyWorkTypeId) {
      throw new BadRequestException("Adaugă cel puțin un element cu tip de lucrare.");
    }
    const workOrder = await this.prisma.$transaction(async (tx) => {
      const clinicId = dto.clinicId ?? null;
      const doctorId = dto.doctorId ?? null;
      const clinic = await this.validateClinic(tx, clinicId, true);
      await this.validateDoctor(tx, doctorId, clinicId, true);
      const clinicEntity = clinic?.legalEntity ?? null;
      const workLegalEntity: LegalEntityContext = clinicEntity?.isActive
        ? { code: clinicEntity.code as LegalEntityContext["code"], displayName: clinicEntity.displayName, id: clinicEntity.id }
        : legalEntity;
      this.rejectConflictingPatientPayload(dto.patientId, dto.patientName);
      const patient = await this.patientsService.findActivePatientOrThrow(tx, dto.patientId);
      const workType = await this.validateWorkType(tx, legacyWorkTypeId, true);
      if (!aggregateItems && workType.unit === "UNIT" && dto.quantity !== 1) throw new BadRequestException("O lucrare de tip bucată are întotdeauna cantitatea 1.");
      const itemInputs: WorkOrderItemInput[] = aggregateItems
        ? aggregateItems.map((item) => this.validateAggregateItem(item))
        : [{
            scope: "TOOTH" as const,
            teeth: [],
            workTypeId: legacyWorkTypeId,
            shade: dto.shade ?? null,
            implantPlatform: dto.implantPlatform ?? null,
          technicalCodeNotes: dto.technicalCodeNotes ?? null,
        }];
      for (const item of itemInputs) {
        if (item.customWorkTypeSnapshot) await this.authorizationService.requirePermission({ permission: "works.custom_type.use", requiredScope: "ALL", userId: context.actorUserId });
        if (item.customImplantPlatformSnapshot) await this.authorizationService.requirePermission({ permission: "works.custom_platform.use", requiredScope: "ALL", userId: context.actorUserId });
      }
      const itemConfigs = await Promise.all(itemInputs.map((item) => this.validateWorkType(tx, item.workTypeId ?? legacyWorkTypeId, true)));
      validateAggregateCatalogRules(itemInputs, itemConfigs);
      const primaryConfig = itemConfigs[0];
      if (!primaryConfig) throw new BadRequestException("Compoziția lucrării nu are o configurație validă.");
      const canonicalItemAddOns = itemInputs.map((item, index) => canonicalSelectedAddOns(itemConfigs[index]!.allowedAddOns, item.selectedAddOns));
      const itemQuantities = itemInputs.map((item, index) => itemConfigs[index]!.unit === "ELEMENT" ? Math.max(1, item.teeth?.length ?? 0) : 1);
      const quantity = aggregateItems ? itemQuantities.reduce((total, value) => total + value, 0) : workType.unit === "UNIT" ? 1 : dto.quantity;
      const pricing = aggregateItems
        ? await this.createPricingSnapshot(tx, itemInputs.length === 1 ? primaryConfig.basePriceMinor : null, quantity)
        : await this.createPricingSnapshot(tx, workType.basePriceMinor, quantity);
      const aggregateTotalPriceMinor = aggregateItems
        ? itemConfigs.reduce((total, config, index) => total + calculateTotalPriceMinor((config.basePriceMinor ?? 0) + addOnAmountMinor(config.allowedAddOns, canonicalItemAddOns[index]), itemQuantities[index]!), 0)
        : pricing.totalPriceMinor;
      const deadline = await this.workDeadlineService.resolveForWork({
        clinicId,
        doctorId,
        legalEntity: workLegalEntity,
        manualDueAt,
        manualDueTimeSet: dto.manualDueTimeSet ?? false,
        now: operationNow,
        quantity,
        source: manualDueAt ? "MANUAL_OVERRIDE" : "CREATION",
        startAt: operationNow,
        workTypeId: legacyWorkTypeId,
      });
      const code = await this.workOrderCodeService.generate(tx);
      const qrToken = await this.workQrTokenService.generate(tx);
      const preparedSubmission = await this.workFormSubmissionValidationService.prepareCreate(tx, {
        actorUserId: context.actorUserId,
        enforceRequired: false,
        submission: dto.workFormSubmission,
        workCode: code,
        workTypeId: legacyWorkTypeId,
      });

      const data: Prisma.WorkOrderUncheckedCreateInput = {
        baseUnitPriceMinor: pricing.baseUnitPriceMinor,
        clinicId,
        code,
        createdByUserId: context.actorUserId,
        currency: pricing.currency,
        ...deadlineDataToPrisma(deadline, 1),
        doctorId,
        // A clinic without an explicitly assigned legal entity must remain
        // unresolved on the work. The actor's legal entity is only a fallback
        // for deadline/pricing calculation, not a persisted company choice.
        executionLegalEntityId: clinicEntity?.isActive ? clinicEntity.id : null,
        patientId: patient.id,
        patientName: toPatientSnapshotName(patient),
        priority: dto.priority,
        urgency: dto.urgency ?? "NORMAL",
        qrToken,
        quantity,
        requestedDeliveryDate,
        status: "RECEPTIE",
        statusChangedAt: operationNow,
        statusChangedByUserId: context.actorUserId,
        totalPriceMinor: aggregateTotalPriceMinor,
        updatedByUserId: context.actorUserId,
        workTypeId: legacyWorkTypeId,
      };

      assignNullableCreateValue(data, "clinicalNotes", dto.clinicalNotes);
      assignNullableCreateValue(data, "externalReference", dto.externalReference);
      assignNullableCreateValue(data, "internalNotes", dto.internalNotes);
      assignNullableCreateValue(data, "technicalCodeNotes", dto.technicalCodeNotes);
      assignNullableCreateValue(data, "patientReference", dto.patientReference);
      assignNullableCreateValue(data, "shade", dto.shade);
      assignNullableCreateValue(data, "implantPlatform", dto.implantPlatform);
      if (preparedSubmission) {
        data.workFormSubmissions = {
          create: preparedSubmission.data,
        };
      }

      const createdWorkOrder = await tx.workOrder.create({
        data,
        include: WORK_ORDER_INCLUDE,
      });

      if (aggregateItems) {
        for (const [sortOrder, item] of itemInputs.entries()) {
          await tx.workOrderItem.create({
            data: {
              workOrderId: createdWorkOrder.id,
              sortOrder,
              scope: item.scope,
              workTypeId: item.workTypeId ?? null,
              ...(item.customWorkTypeSnapshot ? { customWorkTypeSnapshot: item.customWorkTypeSnapshot as Prisma.InputJsonValue } : {}),
              shade: item.shade ?? null,
              implantPlatform: item.implantPlatform ?? null,
              ...(item.customImplantPlatformSnapshot ? { customImplantPlatformSnapshot: item.customImplantPlatformSnapshot as Prisma.InputJsonValue } : {}),
              restorationType: item.restorationType ?? null,
              technicalCodeNotes: item.technicalCodeNotes ?? null,
              notes: item.notes ?? null,
              baseUnitPriceMinor: itemConfigs[sortOrder]!.basePriceMinor,
              totalPriceMinor: calculateTotalPriceMinor((itemConfigs[sortOrder]!.basePriceMinor ?? 0) + addOnAmountMinor(itemConfigs[sortOrder]!.allowedAddOns, canonicalItemAddOns[sortOrder]), itemQuantities[sortOrder]!),
              currency: pricing.currency,
              commercialSnapshot: { selectedAddOns: canonicalItemAddOns[sortOrder] ?? [] },
              selectedAddOns: canonicalItemAddOns[sortOrder] ? canonicalItemAddOns[sortOrder] as Prisma.InputJsonValue : Prisma.JsonNull,
              teeth: { create: (item.teeth ?? []).map((fdiTooth, toothSortOrder) => ({ fdiTooth, sortOrder: toothSortOrder })) },
            },
          });
        }
        const presentTeeth = new Set(getCanonicalWorkOrderCompositionTeeth(itemInputs.map((item) => ({ scope: item.scope, teeth: item.teeth ?? [] }))));
        for (const connection of dto.toothConnections ?? []) {
          const pair = normalizeConnectionPair(connection.toothA, connection.toothB);
          if (!pair || !isAdjacentAdultFdiPair(connection.toothA, connection.toothB) || !presentTeeth.has(pair.toothA) || !presentTeeth.has(pair.toothB)) {
            throw new BadRequestException("Conexiunea selectată nu este validă pentru compoziția lucrării.");
          }
          await tx.workOrderToothConnection.create({ data: { workOrderId: createdWorkOrder.id, toothA: pair.toothA, toothB: pair.toothB } });
        }
      }

      // Every new work starts with an active intake cycle.  Claiming a new work
      // must not depend on the return-cycle flow having run first.
      const initialCycle = await tx.workCycle.create({
        data: {
          clinicId,
          createdByUserId: context.actorUserId,
          cycleNumber: 1,
          deadlineEffectiveDueAtSnapshot: deadline.effectiveDueAt,
          deadlineModeSnapshot: deadline.deadlineMode,
          deadlineSnapshotJson: deadline.deadlineRuleSnapshot,
          doctorId,
          openedAt: operationNow,
          reason: "INITIAL",
          status: "ACTIVE",
          workOrderId: createdWorkOrder.id,
        },
      });
      // Keep the technical probe lifecycle aligned with the operational cycle.
      // This makes the first probe eligible for the same technician ->
      // logistics -> courier flow as later probes.
      if (tx.probeType && Array.isArray(createdWorkOrder.workType.probeTypeCodes)) {
        const probeCodes = createdWorkOrder.workType.probeTypeCodes.filter((value): value is string => typeof value === "string");
        if (probeCodes.length > 0) {
          const initialProbeType = await tx.probeType.findFirst({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true }, where: { code: { in: probeCodes }, isArchived: false } });
          if (initialProbeType) {
            const initialProbeCycle = await tx.probeCycle.create({ data: { createdByUserId: context.actorUserId, deadlineAt: deadline.effectiveDueAt ?? requestedDeliveryDate ?? operationNow, openedAt: operationNow, probeTypeId: initialProbeType.id, probeTypeNameSnapshot: initialProbeType.name, sequence: 0, status: "ACTIVE", workOrderId: createdWorkOrder.id, probeTypes: { create: [{ probeTypeId: initialProbeType.id, probeTypeNameSnapshot: initialProbeType.name, sortOrder: 0 }] } } });
            await tx.workOrder.update({ data: { activeProbeCycleId: initialProbeCycle.id }, where: { id: createdWorkOrder.id } });
          }
        }
      }
      await tx.workOrder.update({
        data: { activeCycleId: initialCycle.id },
        where: { id: createdWorkOrder.id },
      });
      await this.workflowExecutionService.createSnapshotForWork(tx, {
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        workCode: createdWorkOrder.code,
        workCycleId: initialCycle.id,
        workOrderId: createdWorkOrder.id,
        workTypeId: createdWorkOrder.workTypeId,
      });
      const initialLogisticsState = await tx.workLogisticsState.create({
        data: {
          physicalLocationCode: "RECEPTIE",
          status: "RECEIVED",
          workCycleId: initialCycle.id,
          workOrderId: createdWorkOrder.id,
        },
      });
      await tx.logisticsEvent.create({
        data: {
          actorUserId: context.actorUserId,
          logisticsStateId: initialLogisticsState.id,
          metadata: { cycleId: initialCycle.id, cycleNumber: 1, newStatus: "RECEIVED", workCode: createdWorkOrder.code, workId: createdWorkOrder.id },
          type: "WORK_RECEIVED",
          workCycleId: initialCycle.id,
          workOrderId: createdWorkOrder.id,
        },
      });

      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: {
          ...this.createAuditMetadata(createdWorkOrder),
          notificationEvent: B17_LOGISTICS_NOTIFICATION_EVENTS.newWork,
          notificationKey: getB17LogisticsNotificationKey(B17_LOGISTICS_NOTIFICATION_EVENTS.newWork, { workOrderId: createdWorkOrder.id }),
        },
        requestMetadata: context.requestMetadata,
        resourceId: createdWorkOrder.id,
      });
      await this.recordAudit(tx, {
        action: WORK_ORDER_AUDIT_ACTIONS.urgencySet,
        actorUserId: context.actorUserId,
        metadata: { from: null, to: formatUrgency(createdWorkOrder.urgency), workCode: createdWorkOrder.code },
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

    await this.notificationsService?.publishNewWork({ workOrderId: workOrder.id, code: workOrder.code, patientName: workOrder.patientName, clinicName: workOrder.clinic?.name ?? null, technicianAvailable: workOrder.claimStatus === "UNCLAIMED" && workOrder.technicalReadiness === null });
    return toWorkDetailView(workOrder, await this.canReadPricing(context.actorUserId), await this.createClaimAccess(context.actorUserId));
  }

  public async updateWork(context: ActorContext, legalEntity: LegalEntityContext, workOrderId: string, dto: UpdateWorkDto): Promise<WorkDetailView> {
    const before = await this.findWorkOrderOrThrow(workOrderId);
    const hasTechnicalCode = Object.prototype.hasOwnProperty.call(dto, "technicalCodeNotes");
    if (hasTechnicalCode) {
      const codePermission = await this.authorizationService.hasPermission({ permission: "works.technical_code.edit", userId: context.actorUserId });
      if (!codePermission.allowed || before.status === "FINALIZATA" || before.technicalReadiness === "FINAL_READY") {
        throw new ForbiddenException("Codul tehnic nu poate fi modificat de acest utilizator.");
      }
    }
    if (dto.urgency !== undefined) {
      await this.authorizationService.requirePermission({ permission: "works.urgency.update", requiredScope: "ALL", userId: context.actorUserId });
      if (before.status === "FINALIZATA") throw new BadRequestException("Urgența nu mai poate fi modificată după finalizarea lucrării.");
    }
    const beforeGenericSubmission = getGenericWorkFormSubmission(before);
    this.rejectConflictingPatientPayload(dto.patientId, dto.patientName);
    const data = await this.toUpdateData(before, dto, context.actorUserId);
    await this.ensureCanUpdateWork(context.actorUserId, before);
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
    const hasManualDeadline = dto.manualDueAt !== undefined && dto.manualDueAt !== null;
    if (hasManualDeadline) {
      await this.authorizationService.requirePermission({ permission: "works.deadline.set_manual", requiredScope: "ALL", userId: context.actorUserId });
    }
    const shouldRecalculateDeadline = !hasManualDeadline && this.workDeadlineService.shouldRecalculate(candidateChangedFields, before.deadlineLockedAt !== null);
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
    if (hasManualDeadline) {
      const manualDeadline = await this.workDeadlineService.resolveForWork({
        clinicId: dto.clinicId ?? before.clinicId,
        doctorId: dto.doctorId ?? before.doctorId,
        legalEntity,
        manualDueAt: new Date(dto.manualDueAt!),
        manualDueTimeSet: dto.manualDueTimeSet ?? true,
        now: new Date(),
        quantity: dto.quantity ?? before.quantity,
        source: "MANUAL_OVERRIDE",
        startAt: before.deadlineStartAt ?? before.createdAt,
        workTypeId: dto.workTypeId ?? before.workTypeId,
      });
      Object.assign(data, deadlineDataToPrisma(manualDeadline, before.deadlineRevision + 1));
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

      if (dto.patientName !== undefined && before.patientId) {
        const patientName = dto.patientName.trim().replace(/\s+/g, " ");
        const nameParts = patientName.split(" ");
        const firstName = nameParts.shift() ?? patientName;
        const lastName = nameParts.join(" ") || firstName;
        const normalized = normalizePatientName(firstName, lastName);
        await tx.patient.update({
          data: { firstName, lastName, normalizedFirstName: normalized.firstName, normalizedLastName: normalized.lastName, updatedByUserId: context.actorUserId, version: { increment: 1 } },
          where: { id: before.patientId },
        });
        await tx.workOrder.updateMany({
          data: { patientName, updatedByUserId: context.actorUserId, version: { increment: 1 } },
          where: { patientId: before.patientId },
        });
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
      if (dto.urgency !== undefined && before.urgency !== updatedWorkOrder.urgency) {
        await this.recordAudit(tx, {
          action: before.urgency === null ? WORK_ORDER_AUDIT_ACTIONS.urgencySet : WORK_ORDER_AUDIT_ACTIONS.urgencyChanged,
          actorUserId: context.actorUserId,
          metadata: {
            from: formatUrgency(before.urgency),
            to: formatUrgency(updatedWorkOrder.urgency),
            workCode: before.code,
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
      if (hasTechnicalCode && before.technicalCodeNotes !== updatedWorkOrder.technicalCodeNotes) {
        await this.recordAudit(tx, {
          action: WORK_ORDER_AUDIT_ACTIONS.technicalCodeUpdated,
          actorUserId: context.actorUserId,
          metadata: {
            from: before.technicalCodeNotes ?? null,
            to: updatedWorkOrder.technicalCodeNotes ?? null,
            workCode: before.code,
          },
          requestMetadata: context.requestMetadata,
          resourceId: workOrderId,
        });
      }

      return updatedWorkOrder;
    });

    return toWorkDetailView(after, await this.canReadPricing(context.actorUserId), await this.createClaimAccess(context.actorUserId));
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

    return toWorkDetailView(after, await this.canReadPricing(context.actorUserId), await this.createClaimAccess(context.actorUserId));
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
      manualDueTimeSet: dto.manualDueTimeSet ?? true,
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

    return toWorkDetailView(after, await this.canReadPricing(context.actorUserId), await this.createClaimAccess(context.actorUserId));
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

  private async canReadPricing(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId });
    return result.allowed;
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
      doctor: cycle.doctor?.displayName ?? workOrder.doctor?.displayName ?? "-",
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

    const hasClinicId = Object.prototype.hasOwnProperty.call(dto, "clinicId");
    const hasDoctorId = Object.prototype.hasOwnProperty.call(dto, "doctorId");
    const nextClinicId = hasClinicId ? dto.clinicId ?? null : before.clinicId;
    const nextDoctorId = hasDoctorId ? dto.doctorId ?? null : before.doctorId;
    const nextQuantity = dto.quantity ?? before.quantity;

    if (hasClinicId) {
      await this.validateClinic(this.prisma, nextClinicId, true);
      data.clinicId = nextClinicId;
    }

    if (hasDoctorId || hasClinicId) {
      await this.validateDoctor(this.prisma, nextDoctorId, nextClinicId, hasDoctorId && nextDoctorId !== null);
      data.doctorId = nextDoctorId;
    }

    if (dto.workTypeId !== undefined) {
      const workType = await this.validateWorkType(this.prisma, dto.workTypeId, true);
      if (workType.unit === "UNIT" && nextQuantity !== 1) throw new BadRequestException("O lucrare de tip bucată are întotdeauna cantitatea 1.");
      const pricing = await this.createPricingSnapshot(this.prisma, workType.basePriceMinor, nextQuantity);
      data.workTypeId = dto.workTypeId;
      data.baseUnitPriceMinor = pricing.baseUnitPriceMinor;
      data.currency = pricing.currency;
      data.totalPriceMinor = pricing.totalPriceMinor;
    } else if (dto.quantity !== undefined) {
      if (before.workType?.unit === "UNIT" && dto.quantity !== 1) throw new BadRequestException("O lucrare de tip bucată are întotdeauna cantitatea 1.");
      data.totalPriceMinor = before.baseUnitPriceMinor === null ? null : calculateTotalPriceMinor(before.baseUnitPriceMinor, dto.quantity);
    }

    if (dto.patientId !== undefined) {
      throw new BadRequestException("Pacientul se modifică prin selectarea unui pacient existent.");
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
      case "technicalCodeNotes":
      case "patientReference":
      case "shade":
      case "implantPlatform":
        data[field] = typeof value === "number" ? null : value;
        return;
      case "priority":
        if (value === "NORMAL" || value === "URGENT") {
          data.priority = value;
        }
        return;
      case "urgency":
        if (typeof value === "string" && (URGENCY_LEVELS as readonly string[]).includes(value)) data.urgency = value as "NORMAL" | "URGENCY_1" | "URGENCY_2" | "URGENCY_3" | "URGENCY_4";
        return;
      case "quantity":
        if (typeof value === "number") {
          data.quantity = value;
        }
        return;
      case "patientName":
        if (typeof value === "string") data.patientName = value;
        return;
      case "requestedDeliveryDate":
        if (typeof value === "string") {
          data.requestedDeliveryDate = parseDateOnly(value, true);
        }
        return;
    }
  }

  private async validateClinic(
    client: Prisma.TransactionClient | PrismaService,
    clinicId: string | null | undefined,
    requireActive: boolean,
  ): Promise<{ isActive: boolean; legalEntity: { id: string; code: string; displayName: string; isActive: boolean } | null } | null> {
    if (!clinicId) {
      return null;
    }

    const clinic = await client.clinic.findUnique({
      select: {
        isActive: true,
        legalEntity: {
          select: {
            code: true,
            displayName: true,
            id: true,
            isActive: true,
          },
        },
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

    return clinic;
  }

  private async validateDoctor(
    client: Prisma.TransactionClient | PrismaService,
    doctorId: string | null | undefined,
    clinicId: string | null | undefined,
    requireActive: boolean,
  ): Promise<void> {
    if (!doctorId) {
      return;
    }

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

    if (clinicId && doctor.clinicId !== clinicId) {
      throw new BadRequestException("Doctor must belong to the selected clinic.");
    }

    if (requireActive && !doctor.isActive) {
      throw new BadRequestException("Doctor must be active.");
    }
  }

  private validateAggregateItem(dto: CreateWorkOrderItemDto): WorkOrderItemInput {
    const validation = validateWorkOrderItemScope(dto);
    if (!validation.valid) {
      throw new BadRequestException(validation.message ?? "Componenta tehnică nu este validă.");
    }
    if (!dto.workTypeId && !dto.customWorkTypeSnapshot) {
      throw new BadRequestException("Selectează un tip de lucrare pentru fiecare componentă.");
    }
    if (dto.workTypeId && dto.customWorkTypeSnapshot) {
      throw new BadRequestException("Alege tipul din catalog sau valoarea personalizată, nu ambele.");
    }
    return { ...dto, teeth: validation.teeth };
  }

  private async validateWorkType(
    client: Prisma.TransactionClient | PrismaService,
    workTypeId: string,
    requireActive: boolean,
  ): Promise<{ readonly allowedAddOns: Prisma.JsonValue | null; readonly basePriceMinor: number | null; readonly exclusiveGroup: string | null; readonly id: string; readonly unit: string }> {
    const workType = await client.workType.findUnique({
      select: {
        allowedAddOns: true,
        basePriceMinor: true,
        exclusiveGroup: true,
        isActive: true,
        id: true,
        unit: true,
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

  private async createPricingSnapshot(client: Prisma.TransactionClient | PrismaService, baseUnitPriceMinor: number | null, quantity: number): Promise<PricingSnapshot> {
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
      totalPriceMinor: baseUnitPriceMinor === null ? null : calculateTotalPriceMinor(baseUnitPriceMinor, quantity),
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

  private getTechnicianDetailChangedFields(before: WorkOrderRecord, after: WorkOrderRecord): readonly (typeof TECHNICIAN_DETAIL_FIELDS)[number][] {
    return TECHNICIAN_DETAIL_FIELDS.filter((field) => before[field] !== after[field]);
  }

  private createAuditMetadata(workOrder: WorkOrderRecord): Prisma.InputJsonObject {
    return {
      baseUnitPriceMinor: workOrder.baseUnitPriceMinor,
      clinicId: workOrder.clinicId,
      code: workOrder.code,
      currency: workOrder.currency,
      doctorId: workOrder.doctorId,
      priority: workOrder.priority,
      urgency: workOrder.urgency,
      quantity: workOrder.quantity,
      shade: workOrder.shade,
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
      readonly legalEntity: { readonly code: "CDT" | "NG"; readonly displayName: string; readonly id: string };
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
        code: input.legalEntity.code as "CDT" | "NG",
        displayName: input.legalEntity.displayName,
        publicId: input.legalEntity.id,
      },
      technician: {
        displayName: technician.displayName,
        publicId: technician.id,
      },
      work: {
        clinicName: input.workOrder.clinic?.name ?? "-",
        clinicPublicId: input.workOrder.clinic?.id ?? null,
        doctorName: input.workOrder.doctor?.displayName ?? "-",
        doctorPublicId: input.workOrder.doctor?.id ?? null,
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
      readonly legalEntity: { readonly code: "CDT" | "NG"; readonly id: string };
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
      readonly legalEntity: { readonly code: "CDT" | "NG"; readonly displayName: string; readonly id: string };
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

  private async ensureCanChangeStatus(userId: string, workOrder: WorkOrderRecord): Promise<void> {
    const permission = await this.authorizationService.hasPermission({
      permission: "works.change_status",
      userId,
    });
    if (!permission.allowed) {
      throw new ForbiddenException("Nu ai permisiunea necesară pentru schimbarea stării lucrării.");
    }
    if (!permission.effectiveScopes || permission.effectiveScopes.includes("ALL")) {
      return;
    }
    if (workOrder.assignedTechnicianId === userId || workOrder.claimedByUserId === userId) {
      return;
    }
    throw new ForbiddenException("Poți schimba starea doar pentru lucrările proprii.");
  }

  private async ensureCanUpdateWork(userId: string, workOrder: WorkOrderRecord): Promise<void> {
    const permission = await this.authorizationService.hasPermission({ permission: "works.update", userId });
    if (!permission.allowed) throw new ForbiddenException("Nu ai permisiunea necesară pentru modificarea lucrării.");
    if (!permission.effectiveScopes || permission.effectiveScopes.includes("ALL")) return;
    if (workOrder.assignedTechnicianId === userId || workOrder.claimedByUserId === userId) return;
    throw new ForbiddenException("Poți modifica doar lucrările proprii.");
  }

  private async ensureCanUpdateTechnicalDetails(userId: string, workOrder: WorkOrderRecord): Promise<void> {
    const permission = await this.authorizationService.hasPermission({
      permission: "works.technical_details.update",
      userId,
    });
    if (!permission.allowed) {
      throw new ForbiddenException("Nu ai permisiunea necesară pentru modificarea detaliilor tehnice.");
    }
    if (permission.effectiveScopes.includes("ALL")) {
      return;
    }
    if (workOrder.assignedTechnicianId === userId || workOrder.claimedByUserId === userId) {
      return;
    }
    throw new ForbiddenException("Poți modifica detaliile tehnice doar pentru lucrările proprii.");
  }

  private assertAllowedStatusTransition(currentStatus: WorkStatus, nextStatus: SetWorkStatusDto["status"]): void {
    if (currentStatus === nextStatus) {
      return;
    }
    if (currentStatus === "REGISTERED" && nextStatus === "RECEPTIE") {
      return;
    }
    if (currentStatus === "RECEPTIE" && nextStatus === "IN_LUCRU") {
      return;
    }
    if (currentStatus === "IN_LUCRU" && (nextStatus === "IN_ASTEPTARE" || nextStatus === "FINALIZATA")) {
      return;
    }
    if (currentStatus === "IN_ASTEPTARE" && nextStatus === "IN_LUCRU") {
      return;
    }
    throw new BadRequestException("Tranziția de stare nu este permisă.");
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
    if (workOrder.technicalReadiness === "PROBE_READY" || workOrder.technicalReadiness === "FINAL_READY") {
      throw new ConflictException("Lucrarea nu mai este disponibilă pentru preluare tehnică.");
    }
    // A returned probe opens a new active probe cycle, while the legacy work
    // cycle can still retain the previous delivery's logistics status. That
    // historical status must not prevent the technician from claiming the new
    // probe.
    const logisticsStatus = workOrder.activeProbeCycleId ? null : workOrder.activeCycle?.logisticsState?.status;
    if (logisticsStatus === "BLOCKED") {
      throw new BadRequestException("Lucrarea blocată nu poate fi revendicată.");
    }
    if (logisticsStatus === "HANDED_TO_DELIVERY" || logisticsStatus === "DELIVERED") {
      throw new BadRequestException("Lucrarea predată sau livrată nu poate fi revendicată.");
    }
  }

  private async validateExecutionLegalEntity(
    client: Prisma.TransactionClient | PrismaService,
    legalEntityCode: "CDT" | "NG",
  ): Promise<{ readonly id: string; readonly code: "CDT" | "NG"; readonly displayName: string }> {
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

    if (!legalEntity || !legalEntity.isActive || (legalEntity.code !== "CDT" && legalEntity.code !== "NG")) {
      throw new BadRequestException("Alege o companie activă CDT sau NG pentru execuție.");
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

function addOnAmountMinor(allowedAddOns: Prisma.JsonValue | null, selectedAddOns: WorkOrderItemInput["selectedAddOns"]): number {
  const amounts = new Map<string, number>();
  if (Array.isArray(allowedAddOns)) {
    for (const entry of allowedAddOns) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      if (typeof entry.code === "string" && typeof entry.amountMinor === "number") amounts.set(entry.code, entry.amountMinor);
    }
  }
  return (selectedAddOns ?? []).reduce((total, selected) => total + (amounts.get(selected.code) ?? 0), 0);
}

function canonicalSelectedAddOns(allowedAddOns: Prisma.JsonValue | null, selectedAddOns: WorkOrderItemInput["selectedAddOns"]): readonly { readonly code: string; readonly amountMinor: number | null }[] {
  const amounts = new Map<string, number>();
  if (Array.isArray(allowedAddOns)) {
    for (const entry of allowedAddOns) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      if (typeof entry.code === "string" && typeof entry.amountMinor === "number") amounts.set(entry.code, entry.amountMinor);
    }
  }
  return (selectedAddOns ?? []).map((selected) => ({ code: selected.code, amountMinor: amounts.get(selected.code) ?? null }));
}

function validateAggregateCatalogRules(
  items: readonly WorkOrderItemInput[],
  configs: readonly { readonly allowedAddOns: Prisma.JsonValue | null; readonly exclusiveGroup: string | null; readonly id: string; readonly unit: string }[],
): void {
  const workTypeCounts = new Map<string, number>();
  const exclusiveCounts = new Map<string, number>();
  items.forEach((item, index) => {
    const config = configs[index];
    if (!config) throw new BadRequestException("Configurația tipului de lucrare nu a fost găsită.");
    const count = (workTypeCounts.get(config.id) ?? 0) + 1;
    workTypeCounts.set(config.id, count);
    if (config.unit === "UNIT" && count > 1) throw new BadRequestException("O lucrare de tip bucată poate fi adăugată o singură dată în aceeași lucrare.");
    if (config.exclusiveGroup) {
      const groupCount = (exclusiveCounts.get(config.exclusiveGroup) ?? 0) + 1;
      exclusiveCounts.set(config.exclusiveGroup, groupCount);
      if (groupCount > 1) throw new BadRequestException(`Lucrările din grupul ${config.exclusiveGroup} nu pot fi combinate în aceeași lucrare.`);
    }
    const allowed = new Set(Array.isArray(config.allowedAddOns) ? config.allowedAddOns.flatMap((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && typeof entry.code === "string" ? [entry.code] : []) : []);
    const selected = new Set<string>();
    for (const addOn of item.selectedAddOns ?? []) {
      if (selected.has(addOn.code)) throw new BadRequestException("Același adaos nu poate fi selectat de două ori pentru aceeași componentă.");
      selected.add(addOn.code);
      if (!allowed.has(addOn.code)) throw new BadRequestException("Adaosul selectat nu este permis pentru această lucrare.");
    }
  });
}

export function assignNullableCreateValue(
  data: Prisma.WorkOrderUncheckedCreateInput,
  field: "clinicalNotes" | "externalReference" | "internalNotes" | "technicalCodeNotes" | "patientReference" | "shade" | "implantPlatform",
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

function formatUrgency(value: string | null): string | null {
  if (!value || !(value in URGENCY_LABELS_RO)) return null;
  const level = value as keyof typeof URGENCY_LABELS_RO;
  return `${URGENCY_LABELS_RO[level]} · +${URGENCY_SURCHARGE_PERCENT[level]}%`;
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

function isCompletedOnTimeInWindow(workOrder: WorkOrderDeadlineRecord, windowStart: Date): boolean {
  const completedAt = workOrder.activeCycle?.workflowExecution?.completedAt;
  if (!completedAt || !workOrder.effectiveDueAt) {
    return false;
  }

  return completedAt.getTime() >= windowStart.getTime() && completedAt.getTime() <= workOrder.effectiveDueAt.getTime();
}
