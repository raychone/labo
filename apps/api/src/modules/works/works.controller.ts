import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateWorkDto, ListWorksQueryDto, UpdateWorkDto } from "./dto/works.dto.js";
import { WorksService } from "./works.service.js";

@Controller("works")
@UseGuards(AuthGuard, PermissionsGuard)
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

  @Get(":id")
  @RequirePermission("works.read_all", "ALL")
  public async getWork(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    return this.worksService.getWork(workOrderId, await this.canReadPricing(actor.id));
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("works.create", "ALL")
  public createWork(@Body() dto: CreateWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.createWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.update", "ALL")
  public updateWork(
    @Param("id") workOrderId: string,
    @Body() dto: UpdateWorkDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.updateWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  private async canReadPricing(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "pricing.read",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }
}
