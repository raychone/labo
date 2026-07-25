import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateWorkflowTemplateDto, ReplaceWorkflowStagesDto, UpdateWorkflowTemplateDto } from "./dto/workflow-templates.dto.js";
import { WorkflowTemplatesService } from "./workflow-templates.service.js";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class WorkflowTemplatesController {
  public constructor(@Inject(WorkflowTemplatesService) private readonly workflowTemplatesService: WorkflowTemplatesService) {}

  @Get("work-types/:workTypeId/workflow-templates")
  @RequirePermission("workflow.read", "ALL")
  public listTemplates(@Param("workTypeId") workTypeId: string) {
    return this.workflowTemplatesService.listTemplates(workTypeId);
  }

  @Get("work-types/:workTypeId/workflow-template")
  @RequirePermission("workflow.read", "ALL")
  public getActiveTemplate(@Param("workTypeId") workTypeId: string) {
    return this.workflowTemplatesService.getActiveTemplate(workTypeId);
  }

  @Get("workflow-templates/:id")
  @RequirePermission("workflow.read", "ALL")
  public getTemplate(@Param("id") templateId: string) {
    return this.workflowTemplatesService.getTemplate(templateId);
  }

  @Post("work-types/:workTypeId/workflow-templates")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.create", "ALL")
  public createTemplate(
    @Param("workTypeId") workTypeId: string,
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workflowTemplatesService.createTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workTypeId, dto);
  }

  @Patch("workflow-templates/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.update", "ALL")
  public updateTemplate(
    @Param("id") templateId: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workflowTemplatesService.updateTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId, dto);
  }

  @Put("workflow-templates/:id/stages")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.update", "ALL")
  public replaceStages(
    @Param("id") templateId: string,
    @Body() dto: ReplaceWorkflowStagesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workflowTemplatesService.replaceStages({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId, dto);
  }

  @Post("workflow-templates/:id/activate")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.update", "ALL")
  public activateTemplate(@Param("id") templateId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workflowTemplatesService.activateTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId);
  }

  @Post("workflow-templates/:id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.archive", "ALL")
  public archiveTemplate(@Param("id") templateId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workflowTemplatesService.archiveTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId);
  }

  @Post("workflow-templates/:id/clone")
  @UseGuards(CsrfGuard)
  @RequirePermission("workflow.create", "ALL")
  public cloneTemplate(@Param("id") templateId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workflowTemplatesService.cloneTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId);
  }
}
