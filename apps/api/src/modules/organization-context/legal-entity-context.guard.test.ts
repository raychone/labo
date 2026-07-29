import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { LEGAL_ENTITY_CONTEXT_METADATA_KEY } from "./organization-context.constants.js";
import { LegalEntityContextGuard } from "./legal-entity-context.guard.js";
import type { OrganizationContextService } from "./organization-context.service.js";

function createExecutionContext(request: unknown): ExecutionContext {
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe("LegalEntityContextGuard", () => {
  it("allows endpoints without context metadata", async () => {
    const service = {
      requireActiveContext: vi.fn(),
    };
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    };
    const guard = new LegalEntityContextGuard(service as unknown as OrganizationContextService, reflector as unknown as Reflector);

    await expect(guard.canActivate(createExecutionContext({}))).resolves.toBe(true);
    expect(service.requireActiveContext).not.toHaveBeenCalled();
  });

  it("requires authenticated session for context-required endpoints", async () => {
    const service = {
      requireActiveContext: vi.fn(),
    };
    const reflector = {
      getAllAndOverride: vi.fn().mockImplementation((key: symbol) => key === LEGAL_ENTITY_CONTEXT_METADATA_KEY),
    };
    const guard = new LegalEntityContextGuard(service as unknown as OrganizationContextService, reflector as unknown as Reflector);

    await expect(guard.canActivate(createExecutionContext({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches valid context to the request", async () => {
    const context = { code: "NC", displayName: "Nicolaie Cristina" };
    const request = {
      auth: {
        session: { id: "session_1" },
        user: { id: "user_1" },
      },
    };
    const service = {
      requireActiveContext: vi.fn().mockResolvedValue(context),
    };
    const reflector = {
      getAllAndOverride: vi.fn().mockImplementation((key: symbol) => key === LEGAL_ENTITY_CONTEXT_METADATA_KEY),
    };
    const guard = new LegalEntityContextGuard(service as unknown as OrganizationContextService, reflector as unknown as Reflector);

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true);
    expect(request).toStrictEqual({
      auth: {
        session: { id: "session_1" },
        user: { id: "user_1" },
      },
      legalEntityContext: context,
    });
  });
});
