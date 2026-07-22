import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateDoctorDto, ListDoctorOptionsQueryDto, ListDoctorsQueryDto, UpdateDoctorDto } from "./dto/doctors.dto.js";
import { DoctorsService } from "./doctors.service.js";

@Controller("doctors")
@UseGuards(AuthGuard, PermissionsGuard)
export class DoctorsController {
  public constructor(@Inject(DoctorsService) private readonly doctorsService: DoctorsService) {}

  @Get()
  @RequirePermission("doctors.read", "ALL")
  public listDoctors(@Query() query: ListDoctorsQueryDto) {
    return this.doctorsService.listDoctors(query);
  }

  @Get("options")
  @RequirePermission("doctors.read", "ALL")
  public listDoctorOptions(@Query() query: ListDoctorOptionsQueryDto) {
    return this.doctorsService.listDoctorOptions(query);
  }

  @Get(":id")
  @RequirePermission("doctors.read", "ALL")
  public getDoctor(@Param("id") doctorId: string) {
    return this.doctorsService.getDoctor(doctorId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("doctors.create", "ALL")
  public createDoctor(@Body() dto: CreateDoctorDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.doctorsService.createDoctor({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("doctors.update", "ALL")
  public updateDoctor(
    @Param("id") doctorId: string,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.doctorsService.updateDoctor({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, doctorId, dto);
  }

  @Post(":id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("doctors.archive", "ALL")
  public archiveDoctor(@Param("id") doctorId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.doctorsService.archiveDoctor({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, doctorId);
  }

  @Post(":id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("doctors.archive", "ALL")
  public restoreDoctor(@Param("id") doctorId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.doctorsService.restoreDoctor({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, doctorId);
  }
}
