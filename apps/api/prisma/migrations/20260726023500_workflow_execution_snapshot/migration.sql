-- WORKFLOW-002: workflow execution snapshots and linear stage transitions.
-- Non-destructive: adds execution tables without backfilling existing real works.

CREATE TYPE "WorkWorkflowExecutionStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "WorkStageExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "WorkStageEventType" AS ENUM ('WORKFLOW_CREATED', 'STAGE_STARTED', 'STAGE_COMPLETED', 'WORKFLOW_COMPLETED');

CREATE TABLE "work_workflow_executions" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "workflow_template_id" TEXT,
    "workflow_template_version" INTEGER NOT NULL,
    "workflow_name_snapshot" VARCHAR(160) NOT NULL,
    "status" "WorkWorkflowExecutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_stage_execution_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "work_workflow_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_stage_executions" (
    "id" TEXT NOT NULL,
    "workflow_execution_id" TEXT NOT NULL,
    "stage_definition_id" TEXT,
    "stage_key_snapshot" VARCHAR(64) NOT NULL,
    "stage_name_snapshot" VARCHAR(160) NOT NULL,
    "stage_description_snapshot" VARCHAR(1000),
    "sort_order" INTEGER NOT NULL,
    "estimated_duration_minutes_snapshot" INTEGER,
    "allowed_role_codes_snapshot" JSONB NOT NULL,
    "status" "WorkStageExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "started_by_user_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "work_stage_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_stage_events" (
    "id" TEXT NOT NULL,
    "workflow_execution_id" TEXT NOT NULL,
    "stage_execution_id" TEXT,
    "type" "WorkStageEventType" NOT NULL,
    "actor_user_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_stage_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_workflow_executions_work_order_id_key" ON "work_workflow_executions"("work_order_id");
CREATE UNIQUE INDEX "work_workflow_executions_current_stage_execution_id_key" ON "work_workflow_executions"("current_stage_execution_id");
CREATE INDEX "work_workflow_executions_workflow_template_id_idx" ON "work_workflow_executions"("workflow_template_id");
CREATE INDEX "work_workflow_executions_status_idx" ON "work_workflow_executions"("status");
CREATE INDEX "work_workflow_executions_started_at_idx" ON "work_workflow_executions"("started_at");
CREATE INDEX "work_workflow_executions_completed_at_idx" ON "work_workflow_executions"("completed_at");

CREATE UNIQUE INDEX "work_stage_executions_workflow_execution_id_sort_order_key" ON "work_stage_executions"("workflow_execution_id", "sort_order");
CREATE UNIQUE INDEX "work_stage_executions_workflow_execution_id_stage_key_snaps_key" ON "work_stage_executions"("workflow_execution_id", "stage_key_snapshot");
CREATE INDEX "work_stage_executions_workflow_execution_id_status_idx" ON "work_stage_executions"("workflow_execution_id", "status");
CREATE INDEX "work_stage_executions_status_idx" ON "work_stage_executions"("status");
CREATE INDEX "work_stage_executions_started_by_user_id_idx" ON "work_stage_executions"("started_by_user_id");
CREATE INDEX "work_stage_executions_completed_by_user_id_idx" ON "work_stage_executions"("completed_by_user_id");
CREATE INDEX "work_stage_executions_stage_definition_id_idx" ON "work_stage_executions"("stage_definition_id");

CREATE INDEX "work_stage_events_workflow_execution_id_occurred_at_idx" ON "work_stage_events"("workflow_execution_id", "occurred_at");
CREATE INDEX "work_stage_events_stage_execution_id_idx" ON "work_stage_events"("stage_execution_id");
CREATE INDEX "work_stage_events_type_idx" ON "work_stage_events"("type");
CREATE INDEX "work_stage_events_actor_user_id_idx" ON "work_stage_events"("actor_user_id");

ALTER TABLE "work_workflow_executions" ADD CONSTRAINT "work_workflow_executions_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_workflow_executions" ADD CONSTRAINT "work_workflow_executions_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_stage_executions" ADD CONSTRAINT "work_stage_executions_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "work_workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_stage_executions" ADD CONSTRAINT "work_stage_executions_stage_definition_id_fkey" FOREIGN KEY ("stage_definition_id") REFERENCES "workflow_stage_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_stage_executions" ADD CONSTRAINT "work_stage_executions_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_stage_executions" ADD CONSTRAINT "work_stage_executions_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_workflow_executions" ADD CONSTRAINT "work_workflow_executions_current_stage_execution_id_fkey" FOREIGN KEY ("current_stage_execution_id") REFERENCES "work_stage_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_stage_events" ADD CONSTRAINT "work_stage_events_workflow_execution_id_fkey" FOREIGN KEY ("workflow_execution_id") REFERENCES "work_workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_stage_events" ADD CONSTRAINT "work_stage_events_stage_execution_id_fkey" FOREIGN KEY ("stage_execution_id") REFERENCES "work_stage_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_stage_events" ADD CONSTRAINT "work_stage_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
