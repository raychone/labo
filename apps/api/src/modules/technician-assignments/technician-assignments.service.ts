import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkStageEventType, WorkStageExecutionStatus, WorkWorkflowExecutionStatus } from "@prisma/client";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import {
  TECHNICIAN_ASSIGNMENT_AUDIT_ACTIONS,
  TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE,
  TECHNICIAN_ASSIGNMENT_RESOURCE_TYPE,
  TECHNICIAN_SCAN_AUDIT_ACTIONS,
} from "./technician-assignments.constants.js";
import type { AssignStageDto, UnassignStageDto } from "./dto/technician-assignments.dto.js";
import { toTechnicianOption } from "./technician-assignments.view.js";

interface ActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

type AssignmentTx = Prisma.TransactionClient;

@Injectable()
export class TechnicianAssignmentsService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async listTechnicianOptions() {
    const [users, currentStageIds] = await Promise.all([
      this.prisma.user.findMany({
      orderBy: { displayName: "asc" },
      select: {
        displayName: true,
        email: true,
        id: true,
        preferredColor: true,
      },
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              isActive: true,
              key: "TEHNICIAN",
            },
          },
        },
      },
    }),
      this.findActiveCurrentStageIds(),
    ]);
    const counts = currentStageIds.length > 0
      ? await this.prisma.workStageExecution.groupBy({
          _count: { _all: true },
          by: ["assignedUserId"],
          where: {
            assignedUserId: { not: null },
            id: { in: currentStageIds },
            status: { in: [WorkStageExecutionStatus.PENDING, WorkStageExecutionStatus.IN_PROGRESS] },
          },
        })
      : [];
    const countByUserId = new Map(counts.map((item) => [item.assignedUserId, item._count._all]));

    return users.map((user) => toTechnicianOption({
      ...user,
      _count: { assignedWorkStages: countByUserId.get(user.id) ?? 0 },
    }));
  }

  public async assignStage(context: ActorContext, workOrderId: string, stageExecutionId: string, dto: AssignStageDto) {
    return this.prisma.$transaction(async (tx) => {
      const stage = await this.findCurrentStageForUpdate(tx, workOrderId, stageExecutionId);
      if (stage.version !== dto.expectedVersion) {
        throw new ConflictException(TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE);
      }
      if (stage.workflowExecution.status !== WorkWorkflowExecutionStatus.ACTIVE || stage.status === WorkStageExecutionStatus.COMPLETED) {
        throw new ConflictException(TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE);
      }

      const target = await this.findAssignableTechnician(tx, dto.userId);
      this.assertStageAllowsTechnician(stage);

      const isReassignment = stage.assignedUserId !== null && stage.assignedUserId !== target.id;
      if (stage.assignedUserId === target.id) {
        throw new BadRequestException("Etapa este deja asignată acestui tehnician.");
      }
      if (stage.status === WorkStageExecutionStatus.IN_PROGRESS) {
        const permission = await this.authorizationService.hasPermission({
          permission: "workflow.reassign_stage",
          requiredScope: "ALL",
          userId: context.actor.id,
        });
        if (!permission.allowed) {
          throw new ForbiddenException("Reasignarea unei etape în lucru necesită permisiune de manager.");
        }
        if (dto.confirmInProgress !== true) {
          throw new BadRequestException("Confirmă reasignarea responsabilului pentru etapa aflată în lucru.");
        }
      }

      const now = new Date();
      const updated = await tx.workStageExecution.update({
        data: {
          assignedAt: now,
          assignedByUserId: context.actor.id,
          assignedUserId: target.id,
          version: { increment: 1 },
        },
        where: { id: stage.id },
      });
      await tx.workWorkflowExecution.update({ data: { version: { increment: 1 } }, where: { id: stage.workflowExecutionId } });

      const eventType = isReassignment ? WorkStageEventType.STAGE_REASSIGNED : WorkStageEventType.STAGE_ASSIGNED;
      const action = isReassignment ? TECHNICIAN_ASSIGNMENT_AUDIT_ACTIONS.reassigned : TECHNICIAN_ASSIGNMENT_AUDIT_ACTIONS.assigned;
      const metadata = this.createAssignmentMetadata(stage, context.actor.id, stage.assignedUserId, target.id, stage.status === WorkStageExecutionStatus.IN_PROGRESS);
      await this.recordEvent(tx, stage, context.actor.id, eventType, metadata);
      await this.recordAudit(tx, context, action, stage.id, metadata);
      if (dto.source === "scan") {
        await this.recordAudit(tx, context, TECHNICIAN_SCAN_AUDIT_ACTIONS.assigned, stage.id, {
          ...metadata,
          source: "scan",
        });
      }

      return updated;
    });
  }

  public async unassignStage(context: ActorContext, workOrderId: string, stageExecutionId: string, dto: UnassignStageDto) {
    return this.prisma.$transaction(async (tx) => {
      const stage = await this.findCurrentStageForUpdate(tx, workOrderId, stageExecutionId);
      if (stage.version !== dto.expectedVersion) {
        throw new ConflictException(TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE);
      }
      if (stage.assignedUserId === null) {
        throw new BadRequestException("Etapa nu are responsabil asignat.");
      }
      if (stage.status === WorkStageExecutionStatus.COMPLETED || stage.workflowExecution.status !== WorkWorkflowExecutionStatus.ACTIVE) {
        throw new ConflictException(TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE);
      }
      const permission = await this.authorizationService.hasPermission({
        permission: "workflow.reassign_stage",
        requiredScope: "ALL",
        userId: context.actor.id,
      });
      if (!permission.allowed) {
        throw new ForbiddenException("Eliminarea asignării necesită permisiune de manager.");
      }
      if (stage.status === WorkStageExecutionStatus.IN_PROGRESS && dto.confirmInProgress !== true) {
        throw new BadRequestException("Confirmă eliminarea responsabilului pentru etapa aflată în lucru.");
      }

      const updated = await tx.workStageExecution.update({
        data: {
          assignedAt: null,
          assignedByUserId: null,
          assignedUserId: null,
          version: { increment: 1 },
        },
        where: { id: stage.id },
      });
      await tx.workWorkflowExecution.update({ data: { version: { increment: 1 } }, where: { id: stage.workflowExecutionId } });

      const metadata = this.createAssignmentMetadata(stage, context.actor.id, stage.assignedUserId, null, stage.status === WorkStageExecutionStatus.IN_PROGRESS);
      await this.recordEvent(tx, stage, context.actor.id, WorkStageEventType.STAGE_UNASSIGNED, metadata);
      await this.recordAudit(tx, context, TECHNICIAN_ASSIGNMENT_AUDIT_ACTIONS.unassigned, stage.id, metadata);

      return updated;
    });
  }

  private async findCurrentStageForUpdate(tx: AssignmentTx, workOrderId: string, stageExecutionId: string) {
    const execution = await tx.workWorkflowExecution.findFirst({
      include: {
        workOrder: { select: { code: true } },
      },
      where: { workCycle: { activeForWorkOrder: { id: workOrderId } }, workOrderId },
    });
    if (!execution) {
      throw new NotFoundException("Fluxul lucrării nu a fost găsit.");
    }

    await tx.$queryRaw`SELECT id FROM work_workflow_executions WHERE id = ${execution.id} FOR UPDATE`;
    const stage = await tx.workStageExecution.findUnique({
      include: {
        workflowExecution: {
          include: {
            workOrder: { select: { code: true } },
          },
        },
      },
      where: { id: stageExecutionId },
    });

    if (!stage || stage.workflowExecutionId !== execution.id || execution.currentStageExecutionId !== stage.id) {
      throw new ConflictException(TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE);
    }

    return stage;
  }

  private async findAssignableTechnician(tx: AssignmentTx, userId: string) {
    const user = await tx.user.findUnique({
      select: {
        displayName: true,
        id: true,
        isActive: true,
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
      where: { id: userId },
    });

    if (!user?.isActive || !user.roles.some((role) => role.role.isActive && role.role.key === "TEHNICIAN")) {
      throw new BadRequestException("Alege un tehnician activ.");
    }

    return user;
  }

  private async findActiveCurrentStageIds(): Promise<string[]> {
    const executions = await this.prisma.workWorkflowExecution.findMany({
      select: { currentStageExecutionId: true },
      where: {
        currentStageExecutionId: { not: null },
        status: WorkWorkflowExecutionStatus.ACTIVE,
      },
    });

    return executions.flatMap((execution) => execution.currentStageExecutionId ? [execution.currentStageExecutionId] : []);
  }

  private assertStageAllowsTechnician(stage: { readonly allowedRoleCodesSnapshot: Prisma.JsonValue }): void {
    const roles = Array.isArray(stage.allowedRoleCodesSnapshot)
      ? stage.allowedRoleCodesSnapshot.filter((item): item is string => typeof item === "string")
      : [];
    if (!roles.includes("TEHNICIAN")) {
      throw new BadRequestException("Etapa curentă nu permite rolul Tehnician.");
    }
  }

  private createAssignmentMetadata(
    stage: {
      readonly id: string;
      readonly stageKeySnapshot: string;
      readonly status: WorkStageExecutionStatus;
      readonly workflowExecutionId: string;
      readonly workflowExecution: { readonly workOrder: { readonly code: string }; readonly workOrderId: string };
    },
    actorUserId: string,
    oldAssignedUserId: string | null,
    newAssignedUserId: string | null,
    reassignedWhileInProgress: boolean,
  ): Prisma.InputJsonObject {
    return {
      actorUserId,
      newAssignedUserId,
      oldAssignedUserId,
      occurredAt: new Date().toISOString(),
      reassignedWhileInProgress,
      stageExecutionId: stage.id,
      stageKey: stage.stageKeySnapshot,
      stageStatus: stage.status,
      workCode: stage.workflowExecution.workOrder.code,
      workId: stage.workflowExecution.workOrderId,
      workflowExecutionId: stage.workflowExecutionId,
    };
  }

  private async recordEvent(tx: AssignmentTx, stage: { readonly id: string; readonly workflowExecutionId: string }, actorUserId: string, type: WorkStageEventType, metadata: Prisma.InputJsonObject): Promise<void> {
    await tx.workStageEvent.create({
      data: {
        actorUserId,
        metadata,
        stageExecutionId: stage.id,
        type,
        workflowExecutionId: stage.workflowExecutionId,
      },
    });
  }

  private async recordAudit(tx: AssignmentTx, context: ActorContext, action: string, resourceId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId,
      resourceType: TECHNICIAN_ASSIGNMENT_RESOURCE_TYPE,
    };

    if (context.requestMetadata.ipAddress) {
      data.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      data.userAgent = context.requestMetadata.userAgent;
    }

    await tx.auditLog.create({ data });
  }
}
