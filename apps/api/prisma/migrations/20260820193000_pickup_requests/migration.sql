CREATE TYPE "PickupScheduleType" AS ENUM ('EXACT', 'RANGE');
CREATE TYPE "PickupRequestStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

CREATE TABLE "pickup_requests" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "schedule_type" "PickupScheduleType" NOT NULL,
    "exact_time" VARCHAR(5),
    "window_start_time" VARCHAR(5),
    "window_end_time" VARCHAR(5),
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" VARCHAR(1000),
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "cancelled_by_user_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pickup_requests_clinic_id_idx" ON "pickup_requests"("clinic_id");
CREATE INDEX "pickup_requests_doctor_id_idx" ON "pickup_requests"("doctor_id");
CREATE INDEX "pickup_requests_status_scheduled_date_idx" ON "pickup_requests"("status", "scheduled_date");
CREATE INDEX "pickup_requests_scheduled_date_idx" ON "pickup_requests"("scheduled_date");
CREATE INDEX "pickup_requests_created_by_user_id_idx" ON "pickup_requests"("created_by_user_id");
CREATE INDEX "pickup_requests_updated_by_user_id_idx" ON "pickup_requests"("updated_by_user_id");
CREATE INDEX "pickup_requests_cancelled_by_user_id_idx" ON "pickup_requests"("cancelled_by_user_id");

ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
