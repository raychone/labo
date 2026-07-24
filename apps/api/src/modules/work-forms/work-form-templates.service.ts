import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkFormTemplateStatus } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateWorkFormTemplateDto, ReplaceWorkFormFieldsDto, UpdateWorkFormTemplateDto } from "./dto/work-form-templates.dto.js";
import { WorkFormTemplateValidationService, type NormalizedWorkFormField } from "./work-form-template-validation.service.js";
import { WORK_FORMS_AUDIT_ACTIONS, WORK_FORMS_RESOURCE_TYPE } from "./work-forms.constants.js";
import {
  type WorkFormTemplateDetailView,
  type WorkFormTemplateListView,
  toWorkFormTemplateDetailView,
  toWorkFormTemplateSummaryView,
  toWorkFormWorkTypeView,
} from "./work-form-templates.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type WorkFormTx = Prisma.TransactionClient;

const templateDetailInclude = {
  fields: {
    orderBy: {
      sortOrder: "asc",
    },
  },
  workType: true,
} as const;

@Injectable()
export class WorkFormTemplatesService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkFormTemplateValidationService) private readonly validationService: WorkFormTemplateValidationService,
  ) {}

  public async listTemplates(workTypeId: string): Promise<WorkFormTemplateListView> {
    const workType = await this.findWorkTypeOrThrow(workTypeId);
    const templates = await this.prisma.workFormTemplate.findMany({
      include: {
        _count: {
          select: {
            fields: true,
          },
        },
      },
      orderBy: {
        version: "desc",
      },
      where: {
        workTypeId,
      },
    });

    return {
      activeTemplateId: templates.find((template) => template.status === "ACTIVE")?.id ?? null,
      templates: templates.map(toWorkFormTemplateSummaryView),
      workType: toWorkFormWorkTypeView(workType),
    };
  }

  public async getActiveTemplate(workTypeId: string): Promise<WorkFormTemplateDetailView | null> {
    await this.findWorkTypeOrThrow(workTypeId);
    const template = await this.prisma.workFormTemplate.findFirst({
      include: templateDetailInclude,
      where: {
        status: "ACTIVE",
        workTypeId,
      },
    });

    return template ? toWorkFormTemplateDetailView(template) : null;
  }

  public async getTemplate(templateId: string): Promise<WorkFormTemplateDetailView> {
    return toWorkFormTemplateDetailView(await this.findTemplateOrThrow(templateId));
  }

  public async createTemplate(context: ActorContext, workTypeId: string, dto: CreateWorkFormTemplateDto): Promise<WorkFormTemplateDetailView> {
    const template = await this.prisma.$transaction(async (tx) => {
      const workType = await this.findWorkTypeOrThrow(workTypeId, tx);
      this.ensureWorkTypeActive(workType.isActive);
      await this.lockWorkTypeTemplates(tx, workTypeId);

      const version = await this.getNextVersion(tx, workTypeId);
      const created = await tx.workFormTemplate.create({
        data: {
          createdByUserId: context.actorUserId,
          description: dto.description ?? null,
          name: dto.name,
          updatedByUserId: context.actorUserId,
          version,
          workTypeId,
        },
      });

      if (dto.cloneFromTemplateId) {
        const source = await this.findTemplateOrThrow(dto.cloneFromTemplateId, tx);
        if (source.workTypeId !== workTypeId) {
          throw new BadRequestException("Template can only be cloned within the same work type.");
        }
        await this.copyFields(tx, source.id, created.id);
      }

      await this.recordAudit(tx, context, WORK_FORMS_AUDIT_ACTIONS.templateCreated, created.id, {
        clonedFromTemplateId: dto.cloneFromTemplateId,
        status: created.status,
        templateId: created.id,
        version: created.version,
        workTypeId,
      });

      return this.findTemplateOrThrow(created.id, tx);
    });

    return toWorkFormTemplateDetailView(template);
  }

  public async updateTemplate(context: ActorContext, templateId: string, dto: UpdateWorkFormTemplateDto): Promise<WorkFormTemplateDetailView> {
    const before = await this.findTemplateOrThrow(templateId);
    this.ensureDraft(before.status);
    this.ensureWorkTypeActive(before.workType.isActive);

    const data: Prisma.WorkFormTemplateUncheckedUpdateInput = {
      updatedByUserId: context.actorUserId,
    };
    const changedFields: string[] = [];

    if (dto.name !== undefined && dto.name !== before.name) {
      data.name = dto.name;
      changedFields.push("name");
    }

    if (dto.description !== undefined && dto.description !== before.description) {
      data.description = dto.description;
      changedFields.push("description");
    }

    if (changedFields.length === 0) {
      throw new BadRequestException("No template fields were provided.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const template = await tx.workFormTemplate.update({
        data,
        include: templateDetailInclude,
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORK_FORMS_AUDIT_ACTIONS.templateUpdated, templateId, {
        changedFields,
        status: template.status,
        templateId,
        version: template.version,
        workTypeId: template.workTypeId,
      });

      return template;
    });

    return toWorkFormTemplateDetailView(updated);
  }

  public async replaceFields(context: ActorContext, templateId: string, dto: ReplaceWorkFormFieldsDto): Promise<WorkFormTemplateDetailView> {
    const template = await this.findTemplateOrThrow(templateId);
    this.ensureDraft(template.status);
    this.ensureWorkTypeActive(template.workType.isActive);
    const fields = this.validationService.normalizeFields(dto.fields);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workFormFieldDefinition.deleteMany({
        where: {
          templateId,
        },
      });
      await this.createFields(tx, templateId, fields);
      await tx.workFormTemplate.update({
        data: {
          updatedByUserId: context.actorUserId,
        },
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORK_FORMS_AUDIT_ACTIONS.fieldsReplaced, templateId, {
        fieldKeys: fields.map((field) => field.key),
        status: template.status,
        templateId,
        version: template.version,
        workTypeId: template.workTypeId,
      });

      return this.findTemplateOrThrow(templateId, tx);
    });

    return toWorkFormTemplateDetailView(updated);
  }

  public async activateTemplate(context: ActorContext, templateId: string): Promise<WorkFormTemplateDetailView> {
    const activated = await this.prisma.$transaction(async (tx) => {
      const template = await this.findTemplateOrThrow(templateId, tx);
      this.ensureDraft(template.status);
      this.ensureWorkTypeActive(template.workType.isActive);
      this.validationService.ensureTemplateCanActivate(template.fields);
      await this.lockWorkTypeTemplates(tx, template.workTypeId);

      const now = new Date();
      await tx.workFormTemplate.updateMany({
        data: {
          archivedAt: now,
          archivedByUserId: context.actorUserId,
          status: WorkFormTemplateStatus.ARCHIVED,
          updatedByUserId: context.actorUserId,
        },
        where: {
          id: {
            not: templateId,
          },
          status: WorkFormTemplateStatus.ACTIVE,
          workTypeId: template.workTypeId,
        },
      });

      const next = await tx.workFormTemplate.update({
        data: {
          activatedAt: now,
          activatedByUserId: context.actorUserId,
          status: WorkFormTemplateStatus.ACTIVE,
          updatedByUserId: context.actorUserId,
        },
        include: templateDetailInclude,
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORK_FORMS_AUDIT_ACTIONS.templateActivated, templateId, {
        fieldKeys: next.fields.map((field) => field.key),
        status: next.status,
        templateId,
        version: next.version,
        workTypeId: next.workTypeId,
      });

      return next;
    });

    return toWorkFormTemplateDetailView(activated);
  }

  public async archiveTemplate(context: ActorContext, templateId: string): Promise<WorkFormTemplateDetailView> {
    const archived = await this.prisma.$transaction(async (tx) => {
      const template = await this.findTemplateOrThrow(templateId, tx);
      if (template.status === "ARCHIVED") {
        return template;
      }

      if (template.status !== "DRAFT") {
        throw new BadRequestException("Only draft templates can be manually archived.");
      }

      const next = await tx.workFormTemplate.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          status: WorkFormTemplateStatus.ARCHIVED,
          updatedByUserId: context.actorUserId,
        },
        include: templateDetailInclude,
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORK_FORMS_AUDIT_ACTIONS.templateArchived, templateId, {
        status: next.status,
        templateId,
        version: next.version,
        workTypeId: next.workTypeId,
      });

      return next;
    });

    return toWorkFormTemplateDetailView(archived);
  }

  public async cloneTemplate(context: ActorContext, templateId: string): Promise<WorkFormTemplateDetailView> {
    const cloned = await this.prisma.$transaction(async (tx) => {
      const source = await this.findTemplateOrThrow(templateId, tx);
      this.ensureWorkTypeActive(source.workType.isActive);
      await this.lockWorkTypeTemplates(tx, source.workTypeId);

      const clone = await tx.workFormTemplate.create({
        data: {
          createdByUserId: context.actorUserId,
          description: source.description,
          name: `${source.name} copie`,
          updatedByUserId: context.actorUserId,
          version: await this.getNextVersion(tx, source.workTypeId),
          workTypeId: source.workTypeId,
        },
      });
      await this.copyFields(tx, source.id, clone.id);

      await this.recordAudit(tx, context, WORK_FORMS_AUDIT_ACTIONS.templateCloned, clone.id, {
        clonedFromTemplateId: source.id,
        status: clone.status,
        templateId: clone.id,
        version: clone.version,
        workTypeId: clone.workTypeId,
      });

      return this.findTemplateOrThrow(clone.id, tx);
    });

    return toWorkFormTemplateDetailView(cloned);
  }

  private async findWorkTypeOrThrow(workTypeId: string, tx: WorkFormTx | PrismaService = this.prisma) {
    const workType = await tx.workType.findUnique({
      where: {
        id: workTypeId,
      },
    });

    if (!workType) {
      throw new NotFoundException("Work type was not found.");
    }

    return workType;
  }

  private async findTemplateOrThrow(templateId: string, tx: WorkFormTx | PrismaService = this.prisma) {
    const template = await tx.workFormTemplate.findUnique({
      include: templateDetailInclude,
      where: {
        id: templateId,
      },
    });

    if (!template) {
      throw new NotFoundException("Work form template was not found.");
    }

    return template;
  }

  private async lockWorkTypeTemplates(tx: WorkFormTx, workTypeId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workTypeId}))`;
  }

  private async getNextVersion(tx: WorkFormTx, workTypeId: string): Promise<number> {
    const result = await tx.workFormTemplate.aggregate({
      _max: {
        version: true,
      },
      where: {
        workTypeId,
      },
    });

    return (result._max.version ?? 0) + 1;
  }

  private ensureDraft(status: WorkFormTemplateStatus): void {
    if (status !== "DRAFT") {
      throw new BadRequestException("Only draft templates can be edited.");
    }
  }

  private ensureWorkTypeActive(isActive: boolean): void {
    if (!isActive) {
      throw new BadRequestException("Archived work types must be restored before managing templates.");
    }
  }

  private async copyFields(tx: WorkFormTx, sourceTemplateId: string, targetTemplateId: string): Promise<void> {
    const fields = await tx.workFormFieldDefinition.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      where: {
        templateId: sourceTemplateId,
      },
    });

    await tx.workFormFieldDefinition.createMany({
      data: fields.map((field) => this.toCreateManyFieldInput({
        defaultValue: field.defaultValue ?? undefined,
        helpText: field.helpText,
        isActive: field.isActive,
        key: field.key,
        label: field.label,
        options: field.options ?? undefined,
        placeholder: field.placeholder,
        required: field.required,
        sortOrder: field.sortOrder,
        templateId: targetTemplateId,
        type: field.type,
        validation: field.validation ?? undefined,
      })),
    });
  }

  private async createFields(tx: WorkFormTx, templateId: string, fields: readonly NormalizedWorkFormField[]): Promise<void> {
    if (fields.length === 0) {
      return;
    }

    await tx.workFormFieldDefinition.createMany({
      data: fields.map((field) => this.toCreateManyFieldInput({
        defaultValue: field.defaultValue,
        helpText: field.helpText,
        key: field.key,
        label: field.label,
        options: field.options,
        placeholder: field.placeholder,
        required: field.required,
        sortOrder: field.sortOrder,
        templateId,
        type: field.type,
        validation: field.validation,
      })),
    });
  }

  private toCreateManyFieldInput(input: {
    readonly defaultValue: Prisma.InputJsonValue | undefined;
    readonly helpText: string | null;
    readonly isActive?: boolean;
    readonly key: string;
    readonly label: string;
    readonly options: Prisma.InputJsonValue | undefined;
    readonly placeholder: string | null;
    readonly required: boolean;
    readonly sortOrder: number;
    readonly templateId: string;
    readonly type: Prisma.WorkFormFieldDefinitionCreateManyInput["type"];
    readonly validation: Prisma.InputJsonValue | undefined;
  }): Prisma.WorkFormFieldDefinitionCreateManyInput {
    const data: Prisma.WorkFormFieldDefinitionCreateManyInput = {
      helpText: input.helpText,
      key: input.key,
      label: input.label,
      placeholder: input.placeholder,
      required: input.required,
      sortOrder: input.sortOrder,
      templateId: input.templateId,
      type: input.type,
    };

    if (input.defaultValue !== undefined) {
      data.defaultValue = input.defaultValue;
    }

    if (input.options !== undefined) {
      data.options = input.options;
    }

    if (input.validation !== undefined) {
      data.validation = input.validation;
    }

    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }

    return data;
  }

  private async recordAudit(
    tx: WorkFormTx,
    context: ActorContext,
    action: string,
    resourceId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action,
      actorUserId: context.actorUserId,
      metadata,
      resourceId,
      resourceType: WORK_FORMS_RESOURCE_TYPE,
    };

    if (context.requestMetadata.ipAddress) {
      data.ipAddress = context.requestMetadata.ipAddress;
    }

    if (context.requestMetadata.userAgent) {
      data.userAgent = context.requestMetadata.userAgent;
    }

    await tx.auditLog.create({ data });
  }
}
