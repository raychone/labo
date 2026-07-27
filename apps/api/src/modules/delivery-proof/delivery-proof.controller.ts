import { Controller, Get, Inject, Param, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { DeliveryProofService } from "./delivery-proof.service.js";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class DeliveryProofController {
  public constructor(@Inject(DeliveryProofService) private readonly deliveryProofService: DeliveryProofService) {}

  @Get("deliveries/:id/proof")
  @RequirePermission("delivery.signature.read", "OWN_DELIVERY")
  public getProof(@CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryProofService.getProof({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId);
  }

  @Get("deliveries/:id/proof/print-view")
  @RequirePermission("delivery.proof.print", "ALL")
  public getPrintView(@CurrentUser() actor: AuthenticatedUser, @Param("id") deliveryId: string, @Req() request: Request) {
    return this.deliveryProofService.getPrintView({ actor, requestMetadata: getRequestMetadata(request) }, deliveryId);
  }
}
