import { Controller, Get, Inject, Query, UseGuards, ValidationPipe } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { OperationalStatusQueryDto } from "./dto/operational-status.dto.js";
import { OperationalStatusService } from "./operational-status.service.js";

@Controller("status")
@UseGuards(AuthGuard, PermissionsGuard)
export class OperationalStatusController {
  public constructor(@Inject(OperationalStatusService) private readonly operationalStatusService: OperationalStatusService) {}

  @Get("operational")
  public getOperationalStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Query(new ValidationPipe({ expectedType: OperationalStatusQueryDto, forbidNonWhitelisted: true, transform: true, whitelist: true })) query: OperationalStatusQueryDto,
  ) {
    return this.operationalStatusService.getOperationalStatus(actor, query);
  }
}
