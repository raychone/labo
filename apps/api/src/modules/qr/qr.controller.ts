import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { ResolveWorkQrDto } from "./dto/resolve-work-qr.dto.js";
import { QrService } from "./qr.service.js";

@Controller("works")
@UseGuards(AuthGuard, PermissionsGuard)
export class QrController {
  public constructor(@Inject(QrService) private readonly qrService: QrService) {}

  @Get(":id/qr")
  @RequirePermission("works.read_all", "ALL")
  public getWorkQr(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string, @Req() request: Request) {
    return this.qrService.getWorkQr({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId);
  }

  @Get(":id/qr-image")
  @Header("Cache-Control", "private, no-store")
  @RequirePermission("works.read_all", "ALL")
  public async getWorkQrImage(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") workOrderId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const image = await this.qrService.getWorkQrImage({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId);
    response.type("image/png").send(image);
  }

  @Post("resolve-qr")
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @RequirePermission("works.read_all", "ALL")
  public resolveQr(@Body() dto: ResolveWorkQrDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.qrService.resolveQr({ actor, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Post(":id/qr/print")
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @RequirePermission("works.read_all", "ALL")
  public recordPrint(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string, @Req() request: Request) {
    return this.qrService.recordPrint({ actor, requestMetadata: getRequestMetadata(request) }, workOrderId);
  }
}
