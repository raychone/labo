export const WORKFLOW_TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type WorkflowTemplateStatus = (typeof WORKFLOW_TEMPLATE_STATUSES)[number];

export const WORKFLOW_STAGE_ROLE_CODES = ["MANAGER", "RECEPTIE", "LOGISTICA", "TEHNICIAN", "CURIER", "MEDIC"] as const;
export type WorkflowStageRoleCode = (typeof WORKFLOW_STAGE_ROLE_CODES)[number];

export interface WorkflowWorkTypeSummary {
  readonly code: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface WorkflowStageDefinition {
  readonly id?: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly estimatedDurationMinutes: number | null;
  readonly allowedRoleCodes: readonly WorkflowStageRoleCode[];
  readonly isInitial: boolean;
  readonly isFinal: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface WorkflowTemplateSummary {
  readonly id: string;
  readonly workTypeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly version: number;
  readonly status: WorkflowTemplateStatus;
  readonly stageCount: number;
  readonly activatedAt: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkflowTemplateDetail extends WorkflowTemplateSummary {
  readonly workType: WorkflowWorkTypeSummary;
  readonly stages: readonly WorkflowStageDefinition[];
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly activatedByUserId: string | null;
  readonly archivedByUserId: string | null;
}

export interface WorkflowTemplateListResponse {
  readonly activeTemplateId: string | null;
  readonly templates: readonly WorkflowTemplateSummary[];
  readonly workType: WorkflowWorkTypeSummary;
}

export interface CreateWorkflowTemplateInput {
  readonly name: string;
  readonly description?: string | null;
  readonly cloneFromTemplateId?: string;
}

export interface UpdateWorkflowTemplateInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface ReplaceWorkflowStagesInput {
  readonly stages: readonly WorkflowStageDefinition[];
}

export interface WorkflowValidationResult {
  readonly errors: readonly string[];
  readonly ok: boolean;
}

export const WORKFLOW_STAGE_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export const RESERVED_WORKFLOW_STAGE_KEYS = [
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
] as const;

export const MAX_WORKFLOW_STAGES = 50;
export const MAX_WORKFLOW_STAGE_DURATION_MINUTES = 43_200;

export function isWorkflowStageKey(value: string): boolean {
  return WORKFLOW_STAGE_KEY_PATTERN.test(value) && !RESERVED_WORKFLOW_STAGE_KEYS.includes(value as never) && !hasMarkup(value);
}

export function isWorkflowStageRoleCode(value: string): value is WorkflowStageRoleCode {
  return WORKFLOW_STAGE_ROLE_CODES.includes(value as WorkflowStageRoleCode);
}

export function normalizeWorkflowStagesOrder(
  stages: readonly WorkflowStageDefinition[],
): readonly WorkflowStageDefinition[] {
  return stages
    .map((stage, index) => ({ index, stage }))
    .sort((left, right) => left.stage.sortOrder - right.stage.sortOrder || left.index - right.index)
    .map(({ stage }, index, orderedStages) => ({
      ...stage,
      isFinal: index === orderedStages.length - 1,
      isInitial: index === 0,
      sortOrder: index + 1,
    }));
}

export function formatWorkflowDuration(minutes: number | null, locale = "ro-RO"): string {
  if (minutes === null) {
    return "Fără durată estimată";
  }

  if (minutes < 60) {
    return `${new Intl.NumberFormat(locale).format(minutes)} min`;
  }

  if (minutes % 60 === 0) {
    return `${new Intl.NumberFormat(locale).format(minutes / 60)} h`;
  }

  return `${new Intl.NumberFormat(locale).format(minutes)} min`;
}

export function validateWorkflowRoleCodes(roleCodes: readonly string[]): WorkflowValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const roleCode of roleCodes) {
    if (!isWorkflowStageRoleCode(roleCode)) {
      errors.push(`Invalid role code: ${roleCode}.`);
    }

    if (seen.has(roleCode)) {
      errors.push(`Duplicate role code: ${roleCode}.`);
    }
    seen.add(roleCode);
  }

  if (roleCodes.length === 0) {
    errors.push("At least one role code is required.");
  }

  return { errors, ok: errors.length === 0 };
}

export function validateWorkflowInitialFinal(stages: readonly WorkflowStageDefinition[]): WorkflowValidationResult {
  const errors: string[] = [];
  const initialCount = stages.filter((stage) => stage.isInitial).length;
  const finalCount = stages.filter((stage) => stage.isFinal).length;

  if (initialCount !== 1) {
    errors.push("Workflow must have exactly one initial stage.");
  }

  if (finalCount !== 1) {
    errors.push("Workflow must have exactly one final stage.");
  }

  if (stages.length > 0) {
    if (!stages[0]?.isInitial) {
      errors.push("The first stage must be initial.");
    }

    if (!stages.at(-1)?.isFinal) {
      errors.push("The last stage must be final.");
    }
  }

  return { errors, ok: errors.length === 0 };
}

export function getChangedWorkflowStageKeys(
  before: readonly WorkflowStageDefinition[],
  after: readonly WorkflowStageDefinition[],
): readonly string[] {
  const byKey = new Map(before.map((stage) => [stage.key, stage]));
  const keys = new Set([...before.map((stage) => stage.key), ...after.map((stage) => stage.key)]);

  return [...keys]
    .filter((key) => JSON.stringify(byKey.get(key) ?? null) !== JSON.stringify(after.find((stage) => stage.key === key) ?? null))
    .sort();
}

function hasMarkup(value: string): boolean {
  return /[<>]/.test(value) || value.toLowerCase().includes("script");
}
