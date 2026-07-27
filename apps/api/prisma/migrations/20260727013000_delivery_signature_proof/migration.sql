-- Add signature proof support without touching existing delivery rows.
ALTER TYPE "DeliveryEventType" ADD VALUE IF NOT EXISTS 'DELIVERY_SIGNATURE_CAPTURED';
ALTER TYPE "DeliveryEventType" ADD VALUE IF NOT EXISTS 'DELIVERY_COMPLETED_WITHOUT_SIGNATURE';

CREATE TYPE "SignatureOverrideReasonCode" AS ENUM (
  'RECIPIENT_REFUSED_SIGNATURE',
  'DEVICE_UNAVAILABLE',
  'TECHNICAL_FAILURE',
  'OTHER'
);

CREATE TABLE "delivery_proofs" (
  "id" TEXT NOT NULL,
  "delivery_id" TEXT NOT NULL,
  "recipient_name" VARCHAR(160) NOT NULL,
  "recipient_role" VARCHAR(120),
  "recipient_notes" VARCHAR(1000),
  "signature_strokes" JSONB,
  "signature_hash" CHAR(64),
  "signature_captured_at" TIMESTAMP(3),
  "signed" BOOLEAN NOT NULL DEFAULT false,
  "signature_override_reason_code" "SignatureOverrideReasonCode",
  "signature_override_details" VARCHAR(1000),
  "confirmed_by_user_id" TEXT,
  "confirmed_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_proofs_signature_or_override_check" CHECK (
    (
      "signed" = true
      AND "signature_strokes" IS NOT NULL
      AND "signature_hash" IS NOT NULL
      AND "signature_captured_at" IS NOT NULL
      AND "signature_override_reason_code" IS NULL
    )
    OR
    (
      "signed" = false
      AND "signature_strokes" IS NULL
      AND "signature_hash" IS NULL
      AND "signature_captured_at" IS NULL
      AND "signature_override_reason_code" IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX "delivery_proofs_delivery_id_key" ON "delivery_proofs"("delivery_id");
CREATE INDEX "delivery_proofs_confirmed_by_user_id_idx" ON "delivery_proofs"("confirmed_by_user_id");
CREATE INDEX "delivery_proofs_confirmed_at_idx" ON "delivery_proofs"("confirmed_at");
CREATE INDEX "delivery_proofs_signed_idx" ON "delivery_proofs"("signed");

ALTER TABLE "delivery_proofs"
  ADD CONSTRAINT "delivery_proofs_delivery_id_fkey"
  FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_proofs"
  ADD CONSTRAINT "delivery_proofs_confirmed_by_user_id_fkey"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
