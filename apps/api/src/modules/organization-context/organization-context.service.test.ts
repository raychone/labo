import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../auth/audit.service.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { OrganizationContextService } from "./organization-context.service.js";

const activeEntities = [
  { code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc" },
  { code: "NG", displayName: "Nicolaie Gabriel", id: "legal_ng" },
] as const;

function createService(input: {
  readonly canSwitch?: boolean;
  readonly session?: unknown;
  readonly target?: unknown;
  readonly updateCount?: number;
} = {}): {
  readonly audit: Pick<AuditService, "record">;
  readonly authorization: Pick<AuthorizationService, "hasPermission" | "requirePermission">;
  readonly prisma: unknown;
  readonly service: OrganizationContextService;
} {
  const authorization = {
    hasPermission: vi.fn().mockResolvedValue({
      allowed: input.canSwitch ?? true,
      effectiveScopes: input.canSwitch === false ? [] : ["ALL"],
      permission: "organization_context.switch",
    }),
    requirePermission: vi.fn().mockResolvedValue({
      allowed: true,
      effectiveScopes: ["ALL"],
      permission: "organization_context.switch",
    }),
  };
  const audit = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    legalEntity: {
      findFirst: vi.fn().mockResolvedValue(Object.hasOwn(input, "target") ? input.target : { ...activeEntities[1], isActive: true }),
      findMany: vi.fn().mockResolvedValue(activeEntities),
    },
    session: {
      findFirst: vi.fn().mockResolvedValue(Object.hasOwn(input, "session") ? input.session : {
        activeLegalEntity: null,
        activeLegalEntityId: null,
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_1",
        revokedAt: null,
        userId: "user_1",
      }),
      updateMany: vi.fn().mockResolvedValue({ count: input.updateCount ?? 1 }),
    },
  };

  return {
    audit,
    authorization,
    prisma,
    service: new OrganizationContextService(
      audit as unknown as AuditService,
      authorization as unknown as AuthorizationService,
      prisma as unknown as PrismaService,
    ),
  };
}

describe("OrganizationContextService", () => {
  it("initializes NC deterministic for a switch-capable user without active context", async () => {
    const { prisma, service } = createService();

    const context = await service.getContext({ sessionId: "session_1", userId: "user_1" });

    expect(context.active).toStrictEqual({ code: "NC", displayName: "Nicolaie Cristina" });
    expect(context.available.map((entity) => entity.code)).toStrictEqual(["NC", "NG"]);
    expect(context.canSwitch).toBe(true);
    expect((prisma as { session: { updateMany: ReturnType<typeof vi.fn> } }).session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { activeLegalEntityId: "legal_nc" },
    }));
  });

  it("preserves an existing active NG context", async () => {
    const { prisma, service } = createService({
      session: {
        activeLegalEntity: { code: "NG", displayName: "Nicolaie Gabriel", id: "legal_ng", isActive: true },
        activeLegalEntityId: "legal_ng",
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_1",
        revokedAt: null,
        userId: "user_1",
      },
    });

    const context = await service.getContext({ sessionId: "session_1", userId: "user_1" });

    expect(context.active).toStrictEqual({ code: "NG", displayName: "Nicolaie Gabriel" });
    expect((prisma as { session: { updateMany: ReturnType<typeof vi.fn> } }).session.updateMany).not.toHaveBeenCalled();
  });

  it("initializes active context for users without switch permission without granting switch access", async () => {
    const { service } = createService({ canSwitch: false });

    const context = await service.getContext({ sessionId: "session_1", userId: "user_1" });

    expect(context.active).toStrictEqual({ code: "NC", displayName: "Nicolaie Cristina" });
    expect(context.canSwitch).toBe(false);
  });

  it("switches only the current session and audits safe metadata", async () => {
    const { audit, prisma, service } = createService({
      session: {
        activeLegalEntity: { code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc", isActive: true },
        activeLegalEntityId: "legal_nc",
        expiresAt: new Date(Date.now() + 60_000),
        id: "session_1",
        revokedAt: null,
        userId: "user_1",
      },
    });

    await service.switchContext({
      code: "NG",
      requestMetadata: { ipAddress: "127.0.0.1", userAgent: "vitest" },
      sessionId: "session_1",
      userId: "user_1",
    });

    expect((prisma as { session: { updateMany: ReturnType<typeof vi.fn> } }).session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { activeLegalEntityId: "legal_ng" },
      where: expect.objectContaining({
        id: "session_1",
        userId: "user_1",
      }),
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "organization_context.switched",
      metadata: {
        fromCode: "NC",
        sessionId: "session_1",
        source: "shell",
        toCode: "NG",
      },
    }));
  });

  it("rejects inactive or missing target context", async () => {
    const { service } = createService({ target: null });

    await expect(service.switchContext({
      code: "NG",
      requestMetadata: {},
      sessionId: "session_1",
      userId: "user_1",
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects unavailable current sessions", async () => {
    const { service } = createService({ session: null });

    await expect(service.getContext({ sessionId: "session_1", userId: "user_1" })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
