export const WORKFLOW_EXECUTION_RESOURCE_TYPE = "work_workflow_execution";

export const WORKFLOW_EXECUTION_AUDIT_ACTIONS = {
  executionCompleted: "workflow.execution_completed",
  executionCreated: "workflow.execution_created",
  stageCompleted: "workflow.stage_completed",
  stageStarted: "workflow.stage_started",
} as const;

export const WORKFLOW_CONFLICT_MESSAGE = "Starea lucrării s-a modificat. Reîncarcă lucrarea și încearcă din nou.";
export const WORKFLOW_STALE_TEMPLATE_MESSAGE = "Fluxul acestui tip de lucrare a fost actualizat. Reîncarcă datele înainte de salvare.";
