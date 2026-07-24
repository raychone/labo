CREATE TYPE "WorkFormTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "WorkFormFieldType" AS ENUM (
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'CHECKBOX',
  'RADIO',
  'SELECT',
  'MULTISELECT',
  'TOOTH',
  'SHADE'
);

CREATE TABLE "work_form_templates" (
  "id" TEXT NOT NULL,
  "work_type_id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "version" INTEGER NOT NULL,
  "status" "WorkFormTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "activated_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "activated_by_user_id" TEXT,
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "work_form_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_form_field_definitions" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "help_text" VARCHAR(500),
  "type" "WorkFormFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL,
  "placeholder" VARCHAR(160),
  "default_value" JSONB,
  "options" JSONB,
  "validation" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "work_form_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_form_templates_work_type_id_version_key" ON "work_form_templates"("work_type_id", "version");
CREATE UNIQUE INDEX "work_form_templates_one_active_per_work_type_idx" ON "work_form_templates"("work_type_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "work_form_templates_work_type_id_idx" ON "work_form_templates"("work_type_id");
CREATE INDEX "work_form_templates_status_idx" ON "work_form_templates"("status");
CREATE INDEX "work_form_templates_work_type_id_status_idx" ON "work_form_templates"("work_type_id", "status");
CREATE INDEX "work_form_templates_created_by_user_id_idx" ON "work_form_templates"("created_by_user_id");
CREATE INDEX "work_form_templates_updated_by_user_id_idx" ON "work_form_templates"("updated_by_user_id");
CREATE INDEX "work_form_templates_activated_by_user_id_idx" ON "work_form_templates"("activated_by_user_id");
CREATE INDEX "work_form_templates_archived_by_user_id_idx" ON "work_form_templates"("archived_by_user_id");

CREATE UNIQUE INDEX "work_form_field_definitions_template_id_key_key" ON "work_form_field_definitions"("template_id", "key");
CREATE INDEX "work_form_field_definitions_template_id_sort_order_idx" ON "work_form_field_definitions"("template_id", "sort_order");

ALTER TABLE "work_form_templates" ADD CONSTRAINT "work_form_templates_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_form_templates" ADD CONSTRAINT "work_form_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_form_templates" ADD CONSTRAINT "work_form_templates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_form_templates" ADD CONSTRAINT "work_form_templates_activated_by_user_id_fkey" FOREIGN KEY ("activated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_form_templates" ADD CONSTRAINT "work_form_templates_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_form_field_definitions" ADD CONSTRAINT "work_form_field_definitions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "work_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
