ALTER TABLE "pickup_requests"
  ALTER COLUMN "doctor_id" DROP NOT NULL;

ALTER TABLE "pickup_requests"
  DROP CONSTRAINT IF EXISTS "pickup_requests_doctor_id_fkey";

ALTER TABLE "pickup_requests"
  ADD CONSTRAINT "pickup_requests_doctor_id_fkey"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
