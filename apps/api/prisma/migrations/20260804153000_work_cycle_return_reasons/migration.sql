ALTER TYPE "WorkCycleReason" ADD VALUE IF NOT EXISTS 'PROBA';
ALTER TYPE "WorkCycleReason" ADD VALUE IF NOT EXISTS 'FINISHING';
ALTER TYPE "WorkCycleReason" ADD VALUE IF NOT EXISTS 'CLARIFICATION';

ALTER TABLE "work_cycles" ADD COLUMN "clinic_id" TEXT;

UPDATE "work_cycles" wc
SET "clinic_id" = wo."clinic_id"
FROM "work_orders" wo
WHERE wc."work_order_id" = wo."id"
  AND wc."clinic_id" IS NULL;

ALTER TABLE "work_cycles" ALTER COLUMN "clinic_id" SET NOT NULL;

CREATE INDEX "work_cycles_clinic_id_idx" ON "work_cycles"("clinic_id");

ALTER TABLE "work_cycles" ADD CONSTRAINT "work_cycles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
