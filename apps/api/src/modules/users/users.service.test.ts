import { ConflictException, UnprocessableEntityException } from "@nestjs/common";
import type { User } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PasswordService } from "../auth/password.service.js";
import type { SessionService } from "../auth/session.service.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { UsersService } from "./users.service.js";

const user: User = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  displayName: "Manager",
  email: "manager@example.test",
  id: "user_1",
  isActive: true,
  mustChangePassword: false,
  preferredColor: null,
  passwordChangedAt: new Date("2026-01-01T00:00:00.000Z"),
  passwordHash: "secret-hash",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  version: 1,
};

const userWithRoles = {
  ...user,
  roles: [
    {
      role: {
        key: "MANAGER",
        name: "Manager",
      },
    },
  ],
};

const userWithDetails = {
  ...userWithRoles,
  permissionOverrides: [],
};

function createService(input: {
  readonly authorization?: Partial<AuthorizationService>;
  readonly password?: Partial<PasswordService>;
  readonly prisma: unknown;
  readonly session?: Partial<SessionService>;
}): UsersService {
  return new UsersService(
    input.authorization as AuthorizationService,
    input.password as PasswordService,
    input.prisma as PrismaService,
    input.session as SessionService,
  );
}

describe("UsersService", () => {
  it("lists users without exposing password hashes", async () => {
    const prisma = {
      $transaction: vi.fn((operations: readonly Promise<unknown>[]) => Promise.all(operations)),
      user: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([userWithRoles]),
      },
    };
    const service = createService({ prisma });

    const result = await service.listUsers({
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    expect(result.items[0]).toMatchObject({
      email: user.email,
      id: user.id,
      roles: [{ key: "MANAGER", name: "Manager" }],
    });
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("secret-hash");
  });

  it("rejects duplicate emails on update", async () => {
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn() },
          user: {
            findUnique: vi.fn().mockResolvedValue({ ...user, email: "other@example.test", id: "other_user" }),
          },
        }),
      ),
      user: {
        findUnique: vi.fn().mockResolvedValue(userWithRoles),
      },
    };
    const service = createService({ prisma });

    await expect(
      service.updateUser(
        { actorUserId: "actor_1", requestMetadata: {} },
        user.id,
        { email: "other@example.test" },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates and clears preferred colors through manager actions", async () => {
    const update = vi.fn().mockResolvedValue(user);
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          user: {
            findUnique: vi.fn().mockResolvedValue(userWithDetails),
            update,
          },
        }),
      ),
      user: {
        findUnique: vi.fn().mockResolvedValue(userWithDetails),
      },
    };
    const service = createService({
      prisma,
      session: {
        countActiveForUser: vi.fn().mockResolvedValue(0),
        revokeAllForUser: vi.fn().mockResolvedValue(0),
      },
    });

    await service.updateUser({ actorUserId: "actor_1", requestMetadata: {} }, user.id, { preferredColor: "#0f766e" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        preferredColor: "#0f766e",
      }),
    }));

    update.mockClear();
    await service.updateUser({ actorUserId: "actor_1", requestMetadata: {} }, user.id, { preferredColor: null });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        preferredColor: null,
      }),
    }));
  });

  it("protects the last active administrator from being disabled", async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: user.id }]),
        findUnique: vi.fn().mockResolvedValue(userWithRoles),
      },
    };
    const service = createService({
      authorization: {
        hasAllPermissions: vi.fn().mockResolvedValue(true),
      },
      prisma,
    });

    await expect(
      service.disableUser({ actorUserId: "actor_1", requestMetadata: {} }, user.id),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("resets passwords without returning the temporary password and revokes sessions", async () => {
    const prisma = {
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(userWithRoles).mockResolvedValueOnce(userWithDetails),
        update: vi.fn().mockResolvedValue(user),
      },
    };
    const session = {
      countActiveForUser: vi.fn().mockResolvedValue(0),
      revokeAllForUser: vi.fn().mockResolvedValue(2),
    };
    const service = createService({
      password: {
        hash: vi.fn().mockResolvedValue("new-hash"),
      },
      prisma,
      session,
    });

    const result = await service.resetPassword(
      { actorUserId: "actor_1", requestMetadata: {} },
      user.id,
      { temporaryPassword: "Temporary-12345" },
    );

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        mustChangePassword: true,
        passwordHash: "new-hash",
      }),
    }));
    expect(session.revokeAllForUser).toHaveBeenCalledWith(user.id);
    expect(JSON.stringify(result)).not.toContain("Temporary-12345");
    expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain("Temporary-12345");
  });
});
