import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { AssignStageDto, TechnicianWorkbenchQueryDto, UnassignStageDto } from "./dto/technician-assignments.dto.js";
import { TechnicianAssignmentsService } from "./technician-assignments.service.js";
import { TechnicianWorkbenchService } from "./technician-workbench.service.js";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class TechnicianAssignmentsController {
  public constructor(
    @Inject(TechnicianAssignmentsService) private readonly assignmentsService: TechnicianAssignmentsService,
    @Inject(TechnicianWorkbenchService) private readonly workbenchService: TechnicianWorkbenchService,
  ) {}

  @Get("technicians/options")
  @RequirePermission("technician.workload.read", "ALL")
  public listTechnicianOptions() {
    return this.assignmentsService.listTechnicianOptions();
  }

  @Get("technician/workbench")
  @RequirePermission("technician.workbench.read", "ASSIGNED")
  public getWorkbench(@CurrentUser() actor: AuthenticatedUser, @Query() query: TechnicianWorkbenchQueryDto) {
    return this.workbenchService.getWorkbench(actor, query);
  }

  @Get("technician/workload")
  @RequirePermission("technician.workload.read", "ALL")
  public getWorkload() {
    return this.workbenchService.getWorkload();
  }

  @Post("works/:workId/workflow/stages/:stageExecutionId/assign")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.assign_stage", "ALL")
  public assignStage(
    @Body() dto: AssignStageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("stageExecutionId") stageExecutionId: string,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.assignmentsService.assignStage({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, stageExecutionId, dto);
  }

  @Post("works/:workId/workflow/stages/:stageExecutionId/unassign")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.reassign_stage", "ALL")
  public unassignStage(
    @Body() dto: UnassignStageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("stageExecutionId") stageExecutionId: string,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.assignmentsService.unassignStage({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, stageExecutionId, dto);
  }
}
