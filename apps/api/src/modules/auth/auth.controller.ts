import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { loadServerEnvironment } from "../../config/environment.js";
import { AuditService } from "./audit.service.js";
import { clearSessionCookie, setCsrfCookie, setSessionCookie } from "./auth.cookies.js";
import { AUTH_AUDIT_ACTIONS, AUTH_RESOURCE_TYPES } from "./auth.constants.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedUser } from "./auth.types.js";
import type { AuthUserResponse } from "./auth.view.js";
import { toAuthUserResponse } from "./auth.view.js";
import { CurrentUser } from "./current-user.decorator.js";
import { CsrfGuard } from "./csrf.guard.js";
import { CsrfService } from "./csrf.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { getRequestMetadata } from "./request-metadata.js";
import { SessionService } from "./session.service.js";
import { AuthorizationService, type EffectivePermissionSnapshot } from "../rbac/authorization.service.js";

interface CsrfResponse {
  readonly csrfToken: string;
}

@Controller("auth")
export class AuthController {
  public constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(CsrfService)
    private readonly csrfService: CsrfService,
    @Inject(SessionService)
    private readonly sessionService: SessionService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get("csrf")
  public async createCsrfToken(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<CsrfResponse> {
    const environment = loadServerEnvironment();
    const csrfToken = this.csrfService.createToken();

    setCsrfCookie(response, environment, csrfToken);
    await this.auditService.record({
      action: AUTH_AUDIT_ACTIONS.csrfIssued,
      requestMetadata: getRequestMetadata(request),
      resourceType: AUTH_RESOURCE_TYPES.auth,
    });

    return { csrfToken };
  }

  @Post("login")
  @HttpCode(200)
  public async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserResponse> {
    const environment = loadServerEnvironment();
    const loginResult = await this.authService.login({
      email: loginDto.email,
      password: loginDto.password,
      requestMetadata: getRequestMetadata(request),
    });

    setSessionCookie(response, environment, loginResult.session.token);

    return toAuthUserResponse(loginResult.user);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  public getCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
  ): AuthUserResponse {
    return toAuthUserResponse(user);
  }

  @Get("permissions")
  @UseGuards(AuthGuard)
  public async getCurrentPermissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EffectivePermissionSnapshot> {
    return this.authorizationService.getEffectivePermissions(user.id);
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  public async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const environment = loadServerEnvironment();
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const resolvedSession = await this.sessionService.revokeToken(cookies?.[environment.sessionCookieName]);

    clearSessionCookie(response, environment);

    if (resolvedSession) {
      await this.auditService.record({
        action: AUTH_AUDIT_ACTIONS.logoutSucceeded,
        actorUserId: resolvedSession.user.id,
        requestMetadata: getRequestMetadata(request),
        resourceId: resolvedSession.session.id,
        resourceType: AUTH_RESOURCE_TYPES.session,
      });
    }
  }
}
