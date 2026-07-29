-- PATIENTS-001: patient registry and nullable work-order relation.
-- Non-destructive: keeps work_orders.patient_name as the historical snapshot.

CREATE TYPE "PatientSex" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

CREATE TABLE "patients" (
  "id" TEXT NOT NULL,
  "first_name" VARCHAR(80) NOT NULL,
  "last_name" VARCHAR(80) NOT NULL,
  "normalized_first_name" VARCHAR(80) NOT NULL,
  "normalized_last_name" VARCHAR(80) NOT NULL,
  "birth_date" DATE,
  "sex" "PatientSex" NOT NULL DEFAULT 'UNSPECIFIED',
  "notes" VARCHAR(1000),
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "archived_at" TIMESTAMP(3),
  "archived_by_user_id" TEXT,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "patients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patients_first_name_not_blank" CHECK (length(btrim("first_name")) >= 1),
  CONSTRAINT "patients_last_name_not_blank" CHECK (length(btrim("last_name")) >= 1),
  CONSTRAINT "patients_notes_not_blank" CHECK ("notes" IS NULL OR length(btrim("notes")) > 0)
);

CREATE INDEX "patients_normalized_last_name_normalized_first_name_idx" ON "patients"("normalized_last_name", "normalized_first_name");
CREATE INDEX "patients_is_archived_idx" ON "patients"("is_archived");
CREATE INDEX "patients_created_at_idx" ON "patients"("created_at");
CREATE INDEX "patients_created_by_user_id_idx" ON "patients"("created_by_user_id");
CREATE INDEX "patients_updated_by_user_id_idx" ON "patients"("updated_by_user_id");
CREATE INDEX "patients_archived_by_user_id_idx" ON "patients"("archived_by_user_id");

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_archived_by_user_id_fkey"
  FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_orders" ADD COLUMN "patient_id" TEXT;
CREATE INDEX "work_orders_patient_id_idx" ON "work_orders"("patient_id");

WITH source_names AS (
  SELECT
    btrim("patient_name") AS original_name,
    regexp_replace(
      lower(
        translate(
          btrim("patient_name"),
          'ăâîșşțţĂÂÎȘŞȚŢ',
          'aaissttAAISSTT'
        )
      ),
      '\s+',
      ' ',
      'g'
    ) AS normalized_full_name
  FROM "work_orders"
  WHERE "patient_name" IS NOT NULL AND btrim("patient_name") <> ''
),
distinct_names AS (
  SELECT
    min(original_name) AS original_name,
    normalized_full_name
  FROM source_names
  GROUP BY normalized_full_name
),
split_names AS (
  SELECT
    'pat_backfill_' || md5(normalized_full_name) AS id,
    CASE
      WHEN strpos(original_name, ' ') = 0 THEN original_name
      ELSE btrim(left(original_name, length(original_name) - length(split_part(reverse(original_name), ' ', 1)) - 1))
    END AS first_name,
    CASE
      WHEN strpos(original_name, ' ') = 0 THEN 'Nespecificat'
      ELSE reverse(split_part(reverse(original_name), ' ', 1))
    END AS last_name,
    normalized_full_name
  FROM distinct_names
)
INSERT INTO "patients" (
  "id",
  "first_name",
  "last_name",
  "normalized_first_name",
  "normalized_last_name",
  "created_at",
  "updated_at"
)
SELECT
  id,
  left(first_name, 80),
  left(last_name, 80),
  left(
    regexp_replace(
      lower(translate(first_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT')),
      '\s+',
      ' ',
      'g'
    ),
    80
  ),
  left(
    regexp_replace(
      lower(translate(last_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT')),
      '\s+',
      ' ',
      'g'
    ),
    80
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM split_names
ON CONFLICT ("id") DO NOTHING;

WITH mapped AS (
  SELECT
    wo."id" AS work_order_id,
    'pat_backfill_' || md5(
      regexp_replace(
        lower(
          translate(
            btrim(wo."patient_name"),
            'ăâîșşțţĂÂÎȘŞȚŢ',
            'aaissttAAISSTT'
          )
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS patient_id
  FROM "work_orders" wo
  WHERE wo."patient_name" IS NOT NULL AND btrim(wo."patient_name") <> ''
)
UPDATE "work_orders" wo
SET "patient_id" = mapped.patient_id
FROM mapped
WHERE wo."id" = mapped.work_order_id
  AND wo."patient_id" IS NULL;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
