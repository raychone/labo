import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateOperationalWorkTypeDto, CreateWorkTypeDto, ListWorkTypesQueryDto, UpdateWorkTypeDto } from "./dto/work-types.dto.js";
import { WorkTypesService } from "./work-types.service.js";

@Controller("work-types")
@UseGuards(AuthGuard, PermissionsGuard)
export class WorkTypesController {
  public constructor(@Inject(WorkTypesService) private readonly workTypesService: WorkTypesService) {}

  @Get()
  @RequirePermission("pricing.read", "ALL")
  public listWorkTypes(@Query() query: ListWorkTypesQueryDto) {
    return this.workTypesService.listWorkTypes(query);
  }

  @Get("options")
  @RequirePermission("pricing.read", "ALL")
  public listWorkTypeOptions() {
    return this.workTypesService.listWorkTypeOptions();
  }

  @Get(":id")
  @RequirePermission("pricing.read", "ALL")
  public getWorkType(@Param("id") workTypeId: string) {
    return this.workTypesService.getWorkType(workTypeId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.create", "ALL")
  public createWorkType(@Body() dto: CreateWorkTypeDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workTypesService.createWorkType({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Post("operational-name")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.custom_type.save_to_catalog", "ALL")
  public saveOperationalName(@Body() dto: CreateOperationalWorkTypeDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workTypesService.saveOperationalNameToCatalog({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto.name);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.update", "ALL")
  public updateWorkType(
    @Param("id") workTypeId: string,
    @Body() dto: UpdateWorkTypeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.workTypesService.updateWorkType({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workTypeId, dto);
  }

  @Post(":id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.update", "ALL")
  public archiveWorkType(@Param("id") workTypeId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workTypesService.archiveWorkType({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workTypeId);
  }

  @Post(":id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.update", "ALL")
  public restoreWorkType(@Param("id") workTypeId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.workTypesService.restoreWorkType({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workTypeId);
  }
}
