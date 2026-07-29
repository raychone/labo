import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import type { LegalEntityContext } from "./organization-context.view.js";

type RequestWithLegalEntityContext = AuthenticatedRequest & {
  readonly legalEntityContext?: LegalEntityContext;
};

export const CurrentLegalEntity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): LegalEntityContext | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithLegalEntityContext>();

    return request.legalEntityContext;
  },
);
