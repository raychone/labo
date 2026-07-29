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
import {
  ClaimWorkDto,
  CreateWorkDto,
  ListClaimWorksQueryDto,
  ListWorksQueryDto,
  ReassignWorkDto,
  RecalculateWorkDeadlineDto,
  ReleaseWorkDto,
  SetManualWorkDeadlineDto,
  UpdateWorkDto,
  WorkDeadlinePreviewDto,
} from "./dto/works.dto.js";
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
    return this.worksService.listWorks(actor.id, query, await this.canReadPricing(actor.id));
  }

  @Get("available-for-claim")
  @RequirePermission("works.claim.available.read", "ALL")
  public listAvailableForClaim(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListClaimWorksQueryDto) {
    return this.worksService.listAvailableForClaim(actor.id, query);
  }

  @Get("my-claimed")
  @RequirePermission("works.claim.own.read", "ASSIGNED")
  public listMyClaimed(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListClaimWorksQueryDto) {
    return this.worksService.listMyClaimed(actor.id, query);
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
    return this.worksService.getWork(actor.id, workOrderId, await this.canReadPricing(actor.id));
  }

  @Get(":id/assignment-history")
  @RequirePermission("works.claim.history.read", "ASSIGNED")
  public listAssignmentHistory(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    return this.worksService.listAssignmentHistory(actor.id, workOrderId);
  }

  @Post(":id/claim")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.claim.create", "ASSIGNED")
  public claimWork(@Param("id") workOrderId: string, @Body() dto: ClaimWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.claimWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post(":id/release")
  @UseGuards(CsrfGuard)
  public releaseWork(@Param("id") workOrderId: string, @Body() dto: ReleaseWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.releaseWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post(":id/reassign")
  @UseGuards(CsrfGuard)
  public reassignWork(@Param("id") workOrderId: string, @Body() dto: ReassignWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.reassignWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
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
