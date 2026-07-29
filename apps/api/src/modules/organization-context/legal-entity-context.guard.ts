import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { LEGAL_ENTITY_CONTEXT_METADATA_KEY } from "./organization-context.constants.js";
import { OrganizationContextService } from "./organization-context.service.js";
import type { LegalEntityContext } from "./organization-context.view.js";

type RequestWithLegalEntityContext = AuthenticatedRequest & {
  legalEntityContext?: LegalEntityContext;
};

@Injectable()
export class LegalEntityContextGuard implements CanActivate {
  public constructor(
    @Inject(OrganizationContextService)
    private readonly organizationContextService: OrganizationContextService,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresContext = this.reflector.getAllAndOverride<boolean>(
      LEGAL_ENTITY_CONTEXT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiresContext !== true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithLegalEntityContext>();
    const userId = request.auth?.user.id;
    const sessionId = request.auth?.session.id;

    if (!userId || !sessionId) {
      throw new UnauthorizedException("Authentication required.");
    }

    request.legalEntityContext = await this.organizationContextService.requireActiveContext({
      sessionId,
      userId,
    });

    return true;
  }
}
