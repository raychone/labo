CREATE TYPE "WorkRealLabSheetStatus" AS ENUM ('IN_PROGRESS', 'COMPLETE', 'FINALIZED');

ALTER TABLE "work_form_submissions"
  ADD COLUMN "real_lab_sheet_status" "WorkRealLabSheetStatus",
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

UPDATE "work_form_submissions"
SET "real_lab_sheet_status" = CASE
  WHEN "finalized_at" IS NOT NULL THEN 'FINALIZED'::"WorkRealLabSheetStatus"
  ELSE 'IN_PROGRESS'::"WorkRealLabSheetStatus"
END
WHERE "template_kind" = 'REAL_LAB_SHEET'
  AND "real_lab_sheet_status" IS NULL;

CREATE INDEX "work_form_submissions_real_lab_sheet_status_idx" ON "work_form_submissions"("real_lab_sheet_status");
CREATE INDEX "work_form_submissions_revision_idx" ON "work_form_submissions"("revision");
