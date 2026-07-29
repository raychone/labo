import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import QRCode from "qrcode";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { toWorkDetailView, type WorkOrderRecord } from "../works/works.view.js";
import { QR_AUDIT_ACTIONS, QR_PAYLOAD_PREFIX, QR_RESOURCE_TYPE, WORK_CODE_PATTERN, WORK_QR_TOKEN_PATTERN } from "./qr.constants.js";
import { QrRateLimitService } from "./qr-rate-limit.service.js";
import { createQrPayload, toWorkQrView, type QrWorkRecord, type WorkQrView } from "./qr.view.js";

interface ActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

interface ResolveQrInput {
  readonly payload: string;
  readonly source: "camera" | "manual";
}

const QR_WORK_INCLUDE = {
  clinic: {
    select: {
      name: true,
    },
  },
  doctor: {
    select: {
      displayName: true,
    },
  },
  workType: {
    select: {
      name: true,
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

const WORK_DETAIL_INCLUDE = {
  clinic: true,
  doctor: true,
  patient: true,
  workFormSubmission: true,
  workType: true,
  workflowExecution: {
    include: {
      events: {
        include: {
          actor: {
            select: {
              displayName: true,
              id: true,
            },
          },
        },
      },
      stages: {
        include: {
          completedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          startedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          assignedBy: {
            select: {
              displayName: true,
              id: true,
            },
          },
          assignedUser: {
            select: {
              displayName: true,
              email: true,
              id: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

@Injectable()
export class QrService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QrRateLimitService) private readonly qrRateLimitService: QrRateLimitService,
  ) {}

  public async getWorkQr(context: ActorContext, workOrderId: string): Promise<WorkQrView> {
    const workOrder = await this.findQrWorkOrThrow({ id: workOrderId });
    await this.recordQrAudit({
      action: QR_AUDIT_ACTIONS.viewed,
      context,
      metadata: {
        workCode: workOrder.code,
      },
      workOrderId: workOrder.id,
    });

    return toWorkQrView(workOrder);
  }

  public async getWorkQrImage(context: ActorContext, workOrderId: string): Promise<Buffer> {
    const workOrder = await this.findQrWorkOrThrow({ id: workOrderId });
    await this.recordQrAudit({
      action: QR_AUDIT_ACTIONS.viewed,
      context,
      metadata: {
        workCode: workOrder.code,
      },
      workOrderId: workOrder.id,
    });

    return QRCode.toBuffer(createQrPayload(workOrder.qrToken), {
      errorCorrectionLevel: "M",
      margin: 1,
      type: "png",
      width: 384,
    });
  }

  public async resolveQr(context: ActorContext, input: ResolveQrInput) {
    this.qrRateLimitService.assertAllowed(`${context.actor.id}:${context.requestMetadata.ipAddress ?? "unknown"}`);
    const lookup = parseQrLookup(input.payload);
    const workOrder = await this.findWorkDetailForLookup(lookup);

    await this.recordQrAudit({
      action: QR_AUDIT_ACTIONS.resolved,
      context,
      metadata: {
        source: input.source,
        workCode: workOrder.code,
      },
      workOrderId: workOrder.id,
    });

    return {
      work: toWorkDetailView(workOrder, await this.canReadPricing(context.actor.id)),
    };
  }

  public async recordPrint(context: ActorContext, workOrderId: string): Promise<WorkQrView> {
    const workOrder = await this.findQrWorkOrThrow({ id: workOrderId });
    await this.recordQrAudit({
      action: QR_AUDIT_ACTIONS.printed,
      context,
      metadata: {
        workCode: workOrder.code,
      },
      workOrderId: workOrder.id,
    });

    return toWorkQrView(workOrder);
  }

  private async findQrWorkOrThrow(where: Prisma.WorkOrderWhereUniqueInput): Promise<QrWorkRecord> {
    const workOrder = await this.prisma.workOrder.findUnique({
      include: QR_WORK_INCLUDE,
      where,
    });

    if (!workOrder) {
      throw new NotFoundException("Work order was not found.");
    }

    return workOrder;
  }

  private async findWorkDetailForLookup(lookup: QrLookup): Promise<WorkOrderRecord> {
    const workOrder = await this.prisma.workOrder.findUnique({
      include: WORK_DETAIL_INCLUDE,
      where: lookup.kind === "token" ? { qrToken: lookup.value } : { code: lookup.value },
    });

    if (!workOrder) {
      throw new NotFoundException("Work order was not found.");
    }

    return workOrder;
  }

  private async canReadPricing(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "pricing.read",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }

  private async recordQrAudit(input: {
    readonly action: string;
    readonly context: ActorContext;
    readonly metadata: Prisma.InputJsonObject;
    readonly workOrderId: string;
  }): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      actorUserId: input.context.actor.id,
      metadata: input.metadata,
      resourceId: input.workOrderId,
      resourceType: QR_RESOURCE_TYPE,
    };

    if (input.context.requestMetadata.ipAddress !== undefined) {
      data.ipAddress = input.context.requestMetadata.ipAddress;
    }

    if (input.context.requestMetadata.userAgent !== undefined) {
      data.userAgent = input.context.requestMetadata.userAgent;
    }

    await this.prisma.auditLog.create({
      data,
    });
  }
}

type QrLookup =
  | {
      readonly kind: "code";
      readonly value: string;
    }
  | {
      readonly kind: "token";
      readonly value: string;
    };

export function parseQrLookup(rawPayload: string): QrLookup {
  const payload = rawPayload.trim();

  if (payload.startsWith(QR_PAYLOAD_PREFIX)) {
    const token = payload.slice(QR_PAYLOAD_PREFIX.length);
    if (!WORK_QR_TOKEN_PATTERN.test(token)) {
      throw new NotFoundException("Work order was not found.");
    }

    return {
      kind: "token",
      value: token,
    };
  }

  if (WORK_CODE_PATTERN.test(payload)) {
    return {
      kind: "code",
      value: payload,
    };
  }

  throw new NotFoundException("Work order was not found.");
}
