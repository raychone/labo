ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "status_changed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status_changed_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "waiting_started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_by_user_id" TEXT;

UPDATE "work_orders"
SET
  "status" = 'RECEPTIE',
  "status_changed_at" = COALESCE("status_changed_at", "created_at")
WHERE "status" = 'REGISTERED';

ALTER TABLE "work_orders"
  ALTER COLUMN "status" SET DEFAULT 'RECEPTIE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_status_changed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "work_orders"
      ADD CONSTRAINT "work_orders_status_changed_by_user_id_fkey"
      FOREIGN KEY ("status_changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_completed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "work_orders"
      ADD CONSTRAINT "work_orders_completed_by_user_id_fkey"
      FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "work_orders_status_changed_at_idx" ON "work_orders"("status_changed_at");
CREATE INDEX IF NOT EXISTS "work_orders_status_changed_by_user_id_idx" ON "work_orders"("status_changed_by_user_id");
CREATE INDEX IF NOT EXISTS "work_orders_waiting_started_at_idx" ON "work_orders"("waiting_started_at");
CREATE INDEX IF NOT EXISTS "work_orders_completed_at_idx" ON "work_orders"("completed_at");
CREATE INDEX IF NOT EXISTS "work_orders_completed_by_user_id_idx" ON "work_orders"("completed_by_user_id");
