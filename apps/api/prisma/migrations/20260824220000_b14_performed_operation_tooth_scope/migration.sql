-- B14: tooth-scoped immutable maneuver snapshots and active reservations.
ALTER TABLE "technician_performed_operations"
  ADD COLUMN "probe_cycle_id" TEXT,
  ADD COLUMN "operation_code_snapshot" VARCHAR(40),
  ADD COLUMN "operation_name_snapshot" VARCHAR(160),
  ADD COLUMN "quantity" INTEGER,
  ADD COLUMN "rate_minor_snapshot" INTEGER,
  ADD COLUMN "notes" VARCHAR(1000);

CREATE TABLE "technician_performed_operation_teeth" (
  "id" TEXT NOT NULL,
  "performed_operation_id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL,
  "fdi_tooth" INTEGER NOT NULL,
  "released_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technician_performed_operation_teeth_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technician_performed_operation_teeth_performed_operation_id_idx"
  ON "technician_performed_operation_teeth"("performed_operation_id");
CREATE INDEX "technician_performed_operation_teeth_work_order_id_fdi_tooth_idx"
  ON "technician_performed_operation_teeth"("work_order_id", "fdi_tooth");
CREATE INDEX "technician_performed_operation_teeth_operation_id_fdi_tooth_idx"
  ON "technician_performed_operation_teeth"("operation_id", "fdi_tooth");
CREATE UNIQUE INDEX "technician_performed_operation_teeth_active_unique"
  ON "technician_performed_operation_teeth"("work_order_id", "operation_id", "fdi_tooth")
  WHERE "released_at" IS NULL;

ALTER TABLE "technician_performed_operations"
  ADD CONSTRAINT "technician_performed_operations_probe_cycle_id_fkey"
  FOREIGN KEY ("probe_cycle_id") REFERENCES "probe_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "technician_performed_operation_teeth"
  ADD CONSTRAINT "technician_performed_operation_teeth_performed_operation_id_fkey"
  FOREIGN KEY ("performed_operation_id") REFERENCES "technician_performed_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "technician_performed_operation_teeth_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "technician_performed_operation_teeth_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "technician_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
