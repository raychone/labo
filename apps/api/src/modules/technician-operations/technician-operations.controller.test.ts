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
import { TechnicianOperationsController } from "./technician-operations.controller.js";
import { TechnicianOperationsService } from "./technician-operations.service.js";

const operationResponse = {
  archivedAt: null,
  archivedByUserId: null,
  code: "CERAMICA",
  createdAt: "2026-08-20T10:00:00.000Z",
  createdByUserId: "manager_1",
  description: null,
  id: "operation_1",
  isActive: true,
  name: "Ceramică",
  updatedAt: "2026-08-20T10:00:00.000Z",
  updatedByUserId: "manager_1",
  version: 1,
};

const rateResponse = {
  createdAt: "2026-08-20T10:00:00.000Z",
  createdByUserId: "manager_1",
  currency: "RON",
  effectiveFrom: "2026-09-01T00:00:00.000Z",
  id: "rate_1",
  operation: { code: "CERAMICA", id: "operation_1", name: "Ceramică" },
  rateMinor: 3000,
  technician: { displayName: "Tehnician A", id: "tech_1" },
  validUntil: null,
};

const performedOperationResponse = {
  createdAt: "2026-08-20T10:05:00.000Z",
  createdByUserId: "manager_1",
  currency: "RON",
  earningMinor: 3000,
  id: "performed_1",
  operation: { code: "CERAMICA", id: "operation_1", name: "Ceramică" },
  performedAt: "2026-08-20T10:05:00.000Z",
  rateId: "rate_1",
  removalReason: null,
  removedAt: null,
  removedByUserId: null,
  technicianId: "tech_1",
  workOrderId: "work_1",
};

const earningsResponse = {
  currency: "RON",
  generatedAt: "2026-08-20T12:00:00.000Z",
  period: "DAY",
  periodEnd: "2026-08-21T00:00:00.000Z",
  periodStart: "2026-08-20T00:00:00.000Z",
  settlementStatus: "EARNED_NOT_SETTLED",
  technician: { displayName: "Tehnician A", id: "tech_1" },
  totalMinor: 3000,
  works: [
    {
      currency: "RON",
      operations: [
        {
          currency: "RON",
          earningMinor: 3000,
          operation: { code: "CERAMICA", id: "operation_1", name: "Ceramică" },
          performedAt: "2026-08-20T10:05:00.000Z",
          performedOperationId: "performed_1",
        },
      ],
      patientName: "Ion Pop",
      totalMinor: 3000,
      workCode: "WO-26-0001",
      workOrderId: "work_1",
    },
  ],
};

describe("TechnicianOperationsController", () => {
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
      permission: "technician.operations.read",
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [TechnicianOperationsController],
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
                  id: "manager_1",
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
          provide: TechnicianOperationsService,
          useValue: {
            archiveOperation: vi.fn().mockResolvedValue(operationResponse),
            createOperation: vi.fn().mockResolvedValue(operationResponse),
            getOperation: vi.fn().mockResolvedValue(operationResponse),
            listManagerEarnings: vi.fn().mockResolvedValue(earningsResponse),
            listOperationOptions: vi.fn().mockResolvedValue([operationResponse]),
            listOperations: vi.fn().mockResolvedValue({ items: [operationResponse], page: 1, pageCount: 1, pageSize: 20, total: 1 }),
            listOwnEarnings: vi.fn().mockResolvedValue(earningsResponse),
            listPerformedOperations: vi.fn().mockResolvedValue([performedOperationResponse]),
            listRates: vi.fn().mockResolvedValue([rateResponse]),
            performOperation: vi.fn().mockResolvedValue(performedOperationResponse),
            removePerformedOperation: vi.fn().mockResolvedValue({ ...performedOperationResponse, removalReason: "Corecție", removedAt: "2026-08-20T10:10:00.000Z", removedByUserId: "manager_1" }),
            resolveRate: vi.fn().mockResolvedValue({
              currency: "RON",
              effectiveFrom: "2026-09-01T00:00:00.000Z",
              operationId: "operation_1",
              rateId: "rate_1",
              rateMinor: 3000,
              technicianId: "tech_1",
              validUntil: null,
            }),
            restoreOperation: vi.fn().mockResolvedValue(operationResponse),
            setRate: vi.fn().mockResolvedValue(rateResponse),
            updateOperation: vi.fn().mockResolvedValue(operationResponse),
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
    await request(app.getHttpServer() as App).get("/technician-operations").expect(401);
  });

  it("returns 403 without technician.operations.read", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .get("/technician-operations")
      .set("Cookie", ["dl_session=session-token"])
      .expect(403);
  });

  it("lists technician operations with read permission", async () => {
    await request(app.getHttpServer() as App)
      .get("/technician-operations")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect({ items: [operationResponse], page: 1, pageCount: 1, pageSize: 20, total: 1 });
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "technician.operations.read" }));
  });

  it("rejects create without CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/technician-operations")
      .set("Cookie", ["dl_session=session-token"])
      .send({ code: "CERAMICA", name: "Ceramică" })
      .expect(403);
  });

  it("sets rates with technician.rates.manage and CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/technician-operations/rates")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ effectiveFrom: "2026-09-01T00:00:00.000Z", operationId: "operation_1", rateMinor: 3000, technicianId: "tech_1" })
      .expect(201)
      .expect(rateResponse);
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "technician.rates.manage" }));
  });

  it("lists performed operations with technician.operations.read", async () => {
    await request(app.getHttpServer() as App)
      .get("/technician-operations/performed?workOrderId=work_1")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect([performedOperationResponse]);
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "technician.operations.read" }));
  });

  it("lists own earnings with technician.earnings.read_own", async () => {
    await request(app.getHttpServer() as App)
      .get("/technician-operations/earnings/me?period=DAY&date=2026-08-20")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect(earningsResponse);
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "technician.earnings.read_own" }));
  });

  it("lists manager earnings with technician.earnings.read_all", async () => {
    await request(app.getHttpServer() as App)
      .get("/technician-operations/earnings?period=MONTH&month=2026-08&technicianId=tech_1")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect(earningsResponse);
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "technician.earnings.read_all" }));
  });

  it("performs and removes operations with own-operation permission and CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/technician-operations/performed")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ operationId: "operation_1", workOrderId: "work_1" })
      .expect(201)
      .expect(performedOperationResponse);

    await request(app.getHttpServer() as App)
      .post("/technician-operations/performed/performed_1/remove")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ reason: "Corecție" })
      .expect(201)
      .expect({ ...performedOperationResponse, removalReason: "Corecție", removedAt: "2026-08-20T10:10:00.000Z", removedByUserId: "manager_1" });

    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "technician.operations.manage_own" }));
  });
});
