import type { DeliveryProof, LaboratorySettings } from "@prisma/client";
import type { SignatureValue } from "./delivery-proof-validation.service.js";

type SignatureOverrideReasonCode = "RECIPIENT_REFUSED_SIGNATURE" | "DEVICE_UNAVAILABLE" | "TECHNICAL_FAILURE" | "OTHER";

interface DeliveryClinicSummary {
  readonly address: string | null;
  readonly city: string | null;
  readonly contactName: string | null;
  readonly contactPhone: string | null;
  readonly id: string;
  readonly name: string;
}

export interface DeliveryProofSummary {
  readonly confirmedAt: string;
  readonly confirmedByUserName: string | null;
  readonly hasSignature: boolean;
  readonly id: string;
  readonly overrideDetails: string | null;
  readonly overrideReasonCode: SignatureOverrideReasonCode | null;
  readonly overrideReasonLabel: string | null;
  readonly recipientName: string;
  readonly recipientNotes: string | null;
  readonly recipientRole: string | null;
  readonly signatureCapturedAt: string | null;
  readonly signatureHashPrefix: string | null;
}

export interface DeliveryProofView extends DeliveryProofSummary {
  readonly deliveryCode: string;
  readonly signature: SignatureValue | null;
}

interface DeliveryProofPrintWorkItem {
  readonly doctorName: string;
  readonly patientName: string;
  readonly quantity: number;
  readonly workCode: string;
  readonly workTypeName: string;
}

export interface DeliveryProofPrintView extends DeliveryProofView {
  readonly clinic: DeliveryClinicSummary;
  readonly courierName: string | null;
  readonly deliveredAt: string | null;
  readonly disclaimer: string;
  readonly laboratory: {
    readonly address: string | null;
    readonly email: string | null;
    readonly legalName: string | null;
    readonly name: string;
    readonly phone: string | null;
    readonly taxId: string | null;
  };
  readonly plannedDate: string;
  readonly statusLabel: string;
  readonly works: readonly DeliveryProofPrintWorkItem[];
}

const DELIVERY_PROOF_DISCLAIMER = "Document de confirmare operațională internă a predării. Nu reprezintă o semnătură electronică calificată.";

const SIGNATURE_OVERRIDE_REASON_LABELS = {
  DEVICE_UNAVAILABLE: "Dispozitiv indisponibil",
  OTHER: "Alt motiv",
  RECIPIENT_REFUSED_SIGNATURE: "Destinatarul a refuzat semnătura",
  TECHNICAL_FAILURE: "Problemă tehnică",
} as const satisfies Record<SignatureOverrideReasonCode, string>;

type DeliveryProofRecord = DeliveryProof & {
  readonly confirmedBy?: { readonly displayName: string } | null;
};

export function toDeliveryProofSummary(proof: DeliveryProofRecord): DeliveryProofSummary {
  return {
    confirmedAt: proof.confirmedAt.toISOString(),
    confirmedByUserName: proof.confirmedBy?.displayName ?? null,
    hasSignature: proof.signed,
    id: proof.id,
    overrideDetails: proof.signatureOverrideDetails,
    overrideReasonCode: proof.signatureOverrideReasonCode,
    overrideReasonLabel: proof.signatureOverrideReasonCode ? SIGNATURE_OVERRIDE_REASON_LABELS[proof.signatureOverrideReasonCode] : null,
    recipientName: proof.recipientName,
    recipientNotes: proof.recipientNotes,
    recipientRole: proof.recipientRole,
    signatureCapturedAt: proof.signatureCapturedAt?.toISOString() ?? null,
    signatureHashPrefix: proof.signatureHash ? proof.signatureHash.slice(0, 12) : null,
  };
}

export function toDeliveryProofView(proof: DeliveryProofRecord, deliveryCode: string, includeSignature: boolean): DeliveryProofView {
  return {
    ...toDeliveryProofSummary(proof),
    deliveryCode,
    signature: includeSignature && proof.signatureStrokes ? proof.signatureStrokes as unknown as SignatureValue : null,
  };
}

export function toDeliveryProofPrintView(input: {
  readonly clinic: DeliveryProofPrintView["clinic"];
  readonly courierName: string | null;
  readonly deliveredAt: Date | null;
  readonly deliveryCode: string;
  readonly laboratory: LaboratorySettings;
  readonly plannedDate: Date;
  readonly proof: DeliveryProofRecord;
  readonly statusLabel: string;
  readonly works: DeliveryProofPrintView["works"];
}): DeliveryProofPrintView {
  return {
    ...toDeliveryProofView(input.proof, input.deliveryCode, true),
    clinic: input.clinic,
    courierName: input.courierName,
    deliveredAt: input.deliveredAt?.toISOString() ?? null,
    disclaimer: DELIVERY_PROOF_DISCLAIMER,
    laboratory: {
      address: [input.laboratory.addressLine1, input.laboratory.addressLine2, input.laboratory.city, input.laboratory.countyOrRegion].filter(Boolean).join(", ") || null,
      email: input.laboratory.email,
      legalName: input.laboratory.legalName,
      name: input.laboratory.laboratoryName,
      phone: input.laboratory.phone,
      taxId: input.laboratory.taxId,
    },
    plannedDate: input.plannedDate.toISOString(),
    statusLabel: input.statusLabel,
    works: input.works,
  };
}
