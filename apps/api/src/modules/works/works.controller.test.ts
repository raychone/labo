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
import { WorksController } from "./works.controller.js";
import { WorksService } from "./works.service.js";

const responseBody = {
  baseUnitPriceMinor: 35000,
  clinicalNotes: null,
  clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
  code: "WO-2026-000001",
  createdAt: "2026-07-22T12:00:00.000Z",
  createdByUserId: "user_1",
  currency: "RON",
  doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
  externalReference: null,
  id: "work_order_1",
  invoicedDocumentId: null,
  internalNotes: null,
  deadline: {
    calculatedAt: "2026-07-22T12:00:00.000Z",
    calculatedDueAt: "2026-07-27T14:00:00.000Z",
    effectiveDueAt: "2026-07-27T14:00:00.000Z",
    executionDays: 3,
    explanation: "Termen calculat.",
    includeStartDay: false,
    isLocked: false,
    manualDueAt: null,
    mode: "CALCULATED",
    reasonCode: null,
    revision: 1,
    source: "CREATION",
    startAt: "2026-07-22T12:00:00.000Z",
    timezone: "Europe/Bucharest",
  },
  patientName: "Ion Pop",
  patientReference: null,
  priority: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "2026-08-01T00:00:00.000Z",
  status: "REGISTERED",
  totalPriceMinor: 35000,
  updatedAt: "2026-07-22T12:00:00.000Z",
  updatedByUserId: "user_1",
  version: 1,
  workType: { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu" },
};

describe("WorksController", () => {
  let app: INestApplication;
  const requirePermission = vi.fn();
  const hasPermission = vi.fn();

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";
    process.env.CSRF_COOKIE_NAME = "dl_csrf";
    process.env.CSRF_HEADER_NAME = "x-csrf-token";

    requirePermission.mockResolvedValue({
      allowed: true,
      effectiveScopes: ["ALL"],
      permission: "works.read_all",
    });
    hasPermission.mockResolvedValue({ allowed: false, effectiveScopes: [], permission: "pricing.read" });
    const legalEntityGuard = {
      canActivate: vi.fn().mockImplementation((context: { switchToHttp: () => { getRequest: () => { legalEntityContext?: unknown } } }) => {
        context.switchToHttp().getRequest().legalEntityContext = {
          code: "NC",
          displayName: "Nicolaie Cristina",
          id: "legal_nc",
        };

        return true;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [WorksController],
      providers: [
        AuthGuard,
        CsrfGuard,
        CsrfService,
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: { hasPermission, requirePermission },
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
          provide: WorksService,
          useValue: {
            createWork: vi.fn().mockResolvedValue(responseBody),
            previewDeadline: vi.fn().mockResolvedValue({
              calculatedDueAt: "2026-07-27T14:00:00.000Z",
              effectiveDueAt: "2026-07-27T14:00:00.000Z",
              executionDays: 3,
              explanation: "Termen calculat.",
              includeStartDay: false,
              manualDueAt: null,
              mode: "CALCULATED",
              reasonCode: null,
              sourceSummary: { executionRuleSource: "RESOLVED", pricingSource: "STANDARD" },
              startAt: "2026-07-22T12:00:00.000Z",
              timezone: "Europe/Bucharest",
            }),
            recalculateDeadline: vi.fn().mockResolvedValue(responseBody),
            setManualDeadline: vi.fn().mockResolvedValue(responseBody),
            getWork: vi.fn().mockResolvedValue({ ...responseBody, currency: null, totalPriceMinor: null }),
            listWorkTypeFormOptions: vi.fn().mockResolvedValue([{ code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu", unit: "UNIT" }]),
            listWorks: vi.fn().mockResolvedValue({
              deadlineDashboard: {
                completedOnTimeLast7Days: 0,
                dueToday: 0,
                dueTomorrow: 0,
                late: 0,
                manual: 0,
                next7Days: 1,
                unresolved: 0,
              },
              items: [{ ...responseBody, currency: null, totalPriceMinor: null }],
              page: 1,
              pageCount: 1,
              pageSize: 20,
              total: 1,
            }),
            updateWork: vi.fn().mockResolvedValue(responseBody),
          },
        },
      ],
    })
      .overrideGuard(LegalEntityContextGuard)
      .useValue(legalEntityGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app?.close();
  });

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer() as App).get("/works").expect(401);
  });

  it("returns 403 without works.read_all", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .get("/works")
      .set("Cookie", ["dl_session=session-token"])
      .expect(403);
  });

  it("lists works while asking authorization whether pricing can be shown", async () => {
    await request(app.getHttpServer() as App)
      .get("/works")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200);

    expect(hasPermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "pricing.read" }));
  });

  it("rejects create without CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/works")
      .set("Cookie", ["dl_session=session-token"])
      .send({
        clinicId: "clinic_1",
        doctorId: "doctor_1",
        patientId: "patient_1",
        priority: "NORMAL",
        quantity: 1,
        requestedDeliveryDate: "2026-08-01",
        workTypeId: "work_type_1",
      })
      .expect(403);
  });

  it("allows works.create with CSRF", async () => {
    await request(app.getHttpServer() as App)
      .post("/works")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        clinicId: "clinic_1",
        doctorId: "doctor_1",
        patientId: "patient_1",
        priority: "NORMAL",
        quantity: 1,
        requestedDeliveryDate: "2026-08-01",
        workTypeId: "work_type_1",
      })
      .expect(201)
      .expect(responseBody);

    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({ permission: "works.create" }));
  });
});
