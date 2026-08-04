import { Inject, Injectable } from "@nestjs/common";
import { WorkStageExecutionStatus, WorkWorkflowExecutionStatus, type Prisma } from "@prisma/client";

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
    const orderBy = this.createOrderBy(query);
    const [total, stages] = await this.prisma.$transaction([
      this.prisma.workStageExecution.count({ where }),
      this.prisma.workStageExecution.findMany({
        include: workbenchStageInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);
    const items = stages.map((stage) => toTechnicianWorkbenchItem(stage));

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
        : { assignedUserId: actorUserId }),
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

  private createOrderBy(query: TechnicianWorkbenchQueryDto): Prisma.WorkStageExecutionOrderByWithRelationInput {
    if (query.sortBy === "priority") {
      return { workflowExecution: { workOrder: { priority: query.sortOrder } } };
    }
    if (query.sortBy === "startedAt") {
      return { startedAt: query.sortOrder };
    }
    return { workflowExecution: { workOrder: { requestedDeliveryDate: query.sortOrder } } };
  }
}

function todayRange(now = new Date()): { readonly gte: Date; readonly lt: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { gte: start, lt: end };
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
          clinic: { select: { id: true, name: true } },
          doctor: { select: { displayName: true, id: true } },
          workType: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const satisfies Prisma.WorkStageExecutionInclude;

export type WorkbenchStage = TechnicianWorkbenchStageRecord;
