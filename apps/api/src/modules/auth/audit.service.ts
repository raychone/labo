import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import type { RequestMetadata } from "./auth.types.js";

export interface AuditLogQuery {
  readonly actor?: string;
  readonly action?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly resourceType?: string;
}

export interface AuditLogSummary {
  readonly action: string;
  readonly actorDisplayName: string | null;
  readonly actorUserId: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly metadata: Record<string, unknown> | null;
  readonly resourceId: string | null;
  readonly resourceType: string;
}

export interface PaginatedAuditLogsResponse {
  readonly hasNextPage: boolean;
  readonly items: readonly AuditLogSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface AuditEventInput {
  readonly action: string;
  readonly actorUserId?: string;
  readonly metadata?: Prisma.InputJsonValue;
  readonly requestMetadata?: RequestMetadata;
  readonly resourceId?: string;
  readonly resourceType: string;
}

@Injectable()
export class AuditService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async list(query: AuditLogQuery): Promise<PaginatedAuditLogsResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const where: Prisma.AuditLogWhereInput = {
      // Technical telemetry remains stored for traceability, but is not part of
      // the normal manager-facing business audit feed.
      NOT: TECHNICAL_AUDIT_EVENT_FILTERS,
    };

    if (query.action) {
      where.action = { contains: query.action, mode: "insensitive" };
    }
    if (query.resourceType) {
      where.resourceType = { contains: query.resourceType, mode: "insensitive" };
    }
    if (query.actor) {
      where.OR = [
        { actorUserId: query.actor },
        { actor: { displayName: { contains: query.actor, mode: "insensitive" } } },
      ];
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        include: { actor: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    const items: AuditLogSummary[] = logs.map((log) => ({
      action: log.action,
      actorDisplayName: log.actor?.displayName ?? null,
      actorUserId: log.actorUserId,
      createdAt: log.createdAt.toISOString(),
      id: log.id,
      metadata: redactAuditMetadata(log.metadata),
      resourceId: log.resourceId,
      resourceType: log.resourceType,
    }));
    const totalPages = Math.ceil(total / pageSize);

    return { hasNextPage: page < totalPages, items, page, pageSize, total, totalPages };
  }

  public async record(event: AuditEventInput): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: event.action,
      resourceType: event.resourceType,
    };

    if (event.actorUserId) {
      data.actorUserId = event.actorUserId;
    }

    if (event.requestMetadata?.ipAddress) {
      data.ipAddress = event.requestMetadata.ipAddress;
    }

    if (event.metadata !== undefined) {
      data.metadata = event.metadata;
    }

    if (event.resourceId) {
      data.resourceId = event.resourceId;
    }

    if (event.requestMetadata?.userAgent) {
      data.userAgent = event.requestMetadata.userAgent;
    }

    await this.prisma.auditLog.create({
      data,
    });
  }
}

const SENSITIVE_AUDIT_KEYS = /password|token|secret|hash|authorization|cookie/i;

const TECHNICAL_AUDIT_EVENT_FILTERS: Prisma.AuditLogWhereInput[] = [
  { action: "auth.csrf_issued" },
  { action: { startsWith: "session." } },
  { action: { startsWith: "heartbeat." } },
  { action: { startsWith: "token." } },
  { action: { startsWith: "cache." } },
];

function redactAuditMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return redactAuditObject(value as Record<string, unknown>);
}

function redactAuditObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (SENSITIVE_AUDIT_KEYS.test(key)) {
      return [key, "[redacted]"];
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return [key, redactAuditObject(entry as Record<string, unknown>)];
    }
    if (Array.isArray(entry)) {
      return [key, entry.map((item) => item && typeof item === "object" && !Array.isArray(item) ? redactAuditObject(item as Record<string, unknown>) : item)];
    }
    return [key, entry];
  }));
}
