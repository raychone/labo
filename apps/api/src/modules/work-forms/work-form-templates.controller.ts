import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateWorkFormTemplateDto, ReplaceWorkFormFieldsDto, UpdateWorkFormTemplateDto } from "./dto/work-form-templates.dto.js";
import { WorkFormTemplatesService } from "./work-form-templates.service.js";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class WorkFormTemplatesController {
  public constructor(@Inject(WorkFormTemplatesService) private readonly workFormTemplatesService: WorkFormTemplatesService) {}

  @Get("work-types/:workTypeId/form-templates")
  @RequirePermission("forms.read", "ALL")
  public listTemplates(@Param("workTypeId") workTypeId: string) {
    return this.workFormTemplatesService.listTemplates(workTypeId);
  }

  @Get("work-types/:workTypeId/form-template")
  @RequirePermission("forms.read", "ALL")
  public getActiveTemplate(@Param("workTypeId") workTypeId: string) {
    return this.workFormTemplatesService.getActiveTemplate(workTypeId);
  }

  @Get("work-form-templates/:id")
  @RequirePermission("forms.read", "ALL")
  public getTemplate(@Param("id") templateId: string) {
    return this.workFormTemplatesService.getTemplate(templateId);
  }

  @Post("work-types/:workTypeId/form-templates")
  @UseGuards(CsrfGuard)
  @RequirePermission("forms.create", "ALL")
  public createTemplate(
    @Param("workTypeId") workTypeId: string,
    @Body() dto: CreateWorkFormTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workFormTemplatesService.createTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workTypeId, dto);
  }

  @Patch("work-form-templates/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("forms.update", "ALL")
  public updateTemplate(
    @Param("id") templateId: string,
    @Body() dto: UpdateWorkFormTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workFormTemplatesService.updateTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId, dto);
  }

  @Put("work-form-templates/:id/fields")
  @UseGuards(CsrfGuard)
  @RequirePermission("forms.update", "ALL")
  public replaceFields(
    @Param("id") templateId: string,
    @Body() dto: ReplaceWorkFormFieldsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workFormTemplatesService.replaceFields({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId, dto);
  }

  @Post("work-form-templates/:id/activate")
  @UseGuards(CsrfGuard)
  @RequirePermission("forms.update", "ALL")
  public activateTemplate(@Param("id") templateId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workFormTemplatesService.activateTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId);
  }

  @Post("work-form-templates/:id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("forms.archive", "ALL")
  public archiveTemplate(@Param("id") templateId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workFormTemplatesService.archiveTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId);
  }

  @Post("work-form-templates/:id/clone")
  @UseGuards(CsrfGuard)
  @RequirePermission("forms.create", "ALL")
  public cloneTemplate(@Param("id") templateId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workFormTemplatesService.cloneTemplate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, templateId);
  }
}
