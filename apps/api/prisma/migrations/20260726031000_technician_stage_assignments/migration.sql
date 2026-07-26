-- TECH-001: technician assignment for the current workflow stage.
-- Non-destructive: adds nullable assignment fields and assignment event types.

ALTER TYPE "WorkStageEventType" ADD VALUE 'STAGE_ASSIGNED';
ALTER TYPE "WorkStageEventType" ADD VALUE 'STAGE_REASSIGNED';
ALTER TYPE "WorkStageEventType" ADD VALUE 'STAGE_UNASSIGNED';

ALTER TABLE "work_stage_executions"
  ADD COLUMN "assigned_user_id" TEXT,
  ADD COLUMN "assigned_at" TIMESTAMP(3),
  ADD COLUMN "assigned_by_user_id" TEXT;

CREATE INDEX "work_stage_executions_assigned_user_id_idx" ON "work_stage_executions"("assigned_user_id");
CREATE INDEX "work_stage_executions_status_assigned_user_id_idx" ON "work_stage_executions"("status", "assigned_user_id");
CREATE INDEX "work_stage_executions_workflow_execution_id_assigned_user_i_idx" ON "work_stage_executions"("workflow_execution_id", "assigned_user_id");
CREATE INDEX "work_stage_executions_assigned_user_id_status_idx" ON "work_stage_executions"("assigned_user_id", "status");

ALTER TABLE "work_stage_executions" ADD CONSTRAINT "work_stage_executions_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_stage_executions" ADD CONSTRAINT "work_stage_executions_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
