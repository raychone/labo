CREATE TYPE "WorkCycleStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "WorkCycleReason" AS ENUM ('INITIAL', 'ADJUSTMENT', 'REPAIR', 'REMAKE', 'WARRANTY', 'OTHER');

CREATE TABLE "work_cycles" (
  "id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "cycle_number" INTEGER NOT NULL,
  "reason" "WorkCycleReason" NOT NULL,
  "reason_notes" VARCHAR(1000),
  "status" "WorkCycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "doctor_id" TEXT,
  "execution_legal_entity_id" TEXT,
  "execution_legal_entity_code_snapshot" VARCHAR(8),
  "execution_legal_entity_name_snapshot" VARCHAR(160),
  "execution_snapshot_version" INTEGER,
  "execution_snapshot_json" JSONB,
  "pricing_snapshot_json" JSONB,
  "deadline_mode_snapshot" "WorkDeadlineMode",
  "deadline_effective_due_at_snapshot" TIMESTAMP(3),
  "deadline_snapshot_json" JSONB,
  CONSTRAINT "work_cycles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "work_orders" ADD COLUMN "active_cycle_id" TEXT;
ALTER TABLE "work_workflow_executions" ADD COLUMN "work_cycle_id" TEXT;
ALTER TABLE "work_logistics_states" ADD COLUMN "work_cycle_id" TEXT;
ALTER TABLE "logistics_events" ADD COLUMN "work_cycle_id" TEXT;
ALTER TABLE "delivery_preparation_items" ADD COLUMN "work_cycle_id" TEXT;
ALTER TABLE "work_execution_snapshots" ADD COLUMN "work_cycle_id" TEXT;

INSERT INTO "work_cycles" (
  "id",
  "work_order_id",
  "cycle_number",
  "reason",
  "status",
  "opened_at",
  "created_by_user_id",
  "created_at",
  "updated_at",
  "doctor_id",
  "execution_legal_entity_id",
  "execution_legal_entity_code_snapshot",
  "execution_legal_entity_name_snapshot",
  "execution_snapshot_version",
  "execution_snapshot_json",
  "pricing_snapshot_json",
  "deadline_mode_snapshot",
  "deadline_effective_due_at_snapshot",
  "deadline_snapshot_json"
)
SELECT
  'cycle_' || wo."id",
  wo."id",
  1,
  'INITIAL'::"WorkCycleReason",
  'ACTIVE'::"WorkCycleStatus",
  wo."created_at",
  wo."created_by_user_id",
  wo."created_at",
  wo."updated_at",
  wo."doctor_id",
  wo."execution_legal_entity_id",
  le."code",
  le."display_name",
  wes."version",
  wes."context_snapshot_json",
  wes."pricing_snapshot_json",
  wo."deadline_mode",
  wo."effective_due_at",
  COALESCE(wes."deadline_snapshot_json", wo."deadline_rule_snapshot")
FROM "work_orders" wo
LEFT JOIN "legal_entities" le ON le."id" = wo."execution_legal_entity_id"
LEFT JOIN "work_execution_snapshots" wes ON wes."work_order_id" = wo."id";

UPDATE "work_orders"
SET "active_cycle_id" = 'cycle_' || "id"
WHERE "active_cycle_id" IS NULL;

UPDATE "work_workflow_executions"
SET "work_cycle_id" = 'cycle_' || "work_order_id"
WHERE "work_cycle_id" IS NULL;

UPDATE "work_logistics_states"
SET "work_cycle_id" = 'cycle_' || "work_order_id"
WHERE "work_cycle_id" IS NULL;

UPDATE "logistics_events"
SET "work_cycle_id" = 'cycle_' || "work_order_id"
WHERE "work_cycle_id" IS NULL;

UPDATE "delivery_preparation_items"
SET "work_cycle_id" = 'cycle_' || "work_order_id"
WHERE "work_cycle_id" IS NULL;

UPDATE "work_execution_snapshots"
SET "work_cycle_id" = 'cycle_' || "work_order_id"
WHERE "work_cycle_id" IS NULL;

ALTER TABLE "work_workflow_executions" DROP CONSTRAINT IF EXISTS "work_workflow_executions_work_order_id_key";
ALTER TABLE "work_logistics_states" DROP CONSTRAINT IF EXISTS "work_logistics_states_work_order_id_key";
ALTER TABLE "work_execution_snapshots" DROP CONSTRAINT IF EXISTS "work_execution_snapshots_work_order_id_key";
DROP INDEX IF EXISTS "work_workflow_executions_work_order_id_key";
DROP INDEX IF EXISTS "work_logistics_states_work_order_id_key";
DROP INDEX IF EXISTS "work_execution_snapshots_work_order_id_key";

CREATE UNIQUE INDEX "work_cycles_work_order_id_cycle_number_key" ON "work_cycles"("work_order_id", "cycle_number");
CREATE INDEX "work_cycles_work_order_id_status_idx" ON "work_cycles"("work_order_id", "status");
CREATE INDEX "work_cycles_status_idx" ON "work_cycles"("status");
CREATE INDEX "work_cycles_created_by_user_id_idx" ON "work_cycles"("created_by_user_id");
CREATE INDEX "work_cycles_doctor_id_idx" ON "work_cycles"("doctor_id");
CREATE INDEX "work_cycles_execution_legal_entity_id_idx" ON "work_cycles"("execution_legal_entity_id");
CREATE UNIQUE INDEX "work_orders_active_cycle_id_key" ON "work_orders"("active_cycle_id");
CREATE INDEX "work_orders_active_cycle_id_idx" ON "work_orders"("active_cycle_id");
CREATE UNIQUE INDEX "work_workflow_executions_work_cycle_id_key" ON "work_workflow_executions"("work_cycle_id");
CREATE INDEX "work_workflow_executions_work_order_id_idx" ON "work_workflow_executions"("work_order_id");
CREATE UNIQUE INDEX "work_logistics_states_work_cycle_id_key" ON "work_logistics_states"("work_cycle_id");
CREATE INDEX "work_logistics_states_work_order_id_idx" ON "work_logistics_states"("work_order_id");
CREATE INDEX "logistics_events_work_cycle_id_occurred_at_idx" ON "logistics_events"("work_cycle_id", "occurred_at");
CREATE INDEX "delivery_preparation_items_work_cycle_id_idx" ON "delivery_preparation_items"("work_cycle_id");
CREATE UNIQUE INDEX "work_execution_snapshots_work_cycle_id_key" ON "work_execution_snapshots"("work_cycle_id");
CREATE INDEX "work_execution_snapshots_work_order_id_idx" ON "work_execution_snapshots"("work_order_id");

ALTER TABLE "work_cycles" ADD CONSTRAINT "work_cycles_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_cycles" ADD CONSTRAINT "work_cycles_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_cycles" ADD CONSTRAINT "work_cycles_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_cycles" ADD CONSTRAINT "work_cycles_execution_legal_entity_id_fkey" FOREIGN KEY ("execution_legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_active_cycle_id_fkey" FOREIGN KEY ("active_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_workflow_executions" ADD CONSTRAINT "work_workflow_executions_work_cycle_id_fkey" FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_work_cycle_id_fkey" FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistics_events" ADD CONSTRAINT "logistics_events_work_cycle_id_fkey" FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_preparation_items" ADD CONSTRAINT "delivery_preparation_items_work_cycle_id_fkey" FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_execution_snapshots" ADD CONSTRAINT "work_execution_snapshots_work_cycle_id_fkey" FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
