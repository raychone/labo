ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "technical_code_notes" VARCHAR(4000);
