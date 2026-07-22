import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import type { RequestMetadata } from "./auth.types.js";

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
