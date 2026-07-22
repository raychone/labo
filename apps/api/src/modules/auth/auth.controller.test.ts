import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadServerEnvironment } from "../../config/environment.js";
import { AuditService } from "./audit.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { CsrfGuard } from "./csrf.guard.js";
import { CsrfService } from "./csrf.service.js";
import { SessionService } from "./session.service.js";

const testUser: AuthenticatedUser = {
  displayName: "Development Manager",
  email: "manager@example.test",
  id: "user_1",
  isActive: true,
};

function getSetCookieHeader(response: request.Response): string {
  const header = response.headers["set-cookie"];

  if (Array.isArray(header)) {
    return header.join(";");
  }

  return typeof header === "string" ? header : "";
}

describe("AuthController", () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";
    process.env.CSRF_COOKIE_NAME = "dl_csrf";
    process.env.CSRF_HEADER_NAME = "x-csrf-token";
    process.env.SESSION_TTL_SECONDS = "3600";

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthGuard,
        CsrfGuard,
        CsrfService,
        {
          provide: AuditService,
          useValue: {
            record: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: vi.fn().mockResolvedValue({
              session: {
                session: {
                  expiresAt: new Date(Date.now() + 60_000),
                  id: "session_1",
                },
                token: "session-token",
              },
              user: testUser,
            }),
          },
        },
        {
          provide: SessionService,
          useValue: {
            resolveToken: vi.fn().mockImplementation((token: string | undefined) => {
              if (token !== "session-token") {
                return Promise.resolve(null);
              }

              return Promise.resolve({
                session: {
                  expiresAt: new Date(Date.now() + 60_000),
                  id: "session_1",
                },
                user: testUser,
              });
            }),
            revokeToken: vi.fn().mockResolvedValue({
              session: {
                expiresAt: new Date(Date.now() + 60_000),
                id: "session_1",
              },
              user: testUser,
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("sets a CSRF cookie and returns the token", async () => {
    const environment = loadServerEnvironment();
    const response = await request(app.getHttpServer() as App).get("/auth/csrf").expect(200);

    expect(response.body).toHaveProperty("csrfToken");
    expect(getSetCookieHeader(response)).toContain(environment.csrfCookieName);
  });

  it("logs in and sets the httpOnly session cookie", async () => {
    const response = await request(app.getHttpServer() as App)
      .post("/auth/login")
      .send({
        email: "manager@example.test",
        password: "valid-password",
      })
      .expect(200);

    expect(response.body).toStrictEqual({
      user: {
        displayName: testUser.displayName,
        email: testUser.email,
        id: testUser.id,
      },
    });
    expect(getSetCookieHeader(response)).toContain("HttpOnly");
  });

  it("returns the current user from a valid session cookie", async () => {
    await request(app.getHttpServer() as App)
      .get("/auth/me")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect({
        user: {
          displayName: testUser.displayName,
          email: testUser.email,
          id: testUser.id,
        },
      });
  });

  it("rejects logout without a matching CSRF token", async () => {
    await request(app.getHttpServer() as App)
      .post("/auth/logout")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "different-token")
      .expect(403);
  });

  it("logs out with a matching CSRF token", async () => {
    await request(app.getHttpServer() as App)
      .post("/auth/logout")
      .set("Cookie", ["dl_session=session-token", "dl_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .expect(204);
  });
});
