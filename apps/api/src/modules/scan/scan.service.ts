import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkStageExecutionStatus, WorkWorkflowExecutionStatus } from "@prisma/client";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { parseQrLookup } from "../qr/qr.service.js";
import { QrRateLimitService } from "../qr/qr-rate-limit.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { PermissionKey } from "../rbac/permission-registry.js";
import { SCAN_AUDIT_ACTIONS, SCAN_RESOURCE_TYPE } from "./scan.constants.js";

interface ActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

type ScanActionType = "OPEN_WORK" | "START_STAGE" | "COMPLETE_STAGE" | "ASSIGN_STAGE" | "REASSIGN_STAGE";
type ScanSource = "camera" | "manual";

interface ResolveScanInput {
  readonly payload: string;
  readonly source: ScanSource;
}

interface ScanActionAvailability {
  readonly enabled: boolean;
  readonly reason: string | null;
  readonly type: ScanActionType;
}

export interface ScanContextView {
  readonly actions: readonly ScanActionAvailability[];
  readonly logistics: {
    readonly activeGroup: { readonly code: string; readonly id: string; readonly status: "DRAFT" | "READY" | "CANCELLED" } | null;
    readonly blockedReason: string | null;
    readonly locationCode: "RECEPTIE" | "PRODUCTIE" | "RAFT_FINISARE" | "ZONA_AMBALARE" | "GATA_LIVRARE" | null;
    readonly status: "RECEIVED" | "IN_PRODUCTION" | "BLOCKED" | "READY_FOR_PACKING" | "PACKING" | "READY_FOR_DELIVERY" | "HANDED_TO_DELIVERY" | "DELIVERED";
  };
  readonly resolvedAt: string;
  readonly work: {
    readonly clinicName: string;
    readonly code: string;
    readonly doctorName: string;
    readonly id: string;
    readonly patientName: string | null;
    readonly priority: "NORMAL" | "URGENT";
    readonly requestedDeliveryDate: string;
    readonly status: "REGISTERED";
    readonly workTypeName: string;
  };
  readonly workflow: {
    readonly currentStage: {
      readonly allowedRoleLabels: readonly string[];
      readonly assignedUser: { readonly displayName: string; readonly id: string } | null;
      readonly id: string;
      readonly name: string;
      readonly status: WorkStageExecutionStatus;
      readonly version: number;
    } | null;
    readonly id: string;
    readonly progress: { readonly completed: number; readonly total: number };
    readonly status: WorkWorkflowExecutionStatus;
    readonly version: number;
    readonly workflowName: string;
  } | null;
}

const scanActionOrder = new Map<ScanActionType, number>([
  ["OPEN_WORK", 0],
  ["START_STAGE", 1],
  ["COMPLETE_STAGE", 2],
  ["ASSIGN_STAGE", 3],
  ["REASSIGN_STAGE", 4],
]);

const roleLabels: Readonly<Record<string, string>> = {
  CURIER: "Curier",
  LOGISTICA: "Logistică",
  MANAGER: "Manager",
  MEDIC: "Medic",
  RECEPTIE: "Recepție",
  TEHNICIAN: "Tehnician",
};

const scanWorkInclude = {
  clinic: {
    select: {
      name: true,
    },
  },
  doctor: {
    select: {
      displayName: true,
    },
  },
  deliveryPreparationItems: {
    include: {
      group: {
        select: {
          code: true,
          id: true,
          status: true,
        },
      },
    },
    where: {
      isActive: true,
    },
  },
  logisticsState: true,
  workType: {
    select: {
      name: true,
    },
  },
  workflowExecution: {
    include: {
      stages: {
        include: {
          assignedUser: {
            select: {
              displayName: true,
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

type ScanWorkRecord = Prisma.WorkOrderGetPayload<{ include: typeof scanWorkInclude }>;
type ScanStageRecord = NonNullable<ScanWorkRecord["workflowExecution"]>["stages"][number];

@Injectable()
export class ScanService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QrRateLimitService) private readonly qrRateLimitService: QrRateLimitService,
  ) {}

  public async resolveScan(context: ActorContext, input: ResolveScanInput): Promise<ScanContextView> {
    this.qrRateLimitService.assertAllowed(`${context.actor.id}:${context.requestMetadata.ipAddress ?? "unknown"}`);
    const lookup = parseQrLookup(input.payload);
    const work = await this.findWork(lookup);
    await this.ensureCanResolveWork(context.actor, work);
    const roleCodes = await this.getActorRoleCodes(context.actor.id);
    const actions = await this.getActions(context.actor, roleCodes, work);

    await this.recordAudit(context, SCAN_AUDIT_ACTIONS.qrResolved, work.id, {
      source: input.source,
      workCode: work.code,
      workId: work.id,
    });

    return this.toScanContextView(work, actions);
  }

  public async recordWorkOpened(context: ActorContext, workId: string): Promise<{ readonly ok: true }> {
    const work = await this.prisma.workOrder.findUnique({
      select: {
        code: true,
        id: true,
      },
      where: {
        id: workId,
      },
    });
    if (!work) {
      throw new NotFoundException("Lucrarea nu a fost găsită.");
    }
    const readAll = await this.authorizationService.hasPermission({
      permission: "works.read_all",
      requiredScope: "ALL",
      userId: context.actor.id,
    });
    if (!readAll.allowed) {
      throw new ForbiddenException("Nu ai acces la detaliul complet al lucrării.");
    }

    await this.recordAudit(context, SCAN_AUDIT_ACTIONS.workOpened, work.id, {
      source: "scan",
      workCode: work.code,
      workId: work.id,
    });

    return { ok: true };
  }

  private async findWork(lookup: ReturnType<typeof parseQrLookup>): Promise<ScanWorkRecord> {
    const work = await this.prisma.workOrder.findFirst({
      include: scanWorkInclude,
      where: lookup.kind === "token" ? { qrToken: lookup.value } : { code: lookup.value },
    });

    if (!work) {
      throw new NotFoundException("QR-ul nu corespunde unei lucrări existente.");
    }

    return work;
  }

  private async ensureCanResolveWork(actor: AuthenticatedUser, work: ScanWorkRecord): Promise<void> {
    const permission = await this.authorizationService.hasPermission({
      permission: "scan.resolve",
      requiredScope: "ASSIGNED",
      userId: actor.id,
    });
    if (!permission.allowed) {
      throw new ForbiddenException("Nu ai permisiune pentru scanare.");
    }
    if (permission.effectiveScopes.includes("ALL")) {
      return;
    }

    const currentStage = this.getCurrentStage(work);
    if (currentStage?.assignedUserId !== actor.id) {
      throw new ForbiddenException("Lucrarea scanată nu este asignată utilizatorului curent.");
    }
  }

  private async getActions(
    actor: AuthenticatedUser,
    roleCodes: readonly string[],
    work: ScanWorkRecord,
  ): Promise<readonly ScanActionAvailability[]> {
    const currentStage = this.getCurrentStage(work);
    const [canOpen, canAssign, canReassign, start, complete] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "works.read_all", requiredScope: "ALL", userId: actor.id }),
      this.authorizationService.hasPermission({ permission: "workflow.assign_stage", requiredScope: "ALL", userId: actor.id }),
      this.authorizationService.hasPermission({ permission: "workflow.reassign_stage", requiredScope: "ALL", userId: actor.id }),
      this.getStageAction("workflow.start_stage", actor, roleCodes, currentStage, work.workflowExecution?.status ?? null, WorkStageExecutionStatus.PENDING),
      this.getStageAction("workflow.complete_stage", actor, roleCodes, currentStage, work.workflowExecution?.status ?? null, WorkStageExecutionStatus.IN_PROGRESS),
    ]);
    const assignAction = this.getAssignmentAction("ASSIGN_STAGE", currentStage, canAssign.allowed);
    const reassignAction = this.getAssignmentAction("REASSIGN_STAGE", currentStage, canReassign.allowed);
    const openAction: ScanActionAvailability = {
      enabled: canOpen.allowed,
      reason: canOpen.allowed ? null : "Nu ai acces la detaliul complet al lucrării.",
      type: "OPEN_WORK",
    };

    return [
      openAction,
      start,
      complete,
      assignAction,
      reassignAction,
    ].sort((left, right) => (scanActionOrder.get(left.type) ?? 99) - (scanActionOrder.get(right.type) ?? 99));
  }

  private async getStageAction(
    permission: PermissionKey,
    actor: AuthenticatedUser,
    roleCodes: readonly string[],
    currentStage: ScanStageRecord | null,
    workflowStatus: WorkWorkflowExecutionStatus | null,
    requiredStatus: WorkStageExecutionStatus,
  ): Promise<ScanActionAvailability> {
    const type = permission === "workflow.start_stage" ? "START_STAGE" : "COMPLETE_STAGE";
    if (!workflowStatus || !currentStage) {
      return { enabled: false, reason: "Lucrarea nu are o etapă curentă.", type };
    }
    if (workflowStatus === WorkWorkflowExecutionStatus.COMPLETED) {
      return { enabled: false, reason: "Fluxul lucrării este finalizat.", type };
    }
    if (currentStage.status !== requiredStatus) {
      const reason = type === "START_STAGE" ? "Etapa nu este în așteptare." : "Etapa trebuie să fie în lucru.";
      return { enabled: false, reason, type };
    }

    const permissionResult = await this.authorizationService.hasPermission({
      permission,
      requiredScope: "OWN_STAGE",
      userId: actor.id,
    });
    if (!permissionResult.allowed) {
      return { enabled: false, reason: "Nu ai permisiunea necesară.", type };
    }
    if (permissionResult.effectiveScopes.includes("ALL")) {
      return { enabled: true, reason: null, type };
    }

    const allowedRoleCodes = this.getAllowedRoleCodes(currentStage.allowedRoleCodesSnapshot);
    if (!roleCodes.some((roleCode) => allowedRoleCodes.includes(roleCode))) {
      return { enabled: false, reason: "Rolul curent nu poate executa etapa.", type };
    }
    if (!currentStage.assignedUserId) {
      return { enabled: false, reason: "Etapa nu are responsabil asignat.", type };
    }
    if (currentStage.assignedUserId !== actor.id) {
      return { enabled: false, reason: "Etapa este asignată altui utilizator.", type };
    }

    return { enabled: true, reason: null, type };
  }

  private getAssignmentAction(
    type: "ASSIGN_STAGE" | "REASSIGN_STAGE",
    currentStage: ScanStageRecord | null,
    hasPermission: boolean,
  ): ScanActionAvailability {
    if (!currentStage) {
      return { enabled: false, reason: "Lucrarea nu are o etapă curentă.", type };
    }
    if (currentStage.status === WorkStageExecutionStatus.COMPLETED) {
      return { enabled: false, reason: "Etapa este finalizată.", type };
    }
    if (!this.getAllowedRoleCodes(currentStage.allowedRoleCodesSnapshot).includes("TEHNICIAN")) {
      return { enabled: false, reason: "Etapa nu permite asignare către tehnician.", type };
    }
    if (!hasPermission) {
      return { enabled: false, reason: "Nu ai permisiunea necesară.", type };
    }

    const hasAssignee = currentStage.assignedUserId !== null;
    if (type === "ASSIGN_STAGE" && hasAssignee) {
      return { enabled: false, reason: "Etapa are deja responsabil.", type };
    }
    if (type === "REASSIGN_STAGE" && !hasAssignee) {
      return { enabled: false, reason: "Etapa nu are responsabil de schimbat.", type };
    }

    return { enabled: true, reason: null, type };
  }

  private toScanContextView(work: ScanWorkRecord, actions: readonly ScanActionAvailability[]): ScanContextView {
    const execution = work.workflowExecution;
    const currentStage = this.getCurrentStage(work);
    const completed = execution?.stages.filter((stage) => stage.status === WorkStageExecutionStatus.COMPLETED).length ?? 0;

    return {
      actions,
      logistics: {
        activeGroup: work.deliveryPreparationItems[0]?.group ?? null,
        blockedReason: work.logisticsState?.blockedReasonNotes ?? work.logisticsState?.blockedReasonCode ?? null,
        locationCode: work.logisticsState?.physicalLocationCode ?? null,
        status: work.logisticsState?.status ?? (execution?.status === WorkWorkflowExecutionStatus.ACTIVE ? "IN_PRODUCTION" : "RECEIVED"),
      },
      resolvedAt: new Date().toISOString(),
      work: {
        clinicName: work.clinic.name,
        code: work.code,
        doctorName: work.doctor.displayName,
        id: work.id,
        patientName: work.patientName,
        priority: work.priority,
        requestedDeliveryDate: work.requestedDeliveryDate.toISOString(),
        status: work.status,
        workTypeName: work.workType.name,
      },
      workflow: execution
        ? {
            currentStage: currentStage
              ? {
                  allowedRoleLabels: this.getAllowedRoleCodes(currentStage.allowedRoleCodesSnapshot).map((roleCode) => roleLabels[roleCode] ?? roleCode),
                  assignedUser: currentStage.assignedUser ? { displayName: currentStage.assignedUser.displayName, id: currentStage.assignedUser.id } : null,
                  id: currentStage.id,
                  name: currentStage.stageNameSnapshot,
                  status: currentStage.status,
                  version: currentStage.version,
                }
              : null,
            id: execution.id,
            progress: {
              completed,
              total: execution.stages.length,
            },
            status: execution.status,
            version: execution.version,
            workflowName: execution.workflowNameSnapshot,
          }
        : null,
    };
  }

  private getCurrentStage(work: ScanWorkRecord): ScanStageRecord | null {
    const execution = work.workflowExecution;

    return execution?.stages.find((stage) => stage.id === execution.currentStageExecutionId) ?? null;
  }

  private getAllowedRoleCodes(value: Prisma.JsonValue): readonly string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private async getActorRoleCodes(userId: string): Promise<readonly string[]> {
    const user = await this.prisma.user.findUnique({
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

    return user?.roles.filter((role) => role.role.isActive).map((role) => role.role.key) ?? [];
  }

  private async recordAudit(
    context: ActorContext,
    action: string,
    resourceId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId,
      resourceType: SCAN_RESOURCE_TYPE,
    };
    if (context.requestMetadata.ipAddress) {
      data.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      data.userAgent = context.requestMetadata.userAgent;
    }

    await this.prisma.auditLog.create({ data });
  }
}
