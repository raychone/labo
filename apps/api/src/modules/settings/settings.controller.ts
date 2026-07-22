import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import { SettingsService } from "./settings.service.js";

@Controller("settings")
@UseGuards(AuthGuard, PermissionsGuard)
export class SettingsController {
  public constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission("settings.read", "ALL")
  public getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(CsrfGuard)
  @RequirePermission("settings.update", "ALL")
  public updateSettings(@Body() dto: UpdateSettingsDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.settingsService.updateSettings(
      {
        actorUserId: actor.id,
        requestMetadata: getRequestMetadata(request),
      },
      dto,
    );
  }
}
