import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { ClinicsService } from "./clinics.service.js";
import { CreateClinicDto, ListClinicsQueryDto, UpdateClinicDto } from "./dto/clinics.dto.js";

@Controller("clinics")
@UseGuards(AuthGuard, PermissionsGuard)
export class ClinicsController {
  public constructor(@Inject(ClinicsService) private readonly clinicsService: ClinicsService) {}

  @Get()
  @RequirePermission("clinics.read", "ALL")
  public listClinics(@Query() query: ListClinicsQueryDto) {
    return this.clinicsService.listClinics(query);
  }

  @Get("options")
  @RequirePermission("clinics.read", "ALL")
  public listClinicOptions() {
    return this.clinicsService.listClinicOptions();
  }

  @Get(":id")
  @RequirePermission("clinics.read", "ALL")
  public getClinic(@Param("id") clinicId: string) {
    return this.clinicsService.getClinic(clinicId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("clinics.create", "ALL")
  public createClinic(@Body() dto: CreateClinicDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.clinicsService.createClinic({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("clinics.update", "ALL")
  public updateClinic(
    @Param("id") clinicId: string,
    @Body() dto: UpdateClinicDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.clinicsService.updateClinic({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, clinicId, dto);
  }

  @Post(":id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("clinics.archive", "ALL")
  public archiveClinic(@Param("id") clinicId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.clinicsService.archiveClinic({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, clinicId);
  }

  @Post(":id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("clinics.archive", "ALL")
  public restoreClinic(@Param("id") clinicId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.clinicsService.restoreClinic({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, clinicId);
  }
}
