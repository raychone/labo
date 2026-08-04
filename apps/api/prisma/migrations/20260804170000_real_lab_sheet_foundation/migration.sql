CREATE TYPE "WorkFormTemplateKind" AS ENUM ('GENERIC', 'REAL_LAB_SHEET');

CREATE TYPE "WorkFormFieldRoleOwner" AS ENUM ('RECEPTION', 'TECHNICIAN', 'SHARED', 'SYSTEM');

CREATE TYPE "WorkFormFieldEditableUntil" AS ENUM ('CYCLE_FINALIZED', 'NEVER');

CREATE TYPE "WorkFormFieldCycleScope" AS ENUM ('WORK', 'CYCLE');

CREATE TYPE "WorkFormCopyToNextCyclePolicy" AS ENUM ('NEVER', 'SYSTEM_DERIVED', 'CONFIRM_ONLY');

CREATE TYPE "WorkFormFieldSourceKind" AS ENUM ('USER_ENTERED', 'REGISTRY_DERIVED', 'SYSTEM_DERIVED');

DROP INDEX IF EXISTS "work_form_templates_one_active_per_work_type_idx";
DROP INDEX IF EXISTS "work_form_templates_work_type_id_status_idx";
DROP INDEX IF EXISTS "work_form_templates_work_type_id_version_key";

ALTER TABLE "work_form_templates"
  ADD COLUMN "kind" "WorkFormTemplateKind" NOT NULL DEFAULT 'GENERIC';

ALTER TABLE "work_form_field_definitions"
  ADD COLUMN "section_key" VARCHAR(64),
  ADD COLUMN "section_label" VARCHAR(160),
  ADD COLUMN "role_owner" "WorkFormFieldRoleOwner" NOT NULL DEFAULT 'SHARED',
  ADD COLUMN "editable_until" "WorkFormFieldEditableUntil" NOT NULL DEFAULT 'CYCLE_FINALIZED',
  ADD COLUMN "cycle_scope" "WorkFormFieldCycleScope" NOT NULL DEFAULT 'CYCLE',
  ADD COLUMN "copy_to_next_cycle_policy" "WorkFormCopyToNextCyclePolicy" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN "printable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "source_kind" "WorkFormFieldSourceKind" NOT NULL DEFAULT 'USER_ENTERED';

DROP INDEX IF EXISTS "work_form_submissions_work_order_id_key";

ALTER TABLE "work_form_submissions"
  ADD COLUMN "work_cycle_id" TEXT,
  ADD COLUMN "template_kind" "WorkFormTemplateKind" NOT NULL DEFAULT 'GENERIC',
  ADD COLUMN "finalized_at" TIMESTAMP(3),
  ADD COLUMN "finalized_by_user_id" TEXT;

UPDATE "work_form_submissions" AS submission
SET "work_cycle_id" = work_order."active_cycle_id"
FROM "work_orders" AS work_order
WHERE submission."work_order_id" = work_order."id"
  AND submission."template_kind" = 'GENERIC'
  AND submission."work_cycle_id" IS NULL
  AND work_order."active_cycle_id" IS NOT NULL;

CREATE UNIQUE INDEX "work_form_templates_work_type_id_kind_version_key" ON "work_form_templates"("work_type_id", "kind", "version");
CREATE UNIQUE INDEX "work_form_templates_one_active_per_work_type_kind_idx" ON "work_form_templates"("work_type_id", "kind") WHERE "status" = 'ACTIVE';
CREATE INDEX "work_form_templates_kind_idx" ON "work_form_templates"("kind");
CREATE INDEX "work_form_templates_work_type_id_kind_status_idx" ON "work_form_templates"("work_type_id", "kind", "status");

CREATE UNIQUE INDEX "work_form_submissions_one_generic_per_work_idx" ON "work_form_submissions"("work_order_id") WHERE "template_kind" = 'GENERIC';
CREATE UNIQUE INDEX "work_form_submissions_one_real_sheet_per_cycle_idx" ON "work_form_submissions"("work_cycle_id") WHERE "template_kind" = 'REAL_LAB_SHEET' AND "work_cycle_id" IS NOT NULL;
CREATE INDEX "work_form_submissions_work_order_id_template_kind_idx" ON "work_form_submissions"("work_order_id", "template_kind");
CREATE INDEX "work_form_submissions_work_cycle_id_idx" ON "work_form_submissions"("work_cycle_id");
CREATE INDEX "work_form_submissions_template_kind_idx" ON "work_form_submissions"("template_kind");
CREATE INDEX "work_form_submissions_finalized_by_user_id_idx" ON "work_form_submissions"("finalized_by_user_id");
CREATE INDEX "work_form_submissions_finalized_at_idx" ON "work_form_submissions"("finalized_at");

ALTER TABLE "work_form_submissions"
  ADD CONSTRAINT "work_form_submissions_work_cycle_id_fkey"
  FOREIGN KEY ("work_cycle_id") REFERENCES "work_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_form_submissions"
  ADD CONSTRAINT "work_form_submissions_finalized_by_user_id_fkey"
  FOREIGN KEY ("finalized_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
