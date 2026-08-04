CREATE TYPE "BillingCompanyAssignmentStatus" AS ENUM ('RESOLVED', 'AMBIGUOUS', 'UNASSIGNED');

ALTER TABLE "billing_documents"
  ADD COLUMN "legal_entity_id" TEXT,
  ADD COLUMN "legal_entity_code_snapshot" VARCHAR(8),
  ADD COLUMN "legal_entity_name_snapshot" VARCHAR(160),
  ADD COLUMN "company_assignment_status" "BillingCompanyAssignmentStatus" NOT NULL DEFAULT 'UNASSIGNED',
  ADD COLUMN "company_assignment_notes" VARCHAR(1000);

ALTER TABLE "billing_document_lines"
  ADD COLUMN "work_cycle_id" TEXT,
  ADD COLUMN "legal_entity_id" TEXT,
  ADD COLUMN "legal_entity_code_snapshot" VARCHAR(8),
  ADD COLUMN "cycle_number_snapshot" INTEGER;

ALTER TABLE "payments"
  ADD COLUMN "legal_entity_id" TEXT;

ALTER TABLE "billing_series"
  ADD COLUMN "legal_entity_id" TEXT;

WITH unique_cycle AS (
  SELECT
    "work_order_id",
    MIN("id") AS "work_cycle_id",
    COUNT(*) AS "cycle_count"
  FROM "work_cycles"
  GROUP BY "work_order_id"
)
UPDATE "billing_document_lines" line
SET
  "work_cycle_id" = cycle."id",
  "legal_entity_id" = cycle."execution_legal_entity_id",
  "legal_entity_code_snapshot" = cycle."execution_legal_entity_code_snapshot",
  "cycle_number_snapshot" = cycle."cycle_number"
FROM unique_cycle resolved
JOIN "work_cycles" cycle ON cycle."id" = resolved."work_cycle_id"
WHERE line."work_order_id" = resolved."work_order_id"
  AND resolved."cycle_count" = 1
  AND line."work_cycle_id" IS NULL;

WITH document_company AS (
  SELECT
    document."id" AS "billing_document_id",
    COUNT(line."id") AS "line_count",
    COUNT(line."legal_entity_id") AS "assigned_line_count",
    COUNT(DISTINCT line."legal_entity_id") AS "company_count",
    MIN(line."legal_entity_id") AS "legal_entity_id"
  FROM "billing_documents" document
  LEFT JOIN "billing_document_lines" line ON line."billing_document_id" = document."id"
  GROUP BY document."id"
)
UPDATE "billing_documents" document
SET
  "legal_entity_id" = legal_entity."id",
  "legal_entity_code_snapshot" = legal_entity."code",
  "legal_entity_name_snapshot" = legal_entity."display_name",
  "company_assignment_status" = 'RESOLVED'::"BillingCompanyAssignmentStatus",
  "company_assignment_notes" = 'Backfilled from billing line work cycle execution company.'
FROM document_company resolved
JOIN "legal_entities" legal_entity ON legal_entity."id" = resolved."legal_entity_id"
WHERE document."id" = resolved."billing_document_id"
  AND resolved."line_count" > 0
  AND resolved."assigned_line_count" = resolved."line_count"
  AND resolved."company_count" = 1;

WITH document_company AS (
  SELECT
    document."id" AS "billing_document_id",
    COUNT(line."id") AS "line_count",
    COUNT(line."legal_entity_id") AS "assigned_line_count",
    COUNT(DISTINCT line."legal_entity_id") AS "company_count"
  FROM "billing_documents" document
  LEFT JOIN "billing_document_lines" line ON line."billing_document_id" = document."id"
  GROUP BY document."id"
)
UPDATE "billing_documents" document
SET
  "company_assignment_status" = 'AMBIGUOUS'::"BillingCompanyAssignmentStatus",
  "company_assignment_notes" = CASE
    WHEN resolved."line_count" = 0 THEN 'Legacy document has no billing lines; company cannot be derived.'
    WHEN resolved."assigned_line_count" < resolved."line_count" THEN 'One or more legacy lines cannot be matched to a single work cycle with execution company.'
    WHEN resolved."company_count" > 1 THEN 'Legacy document contains work cycles from multiple execution companies.'
    ELSE 'Legacy document company cannot be derived safely.'
  END
FROM document_company resolved
WHERE document."id" = resolved."billing_document_id"
  AND document."company_assignment_status" <> 'RESOLVED'::"BillingCompanyAssignmentStatus";

UPDATE "payments" payment
SET "legal_entity_id" = document."legal_entity_id"
FROM "billing_documents" document
WHERE payment."billing_document_id" = document."id"
  AND document."company_assignment_status" = 'RESOLVED'::"BillingCompanyAssignmentStatus"
  AND payment."legal_entity_id" IS NULL;

UPDATE "billing_series"
SET "is_active" = false
WHERE "legal_entity_id" IS NULL;

INSERT INTO "billing_series" (
  "id",
  "legal_entity_id",
  "document_type",
  "prefix",
  "current_number",
  "year",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  'series_' || lower(legal_entity."code") || '_' || lower(legacy."document_type"::text) || '_' || legacy."year" || '_' || lower(regexp_replace(legacy."prefix", '[^a-zA-Z0-9]+', '_', 'g')),
  legal_entity."id",
  legacy."document_type",
  legacy."prefix",
  GREATEST(
    legacy."current_number",
    COALESCE(MAX(document."number") FILTER (
      WHERE document."legal_entity_id" = legal_entity."id"
        AND document."type" = legacy."document_type"
        AND document."series" = legacy."prefix"
        AND EXTRACT(YEAR FROM document."issue_date")::INTEGER = legacy."year"
    ), 0)
  ),
  legacy."year",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "billing_series" legacy
CROSS JOIN "legal_entities" legal_entity
LEFT JOIN "billing_documents" document ON document."series" = legacy."prefix"
WHERE legacy."legal_entity_id" IS NULL
  AND legal_entity."code" IN ('NC', 'NG')
GROUP BY legal_entity."id", legal_entity."code", legacy."document_type", legacy."prefix", legacy."current_number", legacy."year"
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS "billing_documents_type_series_number_key";
DROP INDEX IF EXISTS "billing_document_lines_billing_document_id_work_order_id_key";
DROP INDEX IF EXISTS "billing_series_document_type_prefix_year_key";

CREATE UNIQUE INDEX "billing_documents_legal_entity_id_type_series_number_key"
  ON "billing_documents"("legal_entity_id", "type", "series", "number");
CREATE INDEX "billing_documents_legal_entity_id_status_idx" ON "billing_documents"("legal_entity_id", "status");
CREATE INDEX "billing_documents_legal_entity_id_issue_date_idx" ON "billing_documents"("legal_entity_id", "issue_date");
CREATE INDEX "billing_documents_company_assignment_status_idx" ON "billing_documents"("company_assignment_status");
CREATE INDEX "billing_document_lines_work_cycle_id_idx" ON "billing_document_lines"("work_cycle_id");
CREATE INDEX "billing_document_lines_legal_entity_id_idx" ON "billing_document_lines"("legal_entity_id");
CREATE UNIQUE INDEX "billing_document_lines_billing_document_id_work_cycle_id_key"
  ON "billing_document_lines"("billing_document_id", "work_cycle_id");
CREATE INDEX "payments_legal_entity_id_payment_date_idx" ON "payments"("legal_entity_id", "payment_date");
CREATE UNIQUE INDEX "billing_series_legal_entity_id_document_type_prefix_year_key"
  ON "billing_series"("legal_entity_id", "document_type", "prefix", "year");
CREATE INDEX "billing_series_legal_entity_id_document_type_is_active_idx"
  ON "billing_series"("legal_entity_id", "document_type", "is_active");

ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_document_lines" ADD CONSTRAINT "billing_document_lines_work_cycle_id_fkey" FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_document_lines" ADD CONSTRAINT "billing_document_lines_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_series" ADD CONSTRAINT "billing_series_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
