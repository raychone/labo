CREATE TYPE "WorkUrgency" AS ENUM ('NORMAL', 'URGENCY_1', 'URGENCY_2', 'URGENCY_3', 'URGENCY_4');

ALTER TABLE "work_orders" ADD COLUMN "urgency" "WorkUrgency";

CREATE INDEX "work_orders_urgency_idx" ON "work_orders"("urgency");
