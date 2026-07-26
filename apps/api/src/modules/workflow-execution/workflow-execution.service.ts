import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkStageEventType, WorkStageExecutionStatus, WorkWorkflowExecutionStatus } from "@prisma/client";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { PermissionKey } from "../rbac/permission-registry.js";
import {
  WORKFLOW_CONFLICT_MESSAGE,
  WORKFLOW_EXECUTION_AUDIT_ACTIONS,
  WORKFLOW_EXECUTION_RESOURCE_TYPE,
  WORKFLOW_STALE_TEMPLATE_MESSAGE,
} from "./workflow-execution.constants.js";
import { type WorkWorkflowExecutionView, type WorkflowExecutionRecord, toWorkflowExecutionView } from "./workflow-execution.view.js";

interface ActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

interface CreateSnapshotInput {
  readonly actorUserId: string;
  readonly expectedWorkflowTemplateId?: string;
  readonly expectedWorkflowTemplateVersion?: number;
  readonly requestMetadata: RequestMetadata;
  readonly workCode: string;
  readonly workOrderId: string;
  readonly workTypeId: string;
}

interface TransitionInput {
  readonly expectedStageVersion?: number;
  readonly expectedWorkflowVersion?: number;
}

type WorkflowTx = Prisma.TransactionClient;

const workflowExecutionInclude = {
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
} as const satisfies Prisma.WorkWorkflowExecutionInclude;

const activeTemplateInclude = {
  stages: {
    orderBy: {
      sortOrder: "asc",
    },
  },
} as const satisfies Prisma.WorkflowTemplateInclude;

@Injectable()
export class WorkflowExecutionService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
  ) {}

  public async createSnapshotForWork(tx: WorkflowTx, input: CreateSnapshotInput): Promise<string | null> {
    const template = await tx.workflowTemplate.findFirst({
      include: activeTemplateInclude,
      where: {
        status: "ACTIVE",
        workTypeId: input.workTypeId,
      },
    });

    if (!template) {
      return null;
    }

    if (
      (input.expectedWorkflowTemplateId && input.expectedWorkflowTemplateId !== template.id)
      || (input.expectedWorkflowTemplateVersion && input.expectedWorkflowTemplateVersion !== template.version)
    ) {
      throw new ConflictException(WORKFLOW_STALE_TEMPLATE_MESSAGE);
    }

    if (template.stages.length === 0) {
      throw new BadRequestException("Workflow-ul activ nu are etape configurate.");
    }

    const execution = await tx.workWorkflowExecution.create({
      data: {
        workflowNameSnapshot: template.name,
        workflowTemplateId: template.id,
        workflowTemplateVersion: template.version,
        workOrderId: input.workOrderId,
      },
    });

    const createdStages = [];
    for (const stage of template.stages) {
      createdStages.push(await tx.workStageExecution.create({
        data: {
          allowedRoleCodesSnapshot: this.getAllowedRoleCodes(stage.allowedRoleCodes),
          estimatedDurationMinutesSnapshot: stage.estimatedDurationMinutes,
          sortOrder: stage.sortOrder,
          stageDefinitionId: stage.id,
          stageDescriptionSnapshot: stage.description,
          stageKeySnapshot: stage.key,
          stageNameSnapshot: stage.name,
          workflowExecutionId: execution.id,
        },
      }));
    }

    const firstStage = createdStages[0];
    if (!firstStage) {
      throw new BadRequestException("Workflow-ul activ nu are etapă inițială.");
    }

    await tx.workWorkflowExecution.update({
      data: {
        currentStageExecutionId: firstStage.id,
      },
      where: {
        id: execution.id,
      },
    });

    await this.createEvent(tx, {
      actorUserId: input.actorUserId,
      metadata: {
        stageExecutionId: firstStage.id,
        stageKey: firstStage.stageKeySnapshot,
        stageOrder: firstStage.sortOrder,
        workCode: input.workCode,
        workId: input.workOrderId,
        workflowExecutionId: execution.id,
        workflowTemplateId: template.id,
        workflowTemplateVersion: template.version,
      },
      stageExecutionId: firstStage.id,
      type: WorkStageEventType.WORKFLOW_CREATED,
      workflowExecutionId: execution.id,
    });

    await this.recordAudit(tx, input.actorUserId, input.requestMetadata, WORKFLOW_EXECUTION_AUDIT_ACTIONS.executionCreated, input.workOrderId, {
      firstStageKey: firstStage.stageKeySnapshot,
      workCode: input.workCode,
      workId: input.workOrderId,
      workflowExecutionId: execution.id,
      workflowTemplateId: template.id,
      workflowTemplateVersion: template.version,
    });

    return execution.id;
  }

  public async getWorkflowForWork(context: ActorContext, workOrderId: string): Promise<WorkWorkflowExecutionView | null> {
    await this.ensureWorkExists(workOrderId);
    const execution = await this.findExecutionByWorkId(workOrderId);

    if (!execution) {
      return null;
    }

    return toWorkflowExecutionView(execution, await this.getActionAvailability(context.actor, execution));
  }

  public async startStage(context: ActorContext, workOrderId: string, stageExecutionId: string, input: TransitionInput): Promise<WorkWorkflowExecutionView> {
    const execution = await this.prisma.$transaction(async (tx) => {
      const execution = await this.findExecutionForTransition(tx, workOrderId);
      await this.lockExecution(tx, execution.id);
      const fresh = await this.findExecutionById(tx, execution.id);
      const stage = this.getCurrentStageForTransition(fresh, stageExecutionId);

      this.assertExpectedVersions(fresh, stage, input);
      if (fresh.status !== WorkWorkflowExecutionStatus.ACTIVE || stage.status !== WorkStageExecutionStatus.PENDING) {
        throw new ConflictException(WORKFLOW_CONFLICT_MESSAGE);
      }

      const authorization = await this.ensureActorCanExecuteStage(context.actor, "workflow.start_stage", stage);
      const now = new Date();
      await tx.workStageExecution.update({
        data: {
          startedAt: now,
          startedByUserId: context.actor.id,
          status: WorkStageExecutionStatus.IN_PROGRESS,
          version: {
            increment: 1,
          },
        },
        where: {
          id: stage.id,
        },
      });
      await tx.workWorkflowExecution.update({
        data: {
          version: {
            increment: 1,
          },
        },
        where: {
          id: fresh.id,
        },
      });

      await this.createEvent(tx, {
        actorUserId: context.actor.id,
        metadata: this.createStageMetadata(fresh, stage, {
          managerOverride: authorization.managerOverride,
          workCode: fresh.workOrder.code,
          workId: fresh.workOrderId,
        }),
        stageExecutionId: stage.id,
        type: WorkStageEventType.STAGE_STARTED,
        workflowExecutionId: fresh.id,
      });
      await this.recordAudit(tx, context.actor.id, context.requestMetadata, WORKFLOW_EXECUTION_AUDIT_ACTIONS.stageStarted, workOrderId, this.createStageMetadata(fresh, stage, {
        managerOverride: authorization.managerOverride,
        workCode: fresh.workOrder.code,
        workId: fresh.workOrderId,
      }));

      return this.findExecutionById(tx, fresh.id);
    });

    return toWorkflowExecutionView(execution, await this.getActionAvailability(context.actor, execution));
  }

  public async completeStage(context: ActorContext, workOrderId: string, stageExecutionId: string, input: TransitionInput): Promise<WorkWorkflowExecutionView> {
    const execution = await this.prisma.$transaction(async (tx) => {
      const execution = await this.findExecutionForTransition(tx, workOrderId);
      await this.lockExecution(tx, execution.id);
      const fresh = await this.findExecutionById(tx, execution.id);
      const stage = this.getCurrentStageForTransition(fresh, stageExecutionId);

      this.assertExpectedVersions(fresh, stage, input);
      if (fresh.status !== WorkWorkflowExecutionStatus.ACTIVE || stage.status !== WorkStageExecutionStatus.IN_PROGRESS) {
        throw new ConflictException(WORKFLOW_CONFLICT_MESSAGE);
      }

      const authorization = await this.ensureActorCanExecuteStage(context.actor, "workflow.complete_stage", stage);
      const stages = [...fresh.stages].sort((left, right) => left.sortOrder - right.sortOrder);
      const nextStage = stages.find((item) => item.sortOrder > stage.sortOrder) ?? null;
      const now = new Date();

      await tx.workStageExecution.update({
        data: {
          completedAt: now,
          completedByUserId: context.actor.id,
          status: WorkStageExecutionStatus.COMPLETED,
          version: {
            increment: 1,
          },
        },
        where: {
          id: stage.id,
        },
      });

      await tx.workWorkflowExecution.update({
        data: {
          ...(nextStage
            ? { currentStageExecutionId: nextStage.id }
            : {
                completedAt: now,
                currentStageExecutionId: null,
                status: WorkWorkflowExecutionStatus.COMPLETED,
              }),
          version: {
            increment: 1,
          },
        },
        where: {
          id: fresh.id,
        },
      });

      const stageMetadata = this.createStageMetadata(fresh, stage, {
        managerOverride: authorization.managerOverride,
        ...(nextStage ? { nextStageKey: nextStage.stageKeySnapshot } : {}),
        workCode: fresh.workOrder.code,
        workId: fresh.workOrderId,
      });

      await this.createEvent(tx, {
        actorUserId: context.actor.id,
        metadata: stageMetadata,
        stageExecutionId: stage.id,
        type: WorkStageEventType.STAGE_COMPLETED,
        workflowExecutionId: fresh.id,
      });

      await this.recordAudit(tx, context.actor.id, context.requestMetadata, WORKFLOW_EXECUTION_AUDIT_ACTIONS.stageCompleted, workOrderId, stageMetadata);

      if (!nextStage) {
        await this.createEvent(tx, {
          actorUserId: context.actor.id,
          metadata: {
            managerOverride: authorization.managerOverride,
            stageExecutionId: stage.id,
            stageKey: stage.stageKeySnapshot,
            stageOrder: stage.sortOrder,
            workCode: fresh.workOrder.code,
            workId: fresh.workOrderId,
            workflowExecutionId: fresh.id,
            workflowTemplateId: fresh.workflowTemplateId,
            workflowTemplateVersion: fresh.workflowTemplateVersion,
          },
          stageExecutionId: stage.id,
          type: WorkStageEventType.WORKFLOW_COMPLETED,
          workflowExecutionId: fresh.id,
        });
        await this.recordAudit(tx, context.actor.id, context.requestMetadata, WORKFLOW_EXECUTION_AUDIT_ACTIONS.executionCompleted, workOrderId, {
          managerOverride: authorization.managerOverride,
          stageExecutionId: stage.id,
          stageKey: stage.stageKeySnapshot,
          stageOrder: stage.sortOrder,
          workCode: fresh.workOrder.code,
          workId: fresh.workOrderId,
          workflowExecutionId: fresh.id,
          workflowTemplateId: fresh.workflowTemplateId,
          workflowTemplateVersion: fresh.workflowTemplateVersion,
        });
      }

      return this.findExecutionById(tx, fresh.id);
    });

    return toWorkflowExecutionView(execution, await this.getActionAvailability(context.actor, execution));
  }

  private async ensureWorkExists(workOrderId: string): Promise<void> {
    const work = await this.prisma.workOrder.findUnique({
      select: {
        id: true,
      },
      where: {
        id: workOrderId,
      },
    });

    if (!work) {
      throw new NotFoundException("Work order was not found.");
    }
  }

  private async findExecutionByWorkId(workOrderId: string): Promise<WorkflowExecutionRecord | null> {
    return this.prisma.workWorkflowExecution.findUnique({
      include: workflowExecutionInclude,
      where: {
        workOrderId,
      },
    });
  }

  private async findExecutionForTransition(tx: WorkflowTx, workOrderId: string) {
    const execution = await tx.workWorkflowExecution.findUnique({
      include: {
        workOrder: {
          select: {
            code: true,
          },
        },
      },
      where: {
        workOrderId,
      },
    });

    if (!execution) {
      throw new BadRequestException("Lucrarea nu are un flux activ configurat.");
    }

    return execution;
  }

  private async findExecutionById(tx: WorkflowTx, executionId: string): Promise<WorkflowExecutionRecord & { readonly workOrder: { readonly code: string } }> {
    const execution = await tx.workWorkflowExecution.findUnique({
      include: {
        ...workflowExecutionInclude,
        workOrder: {
          select: {
            code: true,
          },
        },
      },
      where: {
        id: executionId,
      },
    });

    if (!execution) {
      throw new NotFoundException("Workflow execution was not found.");
    }

    return execution;
  }

  private async lockExecution(tx: WorkflowTx, executionId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM work_workflow_executions WHERE id = ${executionId} FOR UPDATE`;
  }

  private getCurrentStageForTransition(execution: WorkflowExecutionRecord, stageExecutionId: string): WorkflowExecutionRecord["stages"][number] {
    if (execution.currentStageExecutionId !== stageExecutionId) {
      throw new ConflictException(WORKFLOW_CONFLICT_MESSAGE);
    }

    const stage = execution.stages.find((item) => item.id === stageExecutionId);
    if (!stage) {
      throw new NotFoundException("Workflow stage was not found.");
    }

    return stage;
  }

  private assertExpectedVersions(execution: WorkflowExecutionRecord, stage: WorkflowExecutionRecord["stages"][number], input: TransitionInput): void {
    if (
      (input.expectedWorkflowVersion !== undefined && input.expectedWorkflowVersion !== execution.version)
      || (input.expectedStageVersion !== undefined && input.expectedStageVersion !== stage.version)
    ) {
      throw new ConflictException(WORKFLOW_CONFLICT_MESSAGE);
    }
  }

  private async ensureActorCanExecuteStage(
    actor: AuthenticatedUser,
    permission: PermissionKey,
    stage: WorkflowExecutionRecord["stages"][number],
  ): Promise<{ readonly managerOverride: boolean }> {
    const permissionResult = await this.authorizationService.hasPermission({
      permission,
      requiredScope: "OWN_STAGE",
      userId: actor.id,
    });

    if (!permissionResult.allowed) {
      throw new ForbiddenException("Permission denied.");
    }

    const actorRoleCodes = await this.getActorRoleCodes(actor.id);
    const allowedRoleCodes = this.getAllowedRoleCodes(stage.allowedRoleCodesSnapshot);
    const hasAllowedRole = actorRoleCodes.some((roleCode) => allowedRoleCodes.includes(roleCode));
    const hasAllScope = permissionResult.effectiveScopes.includes("ALL");

    if (!hasAllowedRole && !hasAllScope) {
      throw new ForbiddenException("Rolul curent nu poate executa etapa.");
    }

    if (!hasAllScope && stage.assignedUserId !== actor.id) {
      throw new ForbiddenException("Etapa trebuie să fie asignată utilizatorului curent.");
    }

    return {
      managerOverride: hasAllScope && (!hasAllowedRole || stage.assignedUserId !== actor.id),
    };
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

  private async getActionAvailability(actor: AuthenticatedUser, execution: WorkflowExecutionRecord) {
    const currentStage = execution.stages.find((stage) => stage.id === execution.currentStageExecutionId) ?? null;
    if (!currentStage || execution.status === WorkWorkflowExecutionStatus.COMPLETED) {
      return { canCompleteCurrentStage: false, canStartCurrentStage: false, reason: execution.status === "COMPLETED" ? "Fluxul este finalizat." : "Nu există etapă curentă." };
    }

    const [canStart, canComplete, roleCodes] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "workflow.start_stage", requiredScope: "OWN_STAGE", userId: actor.id }),
      this.authorizationService.hasPermission({ permission: "workflow.complete_stage", requiredScope: "OWN_STAGE", userId: actor.id }),
      this.getActorRoleCodes(actor.id),
    ]);
    const allowedRoleCodes = this.getAllowedRoleCodes(currentStage.allowedRoleCodesSnapshot);
    const hasAllowedRole = roleCodes.some((roleCode) => allowedRoleCodes.includes(roleCode));
    const canStartAll = canStart.effectiveScopes.includes("ALL");
    const canCompleteAll = canComplete.effectiveScopes.includes("ALL");
    const isAssigned = currentStage.assignedUserId === actor.id;
    const canUseStart = canStart.allowed && (canStartAll || (hasAllowedRole && isAssigned));
    const canUseComplete = canComplete.allowed && (canCompleteAll || (hasAllowedRole && isAssigned));

    return {
      canCompleteCurrentStage: canUseComplete && currentStage.status === WorkStageExecutionStatus.IN_PROGRESS,
      canStartCurrentStage: canUseStart && currentStage.status === WorkStageExecutionStatus.PENDING,
      reason: canUseStart || canUseComplete ? null : "Etapa nu este asignată utilizatorului curent.",
    };
  }

  private getAllowedRoleCodes(value: Prisma.JsonValue): readonly string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private createStageMetadata(
    execution: Pick<WorkflowExecutionRecord, "id" | "workflowTemplateId" | "workflowTemplateVersion">,
    stage: Pick<WorkflowExecutionRecord["stages"][number], "id" | "sortOrder" | "stageKeySnapshot">,
    options: {
      readonly managerOverride: boolean;
      readonly nextStageKey?: string;
      readonly workCode: string;
      readonly workId: string;
    },
  ): Prisma.InputJsonObject {
    return {
      managerOverride: options.managerOverride,
      nextStageKey: options.nextStageKey ?? null,
      stageExecutionId: stage.id,
      stageKey: stage.stageKeySnapshot,
      stageOrder: stage.sortOrder,
      workCode: options.workCode,
      workId: options.workId,
      workflowExecutionId: execution.id,
      workflowTemplateId: execution.workflowTemplateId,
      workflowTemplateVersion: execution.workflowTemplateVersion,
    };
  }

  private async createEvent(
    tx: WorkflowTx,
    input: {
      readonly actorUserId: string | null;
      readonly metadata: Prisma.InputJsonObject;
      readonly stageExecutionId: string | null;
      readonly type: WorkStageEventType;
      readonly workflowExecutionId: string;
    },
  ): Promise<void> {
    await tx.workStageEvent.create({
      data: {
        actorUserId: input.actorUserId,
        metadata: input.metadata,
        stageExecutionId: input.stageExecutionId,
        type: input.type,
        workflowExecutionId: input.workflowExecutionId,
      },
    });
  }

  private async recordAudit(
    tx: WorkflowTx,
    actorUserId: string,
    requestMetadata: RequestMetadata,
    action: string,
    resourceId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId,
      metadata,
      resourceId,
      resourceType: WORKFLOW_EXECUTION_RESOURCE_TYPE,
    };

    if (requestMetadata.ipAddress) {
      data.ipAddress = requestMetadata.ipAddress;
    }

    if (requestMetadata.userAgent) {
      data.userAgent = requestMetadata.userAgent;
    }

    await tx.auditLog.create({ data });
  }
}
