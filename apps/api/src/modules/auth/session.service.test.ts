import type { Session, User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { SessionService } from "./session.service.js";

const activeUser: User = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  displayName: "Manager",
  email: "manager@example.test",
  id: "user_1",
  isActive: true,
  passwordChangedAt: new Date("2026-01-01T00:00:00.000Z"),
  passwordHash: "hash",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  version: 1,
};

const activeSession: Session = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date(Date.now() + 60_000),
  id: "session_1",
  ipAddress: "127.0.0.1",
  lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
  revokedAt: null,
  tokenHash: "hash",
  userAgent: "vitest",
  userId: activeUser.id,
};

describe("SessionService", () => {
  beforeEach(() => {
    process.env.SESSION_TTL_SECONDS = "3600";
  });

  it("creates sessions without exposing raw token hashes", async () => {
    const prisma = {
      session: {
        create: vi.fn().mockResolvedValue(activeSession),
      },
    } as unknown as PrismaService;
    const service = new SessionService(prisma);

    const result = await service.createForUser(activeUser.id, {
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result.token).not.toBe(activeSession.tokenHash);
    expect(result.token).toHaveLength(43);
    expect(result.session).toStrictEqual(activeSession);
  });

  it("resolves active sessions and updates lastSeenAt", async () => {
    const sessionWithUser = {
      ...activeSession,
      user: activeUser,
    };
    const prisma = {
      session: {
        findUnique: vi.fn().mockResolvedValue(sessionWithUser),
        update: vi.fn().mockResolvedValue(activeSession),
      },
    } as unknown as PrismaService;
    const service = new SessionService(prisma);

    await expect(service.resolveToken("raw-token")).resolves.toStrictEqual({
      session: sessionWithUser,
      user: activeUser,
    });
  });

  it("rejects sessions for inactive users", async () => {
    const prisma = {
      session: {
        findUnique: vi.fn().mockResolvedValue({
          ...activeSession,
          user: {
            ...activeUser,
            isActive: false,
          },
        }),
      },
    } as unknown as PrismaService;
    const service = new SessionService(prisma);

    await expect(service.resolveToken("raw-token")).resolves.toBeNull();
  });
});
