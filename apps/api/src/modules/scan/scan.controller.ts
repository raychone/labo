import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { RecordScanWorkOpenedDto, ResolveScanDto } from "./dto/scan.dto.js";
import { ScanService } from "./scan.service.js";

@Controller("scan")
@UseGuards(AuthGuard, PermissionsGuard)
export class ScanController {
  public constructor(@Inject(ScanService) private readonly scanService: ScanService) {}

  @Post("resolve")
  @RequirePermission("scan.resolve", "ASSIGNED")
  public resolveScan(@Body() dto: ResolveScanDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.scanService.resolveScan({ actor, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Post("work-opened")
  @UseGuards(CsrfGuard)
  @RequirePermission("scan.use", "ASSIGNED")
  public recordWorkOpened(
    @Body() dto: RecordScanWorkOpenedDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.scanService.recordWorkOpened({ actor, requestMetadata: getRequestMetadata(request) }, dto.workId);
  }
}
