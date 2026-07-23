ALTER TABLE "billing_document_lines"
  ADD COLUMN "work_created_at_snapshot" TIMESTAMP(3);

UPDATE "billing_document_lines" AS billing_line
SET "work_created_at_snapshot" = work_order."created_at"
FROM "work_orders" AS work_order
WHERE billing_line."work_order_id" = work_order."id";

ALTER TABLE "billing_document_lines"
  ALTER COLUMN "work_created_at_snapshot" SET NOT NULL;

CREATE INDEX "billing_document_lines_work_created_at_snapshot_idx"
  ON "billing_document_lines"("work_created_at_snapshot");
