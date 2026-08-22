-- Create technician operation catalog separately from customer-facing work types.
CREATE TABLE "technician_operations" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "technician_operations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "technician_operation_rates" (
  "id" TEXT NOT NULL,
  "technician_id" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL,
  "rate_minor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'RON',
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until" TIMESTAMP(3),
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "technician_operation_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technician_operations_code_key" ON "technician_operations"("code");
CREATE INDEX "technician_operations_name_idx" ON "technician_operations"("name");
CREATE INDEX "technician_operations_is_active_idx" ON "technician_operations"("is_active");
CREATE INDEX "technician_operations_created_at_idx" ON "technician_operations"("created_at");
CREATE INDEX "technician_operations_updated_at_idx" ON "technician_operations"("updated_at");
CREATE INDEX "technician_operations_created_by_user_id_idx" ON "technician_operations"("created_by_user_id");
CREATE INDEX "technician_operations_updated_by_user_id_idx" ON "technician_operations"("updated_by_user_id");
CREATE INDEX "technician_operations_archived_by_user_id_idx" ON "technician_operations"("archived_by_user_id");

CREATE INDEX "technician_operation_rates_technician_id_idx" ON "technician_operation_rates"("technician_id");
CREATE INDEX "technician_operation_rates_operation_id_idx" ON "technician_operation_rates"("operation_id");
CREATE INDEX "technician_operation_rates_technician_id_operation_id_effective_from_idx" ON "technician_operation_rates"("technician_id", "operation_id", "effective_from");
CREATE INDEX "technician_operation_rates_technician_id_operation_id_valid_until_idx" ON "technician_operation_rates"("technician_id", "operation_id", "valid_until");
CREATE INDEX "technician_operation_rates_created_by_user_id_idx" ON "technician_operation_rates"("created_by_user_id");
CREATE UNIQUE INDEX "technician_operation_rates_open_unique" ON "technician_operation_rates"("technician_id", "operation_id") WHERE "valid_until" IS NULL;

ALTER TABLE "technician_operations" ADD CONSTRAINT "technician_operations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "technician_operations" ADD CONSTRAINT "technician_operations_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "technician_operations" ADD CONSTRAINT "technician_operations_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "technician_operation_rates" ADD CONSTRAINT "technician_operation_rates_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_operation_rates" ADD CONSTRAINT "technician_operation_rates_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "technician_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_operation_rates" ADD CONSTRAINT "technician_operation_rates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
