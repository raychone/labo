export const WORKFLOW_TEMPLATES_RESOURCE_TYPE = "workflow_template";

export const WORKFLOW_TEMPLATES_AUDIT_ACTIONS = {
  stagesReplaced: "workflow.stages_replaced",
  templateActivated: "workflow.template_activated",
  templateArchived: "workflow.template_archived",
  templateCloned: "workflow.template_cloned",
  templateCreated: "workflow.template_created",
  templateUpdated: "workflow.template_updated",
} as const;

export const WORKFLOW_STAGE_ROLE_CODES = ["MANAGER", "RECEPTIE", "LOGISTICA", "TEHNICIAN", "CURIER", "MEDIC"] as const;
export const WORKFLOW_STAGE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
export const MAX_WORKFLOW_STAGES = 50;
export const MAX_WORKFLOW_STAGE_DURATION_MINUTES = 43_200;

export const RESERVED_WORKFLOW_STAGE_KEYS = new Set([
  "id",
  "status",
  "workflow",
  "workflow_id",
  "workflow_template",
  "workflow_template_id",
  "work_order",
  "work_order_id",
  "work_type",
  "work_type_id",
  "created_at",
  "updated_at",
]);
