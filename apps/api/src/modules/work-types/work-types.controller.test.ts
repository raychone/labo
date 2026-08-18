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
import { WorkTypesController } from "./work-types.controller.js";
import { WorkTypesService } from "./work-types.service.js";

const responseBody = {
  basePriceMinor: 35000,
  code: "WT-0001",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  id: "work_type_1",
  isActive: true,
  name: "Coroana zirconiu",
  symbol: "Zr",
  unit: "UNIT",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("WorkTypesController", () => {
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
      permission: "pricing.read",
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [WorkTypesController],
      providers: [
        AuthGuard,
        CsrfGuard,
        CsrfService,
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: { requirePermission },
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
          provide: WorkTypesService,
          useValue: {
            archiveWorkType: vi.fn().mockResolvedValue(responseBody),
            createWorkType: vi.fn().mockResolvedValue(responseBody),
            getWorkType: vi.fn().mockResolvedValue(responseBody),
            listWorkTypeOptions: vi.fn().mockResolvedValue([responseBody]),
            listWorkTypes: vi.fn().mockResolvedValue({ items: [responseBody], page: 1, pageCount: 1, pageSize: 20, total: 1 }),
            restoreWorkType: vi.fn().mockResolvedValue(responseBody),
            updateWorkType: vi.fn().mockResolvedValue(responseBody),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer() as App).get("/work-types").expect(401);
  });

  it("returns 403 without pricing.read", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .get("/work-types")
      .set("Cookie", ["dl_session=session-token"])
      .expect(403);
  });

  it("rejects create without CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/work-types")
      .set("Cookie", ["dl_session=session-token"])
      .send({ basePriceMinor: 35000, name: "Coroana zirconiu", symbol: "Zr", unit: "UNIT" })
      .expect(403);
  });

  it("allows pricing.create with CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/work-types")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ basePriceMinor: 35000, name: "Coroana zirconiu", symbol: "Zr", unit: "UNIT" })
      .expect(201)
      .expect(responseBody);
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "pricing.create" }));
  });
});
