import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentLegalEntity } from "../organization-context/current-legal-entity.decorator.js";
import { LegalEntityContextGuard } from "../organization-context/legal-entity-context.guard.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { RequireLegalEntityContext } from "../organization-context/require-legal-entity-context.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateWorkDto, ListWorksQueryDto, RecalculateWorkDeadlineDto, SetManualWorkDeadlineDto, UpdateWorkDto, WorkDeadlinePreviewDto } from "./dto/works.dto.js";
import { WorksService } from "./works.service.js";

@Controller("works")
@RequireLegalEntityContext()
@UseGuards(AuthGuard, PermissionsGuard, LegalEntityContextGuard)
export class WorksController {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(WorksService) private readonly worksService: WorksService,
  ) {}

  @Get()
  @RequirePermission("works.read_all", "ALL")
  public async listWorks(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListWorksQueryDto) {
    return this.worksService.listWorks(query, await this.canReadPricing(actor.id));
  }

  @Get("work-type-options")
  @RequirePermission("works.create", "ALL")
  public listWorkTypeFormOptions() {
    return this.worksService.listWorkTypeFormOptions();
  }

  @Post("deadline-preview")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.preview", "ALL")
  public async previewDeadline(
    @Body() dto: WorkDeadlinePreviewDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.worksService.previewDeadline(legalEntity, dto, await this.canSetManualDeadline(actor.id));
  }

  @Get(":id")
  @RequirePermission("works.read_all", "ALL")
  public async getWork(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    return this.worksService.getWork(workOrderId, await this.canReadPricing(actor.id));
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("works.create", "ALL")
  public async createWork(@Body() dto: CreateWorkDto, @CurrentLegalEntity() legalEntity: LegalEntityContext, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.createWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto, await this.canSetManualDeadline(actor.id));
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.update", "ALL")
  public updateWork(
    @Param("id") workOrderId: string,
    @Body() dto: UpdateWorkDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.updateWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto);
  }

  @Post(":id/deadline/recalculate")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.recalculate", "ALL")
  public recalculateDeadline(
    @Param("id") workOrderId: string,
    @Body() dto: RecalculateWorkDeadlineDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.recalculateDeadline({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto);
  }

  @Post(":id/deadline/manual")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.set_manual", "ALL")
  public setManualDeadline(
    @Param("id") workOrderId: string,
    @Body() dto: SetManualWorkDeadlineDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.setManualDeadline({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto);
  }

  private async canReadPricing(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "pricing.read",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }

  private async canSetManualDeadline(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "works.deadline.set_manual",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }
}
