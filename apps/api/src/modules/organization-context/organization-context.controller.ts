import { Body, Controller, Get, Inject, Put, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { SelectOrganizationContextDto } from "./dto/organization-context.dto.js";
import { OrganizationContextService } from "./organization-context.service.js";

@Controller("organization-context")
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationContextController {
  public constructor(
    @Inject(OrganizationContextService)
    private readonly organizationContextService: OrganizationContextService,
  ) {}

  @Get()
  @RequirePermission("organization_context.read", "ALL")
  public getContext(@Req() request: AuthenticatedRequest) {
    const auth = getAuthenticatedSessionInput(request);

    return this.organizationContextService.getContext({
      sessionId: auth.sessionId,
      userId: auth.userId,
    });
  }

  @Put()
  @UseGuards(CsrfGuard)
  @RequirePermission("organization_context.switch", "ALL")
  public switchContext(@Body() dto: SelectOrganizationContextDto, @Req() request: Request & AuthenticatedRequest) {
    const auth = getAuthenticatedSessionInput(request);

    return this.organizationContextService.switchContext({
      code: dto.code,
      requestMetadata: getRequestMetadata(request),
      sessionId: auth.sessionId,
      userId: auth.userId,
    });
  }
}

function getAuthenticatedSessionInput(request: AuthenticatedRequest): { readonly sessionId: string; readonly userId: string } {
  const sessionId = request.auth?.session.id;
  const userId = request.auth?.user.id;

  if (!sessionId || !userId) {
    throw new UnauthorizedException("Authentication required.");
  }

  return { sessionId, userId };
}
