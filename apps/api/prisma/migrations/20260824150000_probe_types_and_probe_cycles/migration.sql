CREATE TYPE "ProbeCycleStatus" AS ENUM ('ACTIVE', 'COMPLETED');

CREATE TABLE "probe_types" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "probe_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "probe_cycles" (
  "id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "probe_type_id" TEXT NOT NULL,
  "probe_type_name_snapshot" VARCHAR(120) NOT NULL,
  "status" "ProbeCycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "deadline_at" TIMESTAMP(3) NOT NULL,
  "deadline_snapshot_json" JSONB,
  "created_by_user_id" TEXT,
  "completed_by_user_id" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "probe_cycles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "work_orders" ADD COLUMN "active_probe_cycle_id" TEXT;
CREATE UNIQUE INDEX "probe_types_name_key" ON "probe_types"("name");
CREATE INDEX "probe_types_is_archived_sort_order_idx" ON "probe_types"("is_archived", "sort_order");
CREATE UNIQUE INDEX "work_orders_active_probe_cycle_id_key" ON "work_orders"("active_probe_cycle_id");
CREATE UNIQUE INDEX "probe_cycles_work_order_id_sequence_key" ON "probe_cycles"("work_order_id", "sequence");
CREATE UNIQUE INDEX "probe_cycles_one_active_per_work_order_idx" ON "probe_cycles"("work_order_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "probe_cycles_work_order_id_status_idx" ON "probe_cycles"("work_order_id", "status");
CREATE INDEX "probe_cycles_probe_type_id_idx" ON "probe_cycles"("probe_type_id");

ALTER TABLE "probe_types" ADD CONSTRAINT "probe_types_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "probe_types" ADD CONSTRAINT "probe_types_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "probe_types" ADD CONSTRAINT "probe_types_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "probe_cycles" ADD CONSTRAINT "probe_cycles_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "probe_cycles" ADD CONSTRAINT "probe_cycles_probe_type_id_fkey" FOREIGN KEY ("probe_type_id") REFERENCES "probe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "probe_cycles" ADD CONSTRAINT "probe_cycles_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "probe_cycles" ADD CONSTRAINT "probe_cycles_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_active_probe_cycle_id_fkey" FOREIGN KEY ("active_probe_cycle_id") REFERENCES "probe_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
