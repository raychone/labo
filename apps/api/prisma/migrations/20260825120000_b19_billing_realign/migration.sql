-- B19: persist the immutable companion payment-note issuance snapshot.
ALTER TABLE "billing_documents"
  ADD COLUMN "payment_note_issued_at" TIMESTAMP(3),
  ADD COLUMN "payment_note_snapshot" JSONB;

ALTER TABLE "legal_entity_settings"
  ADD COLUMN "large_outstanding_threshold_minor" INTEGER;
