-- CreateEnum
CREATE TYPE "ExecutionSnapshotStatus" AS ENUM ('NOT_CREATED', 'LOCKED', 'INVALID');

-- CreateEnum
CREATE TYPE "ExecutionSnapshotSource" AS ENUM ('TECHNICIAN_FIRST_CLAIM', 'MANAGER_ASSIGNMENT', 'LEGACY_BACKFILL', 'ADMIN_REPAIR');

-- AlterTable
ALTER TABLE "work_assignment_events" ADD COLUMN     "execution_snapshot_status" "ExecutionSnapshotStatus",
ADD COLUMN     "execution_snapshot_version" INTEGER;

-- CreateTable
CREATE TABLE "work_execution_snapshots" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ExecutionSnapshotStatus" NOT NULL,
    "source" "ExecutionSnapshotSource" NOT NULL,
    "execution_legal_entity_id" TEXT NOT NULL,
    "execution_legal_entity_code" VARCHAR(8) NOT NULL,
    "technician_id" TEXT NOT NULL,
    "technician_display_name" VARCHAR(160) NOT NULL,
    "claim_revision" INTEGER NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL,
    "snapshot_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot_locked_at" TIMESTAMP(3),
    "pricing_currency" CHAR(3) NOT NULL,
    "pricing_unit" VARCHAR(40),
    "pricing_quantity" DECIMAL(12,3),
    "pricing_unit_price_minor" INTEGER,
    "pricing_total_minor" INTEGER,
    "pricing_source_type" VARCHAR(40),
    "pricing_source_label" VARCHAR(160),
    "pricing_agreement_id" TEXT,
    "pricing_catalog_item_id" TEXT,
    "pricing_rule_version" INTEGER,
    "pricing_snapshot_json" JSONB NOT NULL,
    "deadline_mode" VARCHAR(40) NOT NULL,
    "deadline_start_at" TIMESTAMP(3),
    "deadline_effective_due_at" TIMESTAMP(3),
    "deadline_execution_days" INTEGER,
    "deadline_include_start_day" BOOLEAN,
    "deadline_due_hour" INTEGER,
    "deadline_timezone" VARCHAR(64),
    "deadline_reason_code" VARCHAR(80),
    "deadline_explanation" VARCHAR(1000),
    "deadline_rule_version" INTEGER,
    "deadline_snapshot_json" JSONB NOT NULL,
    "context_snapshot_json" JSONB NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_execution_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_execution_snapshots_work_order_id_key" ON "work_execution_snapshots"("work_order_id");

-- CreateIndex
CREATE INDEX "work_execution_snapshots_status_idx" ON "work_execution_snapshots"("status");

-- CreateIndex
CREATE INDEX "work_execution_snapshots_execution_legal_entity_id_status_idx" ON "work_execution_snapshots"("execution_legal_entity_id", "status");

-- CreateIndex
CREATE INDEX "work_execution_snapshots_snapshot_created_at_idx" ON "work_execution_snapshots"("snapshot_created_at");

-- AddForeignKey
ALTER TABLE "work_execution_snapshots" ADD CONSTRAINT "work_execution_snapshots_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_execution_snapshots" ADD CONSTRAINT "work_execution_snapshots_execution_legal_entity_id_fkey" FOREIGN KEY ("execution_legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_execution_snapshots" ADD CONSTRAINT "work_execution_snapshots_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_execution_snapshots" ADD CONSTRAINT "work_execution_snapshots_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
