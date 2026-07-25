import type { Prisma } from "@prisma/client";

type TemplateWithWorkType = Prisma.WorkflowTemplateGetPayload<{
  include: {
    stages: true;
    workType: true;
  };
}>;

type TemplateSummaryRecord = Prisma.WorkflowTemplateGetPayload<{
  include: {
    _count: {
      select: {
        stages: true;
      };
    };
  };
}>;

type WorkTypeRecord = Pick<Prisma.WorkTypeGetPayload<object>, "code" | "id" | "isActive" | "name">;

export interface WorkflowWorkTypeView {
  readonly code: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface WorkflowStageView {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly estimatedDurationMinutes: number | null;
  readonly allowedRoleCodes: readonly string[];
  readonly isInitial: boolean;
  readonly isFinal: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkflowTemplateSummaryView {
  readonly id: string;
  readonly workTypeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly version: number;
  readonly status: string;
  readonly stageCount: number;
  readonly activatedAt: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkflowTemplateDetailView extends WorkflowTemplateSummaryView {
  readonly workType: WorkflowWorkTypeView;
  readonly stages: readonly WorkflowStageView[];
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly activatedByUserId: string | null;
  readonly archivedByUserId: string | null;
}

export interface WorkflowTemplateListView {
  readonly activeTemplateId: string | null;
  readonly templates: readonly WorkflowTemplateSummaryView[];
  readonly workType: WorkflowWorkTypeView;
}

export function toWorkflowWorkTypeView(workType: WorkTypeRecord): WorkflowWorkTypeView {
  return {
    code: workType.code,
    id: workType.id,
    isActive: workType.isActive,
    name: workType.name,
  };
}

export function toWorkflowTemplateSummaryView(template: TemplateSummaryRecord): WorkflowTemplateSummaryView {
  return {
    activatedAt: template.activatedAt?.toISOString() ?? null,
    archivedAt: template.archivedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    description: template.description,
    id: template.id,
    name: template.name,
    stageCount: template._count.stages,
    status: template.status,
    updatedAt: template.updatedAt.toISOString(),
    version: template.version,
    workTypeId: template.workTypeId,
  };
}

export function toWorkflowTemplateDetailView(template: TemplateWithWorkType): WorkflowTemplateDetailView {
  return {
    activatedAt: template.activatedAt?.toISOString() ?? null,
    activatedByUserId: template.activatedByUserId,
    archivedAt: template.archivedAt?.toISOString() ?? null,
    archivedByUserId: template.archivedByUserId,
    createdAt: template.createdAt.toISOString(),
    createdByUserId: template.createdByUserId,
    description: template.description,
    id: template.id,
    name: template.name,
    stageCount: template.stages.length,
    stages: template.stages.map((stage) => ({
      allowedRoleCodes: Array.isArray(stage.allowedRoleCodes) ? stage.allowedRoleCodes.filter((roleCode): roleCode is string => typeof roleCode === "string") : [],
      createdAt: stage.createdAt.toISOString(),
      description: stage.description,
      estimatedDurationMinutes: stage.estimatedDurationMinutes,
      id: stage.id,
      isFinal: stage.isFinal,
      isInitial: stage.isInitial,
      key: stage.key,
      name: stage.name,
      sortOrder: stage.sortOrder,
      updatedAt: stage.updatedAt.toISOString(),
    })),
    status: template.status,
    updatedAt: template.updatedAt.toISOString(),
    updatedByUserId: template.updatedByUserId,
    version: template.version,
    workType: toWorkflowWorkTypeView(template.workType),
    workTypeId: template.workTypeId,
  };
}
