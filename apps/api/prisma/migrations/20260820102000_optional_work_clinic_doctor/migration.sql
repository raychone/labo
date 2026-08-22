ALTER TABLE "work_orders" ALTER COLUMN "clinic_id" DROP NOT NULL;
ALTER TABLE "work_orders" ALTER COLUMN "doctor_id" DROP NOT NULL;

ALTER TABLE "work_cycles" ALTER COLUMN "clinic_id" DROP NOT NULL;
