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
import { QrController } from "./qr.controller.js";
import { QrService } from "./qr.service.js";

const qrResponse = {
  label: {
    clinicName: "Clinica Test",
    doctorName: "Dr. Ana Popescu",
    dueDate: "2026-08-01T00:00:00.000Z",
    patientDisplay: "P-100",
    priority: "NORMAL",
    quantity: 1,
    workTypeName: "Coroana zirconiu",
  },
  payload: "dl-work:secure_token_12345678901234567890",
  workCode: "WO-2026-000001",
  workId: "work_order_1",
};

describe("QrController", () => {
  let app: INestApplication;
  const getWorkQr = vi.fn();
  const getWorkQrImage = vi.fn();
  const recordPrint = vi.fn();
  const requirePermission = vi.fn();
  const resolveQr = vi.fn();

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";
    process.env.CSRF_COOKIE_NAME = "dl_csrf";
    process.env.CSRF_HEADER_NAME = "x-csrf-token";

    getWorkQr.mockResolvedValue(qrResponse);
    getWorkQrImage.mockResolvedValue(Buffer.from("png"));
    recordPrint.mockResolvedValue(qrResponse);
    requirePermission.mockResolvedValue({
      allowed: true,
      effectiveScopes: ["ALL"],
      permission: "works.read_all",
    });
    resolveQr.mockResolvedValue({
      work: {
        code: "WO-2026-000001",
        id: "work_order_1",
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [QrController],
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
                  displayName: "Receptie",
                  email: "receptie@example.test",
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
          provide: QrService,
          useValue: {
            getWorkQr,
            getWorkQrImage,
            recordPrint,
            resolveQr,
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
    await request(app.getHttpServer() as App).get("/works/work_order_1/qr").expect(401);
  });

  it("returns 403 without works.read_all", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .get("/works/work_order_1/qr")
      .set("Cookie", ["dl_session=session-token"])
      .expect(403);
  });

  it("returns QR metadata for authenticated readers", async () => {
    await request(app.getHttpServer() as App)
      .get("/works/work_order_1/qr")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect(qrResponse);

    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "works.read_all" }));
  });

  it("returns a private PNG QR image", async () => {
    const response = await request(app.getHttpServer() as App)
      .get("/works/work_order_1/qr-image")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect("Cache-Control", "private, no-store");

    expect(response.headers["content-type"]).toContain("image/png");
  });

  it("rejects resolve without CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/works/resolve-qr")
      .set("Cookie", ["dl_session=session-token"])
      .send({ payload: "WO-2026-000001", source: "manual" })
      .expect(403);
  });

  it("resolves QR payloads with CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/works/resolve-qr")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ payload: "WO-2026-000001", source: "manual" })
      .expect(200);

    expect(resolveQr).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ payload: "WO-2026-000001", source: "manual" }));
  });

  it("records print actions with CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/works/work_order_1/qr/print")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .expect(200)
      .expect(qrResponse);
  });
});
