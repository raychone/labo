import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterEach, beforeEach, describe, it, vi } from "vitest";

import { AuthGuard } from "../auth/auth.guard.js";
import { SessionService } from "../auth/session.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { RbacController } from "./rbac.controller.js";
import { RbacReadService } from "./rbac-read.service.js";

describe("RbacController", () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SESSION_COOKIE_NAME = "dl_session";

    const moduleRef = await Test.createTestingModule({
      controllers: [RbacController],
      providers: [
        AuthGuard,
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: {
            requirePermission: vi.fn().mockResolvedValue({
              allowed: true,
              effectiveScopes: ["ALL"],
              permission: "roles.read",
            }),
          },
        },
        {
          provide: RbacReadService,
          useValue: {
            listRoles: vi.fn().mockResolvedValue({
              roles: [
                {
                  description: "Manager role",
                  isActive: true,
                  isSystem: true,
                  key: "MANAGER",
                  name: "Manager",
                },
              ],
            }),
          },
        },
        {
          provide: SessionService,
          useValue: {
            resolveToken: vi.fn().mockResolvedValue({
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
                passwordChangedAt: new Date(),
                passwordHash: "hash",
                updatedAt: new Date(),
                version: 1,
              },
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("allows a user with roles.read to list sanitized roles", async () => {
    await request(app.getHttpServer() as App)
      .get("/rbac/roles")
      .set("Cookie", ["dl_session=session-token"])
      .expect(200)
      .expect({
        roles: [
          {
            description: "Manager role",
            isActive: true,
            isSystem: true,
            key: "MANAGER",
            name: "Manager",
          },
        ],
      });
  });
});
