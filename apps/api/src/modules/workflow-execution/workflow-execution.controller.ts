import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { StageTransitionDto } from "./dto/workflow-execution.dto.js";
import { WorkflowExecutionService } from "./workflow-execution.service.js";

@Controller("works/:workId/workflow")
@UseGuards(AuthGuard, PermissionsGuard)
export class WorkflowExecutionController {
  public constructor(
    @Inject(WorkflowExecutionService)
    private readonly workflowExecutionService: WorkflowExecutionService,
  ) {}

  @Get()
  @RequirePermission("workflow.read", "ASSIGNED")
  public getWorkflow(@CurrentUser() actor: AuthenticatedUser, @Param("workId") workOrderId: string) {
    return this.workflowExecutionService.getWorkflowForWork({ actor, requestMetadata: {} }, workOrderId);
  }

  @Post("stages/:stageExecutionId/start")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.start_stage", "OWN_STAGE")
  public startStage(
    @Body() dto: StageTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("stageExecutionId") stageExecutionId: string,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.workflowExecutionService.startStage({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, stageExecutionId, dto);
  }

  @Post("stages/:stageExecutionId/complete")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.complete_stage", "OWN_STAGE")
  public completeStage(
    @Body() dto: StageTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("stageExecutionId") stageExecutionId: string,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.workflowExecutionService.completeStage({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, stageExecutionId, dto);
  }
}
