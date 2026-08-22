import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import {
  ListTechnicianOperationsQueryDto,
  CreateTechnicianPaymentDto,
  ListTechnicianRatesQueryDto,
  ListPerformedTechnicianOperationsQueryDto,
  PerformTechnicianOperationDto,
  RemovePerformedTechnicianOperationDto,
  ResolveTechnicianRateQueryDto,
  SetTechnicianRateDto,
  TechnicianEarningsQueryDto,
  TechnicianOperationMutationDto,
} from "./dto/technician-operations.dto.js";
import { TechnicianOperationsService } from "./technician-operations.service.js";

@Controller("technician-operations")
@UseGuards(AuthGuard, PermissionsGuard)
export class TechnicianOperationsController {
  public constructor(@Inject(TechnicianOperationsService) private readonly technicianOperationsService: TechnicianOperationsService) {}

  @Get()
  @RequirePermission("technician.operations.read")
  public listOperations(@Query() query: ListTechnicianOperationsQueryDto) {
    return this.technicianOperationsService.listOperations(query);
  }

  @Get("options")
  @RequirePermission("technician.operations.read")
  public listOperationOptions() {
    return this.technicianOperationsService.listOperationOptions();
  }

  @Get("rates")
  @RequirePermission("technician.rates.read")
  public listRates(@Query() query: ListTechnicianRatesQueryDto) {
    return this.technicianOperationsService.listRates(query);
  }

  @Get("rates/resolve")
  @RequirePermission("technician.rates.read")
  public resolveRate(@Query() query: ResolveTechnicianRateQueryDto) {
    return this.technicianOperationsService.resolveRate(query.technicianId, query.operationId, query.asOf ? new Date(query.asOf) : new Date());
  }

  @Post("rates")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.rates.manage", "ALL")
  public setRate(@Body() dto: SetTechnicianRateDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.setRate({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Get("earnings/me")
  @RequirePermission("technician.earnings.read_own", "ASSIGNED")
  public listOwnEarnings(@Query() query: TechnicianEarningsQueryDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.listOwnEarnings({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, query);
  }

  @Get("earnings")
  @RequirePermission("technician.earnings.read_all", "ALL")
  public listManagerEarnings(@Query() query: TechnicianEarningsQueryDto) {
    return this.technicianOperationsService.listManagerEarnings(query);
  }

  @Post("payments")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.payments.create", "ALL")
  public createPayment(@Body() dto: CreateTechnicianPaymentDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.createPayment({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Get("performed")
  @RequirePermission("technician.operations.read")
  public listPerformedOperations(@Query() query: ListPerformedTechnicianOperationsQueryDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.listPerformedOperations({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, query.workOrderId);
  }

  @Post("performed")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.operations.manage_own", "ASSIGNED")
  public performOperation(@Body() dto: PerformTechnicianOperationDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.performOperation({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Post("performed/:id/remove")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.operations.manage_own", "ASSIGNED")
  public removePerformedOperation(
    @Param("id") performedOperationId: string,
    @Body() dto: RemovePerformedTechnicianOperationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.technicianOperationsService.removePerformedOperation({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, performedOperationId, dto);
  }

  @Get(":id")
  @RequirePermission("technician.operations.read")
  public getOperation(@Param("id") operationId: string) {
    return this.technicianOperationsService.getOperation(operationId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.rates.manage", "ALL")
  public createOperation(@Body() dto: TechnicianOperationMutationDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.createOperation({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.rates.manage", "ALL")
  public updateOperation(
    @Param("id") operationId: string,
    @Body() dto: TechnicianOperationMutationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.technicianOperationsService.updateOperation({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, operationId, dto);
  }

  @Post(":id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.rates.manage", "ALL")
  public archiveOperation(@Param("id") operationId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.archiveOperation({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, operationId);
  }

  @Post(":id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("technician.rates.manage", "ALL")
  public restoreOperation(@Param("id") operationId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.technicianOperationsService.restoreOperation({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, operationId);
  }
}
