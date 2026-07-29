import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import type { PatientAccessActions } from "./patients.view.js";
import { CreatePatientDto, ListPatientsQueryDto, PatientOptionsQueryDto, PatientWorksQueryDto, UpdatePatientDto } from "./dto/patients.dto.js";
import { PatientsService } from "./patients.service.js";

@Controller("patients")
@UseGuards(AuthGuard, PermissionsGuard)
export class PatientsController {
  public constructor(
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(PatientsService)
    private readonly patientsService: PatientsService,
  ) {}

  @Get()
  @RequirePermission("patients.read")
  public listPatients(@Query() query: ListPatientsQueryDto) {
    return this.patientsService.listPatients(query);
  }

  @Get("options")
  @RequirePermission("patients.read")
  public listPatientOptions(@Query() query: PatientOptionsQueryDto) {
    return this.patientsService.listPatientOptions(query);
  }

  @Get(":id")
  @RequirePermission("patients.read")
  public async getPatient(@Param("id") patientId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.patientsService.getPatient(patientId, await this.getActions(actor.id));
  }

  @Get(":id/works")
  @RequirePermission("patients.read")
  public listPatientWorks(@Param("id") patientId: string, @Query() query: PatientWorksQueryDto) {
    return this.patientsService.listPatientWorks(patientId, query);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("patients.create", "ALL")
  public createPatient(@Body() dto: CreatePatientDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.patientsService.createPatient({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("patients.update", "ALL")
  public updatePatient(
    @Param("id") patientId: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.patientsService.updatePatient({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, patientId, dto);
  }

  @Post(":id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("patients.archive", "ALL")
  public archivePatient(@Param("id") patientId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.patientsService.archivePatient({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, patientId);
  }

  @Post(":id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("patients.archive", "ALL")
  public restorePatient(@Param("id") patientId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.patientsService.restorePatient({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, patientId);
  }

  private async getActions(userId: string): Promise<PatientAccessActions> {
    const [archive, createWork, documents, restore, update] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "patients.archive", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "works.create", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "patients.documents.read", userId }),
      this.authorizationService.hasPermission({ permission: "patients.archive", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "patients.update", requiredScope: "ALL", userId }),
    ]);

    return {
      canArchive: archive.allowed,
      canCreateWork: createWork.allowed,
      canReadDocuments: documents.allowed,
      canRestore: restore.allowed,
      canUpdate: update.allowed,
    };
  }
}
