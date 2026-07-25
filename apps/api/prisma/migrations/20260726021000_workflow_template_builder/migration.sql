CREATE TYPE "WorkflowTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "workflow_templates" (
  "id" TEXT NOT NULL,
  "work_type_id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "version" INTEGER NOT NULL,
  "status" "WorkflowTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "activated_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "activated_by_user_id" TEXT,
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_stage_definitions" (
  "id" TEXT NOT NULL,
  "workflow_template_id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "sort_order" INTEGER NOT NULL,
  "estimated_duration_minutes" INTEGER,
  "allowed_role_codes" JSONB NOT NULL,
  "is_initial" BOOLEAN NOT NULL DEFAULT false,
  "is_final" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_stage_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_templates_work_type_id_version_key" ON "workflow_templates"("work_type_id", "version");
CREATE UNIQUE INDEX "workflow_templates_one_active_per_work_type_idx" ON "workflow_templates"("work_type_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "workflow_templates_work_type_id_idx" ON "workflow_templates"("work_type_id");
CREATE INDEX "workflow_templates_status_idx" ON "workflow_templates"("status");
CREATE INDEX "workflow_templates_work_type_id_status_idx" ON "workflow_templates"("work_type_id", "status");
CREATE INDEX "workflow_templates_created_by_user_id_idx" ON "workflow_templates"("created_by_user_id");
CREATE INDEX "workflow_templates_updated_by_user_id_idx" ON "workflow_templates"("updated_by_user_id");
CREATE INDEX "workflow_templates_activated_by_user_id_idx" ON "workflow_templates"("activated_by_user_id");
CREATE INDEX "workflow_templates_archived_by_user_id_idx" ON "workflow_templates"("archived_by_user_id");

CREATE UNIQUE INDEX "workflow_stage_definitions_workflow_template_id_key_key" ON "workflow_stage_definitions"("workflow_template_id", "key");
CREATE INDEX "workflow_stage_definitions_workflow_template_id_sort_order_idx" ON "workflow_stage_definitions"("workflow_template_id", "sort_order");

ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_activated_by_user_id_fkey" FOREIGN KEY ("activated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_stage_definitions" ADD CONSTRAINT "workflow_stage_definitions_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
