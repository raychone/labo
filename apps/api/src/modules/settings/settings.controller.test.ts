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
import { LegalEntityContextGuard } from "../organization-context/legal-entity-context.guard.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

const responseBody = {
  bankName: "Banca NC",
  countryCode: "RO",
  currency: "RON",
  iban: "RO49AAAA1B31007593840000",
  laboratoryName: "Nicolaie Cristina",
  legalEntity: {
    code: "NC",
    displayName: "Nicolaie Cristina",
  },
  legalEntityCode: "NC",
  legalEntityDisplayName: "Nicolaie Cristina",
  legalName: "NC Demo Tehnică Dentară",
  locale: "ro-RO",
  primaryColor: "#0f766e",
  timezone: "Europe/Bucharest",
};

describe("SettingsController", () => {
  let app: INestApplication;
  const requirePermission = vi.fn();

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";
    process.env.CSRF_COOKIE_NAME = "dl_csrf";
    process.env.CSRF_HEADER_NAME = "x-csrf-token";

    requirePermission.mockResolvedValue({
      allowed: true,
      effectiveScopes: ["ALL"],
      permission: "settings.read",
    });

    const legalEntityGuard = {
      canActivate: vi.fn().mockImplementation((context: { switchToHttp: () => { getRequest: () => { legalEntityContext?: unknown } } }) => {
        context.switchToHttp().getRequest().legalEntityContext = {
          code: "NC",
          displayName: "Nicolaie Cristina",
        };

        return true;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SettingsController],
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
          provide: SettingsService,
          useValue: {
            getSettings: vi.fn().mockResolvedValue(responseBody),
            updateSettings: vi.fn().mockResolvedValue({
              ...responseBody,
              legalName: "NC Actualizat",
            }),
          },
        },
      ],
    })
      .overrideGuard(LegalEntityContextGuard)
      .useValue(legalEntityGuard)
      .compile();

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
    await app?.close();
  });

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer() as App).get("/settings").expect(401);
  });

  it("returns 403 without settings.read", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .get("/settings")
      .set("Cookie", ["dl_session=session-token"])
      .expect(403);
  });

  it("allows settings.read to fetch settings", async () => {
    await request(app.getHttpServer() as App)
      .get("/settings")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect(responseBody);
  });

  it("rejects PATCH without CSRF", async () => {
    await request(app.getHttpServer() as App)
      .patch("/settings")
      .set("Cookie", ["dl_session=session-token"])
      .send({ laboratoryName: "Updated Lab" })
      .expect(403);
  });

  it("allows settings.update with CSRF", async () => {
    await request(app.getHttpServer() as App)
      .patch("/settings")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ legalName: "NC Actualizat" })
      .expect(200)
      .expect({
        ...responseBody,
        legalName: "NC Actualizat",
      });
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({
      permission: "settings.update",
    }));
  });

  it("rejects attempts to spoof another legal entity through the body", async () => {
    await request(app.getHttpServer() as App)
      .patch("/settings")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ legalEntityCode: "NG", legalName: "NC Actualizat" })
      .expect(400);
  });
});
