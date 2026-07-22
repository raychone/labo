import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { loadServerEnvironment } from "../../config/environment.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { toAuthenticatedUser } from "./auth.view.js";
import { SessionService } from "./session.service.js";

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(@Inject(SessionService) private readonly sessionService: SessionService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const environment = loadServerEnvironment();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const resolvedSession = await this.sessionService.resolveToken(cookies?.[environment.sessionCookieName]);

    if (!resolvedSession) {
      throw new UnauthorizedException("Authentication required.");
    }

    Object.defineProperty(request, "auth", {
      configurable: false,
      enumerable: false,
      value: {
        session: {
          expiresAt: resolvedSession.session.expiresAt,
          id: resolvedSession.session.id,
        },
        user: toAuthenticatedUser(resolvedSession.user),
      },
    });

    return true;
  }
}
