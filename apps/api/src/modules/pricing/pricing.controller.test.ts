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
import { PricingController } from "./pricing.controller.js";
import { PricingService } from "./pricing.service.js";

const previewResponse = {
  adjustment: {
    basisPoints: null,
    fixedAmountMinor: null,
    overridePriceMinor: null,
    type: null,
  },
  appliedRuleScope: null,
  currency: "RON",
  deadlinePreview: {
    businessDaysCounted: 4,
    calculatedDueAt: "2026-08-04T14:00:00.000Z",
    dueLocalDate: "2026-08-04",
    dueLocalTime: "17:00",
    executionDays: 4,
    explanation: "Termen calculat din 2026-07-29.",
    includeStartDay: false,
    matchedRule: {
      executionDays: 4,
      maxQuantity: 7,
      minQuantity: 1,
      priority: 1,
      requiresManualDueDate: false,
    },
    mode: "CALCULATED",
    reason: null,
    skippedHolidayDays: 0,
    skippedWeekendDays: 2,
    startLocalDate: "2026-07-29",
    timezone: "Europe/Bucharest",
  },
  evaluationDate: "2026-07-29",
  executionTimeRule: {
    executionDays: 4,
    label: "4 zile",
    maxQuantity: 7,
    minQuantity: 1,
    requiresManualDueDate: false,
  },
  explanation: "Se folosește prețul standard al firmei active.",
  finalUnitPriceMinor: 100_000,
  quantity: 1,
  source: "Catalog standard",
  standardUnitPriceMinor: 100_000,
  totalPriceMinor: 100_000,
  workTypeId: "work_type_1",
};

describe("PricingController resolve preview", () => {
  let app: INestApplication;
  const requirePermission = vi.fn();
  const resolvePreview = vi.fn();

  beforeEach(async () => {
    process.env.SESSION_COOKIE_NAME = "dl_session";
    process.env.CSRF_COOKIE_NAME = "dl_csrf";
    process.env.CSRF_HEADER_NAME = "x-csrf-token";

    requirePermission.mockResolvedValue({
      allowed: true,
      effectiveScopes: ["ALL"],
      permission: "pricing.resolve_preview",
    });
    resolvePreview.mockResolvedValue(previewResponse);

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
      controllers: [PricingController],
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
          provide: PricingService,
          useValue: { resolvePreview },
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

  it("requires CSRF for preview resolution", async () => {
    await request(app.getHttpServer() as App)
      .post("/pricing/resolve-preview")
      .set("Cookie", ["dl_session=session-token"])
      .send({ clinicId: "clinic_1", doctorId: "doctor_1", quantity: 1, workTypeId: "work_type_1" })
      .expect(403);
  });

  it("requires manager pricing preview permission", async () => {
    requirePermission.mockRejectedValueOnce(new ForbiddenException("Permission denied."));

    await request(app.getHttpServer() as App)
      .post("/pricing/resolve-preview")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ clinicId: "clinic_1", doctorId: "doctor_1", quantity: 1, startAt: "2026-07-29T09:00:00.000+03:00", workTypeId: "work_type_1" })
      .expect(403);
  });

  it("returns a deadline preview without internal identifiers", async () => {
    const response = await request(app.getHttpServer() as App)
      .post("/pricing/resolve-preview")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ clinicId: "clinic_1", doctorId: "doctor_1", quantity: 1, startAt: "2026-07-29T09:00:00.000+03:00", workTypeId: "work_type_1" })
      .expect(201);

    expect(response.body.deadlinePreview).toEqual(previewResponse.deadlinePreview);
    expect(JSON.stringify(response.body.deadlinePreview)).not.toContain("rule_");
    expect(requirePermission).toHaveBeenCalledWith(expect.objectContaining({
      permission: "pricing.resolve_preview",
    }));
  });
});
