import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { DeliveryService } from "./delivery.service.js";
import { DeliveryTransitionService } from "./delivery-transition.service.js";
import { AssignCourierDto, CompleteDeliveryDto, CreateDeliveryDto, DeliveryVersionDto, FailDeliveryDto, ListDeliveriesQueryDto, RescheduleDeliveryDto, UpdateDeliveryDto } from "./dto/delivery.dto.js";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class DeliveryController {
  public constructor(
    @Inject(DeliveryService) private readonly deliveryService: DeliveryService,
    @Inject(DeliveryTransitionService) private readonly deliveryTransitionService: DeliveryTransitionService,
  ) {}

  @Get("deliveries")
  @RequirePermission("delivery.read", "OWN_DELIVERY")
  public listDeliveries(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListDeliveriesQueryDto) {
    return this.deliveryService.listDeliveries(actor, query);
  }

  @Get("deliveries/:id")
  @RequirePermission("delivery.read", "OWN_DELIVERY")
  public getDelivery(@CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string) {
    return this.deliveryService.getDelivery(actor, deliveryId);
  }

  @Get("couriers/options")
  @RequirePermission("delivery.assign", "ALL")
  public listCourierOptions() {
    return this.deliveryService.listCourierOptions();
  }

  @Post("delivery-preparation-groups/:groupId/delivery")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.create", "ALL")
  public createDelivery(@Body() dto: CreateDeliveryDto, @CurrentUser() actor: AuthenticatedUser, @Param("groupId") groupId: string, @Req() request: Request) {
    return this.deliveryService.createDelivery({ actor, requestMetadata: getRequestMetadata(request) }, groupId, dto);
  }

  @Patch("deliveries/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.assign", "ALL")
  public updateDelivery(@Body() dto: UpdateDeliveryDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryService.updateDelivery({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }

  @Post("deliveries/:id/assign")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.assign", "ALL")
  public assignCourier(@Body() dto: AssignCourierDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryService.assignCourier({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }

  @Post("deliveries/:id/unassign")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.assign", "ALL")
  public unassignCourier(@Body() dto: DeliveryVersionDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryService.unassignCourier({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }

  @Post("deliveries/:id/cancel")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.cancel", "ALL")
  public cancelDelivery(@Body() dto: DeliveryVersionDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryService.cancelDelivery({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }

  @Post("deliveries/:id/pickup")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.pickup", "OWN_DELIVERY")
  public pickup(@Body() dto: DeliveryVersionDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryTransitionService.pickup({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto.version);
  }

  @Post("deliveries/:id/start-transit")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.start_transit", "OWN_DELIVERY")
  public startTransit(@Body() dto: DeliveryVersionDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryTransitionService.startTransit({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto.version);
  }

  @Post("deliveries/:id/complete")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.complete", "OWN_DELIVERY")
  public complete(@Body() dto: CompleteDeliveryDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryTransitionService.complete({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }

  @Post("deliveries/:id/fail")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.fail", "OWN_DELIVERY")
  public fail(@Body() dto: FailDeliveryDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryTransitionService.fail({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }

  @Post("deliveries/:id/reschedule")
  @UseGuards(CsrfGuard)
  @RequirePermission("delivery.reschedule", "ALL")
  public reschedule(@Body() dto: RescheduleDeliveryDto, @CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryTransitionService.reschedule({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId, dto);
  }
}

