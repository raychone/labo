import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { AuthorizationService } from "./authorization.service.js";
import { REQUIRED_PERMISSION_METADATA_KEY } from "./rbac.constants.js";
import type { RequiredPermissionMetadata } from "./require-permission.decorator.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  public constructor(
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermissionMetadata>(
      REQUIRED_PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.auth?.user.id;

    if (!userId) {
      throw new UnauthorizedException("Authentication required.");
    }

    await this.authorizationService.requirePermission({
      permission: requiredPermission.permission,
      userId,
      ...(requiredPermission.requiredScope ? { requiredScope: requiredPermission.requiredScope } : {}),
    });

    return true;
  }
}
