CREATE TABLE "work_form_submissions" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "template_id" TEXT,
    "template_version" INTEGER NOT NULL,
    "template_name_snapshot" VARCHAR(160) NOT NULL,
    "schema_snapshot" JSONB NOT NULL,
    "values" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_by_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_form_submissions_work_order_id_key" ON "work_form_submissions"("work_order_id");
CREATE INDEX "work_form_submissions_template_id_idx" ON "work_form_submissions"("template_id");
CREATE INDEX "work_form_submissions_template_version_idx" ON "work_form_submissions"("template_version");
CREATE INDEX "work_form_submissions_submitted_by_user_id_idx" ON "work_form_submissions"("submitted_by_user_id");
CREATE INDEX "work_form_submissions_updated_by_user_id_idx" ON "work_form_submissions"("updated_by_user_id");
CREATE INDEX "work_form_submissions_created_at_idx" ON "work_form_submissions"("created_at");

ALTER TABLE "work_form_submissions"
  ADD CONSTRAINT "work_form_submissions_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_form_submissions"
  ADD CONSTRAINT "work_form_submissions_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "work_form_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_form_submissions"
  ADD CONSTRAINT "work_form_submissions_submitted_by_user_id_fkey"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_form_submissions"
  ADD CONSTRAINT "work_form_submissions_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
