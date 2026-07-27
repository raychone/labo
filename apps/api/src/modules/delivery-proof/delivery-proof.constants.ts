export const DELIVERY_PROOF_AUDIT_ACTIONS = {
  completedWithoutSignature: "delivery.completed_without_signature",
  proofPrinted: "delivery.proof_printed",
  proofViewed: "delivery.proof_viewed",
  signatureCaptured: "delivery.signature_captured",
} as const;

export const DELIVERY_PROOF_RESOURCE_TYPE = "delivery_proof";

export const STALE_DELIVERY_MESSAGE = "Livrarea a fost modificată între timp. Reîncarcă datele și încearcă din nou.";
