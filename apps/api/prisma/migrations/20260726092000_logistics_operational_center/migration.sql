-- LOGISTICS-001: operational center, logistics states and internal delivery preparation groups.
-- Non-destructive: adds new tables, enums, indexes and foreign keys.

CREATE TYPE "WorkLogisticsStatus" AS ENUM (
  'RECEIVED',
  'IN_PRODUCTION',
  'BLOCKED',
  'READY_FOR_PACKING',
  'PACKING',
  'READY_FOR_DELIVERY',
  'HANDED_TO_DELIVERY',
  'DELIVERED'
);

CREATE TYPE "LogisticsLocationCode" AS ENUM (
  'RECEPTIE',
  'PRODUCTIE',
  'RAFT_FINISARE',
  'ZONA_AMBALARE',
  'GATA_LIVRARE'
);

CREATE TYPE "LogisticsBlockReasonCode" AS ENUM (
  'MISSING_INFO',
  'DOCTOR_CONFIRMATION',
  'MISSING_COMPONENTS',
  'TECHNICAL_ISSUE',
  'DEADLINE_CLARIFICATION',
  'OTHER'
);

CREATE TYPE "LogisticsEventType" AS ENUM (
  'WORK_RECEIVED',
  'LOCATION_UPDATED',
  'WORK_BLOCKED',
  'WORK_UNBLOCKED',
  'READY_FOR_PACKING_CONFIRMED',
  'PACKING_STARTED',
  'PACKING_COMPLETED',
  'DELIVERY_GROUP_CREATED',
  'DELIVERY_GROUP_UPDATED',
  'WORK_ADDED_TO_DELIVERY_GROUP',
  'WORK_REMOVED_FROM_DELIVERY_GROUP',
  'DELIVERY_GROUP_MARKED_READY',
  'DELIVERY_GROUP_CANCELLED'
);

CREATE TYPE "DeliveryPreparationGroupStatus" AS ENUM (
  'DRAFT',
  'READY',
  'CANCELLED'
);

CREATE TABLE "work_logistics_states" (
  "id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "status" "WorkLogisticsStatus" NOT NULL DEFAULT 'RECEIVED',
  "physical_location_code" "LogisticsLocationCode",
  "blocked_reason_code" "LogisticsBlockReasonCode",
  "blocked_reason_notes" VARCHAR(1000),
  "blocked_at" TIMESTAMP(3),
  "blocked_by_user_id" TEXT,
  "ready_for_packing_at" TIMESTAMP(3),
  "ready_for_packing_by_user_id" TEXT,
  "packing_started_at" TIMESTAMP(3),
  "packing_started_by_user_id" TEXT,
  "ready_for_delivery_at" TIMESTAMP(3),
  "ready_for_delivery_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_logistics_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistics_events" (
  "id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "logistics_state_id" TEXT,
  "type" "LogisticsEventType" NOT NULL,
  "actor_user_id" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logistics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_preparation_groups" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(24) NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "status" "DeliveryPreparationGroupStatus" NOT NULL DEFAULT 'DRAFT',
  "planned_date" TIMESTAMP(3),
  "notes" VARCHAR(1000),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "delivery_preparation_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_preparation_items" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "added_by_user_id" TEXT,
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removed_by_user_id" TEXT,
  "removed_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "delivery_preparation_items_pkey" PRIMARY KEY ("id")
);

CREATE SEQUENCE "delivery_preparation_group_code_seq";

CREATE UNIQUE INDEX "work_logistics_states_work_order_id_key" ON "work_logistics_states"("work_order_id");
CREATE INDEX "work_logistics_states_status_idx" ON "work_logistics_states"("status");
CREATE INDEX "work_logistics_states_physical_location_code_idx" ON "work_logistics_states"("physical_location_code");
CREATE INDEX "work_logistics_states_blocked_by_user_id_idx" ON "work_logistics_states"("blocked_by_user_id");
CREATE INDEX "work_logistics_states_ready_for_packing_by_user_id_idx" ON "work_logistics_states"("ready_for_packing_by_user_id");
CREATE INDEX "work_logistics_states_packing_started_by_user_id_idx" ON "work_logistics_states"("packing_started_by_user_id");
CREATE INDEX "work_logistics_states_ready_for_delivery_by_user_id_idx" ON "work_logistics_states"("ready_for_delivery_by_user_id");
CREATE INDEX "work_logistics_states_updated_by_user_id_idx" ON "work_logistics_states"("updated_by_user_id");
CREATE INDEX "work_logistics_states_updated_at_idx" ON "work_logistics_states"("updated_at");

CREATE INDEX "logistics_events_work_order_id_occurred_at_idx" ON "logistics_events"("work_order_id", "occurred_at");
CREATE INDEX "logistics_events_logistics_state_id_idx" ON "logistics_events"("logistics_state_id");
CREATE INDEX "logistics_events_type_idx" ON "logistics_events"("type");
CREATE INDEX "logistics_events_actor_user_id_idx" ON "logistics_events"("actor_user_id");

CREATE UNIQUE INDEX "delivery_preparation_groups_code_key" ON "delivery_preparation_groups"("code");
CREATE INDEX "delivery_preparation_groups_clinic_id_idx" ON "delivery_preparation_groups"("clinic_id");
CREATE INDEX "delivery_preparation_groups_status_idx" ON "delivery_preparation_groups"("status");
CREATE INDEX "delivery_preparation_groups_planned_date_idx" ON "delivery_preparation_groups"("planned_date");
CREATE INDEX "delivery_preparation_groups_created_by_user_id_idx" ON "delivery_preparation_groups"("created_by_user_id");
CREATE INDEX "delivery_preparation_groups_updated_by_user_id_idx" ON "delivery_preparation_groups"("updated_by_user_id");

CREATE UNIQUE INDEX "delivery_preparation_items_group_id_work_order_id_key" ON "delivery_preparation_items"("group_id", "work_order_id");
CREATE UNIQUE INDEX "delivery_preparation_items_active_work_order_id_key" ON "delivery_preparation_items"("work_order_id") WHERE "is_active" = true;
CREATE INDEX "delivery_preparation_items_group_id_idx" ON "delivery_preparation_items"("group_id");
CREATE INDEX "delivery_preparation_items_work_order_id_idx" ON "delivery_preparation_items"("work_order_id");
CREATE INDEX "delivery_preparation_items_is_active_idx" ON "delivery_preparation_items"("is_active");
CREATE INDEX "delivery_preparation_items_added_by_user_id_idx" ON "delivery_preparation_items"("added_by_user_id");
CREATE INDEX "delivery_preparation_items_removed_by_user_id_idx" ON "delivery_preparation_items"("removed_by_user_id");

ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_blocked_by_user_id_fkey" FOREIGN KEY ("blocked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_ready_for_packing_by_user_id_fkey" FOREIGN KEY ("ready_for_packing_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_packing_started_by_user_id_fkey" FOREIGN KEY ("packing_started_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_ready_for_delivery_by_user_id_fkey" FOREIGN KEY ("ready_for_delivery_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_logistics_states" ADD CONSTRAINT "work_logistics_states_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "logistics_events" ADD CONSTRAINT "logistics_events_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistics_events" ADD CONSTRAINT "logistics_events_logistics_state_id_fkey" FOREIGN KEY ("logistics_state_id") REFERENCES "work_logistics_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistics_events" ADD CONSTRAINT "logistics_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "delivery_preparation_groups" ADD CONSTRAINT "delivery_preparation_groups_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_preparation_groups" ADD CONSTRAINT "delivery_preparation_groups_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_preparation_groups" ADD CONSTRAINT "delivery_preparation_groups_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "delivery_preparation_items" ADD CONSTRAINT "delivery_preparation_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "delivery_preparation_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_preparation_items" ADD CONSTRAINT "delivery_preparation_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_preparation_items" ADD CONSTRAINT "delivery_preparation_items_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_preparation_items" ADD CONSTRAINT "delivery_preparation_items_removed_by_user_id_fkey" FOREIGN KEY ("removed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
