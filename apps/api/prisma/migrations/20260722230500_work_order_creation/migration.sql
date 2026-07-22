CREATE TYPE "WorkStatus" AS ENUM ('REGISTERED');
CREATE TYPE "WorkPriority" AS ENUM ('NORMAL', 'URGENT');

CREATE SEQUENCE "work_order_code_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE "work_orders" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(24) NOT NULL,
  "clinic_id" TEXT NOT NULL,
  "doctor_id" TEXT NOT NULL,
  "work_type_id" TEXT NOT NULL,
  "patient_name" VARCHAR(120) NOT NULL,
  "patient_reference" VARCHAR(80),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "base_unit_price_minor" INTEGER NOT NULL,
  "total_price_minor" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "priority" "WorkPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "WorkStatus" NOT NULL DEFAULT 'REGISTERED',
  "requested_delivery_date" TIMESTAMP(3) NOT NULL,
  "external_reference" VARCHAR(120),
  "internal_notes" VARCHAR(2000),
  "clinical_notes" VARCHAR(2000),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_orders_quantity_check" CHECK ("quantity" >= 1 AND "quantity" <= 99),
  CONSTRAINT "work_orders_base_unit_price_minor_check" CHECK ("base_unit_price_minor" >= 0),
  CONSTRAINT "work_orders_total_price_minor_check" CHECK ("total_price_minor" >= 0)
);

CREATE UNIQUE INDEX "work_orders_code_key" ON "work_orders"("code");
CREATE INDEX "work_orders_clinic_id_idx" ON "work_orders"("clinic_id");
CREATE INDEX "work_orders_doctor_id_idx" ON "work_orders"("doctor_id");
CREATE INDEX "work_orders_work_type_id_idx" ON "work_orders"("work_type_id");
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");
CREATE INDEX "work_orders_priority_idx" ON "work_orders"("priority");
CREATE INDEX "work_orders_requested_delivery_date_idx" ON "work_orders"("requested_delivery_date");
CREATE INDEX "work_orders_created_at_idx" ON "work_orders"("created_at");
CREATE INDEX "work_orders_updated_at_idx" ON "work_orders"("updated_at");
CREATE INDEX "work_orders_created_by_user_id_idx" ON "work_orders"("created_by_user_id");
CREATE INDEX "work_orders_updated_by_user_id_idx" ON "work_orders"("updated_by_user_id");

ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
