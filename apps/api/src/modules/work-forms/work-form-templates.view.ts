import type { Prisma } from "@prisma/client";

type TemplateWithWorkType = Prisma.WorkFormTemplateGetPayload<{
  include: {
    fields: true;
    workType: true;
  };
}>;

type TemplateSummaryRecord = Prisma.WorkFormTemplateGetPayload<{
  include: {
    _count: {
      select: {
        fields: true;
      };
    };
  };
}>;

type WorkTypeRecord = Pick<Prisma.WorkTypeGetPayload<object>, "code" | "id" | "isActive" | "name">;

export interface WorkFormWorkTypeView {
  readonly code: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface WorkFormFieldView {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly helpText: string | null;
  readonly type: string;
  readonly required: boolean;
  readonly sortOrder: number;
  readonly placeholder: string | null;
  readonly defaultValue: unknown;
  readonly options: unknown;
  readonly validation: unknown;
  readonly isActive: boolean;
}

export interface WorkFormTemplateSummaryView {
  readonly id: string;
  readonly workTypeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly version: number;
  readonly status: string;
  readonly fieldCount: number;
  readonly activatedAt: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkFormTemplateDetailView extends WorkFormTemplateSummaryView {
  readonly workType: WorkFormWorkTypeView;
  readonly fields: readonly WorkFormFieldView[];
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly activatedByUserId: string | null;
  readonly archivedByUserId: string | null;
}

export interface WorkFormTemplateListView {
  readonly activeTemplateId: string | null;
  readonly templates: readonly WorkFormTemplateSummaryView[];
  readonly workType: WorkFormWorkTypeView;
}

export function toWorkFormWorkTypeView(workType: WorkTypeRecord): WorkFormWorkTypeView {
  return {
    code: workType.code,
    id: workType.id,
    isActive: workType.isActive,
    name: workType.name,
  };
}

export function toWorkFormTemplateSummaryView(template: TemplateSummaryRecord): WorkFormTemplateSummaryView {
  return {
    activatedAt: template.activatedAt?.toISOString() ?? null,
    archivedAt: template.archivedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    description: template.description,
    fieldCount: template._count.fields,
    id: template.id,
    name: template.name,
    status: template.status,
    updatedAt: template.updatedAt.toISOString(),
    version: template.version,
    workTypeId: template.workTypeId,
  };
}

export function toWorkFormTemplateDetailView(template: TemplateWithWorkType): WorkFormTemplateDetailView {
  return {
    activatedAt: template.activatedAt?.toISOString() ?? null,
    activatedByUserId: template.activatedByUserId,
    archivedAt: template.archivedAt?.toISOString() ?? null,
    archivedByUserId: template.archivedByUserId,
    createdAt: template.createdAt.toISOString(),
    createdByUserId: template.createdByUserId,
    description: template.description,
    fieldCount: template.fields.length,
    fields: template.fields.map((field) => ({
      defaultValue: field.defaultValue ?? null,
      helpText: field.helpText,
      id: field.id,
      isActive: field.isActive,
      key: field.key,
      label: field.label,
      options: field.options ?? [],
      placeholder: field.placeholder,
      required: field.required,
      sortOrder: field.sortOrder,
      type: field.type,
      validation: field.validation ?? {},
    })),
    id: template.id,
    name: template.name,
    status: template.status,
    updatedAt: template.updatedAt.toISOString(),
    updatedByUserId: template.updatedByUserId,
    version: template.version,
    workType: toWorkFormWorkTypeView(template.workType),
    workTypeId: template.workTypeId,
  };
}
