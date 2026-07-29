import { ForbiddenException, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CsrfService } from "../auth/csrf.service.js";
import { SessionService } from "../auth/session.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { OrganizationContextController } from "./organization-context.controller.js";
import { OrganizationContextService } from "./organization-context.service.js";

const contextResponse = {
  active: {
    code: "NC",
    displayName: "Nicolaie Cristina",
  },
  available: [
    {
      code: "NC",
      displayName: "Nicolaie Cristina",
    },
    {
      code: "NG",
      displayName: "Nicolaie Gabriel",
    },
  ],
  canSwitch: true,
};

describe("OrganizationContextController", () => {
  let app: INestApplication;
  const requirePermission = vi.fn();
  const getContext = vi.fn();
  const switchContext = vi.fn();

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";
    process.env.CSRF_COOKIE_NAME = "dl_csrf";
    process.env.CSRF_HEADER_NAME = "x-csrf-token";

    requirePermission.mockResolvedValue({
      allowed: true,
      effectiveScopes: ["ALL"],
      permission: "organization_context.read",
    });
    getContext.mockResolvedValue(contextResponse);
    switchContext.mockResolvedValue({
      ...contextResponse,
      active: {
        code: "NG",
        displayName: "Nicolaie Gabriel",
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationContextController],
      providers: [
        AuthGuard,
        CsrfGuard,
        CsrfService,
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: {
            requirePermission,
          },
        },
        {
          provide: SessionService,
          useValue: {
            resolveToken: vi.fn().mockImplementation((token: string | undefined) => {
              if (!token) {
                return Promise.resolve(null);
              }

              return Promise.resolve({
                session: {
                  expiresAt: new Date(Date.now() + 60_000),
                  id: "session_1",
                },
                user: {
                  createdAt: new Date(),
                  displayName: "Manager",
                  email: "manager@example.test",
                  id: "user_1",
                  isActive: true,
                  mustChangePassword: false,
                  passwordChangedAt: new Date(),
                  passwordHash: "hash",
                  updatedAt: new Date(),
                  version: 1,
                },
              });
            }),
          },
        },
        {
          provide: OrganizationContextService,
          useValue: {
            getContext,
            switchContext,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }));
    await app.init();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  it("returns 401 without authentication", async () => {
    await request(app.getHttpServer() as App).get("/organization-context").expect(401);
  });

  it("returns 403 without read permission", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .get("/organization-context")
      .set("Cookie", ["dl_session=session-token"])
      .expect(403);
  });

  it("returns active context without internal ids", async () => {
    const response = await request(app.getHttpServer() as App)
      .get("/organization-context")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200);

    expect(response.body).toStrictEqual(contextResponse);
    expect(JSON.stringify(response.body)).not.toContain("legal_nc");
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({
      permission: "organization_context.read",
    }));
  });

  it("rejects context switch without CSRF", async () => {
    await request(app.getHttpServer() as App)
      .put("/organization-context")
      .set("Cookie", ["dl_session=session-token"])
      .send({ code: "NG" })
      .expect(403);
  });

  it("returns 403 for switch without permission", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .put("/organization-context")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ code: "NG" })
      .expect(403);
  });

  it("switches context with CSRF and strict DTO", async () => {
    await request(app.getHttpServer() as App)
      .put("/organization-context")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ code: "NG" })
      .expect(200)
      .expect({
        ...contextResponse,
        active: {
          code: "NG",
          displayName: "Nicolaie Gabriel",
        },
      });

    expect(switchContext).toHaveBeenCalledWith(expect.objectContaining({
      code: "NG",
      sessionId: "session_1",
      userId: "user_1",
    }));
  });
});
