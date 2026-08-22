CREATE TYPE "CourierRouteStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CourierRouteStopType" AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE "CourierRouteStopOutcome" AS ENUM ('PENDING', 'DELIVERED', 'NOT_DELIVERED', 'PICKED_UP', 'NOT_PICKED_UP');
CREATE TYPE "CourierRouteEventType" AS ENUM ('ROUTE_CREATED', 'ROUTE_UPDATED', 'ROUTE_CANCELLED', 'STOP_OUTCOME_RECORDED', 'STOP_OUTCOME_CORRECTED');

CREATE TABLE "courier_routes" (
  "id" TEXT NOT NULL,
  "route_number" VARCHAR(32) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "route_date" DATE NOT NULL,
  "courier_user_id" TEXT,
  "status" "CourierRouteStatus" NOT NULL DEFAULT 'DRAFT',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "notes" VARCHAR(1000),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "courier_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_route_stops" (
  "id" TEXT NOT NULL,
  "route_id" TEXT NOT NULL,
  "stop_order" INTEGER NOT NULL,
  "type" "CourierRouteStopType" NOT NULL,
  "work_order_id" TEXT,
  "pickup_request_id" TEXT,
  "outcome_status" "CourierRouteStopOutcome" NOT NULL DEFAULT 'PENDING',
  "outcome_notes" VARCHAR(1000),
  "outcome_at" TIMESTAMP(3),
  "outcome_by_user_id" TEXT,
  "failure_reason" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courier_route_stops_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "courier_route_stops_target_check" CHECK (
    ("type" = 'DELIVERY' AND "work_order_id" IS NOT NULL AND "pickup_request_id" IS NULL)
    OR ("type" = 'PICKUP' AND "pickup_request_id" IS NOT NULL AND "work_order_id" IS NULL)
  )
);

CREATE TABLE "courier_route_events" (
  "id" TEXT NOT NULL,
  "route_id" TEXT NOT NULL,
  "type" "CourierRouteEventType" NOT NULL,
  "actor_user_id" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_route_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courier_routes_route_number_key" ON "courier_routes"("route_number");
CREATE INDEX "courier_routes_route_date_idx" ON "courier_routes"("route_date");
CREATE INDEX "courier_routes_courier_user_id_route_date_idx" ON "courier_routes"("courier_user_id", "route_date");
CREATE INDEX "courier_routes_status_route_date_idx" ON "courier_routes"("status", "route_date");
CREATE INDEX "courier_routes_created_by_user_id_idx" ON "courier_routes"("created_by_user_id");
CREATE INDEX "courier_routes_updated_by_user_id_idx" ON "courier_routes"("updated_by_user_id");

CREATE UNIQUE INDEX "courier_route_stops_route_id_stop_order_key" ON "courier_route_stops"("route_id", "stop_order");
CREATE INDEX "courier_route_stops_route_id_idx" ON "courier_route_stops"("route_id");
CREATE INDEX "courier_route_stops_work_order_id_idx" ON "courier_route_stops"("work_order_id");
CREATE INDEX "courier_route_stops_pickup_request_id_idx" ON "courier_route_stops"("pickup_request_id");
CREATE INDEX "courier_route_stops_outcome_status_idx" ON "courier_route_stops"("outcome_status");

CREATE INDEX "courier_route_events_route_id_occurred_at_idx" ON "courier_route_events"("route_id", "occurred_at");
CREATE INDEX "courier_route_events_type_idx" ON "courier_route_events"("type");
CREATE INDEX "courier_route_events_actor_user_id_idx" ON "courier_route_events"("actor_user_id");

ALTER TABLE "courier_routes" ADD CONSTRAINT "courier_routes_courier_user_id_fkey" FOREIGN KEY ("courier_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courier_routes" ADD CONSTRAINT "courier_routes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courier_routes" ADD CONSTRAINT "courier_routes_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courier_routes" ADD CONSTRAINT "courier_routes_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courier_route_stops" ADD CONSTRAINT "courier_route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "courier_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courier_route_stops" ADD CONSTRAINT "courier_route_stops_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_route_stops" ADD CONSTRAINT "courier_route_stops_pickup_request_id_fkey" FOREIGN KEY ("pickup_request_id") REFERENCES "pickup_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_route_stops" ADD CONSTRAINT "courier_route_stops_outcome_by_user_id_fkey" FOREIGN KEY ("outcome_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courier_route_events" ADD CONSTRAINT "courier_route_events_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "courier_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courier_route_events" ADD CONSTRAINT "courier_route_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
