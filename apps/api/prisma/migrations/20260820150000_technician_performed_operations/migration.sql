CREATE TABLE "technician_performed_operations" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "rate_id" TEXT NOT NULL,
    "earning_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'RON',
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "removed_by_user_id" TEXT,
    "removal_reason" VARCHAR(500),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_performed_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technician_performed_operations_active_unique" ON "technician_performed_operations"("work_order_id", "technician_id", "operation_id") WHERE "removed_at" IS NULL;
CREATE INDEX "technician_performed_operations_work_order_id_removed_at_idx" ON "technician_performed_operations"("work_order_id", "removed_at");
CREATE INDEX "technician_performed_operations_technician_id_performed_at_idx" ON "technician_performed_operations"("technician_id", "performed_at");
CREATE INDEX "technician_performed_operations_operation_id_idx" ON "technician_performed_operations"("operation_id");
CREATE INDEX "technician_performed_operations_rate_id_idx" ON "technician_performed_operations"("rate_id");
CREATE INDEX "technician_performed_operations_created_by_user_id_idx" ON "technician_performed_operations"("created_by_user_id");
CREATE INDEX "technician_performed_operations_removed_by_user_id_idx" ON "technician_performed_operations"("removed_by_user_id");

ALTER TABLE "technician_performed_operations" ADD CONSTRAINT "technician_performed_operations_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "technician_performed_operations" ADD CONSTRAINT "technician_performed_operations_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_performed_operations" ADD CONSTRAINT "technician_performed_operations_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "technician_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_performed_operations" ADD CONSTRAINT "technician_performed_operations_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "technician_operation_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_performed_operations" ADD CONSTRAINT "technician_performed_operations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_performed_operations" ADD CONSTRAINT "technician_performed_operations_removed_by_user_id_fkey" FOREIGN KEY ("removed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
