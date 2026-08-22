CREATE TYPE "LogisticsMarker" AS ENUM ('MARKER_1', 'MARKER_2', 'MARKER_3', 'MARKER_4', 'MARKER_5');

ALTER TABLE "work_orders"
  ADD COLUMN "logistics_note" VARCHAR(2000),
  ADD COLUMN "logistics_marker" "LogisticsMarker",
  ADD COLUMN "requires_delivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requires_pickup" BOOLEAN NOT NULL DEFAULT false;
