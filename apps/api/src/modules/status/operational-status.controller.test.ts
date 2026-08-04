import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "../auth/auth.guard.js";
import { SessionService } from "../auth/session.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { OperationalStatusController } from "./operational-status.controller.js";
import { OperationalStatusService } from "./operational-status.service.js";

describe("OperationalStatusController", () => {
  let app: INestApplication;
  const getOperationalStatus = vi.fn();

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";
    getOperationalStatus.mockResolvedValue({
      counters: [
        { count: 1, label: "Astăzi", tab: "TODAY" },
      ],
      items: [],
      meta: {
        hasMore: false,
        page: 1,
        pageSize: 25,
        scannedRows: 1,
        total: 0,
        totalPages: 1,
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [OperationalStatusController],
      providers: [
        AuthGuard,
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: {
            requirePermission: vi.fn(),
          },
        },
        {
          provide: OperationalStatusService,
          useValue: {
            getOperationalStatus,
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
                  displayName: "Manager",
                  email: "manager@example.test",
                  id: "user_1",
                  isActive: true,
                  mustChangePassword: false,
                },
              });
            }),
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
    await app.close();
    getOperationalStatus.mockReset();
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer() as App)
      .get("/status/operational")
      .expect(401);
  });

  it("returns the operational status response for authenticated users", async () => {
    await request(app.getHttpServer() as App)
      .get("/status/operational?tab=TODAY&page=1&pageSize=25")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect((response) => {
        expect(response.body.counters[0]).toStrictEqual({ count: 1, label: "Astăzi", tab: "TODAY" });
      });

    expect(getOperationalStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user_1" }),
      expect.objectContaining({ page: 1, pageSize: 25, tab: "TODAY" }),
    );
  });

  it("rejects invalid query contracts", async () => {
    await request(app.getHttpServer() as App)
      .get("/status/operational?tab=UNKNOWN&pageSize=101")
      .set("Cookie", ["dl_session=session-token"])
      .expect(400);
  });
});
