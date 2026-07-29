import { BadRequestException, Body, Controller, Get, Inject, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentLegalEntity } from "../organization-context/current-legal-entity.decorator.js";
import { LegalEntityContextGuard } from "../organization-context/legal-entity-context.guard.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { RequireLegalEntityContext } from "../organization-context/require-legal-entity-context.decorator.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import { SettingsService } from "./settings.service.js";

@Controller("settings")
@UseGuards(AuthGuard, PermissionsGuard, LegalEntityContextGuard)
export class SettingsController {
  public constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @RequireLegalEntityContext()
  @RequirePermission("settings.read", "ALL")
  public getSettings(@CurrentLegalEntity() legalEntity: LegalEntityContext) {
    return this.settingsService.getSettings(legalEntity);
  }

  @Patch()
  @UseGuards(CsrfGuard)
  @RequireLegalEntityContext()
  @RequirePermission("settings.update", "ALL")
  public updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    rejectForbiddenContextPayload(dto);

    return this.settingsService.updateSettings(
      {
        actorUserId: actor.id,
        legalEntity,
        requestMetadata: getRequestMetadata(request),
      },
      dto,
    );
  }
}

function rejectForbiddenContextPayload(dto: UpdateSettingsDto): void {
  for (const field of ["activeLegalEntityId", "code", "legalEntityCode", "legalEntityId"] as const) {
    if (dto[field] !== undefined) {
      throw new BadRequestException("Firma activă nu poate fi schimbată din payload-ul setărilor.");
    }
  }
}
