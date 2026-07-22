import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";

import type { Session, User } from "@prisma/client";
import { loadServerEnvironment } from "../../config/environment.js";
import { PrismaService } from "../database/prisma.service.js";
import type { RequestMetadata } from "./auth.types.js";

export interface CreatedSession {
  readonly session: Session;
  readonly token: string;
}

export interface ResolvedSession {
  readonly session: Session;
  readonly user: User;
}

type SessionWithUser = Session & {
  readonly user: User;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class SessionService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async createForUser(userId: string, metadata: RequestMetadata): Promise<CreatedSession> {
    const environment = loadServerEnvironment();
    const token = randomBytes(32).toString("base64url");
    const data = {
      expiresAt: new Date(Date.now() + environment.sessionTtlSeconds * 1000),
      tokenHash: hashSessionToken(token),
      userId,
      ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
      ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
    };
    const session = await this.prisma.session.create({
      data,
    });

    return { session, token };
  }

  public async resolveToken(token: string | undefined): Promise<ResolvedSession | null> {
    if (!token) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      include: {
        user: true,
      },
      where: {
        tokenHash: hashSessionToken(token),
      },
    });

    if (!session || !this.isSessionUsable(session)) {
      return null;
    }

    await this.prisma.session.update({
      data: {
        lastSeenAt: new Date(),
      },
      where: {
        id: session.id,
      },
    });

    return {
      session,
      user: session.user,
    };
  }

  public async revokeToken(token: string | undefined): Promise<ResolvedSession | null> {
    const resolvedSession = await this.resolveToken(token);

    if (!resolvedSession) {
      return null;
    }

    await this.prisma.session.update({
      data: {
        revokedAt: new Date(),
      },
      where: {
        id: resolvedSession.session.id,
      },
    });

    return resolvedSession;
  }

  public async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      data: {
        revokedAt: new Date(),
      },
      where: {
        revokedAt: null,
        userId,
      },
    });

    return result.count;
  }

  public async countActiveForUser(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
        revokedAt: null,
        userId,
      },
    });
  }

  private isSessionUsable(session: SessionWithUser): boolean {
    return session.revokedAt === null && session.expiresAt.getTime() > Date.now() && session.user.isActive;
  }
}
