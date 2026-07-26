import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import {
  BlockWorkDto,
  CreateDeliveryPreparationGroupDto,
  DeliveryPreparationGroupsQueryDto,
  DeliveryPreparationWorkDto,
  LogisticsCenterQueryDto,
  LogisticsTransitionDto,
  UpdateDeliveryPreparationGroupDto,
  UpdateLogisticsLocationDto,
} from "./dto/logistics.dto.js";
import { LogisticsService } from "./logistics.service.js";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class LogisticsController {
  public constructor(@Inject(LogisticsService) private readonly logisticsService: LogisticsService) {}

  @Get("logistics/center")
  @RequirePermission("logistics.center.read", "ASSIGNED")
  public getCenter(@CurrentUser() actor: AuthenticatedUser, @Query() query: LogisticsCenterQueryDto) {
    return this.logisticsService.getCenter(actor, query);
  }

  @Get("logistics/center/summary")
  @RequirePermission("logistics.center.read", "ASSIGNED")
  public getCenterSummary(@CurrentUser() actor: AuthenticatedUser, @Query() query: LogisticsCenterQueryDto) {
    return this.logisticsService.getCenterSummary(actor, query);
  }

  @Get("works/:workId/logistics")
  @RequirePermission("logistics.center.read", "ASSIGNED")
  public getWorkLogistics(@CurrentUser() actor: AuthenticatedUser, @Param("workId") workOrderId: string) {
    return this.logisticsService.getWorkLogistics(actor, workOrderId);
  }

  @Post("works/:workId/logistics/location")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.update_location", "ALL")
  public updateLocation(
    @Body() dto: UpdateLogisticsLocationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.updateLocation({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post("works/:workId/logistics/block")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.block_work", "ALL")
  public blockWork(@Body() dto: BlockWorkDto, @CurrentUser() actor: AuthenticatedUser, @Param("workId") workOrderId: string, @Req() request: Request) {
    return this.logisticsService.blockWork({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post("works/:workId/logistics/unblock")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.unblock_work", "ALL")
  public unblockWork(
    @Body() dto: LogisticsTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.unblockWork({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post("works/:workId/logistics/ready-for-packing")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.prepare_work", "ALL")
  public readyForPacking(
    @Body() dto: LogisticsTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.confirmReadyForPacking({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post("works/:workId/logistics/start-packing")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.prepare_work", "ALL")
  public startPacking(
    @Body() dto: LogisticsTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.startPacking({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post("works/:workId/logistics/complete-packing")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.prepare_work", "ALL")
  public completePacking(
    @Body() dto: LogisticsTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("workId") workOrderId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.completePacking({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Get("delivery-preparation-groups")
  @RequirePermission("logistics.center.read", "ASSIGNED")
  public listGroups(@Query() query: DeliveryPreparationGroupsQueryDto) {
    return this.logisticsService.listGroups(query);
  }

  @Get("delivery-preparation-groups/:id")
  @RequirePermission("logistics.center.read", "ASSIGNED")
  public getGroup(@CurrentUser() actor: AuthenticatedUser, @Param("id") groupId: string) {
    return this.logisticsService.getGroup(actor, groupId);
  }

  @Post("delivery-preparation-groups")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.manage_groups", "ALL")
  public createGroup(@Body() dto: CreateDeliveryPreparationGroupDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.logisticsService.createGroup({ actor, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch("delivery-preparation-groups/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.manage_groups", "ALL")
  public updateGroup(
    @Body() dto: UpdateDeliveryPreparationGroupDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") groupId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.updateGroup({ actor, requestMetadata: getRequestMetadata(request) }, groupId, dto);
  }

  @Post("delivery-preparation-groups/:id/works")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.manage_groups", "ALL")
  public addWorkToGroup(
    @Body() dto: DeliveryPreparationWorkDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") groupId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.addWorkToGroup({ actor, requestMetadata: getRequestMetadata(request) }, groupId, dto.workOrderId);
  }

  @Post("delivery-preparation-groups/:id/works/remove")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.manage_groups", "ALL")
  public removeWorkFromGroup(
    @Body() dto: DeliveryPreparationWorkDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") groupId: string,
    @Req() request: Request,
  ) {
    return this.logisticsService.removeWorkFromGroup({ actor, requestMetadata: getRequestMetadata(request) }, groupId, dto.workOrderId);
  }

  @Post("delivery-preparation-groups/:id/mark-ready")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.manage_groups", "ALL")
  public markGroupReady(@CurrentUser() actor: AuthenticatedUser, @Param("id") groupId: string, @Req() request: Request) {
    return this.logisticsService.markGroupReady({ actor, requestMetadata: getRequestMetadata(request) }, groupId);
  }

  @Post("delivery-preparation-groups/:id/cancel")
  @UseGuards(CsrfGuard)
  @RequirePermission("logistics.manage_groups", "ALL")
  public cancelGroup(@CurrentUser() actor: AuthenticatedUser, @Param("id") groupId: string, @Req() request: Request) {
    return this.logisticsService.cancelGroup({ actor, requestMetadata: getRequestMetadata(request) }, groupId);
  }
}
