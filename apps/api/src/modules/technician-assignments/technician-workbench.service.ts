import { Inject, Injectable } from "@nestjs/common";
import { WorkFormTemplateKind, WorkStageExecutionStatus, WorkWorkflowExecutionStatus, type Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { TechnicianWorkbenchQueryDto } from "./dto/technician-assignments.dto.js";
import {
  summarizeWorkbench,
  toTechnicianOption,
  toTechnicianWorkbenchItem,
  toTechnicianWorkloadItem,
  type TechnicianWorkbenchStageRecord,
} from "./technician-assignments.view.js";

const activeStageStatuses = [WorkStageExecutionStatus.PENDING, WorkStageExecutionStatus.IN_PROGRESS] as const;
const unassignedTechnicianFilter = "__UNASSIGNED__";

@Injectable()
export class TechnicianWorkbenchService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async getWorkbench(actor: AuthenticatedUser, query: TechnicianWorkbenchQueryDto) {
    const permission = await this.authorizationService.hasPermission({
      permission: "technician.workbench.read",
      requiredScope: "ASSIGNED",
      userId: actor.id,
    });
    const hasAll = permission.effectiveScopes.includes("ALL");
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const workOrderWhere = this.createWorkOrderWhere(query);
    const currentStageIds = await this.findCurrentStageIds(workOrderWhere);
    if (currentStageIds.length === 0) {
      return {
        items: [],
        page,
        pageCount: 1,
        pageSize,
        summary: summarizeWorkbench([]),
        total: 0,
      };
    }
    const where = this.createWorkbenchWhere(actor.id, hasAll, query, currentStageIds);
    const [total, stages] = await this.prisma.$transaction([
      this.prisma.workStageExecution.count({ where }),
      this.prisma.workStageExecution.findMany({
        include: workbenchStageInclude,
        where,
      }),
    ]);
    const items = stages
      .sort((left, right) => compareWorkbenchStages(left, right, query))
      .slice((page - 1) * pageSize, page * pageSize)
      .map((stage) => toTechnicianWorkbenchItem(stage));

    return {
      items,
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      summary: summarizeWorkbench(items),
      total,
    };
  }

  public async getWorkload() {
    const [technicians, currentStageIds] = await Promise.all([
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
            role: { isActive: true, key: "TEHNICIAN" },
          },
        },
      },
    }),
      this.findCurrentStageIds({}),
    ]);
    const stages = await this.prisma.workStageExecution.findMany({
      select: {
        assignedUserId: true,
        status: true,
        workflowExecution: {
          select: {
            workOrder: {
              select: {
                priority: true,
                requestedDeliveryDate: true,
              },
            },
          },
        },
      },
      where: {
        assignedUserId: { not: null },
        id: { in: currentStageIds },
        status: { in: [...activeStageStatuses] },
        workflowExecution: { status: WorkWorkflowExecutionStatus.ACTIVE },
      },
    });

    return technicians.map((user) => {
      const option = toTechnicianOption(user);
      return toTechnicianWorkloadItem(
        option,
        stages
          .filter((stage) => stage.assignedUserId === user.id)
          .map((stage) => ({
            dueDate: stage.workflowExecution.workOrder.requestedDeliveryDate.toISOString(),
            priority: stage.workflowExecution.workOrder.priority,
            status: stage.status,
          })),
      );
    });
  }

  private createWorkOrderWhere(query: TechnicianWorkbenchQueryDto): Prisma.WorkOrderWhereInput {
    const search = query.search?.trim();
    return {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.queue === "URGENT" ? { priority: "URGENT" } : {}),
      ...(query.queue === "DUE_TODAY" ? { requestedDeliveryDate: todayRange() } : {}),
      ...(query.queue === "OVERDUE" ? { requestedDeliveryDate: { lt: todayRange().gte } } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { patientName: { contains: search, mode: "insensitive" } },
              { clinic: { name: { contains: search, mode: "insensitive" } } },
              { doctor: { displayName: { contains: search, mode: "insensitive" } } },
              { workType: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
  }

  private createWorkbenchWhere(actorUserId: string, hasAll: boolean, query: TechnicianWorkbenchQueryDto, currentStageIds: readonly string[]): Prisma.WorkStageExecutionWhereInput {
    const technicianOwnershipFilter: Prisma.WorkStageExecutionWhereInput = hasAll
      ? {}
      : {
          OR: [
            { assignedUserId: actorUserId },
            { workflowExecution: { workOrder: { assignedTechnicianId: actorUserId } } },
            { workflowExecution: { workOrder: { claimedByUserId: actorUserId } } },
          ],
        };

    return {
      id: { in: [...currentStageIds] },
      status: query.status ? query.status : { in: [...activeStageStatuses] },
      workflowExecution: {
        currentStageExecutionId: { not: null },
        status: WorkWorkflowExecutionStatus.ACTIVE,
      },
      ...(hasAll
        ? (query.technicianId === unassignedTechnicianFilter
            ? { assignedUserId: null }
            : query.technicianId
              ? { assignedUserId: query.technicianId }
              : {})
        : technicianOwnershipFilter),
      ...(query.stageKey ? { stageKeySnapshot: query.stageKey } : {}),
      ...(query.queue === "UNSTARTED" ? { status: WorkStageExecutionStatus.PENDING } : {}),
      ...(query.queue === "IN_PROGRESS" ? { status: WorkStageExecutionStatus.IN_PROGRESS } : {}),
    };
  }

  private async findCurrentStageIds(workOrderWhere: Prisma.WorkOrderWhereInput): Promise<string[]> {
    const executions = await this.prisma.workWorkflowExecution.findMany({
      select: { currentStageExecutionId: true },
      where: {
        currentStageExecutionId: { not: null },
        status: WorkWorkflowExecutionStatus.ACTIVE,
        workCycle: { activeForWorkOrder: { isNot: null } },
        workOrder: workOrderWhere,
      },
    });

    return executions.flatMap((execution) => execution.currentStageExecutionId ? [execution.currentStageExecutionId] : []);
  }

}

function todayRange(now = new Date()): { readonly gte: Date; readonly lt: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { gte: start, lt: end };
}

function compareWorkbenchStages(
  left: WorkbenchStage,
  right: WorkbenchStage,
  query: TechnicianWorkbenchQueryDto,
): number {
  if (query.sortBy === "priority") {
    return compareByPriority(left, right);
  }
  if (query.sortBy === "startedAt") {
    return compareByDateNullable(left.startedAt, right.startedAt) || compareByPriority(left, right) || compareByDueDate(left, right) || compareByCreatedAt(left, right);
  }

  return compareByOverdue(left, right)
    || compareByPriority(left, right)
    || compareByDueDate(left, right)
    || compareByCreatedAt(left, right)
    || left.workflowExecution.workOrder.code.localeCompare(right.workflowExecution.workOrder.code)
    || left.id.localeCompare(right.id);
}

function compareByOverdue(left: WorkbenchStage, right: WorkbenchStage): number {
  return Number(isOverdue(right.workflowExecution.workOrder.requestedDeliveryDate)) - Number(isOverdue(left.workflowExecution.workOrder.requestedDeliveryDate));
}

function compareByPriority(left: WorkbenchStage, right: WorkbenchStage): number {
  return priorityRank(left.workflowExecution.workOrder.priority) - priorityRank(right.workflowExecution.workOrder.priority);
}

function compareByDueDate(left: WorkbenchStage, right: WorkbenchStage): number {
  return left.workflowExecution.workOrder.requestedDeliveryDate.getTime() - right.workflowExecution.workOrder.requestedDeliveryDate.getTime();
}

function compareByCreatedAt(left: WorkbenchStage, right: WorkbenchStage): number {
  return left.workflowExecution.workOrder.createdAt.getTime() - right.workflowExecution.workOrder.createdAt.getTime();
}

function compareByDateNullable(left: Date | null, right: Date | null): number {
  if (left && right) {
    return left.getTime() - right.getTime();
  }
  if (left) {
    return -1;
  }
  if (right) {
    return 1;
  }
  return 0;
}

function isOverdue(date: Date, now = new Date()): boolean {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return due < today;
}

function priorityRank(priority: WorkbenchStage["workflowExecution"]["workOrder"]["priority"]): number {
  return priority === "URGENT" ? 0 : 1;
}

export const workbenchStageInclude = {
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
  workflowExecution: {
    include: {
      stages: {
        select: {
          status: true,
        },
      },
      workOrder: {
        include: {
          activeCycle: {
            include: {
              workFormSubmissions: {
                orderBy: {
                  updatedAt: "desc",
                },
                select: {
                  finalizedAt: true,
                  realLabSheetStatus: true,
                },
                take: 1,
                where: {
                  templateKind: WorkFormTemplateKind.REAL_LAB_SHEET,
                },
              },
            },
          },
          clinic: { select: { id: true, name: true } },
          doctor: { select: { displayName: true, id: true } },
          workType: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const satisfies Prisma.WorkStageExecutionInclude;

export type WorkbenchStage = TechnicianWorkbenchStageRecord;
