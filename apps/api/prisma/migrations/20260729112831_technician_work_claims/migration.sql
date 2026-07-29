-- CreateEnum
CREATE TYPE "WorkClaimStatus" AS ENUM ('UNCLAIMED', 'CLAIMED');

-- CreateEnum
CREATE TYPE "WorkClaimSource" AS ENUM ('TECHNICIAN_CLAIM', 'MANAGER_ASSIGNMENT', 'MANAGER_REASSIGNMENT', 'TECHNICIAN_RELEASE', 'MANAGER_RELEASE', 'LEGACY_BACKFILL');

-- CreateEnum
CREATE TYPE "WorkAssignmentEventType" AS ENUM ('CLAIMED', 'RELEASED', 'ASSIGNED', 'REASSIGNED');

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "assigned_technician_id" TEXT,
ADD COLUMN     "assignment_updated_at" TIMESTAMP(3),
ADD COLUMN     "claim_revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "claim_source" "WorkClaimSource",
ADD COLUMN     "claim_status" "WorkClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
ADD COLUMN     "claimed_at" TIMESTAMP(3),
ADD COLUMN     "claimed_by_user_id" TEXT,
ADD COLUMN     "execution_legal_entity_id" TEXT,
ADD COLUMN     "release_reason" VARCHAR(500),
ADD COLUMN     "released_at" TIMESTAMP(3),
ADD COLUMN     "released_by_user_id" TEXT;

-- CreateTable
CREATE TABLE "work_assignment_events" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "event_type" "WorkAssignmentEventType" NOT NULL,
    "previous_technician_id" TEXT,
    "new_technician_id" TEXT,
    "previous_legal_entity_id" TEXT,
    "new_legal_entity_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "reason" VARCHAR(500),
    "revision" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_assignment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_assignment_events_work_order_id_created_at_idx" ON "work_assignment_events"("work_order_id", "created_at");

-- CreateIndex
CREATE INDEX "work_assignment_events_actor_user_id_created_at_idx" ON "work_assignment_events"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "work_assignment_events_previous_technician_id_idx" ON "work_assignment_events"("previous_technician_id");

-- CreateIndex
CREATE INDEX "work_assignment_events_new_technician_id_idx" ON "work_assignment_events"("new_technician_id");

-- CreateIndex
CREATE INDEX "work_assignment_events_previous_legal_entity_id_idx" ON "work_assignment_events"("previous_legal_entity_id");

-- CreateIndex
CREATE INDEX "work_assignment_events_new_legal_entity_id_idx" ON "work_assignment_events"("new_legal_entity_id");

-- CreateIndex
CREATE INDEX "work_orders_claim_status_idx" ON "work_orders"("claim_status");

-- CreateIndex
CREATE INDEX "work_orders_assigned_technician_id_claim_status_idx" ON "work_orders"("assigned_technician_id", "claim_status");

-- CreateIndex
CREATE INDEX "work_orders_execution_legal_entity_id_claim_status_idx" ON "work_orders"("execution_legal_entity_id", "claim_status");

-- CreateIndex
CREATE INDEX "work_orders_effective_due_at_claim_status_idx" ON "work_orders"("effective_due_at", "claim_status");

-- CreateIndex
CREATE INDEX "work_orders_claimed_by_user_id_idx" ON "work_orders"("claimed_by_user_id");

-- CreateIndex
CREATE INDEX "work_orders_released_by_user_id_idx" ON "work_orders"("released_by_user_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_technician_id_fkey" FOREIGN KEY ("assigned_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_execution_legal_entity_id_fkey" FOREIGN KEY ("execution_legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_released_by_user_id_fkey" FOREIGN KEY ("released_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignment_events" ADD CONSTRAINT "work_assignment_events_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignment_events" ADD CONSTRAINT "work_assignment_events_previous_technician_id_fkey" FOREIGN KEY ("previous_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignment_events" ADD CONSTRAINT "work_assignment_events_new_technician_id_fkey" FOREIGN KEY ("new_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignment_events" ADD CONSTRAINT "work_assignment_events_previous_legal_entity_id_fkey" FOREIGN KEY ("previous_legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignment_events" ADD CONSTRAINT "work_assignment_events_new_legal_entity_id_fkey" FOREIGN KEY ("new_legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_assignment_events" ADD CONSTRAINT "work_assignment_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
