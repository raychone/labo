import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";

import { loadServerEnvironment } from "../../config/environment.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { CsrfService } from "./csrf.service.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  public constructor(@Inject(CsrfService) private readonly csrfService: CsrfService) {}

  public canActivate(context: ExecutionContext): boolean {
    const environment = loadServerEnvironment();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const cookieToken = cookies?.[environment.csrfCookieName];
    const headerValue = request.get(environment.csrfHeaderName);

    this.csrfService.assertValid(cookieToken, headerValue);

    return true;
  }
}
