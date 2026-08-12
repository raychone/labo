import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryEventType, Prisma, type SignatureOverrideReasonCode } from "@prisma/client";
import { createHash } from "node:crypto";

import type { AuthenticatedUser, RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { DELIVERY_PROOF_AUDIT_ACTIONS, DELIVERY_PROOF_RESOURCE_TYPE } from "./delivery-proof.constants.js";
import { DeliveryProofRenderService } from "./delivery-proof-render.service.js";
import { DeliveryProofValidationService } from "./delivery-proof-validation.service.js";
import { toDeliveryProofView, type DeliveryProofPrintView } from "./delivery-proof.view.js";
import type { CompleteDeliveryDto } from "../delivery/dto/delivery.dto.js";

type DeliveryTx = Prisma.TransactionClient;

export interface DeliveryProofActorContext {
  readonly actor: AuthenticatedUser;
  readonly requestMetadata: RequestMetadata;
}

export interface DeliveryProofCompletionResult {
  readonly auditAction: string;
  readonly eventType: DeliveryEventType;
  readonly metadata: {
    readonly actorUserId: string;
    readonly overrideReasonCode: SignatureOverrideReasonCode | null;
    readonly proofId: string;
    readonly signed: boolean;
    readonly signatureHashPrefix: string | null;
  };
}

type DeliveryForCompletion = {
  readonly code: string;
  readonly courierUserId: string | null;
  readonly id: string;
};

@Injectable()
export class DeliveryProofService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(DeliveryProofRenderService) private readonly renderService: DeliveryProofRenderService,
    @Inject(DeliveryProofValidationService) private readonly validationService: DeliveryProofValidationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async createForCompletedDelivery(tx: DeliveryTx, context: DeliveryProofActorContext, delivery: DeliveryForCompletion, dto: CompleteDeliveryDto, confirmedAt: Date): Promise<DeliveryProofCompletionResult> {
    const recipientName = dto.recipientName.trim();
    const recipientRole = dto.recipientRole?.trim() || null;
    const recipientNotes = dto.deliveryNotes?.trim() || null;
    const wantsOverride = dto.overrideReasonCode !== undefined || dto.confirmedWithoutSignature === true;
    const wantsSignature = dto.signature !== undefined || dto.confirmedHandover === true;

    if (wantsOverride && wantsSignature) {
      throw new BadRequestException("Alege semnătură sau override, nu ambele.");
    }
    if (wantsOverride) {
      return this.createOverrideProof(tx, context, delivery, dto, recipientName, recipientRole, recipientNotes, confirmedAt);
    }
    return this.createSignedProof(tx, context, delivery, dto, recipientName, recipientRole, recipientNotes, confirmedAt);
  }

  public async getProof(context: DeliveryProofActorContext, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      include: { proof: { include: { confirmedBy: { select: { displayName: true } } } } },
      where: { id: deliveryId },
    });
    if (!delivery) {
      throw new NotFoundException("Livrarea nu a fost găsită.");
    }
    await this.assertReadAccess(context.actor.id, delivery.courierUserId);
    if (!delivery.proof) {
      throw new NotFoundException("Dovada livrării nu există.");
    }
    await this.recordAudit(context, DELIVERY_PROOF_AUDIT_ACTIONS.proofViewed, delivery.proof.id, {
      actorUserId: context.actor.id,
      deliveryCode: delivery.code,
      deliveryId: delivery.id,
      proofId: delivery.proof.id,
      signed: delivery.proof.signed,
    });
    return toDeliveryProofView(delivery.proof, delivery.code, true);
  }

  public async getPrintView(context: DeliveryProofActorContext, deliveryId: string): Promise<DeliveryProofPrintView> {
    const delivery = await this.prisma.delivery.findUnique({
      include: {
        clinic: true,
        courier: { select: { displayName: true } },
        preparationGroup: {
          include: {
            items: {
              include: {
                workCycle: {
                  select: {
                    cycleNumber: true,
                  },
                },
                workOrder: {
                  include: {
                    doctor: { select: { displayName: true } },
                    workType: { select: { name: true } },
                  },
                },
              },
              where: { isActive: true },
            },
          },
        },
        proof: { include: { confirmedBy: { select: { displayName: true } } } },
      },
      where: { id: deliveryId },
    });
    if (!delivery) {
      throw new NotFoundException("Livrarea nu a fost găsită.");
    }
    await this.assertPrintAccess(context.actor.id);
    if (!delivery.proof) {
      throw new NotFoundException("Dovada livrării nu există.");
    }
    const laboratory = await this.prisma.laboratorySettings.findUniqueOrThrow({ where: { key: "default" } });
    await this.recordAudit(context, DELIVERY_PROOF_AUDIT_ACTIONS.proofPrinted, delivery.proof.id, {
      actorUserId: context.actor.id,
      deliveryCode: delivery.code,
      deliveryId: delivery.id,
      proofId: delivery.proof.id,
      signed: delivery.proof.signed,
    });
    return this.renderService.toPrintView(delivery, laboratory);
  }

  private async createSignedProof(tx: DeliveryTx, context: DeliveryProofActorContext, delivery: DeliveryForCompletion, dto: CompleteDeliveryDto, recipientName: string, recipientRole: string | null, recipientNotes: string | null, confirmedAt: Date): Promise<DeliveryProofCompletionResult> {
    await this.assertCaptureAccess(context.actor.id, delivery.courierUserId);
    if (dto.confirmedHandover !== true) {
      throw new BadRequestException("Confirmarea predării este obligatorie.");
    }
    if (dto.signature === undefined) {
      throw new BadRequestException("Semnătura destinatarului este obligatorie.");
    }
    const validated = this.validationService.validateSignature(dto.signature);
    const signatureHash = createHash("sha256").update(validated.canonical).digest("hex");
    try {
      const proof = await tx.deliveryProof.create({
        data: {
          confirmedAt,
          confirmedByUserId: context.actor.id,
          deliveryId: delivery.id,
          recipientName,
          recipientNotes,
          recipientRole,
          signatureCapturedAt: confirmedAt,
          signatureHash,
          signatureStrokes: validated.signature as unknown as Prisma.InputJsonValue,
          signed: true,
        },
      });
      return {
        auditAction: DELIVERY_PROOF_AUDIT_ACTIONS.signatureCaptured,
        eventType: DeliveryEventType.DELIVERY_SIGNATURE_CAPTURED,
        metadata: { actorUserId: context.actor.id, overrideReasonCode: null, proofId: proof.id, signed: true, signatureHashPrefix: signatureHash.slice(0, 12) },
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Livrarea are deja o dovadă de predare.");
      }
      throw error;
    }
  }

  private async createOverrideProof(tx: DeliveryTx, context: DeliveryProofActorContext, delivery: DeliveryForCompletion, dto: CompleteDeliveryDto, recipientName: string, recipientRole: string | null, recipientNotes: string | null, confirmedAt: Date): Promise<DeliveryProofCompletionResult> {
    await this.assertOverrideAccess(context.actor.id);
    if (dto.confirmedWithoutSignature !== true) {
      throw new BadRequestException("Confirmarea override-ului este obligatorie.");
    }
    if (!dto.overrideReasonCode) {
      throw new BadRequestException("Motivul finalizării fără semnătură este obligatoriu.");
    }
    const overrideDetails = dto.overrideDetails?.trim() || null;
    if (dto.overrideReasonCode === "OTHER" && !overrideDetails) {
      throw new BadRequestException("Pentru alt motiv trebuie completate detaliile.");
    }
    try {
      const proof = await tx.deliveryProof.create({
        data: {
          confirmedAt,
          confirmedByUserId: context.actor.id,
          deliveryId: delivery.id,
          recipientName,
          recipientNotes,
          recipientRole,
          signatureOverrideDetails: overrideDetails,
          signatureOverrideReasonCode: dto.overrideReasonCode,
          signed: false,
        },
      });
      return {
        auditAction: DELIVERY_PROOF_AUDIT_ACTIONS.completedWithoutSignature,
        eventType: DeliveryEventType.DELIVERY_COMPLETED_WITHOUT_SIGNATURE,
        metadata: { actorUserId: context.actor.id, overrideReasonCode: dto.overrideReasonCode, proofId: proof.id, signed: false, signatureHashPrefix: null },
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Livrarea are deja o dovadă de predare.");
      }
      throw error;
    }
  }

  private async assertCaptureAccess(userId: string, courierUserId: string | null): Promise<void> {
    const all = await this.authorizationService.hasPermission({ permission: "delivery.signature.capture", requiredScope: "ALL", userId });
    if (all.allowed) {
      return;
    }
    const own = await this.authorizationService.hasPermission({ permission: "delivery.signature.capture", requiredScope: "OWN_DELIVERY", userId });
    if (own.allowed && courierUserId === userId) {
      return;
    }
    throw new ForbiddenException("Nu ai permisiune pentru capturarea semnăturii.");
  }

  private async assertOverrideAccess(userId: string): Promise<void> {
    const result = await this.authorizationService.hasPermission({ permission: "delivery.signature.override", requiredScope: "ALL", userId });
    if (!result.allowed) {
      throw new ForbiddenException("Nu ai permisiune pentru finalizarea fără semnătură.");
    }
  }

  private async assertReadAccess(userId: string, courierUserId: string | null): Promise<void> {
    const all = await this.authorizationService.hasPermission({ permission: "delivery.signature.read", requiredScope: "ALL", userId });
    if (all.allowed) {
      return;
    }
    const own = await this.authorizationService.hasPermission({ permission: "delivery.signature.read", requiredScope: "OWN_DELIVERY", userId });
    if (own.allowed && courierUserId === userId) {
      return;
    }
    throw new ForbiddenException("Nu ai acces la dovada acestei livrări.");
  }

  private async assertPrintAccess(userId: string): Promise<void> {
    const result = await this.authorizationService.hasPermission({ permission: "delivery.proof.print", requiredScope: "ALL", userId });
    if (!result.allowed) {
      throw new ForbiddenException("Nu ai permisiune pentru printarea dovezii.");
    }
  }

  private async recordAudit(context: DeliveryProofActorContext, action: string, proofId: string, metadata: Prisma.InputJsonValue): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actor.id,
      metadata,
      resourceId: proofId,
      resourceType: DELIVERY_PROOF_RESOURCE_TYPE,
    };
    if (context.requestMetadata.ipAddress) {
      data.ipAddress = context.requestMetadata.ipAddress;
    }
    if (context.requestMetadata.userAgent) {
      data.userAgent = context.requestMetadata.userAgent;
    }
    await this.prisma.auditLog.create({ data });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
