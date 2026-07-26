CREATE TYPE "DeliveryStatus" AS ENUM ('PLANNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "DeliveryFailureReasonCode" AS ENUM ('CLINIC_CLOSED', 'RECIPIENT_UNAVAILABLE', 'ADDRESS_PROBLEM', 'DELIVERY_REFUSED', 'COURIER_PROBLEM', 'OTHER');
CREATE TYPE "DeliveryEventType" AS ENUM ('DELIVERY_CREATED', 'COURIER_ASSIGNED', 'COURIER_REASSIGNED', 'COURIER_UNASSIGNED', 'DELIVERY_PICKED_UP', 'DELIVERY_IN_TRANSIT', 'DELIVERY_COMPLETED', 'DELIVERY_FAILED', 'DELIVERY_RESCHEDULED', 'DELIVERY_CANCELLED');

CREATE SEQUENCE "delivery_code_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE "deliveries" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(24) NOT NULL,
  "preparation_group_id" TEXT NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "courier_user_id" TEXT,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PLANNED',
  "planned_date" TIMESTAMP(3) NOT NULL,
  "sequence_order" INTEGER,
  "assigned_at" TIMESTAMP(3),
  "assigned_by_user_id" TEXT,
  "picked_up_at" TIMESTAMP(3),
  "picked_up_by_user_id" TEXT,
  "in_transit_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "delivered_by_user_id" TEXT,
  "failed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "recipient_name" VARCHAR(160),
  "recipient_role" VARCHAR(120),
  "delivery_notes" VARCHAR(1000),
  "failure_reason_code" "DeliveryFailureReasonCode",
  "failure_details" VARCHAR(1000),
  "rescheduled_for" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_events" (
  "id" TEXT NOT NULL,
  "delivery_id" TEXT NOT NULL,
  "type" "DeliveryEventType" NOT NULL,
  "actor_user_id" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deliveries_code_key" ON "deliveries"("code");
CREATE UNIQUE INDEX "deliveries_active_preparation_group_id_key" ON "deliveries"("preparation_group_id") WHERE "is_active" = true;
CREATE INDEX "deliveries_preparation_group_id_idx" ON "deliveries"("preparation_group_id");
CREATE INDEX "deliveries_clinic_id_idx" ON "deliveries"("clinic_id");
CREATE INDEX "deliveries_courier_user_id_idx" ON "deliveries"("courier_user_id");
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");
CREATE INDEX "deliveries_planned_date_idx" ON "deliveries"("planned_date");
CREATE INDEX "deliveries_courier_user_id_planned_date_idx" ON "deliveries"("courier_user_id", "planned_date");
CREATE INDEX "deliveries_status_planned_date_idx" ON "deliveries"("status", "planned_date");
CREATE INDEX "deliveries_is_active_idx" ON "deliveries"("is_active");
CREATE INDEX "deliveries_created_by_user_id_idx" ON "deliveries"("created_by_user_id");
CREATE INDEX "deliveries_updated_by_user_id_idx" ON "deliveries"("updated_by_user_id");
CREATE INDEX "delivery_events_delivery_id_occurred_at_idx" ON "delivery_events"("delivery_id", "occurred_at");
CREATE INDEX "delivery_events_type_idx" ON "delivery_events"("type");
CREATE INDEX "delivery_events_actor_user_id_idx" ON "delivery_events"("actor_user_id");

ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_preparation_group_id_fkey" FOREIGN KEY ("preparation_group_id") REFERENCES "delivery_preparation_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_courier_user_id_fkey" FOREIGN KEY ("courier_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_picked_up_by_user_id_fkey" FOREIGN KEY ("picked_up_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_delivered_by_user_id_fkey" FOREIGN KEY ("delivered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
