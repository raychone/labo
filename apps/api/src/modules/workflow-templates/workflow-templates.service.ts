import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkflowTemplateStatus } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateWorkflowTemplateDto, ReplaceWorkflowStagesDto, UpdateWorkflowTemplateDto } from "./dto/workflow-templates.dto.js";
import { WorkflowTemplateValidationService, type NormalizedWorkflowStage } from "./workflow-template-validation.service.js";
import { WORKFLOW_TEMPLATES_AUDIT_ACTIONS, WORKFLOW_TEMPLATES_RESOURCE_TYPE } from "./workflow-templates.constants.js";
import {
  type WorkflowTemplateDetailView,
  type WorkflowTemplateListView,
  toWorkflowTemplateDetailView,
  toWorkflowTemplateSummaryView,
  toWorkflowWorkTypeView,
} from "./workflow-templates.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type WorkflowTx = Prisma.TransactionClient;

const templateDetailInclude = {
  stages: {
    orderBy: {
      sortOrder: "asc",
    },
  },
  workType: true,
} as const;

@Injectable()
export class WorkflowTemplatesService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WorkflowTemplateValidationService) private readonly validationService: WorkflowTemplateValidationService,
  ) {}

  public async listTemplates(workTypeId: string): Promise<WorkflowTemplateListView> {
    const workType = await this.findWorkTypeOrThrow(workTypeId);
    const templates = await this.prisma.workflowTemplate.findMany({
      include: {
        _count: {
          select: {
            stages: true,
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
      templates: templates.map(toWorkflowTemplateSummaryView),
      workType: toWorkflowWorkTypeView(workType),
    };
  }

  public async getActiveTemplate(workTypeId: string): Promise<WorkflowTemplateDetailView | null> {
    await this.findWorkTypeOrThrow(workTypeId);
    const template = await this.prisma.workflowTemplate.findFirst({
      include: templateDetailInclude,
      where: {
        status: "ACTIVE",
        workTypeId,
      },
    });

    return template ? toWorkflowTemplateDetailView(template) : null;
  }

  public async getTemplate(templateId: string): Promise<WorkflowTemplateDetailView> {
    return toWorkflowTemplateDetailView(await this.findTemplateOrThrow(templateId));
  }

  public async createTemplate(context: ActorContext, workTypeId: string, dto: CreateWorkflowTemplateDto): Promise<WorkflowTemplateDetailView> {
    const template = await this.prisma.$transaction(async (tx) => {
      const workType = await this.findWorkTypeOrThrow(workTypeId, tx);
      this.ensureWorkTypeActive(workType.isActive);
      await this.lockWorkTypeTemplates(tx, workTypeId);

      const created = await tx.workflowTemplate.create({
        data: {
          createdByUserId: context.actorUserId,
          description: dto.description ?? null,
          name: dto.name,
          updatedByUserId: context.actorUserId,
          version: await this.getNextVersion(tx, workTypeId),
          workTypeId,
        },
      });

      if (dto.cloneFromTemplateId) {
        const source = await this.findTemplateOrThrow(dto.cloneFromTemplateId, tx);
        if (source.workTypeId !== workTypeId) {
          throw new BadRequestException("Workflow can only be cloned within the same work type.");
        }
        await this.copyStages(tx, source.id, created.id);
      }

      await this.recordAudit(tx, context, WORKFLOW_TEMPLATES_AUDIT_ACTIONS.templateCreated, created.id, {
        clonedFromTemplateId: dto.cloneFromTemplateId,
        status: created.status,
        workflowTemplateId: created.id,
        version: created.version,
        workTypeId,
      });

      return this.findTemplateOrThrow(created.id, tx);
    });

    return toWorkflowTemplateDetailView(template);
  }

  public async updateTemplate(context: ActorContext, templateId: string, dto: UpdateWorkflowTemplateDto): Promise<WorkflowTemplateDetailView> {
    const before = await this.findTemplateOrThrow(templateId);
    this.ensureDraft(before.status);
    this.ensureWorkTypeActive(before.workType.isActive);

    const data: Prisma.WorkflowTemplateUncheckedUpdateInput = {
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
      throw new BadRequestException("No workflow fields were provided.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const template = await tx.workflowTemplate.update({
        data,
        include: templateDetailInclude,
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORKFLOW_TEMPLATES_AUDIT_ACTIONS.templateUpdated, templateId, {
        changedFields,
        status: template.status,
        workflowTemplateId: templateId,
        version: template.version,
        workTypeId: template.workTypeId,
      });

      return template;
    });

    return toWorkflowTemplateDetailView(updated);
  }

  public async replaceStages(context: ActorContext, templateId: string, dto: ReplaceWorkflowStagesDto): Promise<WorkflowTemplateDetailView> {
    const template = await this.findTemplateOrThrow(templateId);
    this.ensureDraft(template.status);
    this.ensureWorkTypeActive(template.workType.isActive);
    const stages = this.validationService.normalizeStages(dto.stages);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.workflowStageDefinition.deleteMany({
        where: {
          workflowTemplateId: templateId,
        },
      });
      await this.createStages(tx, templateId, stages);
      await tx.workflowTemplate.update({
        data: {
          updatedByUserId: context.actorUserId,
        },
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORKFLOW_TEMPLATES_AUDIT_ACTIONS.stagesReplaced, templateId, {
        stageKeys: stages.map((stage) => stage.key),
        status: template.status,
        workflowTemplateId: templateId,
        version: template.version,
        workTypeId: template.workTypeId,
      });

      return this.findTemplateOrThrow(templateId, tx);
    });

    return toWorkflowTemplateDetailView(updated);
  }

  public async activateTemplate(context: ActorContext, templateId: string): Promise<WorkflowTemplateDetailView> {
    const activated = await this.prisma.$transaction(async (tx) => {
      const template = await this.findTemplateOrThrow(templateId, tx);
      this.ensureDraft(template.status);
      this.ensureWorkTypeActive(template.workType.isActive);
      await this.lockWorkTypeTemplates(tx, template.workTypeId);
      this.validationService.ensureTemplateCanActivate(template.stages);

      const now = new Date();
      await tx.workflowTemplate.updateMany({
        data: {
          archivedAt: now,
          archivedByUserId: context.actorUserId,
          status: WorkflowTemplateStatus.ARCHIVED,
          updatedByUserId: context.actorUserId,
        },
        where: {
          id: {
            not: templateId,
          },
          status: WorkflowTemplateStatus.ACTIVE,
          workTypeId: template.workTypeId,
        },
      });

      const next = await tx.workflowTemplate.update({
        data: {
          activatedAt: now,
          activatedByUserId: context.actorUserId,
          status: WorkflowTemplateStatus.ACTIVE,
          updatedByUserId: context.actorUserId,
        },
        include: templateDetailInclude,
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORKFLOW_TEMPLATES_AUDIT_ACTIONS.templateActivated, templateId, {
        stageKeys: next.stages.map((stage) => stage.key),
        status: next.status,
        workflowTemplateId: templateId,
        version: next.version,
        workTypeId: next.workTypeId,
      });

      return next;
    });

    return toWorkflowTemplateDetailView(activated);
  }

  public async archiveTemplate(context: ActorContext, templateId: string): Promise<WorkflowTemplateDetailView> {
    const archived = await this.prisma.$transaction(async (tx) => {
      const template = await this.findTemplateOrThrow(templateId, tx);
      if (template.status === "ARCHIVED") {
        return template;
      }

      if (!template.workType.isActive && template.status === "DRAFT") {
        throw new BadRequestException("Archived work types must be restored before managing draft workflows.");
      }

      const next = await tx.workflowTemplate.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          status: WorkflowTemplateStatus.ARCHIVED,
          updatedByUserId: context.actorUserId,
        },
        include: templateDetailInclude,
        where: {
          id: templateId,
        },
      });

      await this.recordAudit(tx, context, WORKFLOW_TEMPLATES_AUDIT_ACTIONS.templateArchived, templateId, {
        status: next.status,
        workflowTemplateId: templateId,
        version: next.version,
        workTypeId: next.workTypeId,
      });

      return next;
    });

    return toWorkflowTemplateDetailView(archived);
  }

  public async cloneTemplate(context: ActorContext, templateId: string): Promise<WorkflowTemplateDetailView> {
    const cloned = await this.prisma.$transaction(async (tx) => {
      const source = await this.findTemplateOrThrow(templateId, tx);
      this.ensureWorkTypeActive(source.workType.isActive);
      await this.lockWorkTypeTemplates(tx, source.workTypeId);

      const clone = await tx.workflowTemplate.create({
        data: {
          createdByUserId: context.actorUserId,
          description: source.description,
          name: `${source.name} copie`,
          updatedByUserId: context.actorUserId,
          version: await this.getNextVersion(tx, source.workTypeId),
          workTypeId: source.workTypeId,
        },
      });
      await this.copyStages(tx, source.id, clone.id);

      await this.recordAudit(tx, context, WORKFLOW_TEMPLATES_AUDIT_ACTIONS.templateCloned, clone.id, {
        clonedFromTemplateId: source.id,
        status: clone.status,
        workflowTemplateId: clone.id,
        version: clone.version,
        workTypeId: clone.workTypeId,
      });

      return this.findTemplateOrThrow(clone.id, tx);
    });

    return toWorkflowTemplateDetailView(cloned);
  }

  private async findWorkTypeOrThrow(workTypeId: string, tx: WorkflowTx | PrismaService = this.prisma) {
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

  private async findTemplateOrThrow(templateId: string, tx: WorkflowTx | PrismaService = this.prisma) {
    const template = await tx.workflowTemplate.findUnique({
      include: templateDetailInclude,
      where: {
        id: templateId,
      },
    });

    if (!template) {
      throw new NotFoundException("Workflow template was not found.");
    }

    return template;
  }

  private async lockWorkTypeTemplates(tx: WorkflowTx, workTypeId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workTypeId}))`;
  }

  private async getNextVersion(tx: WorkflowTx, workTypeId: string): Promise<number> {
    const result = await tx.workflowTemplate.aggregate({
      _max: {
        version: true,
      },
      where: {
        workTypeId,
      },
    });

    return (result._max.version ?? 0) + 1;
  }

  private ensureDraft(status: WorkflowTemplateStatus): void {
    if (status !== "DRAFT") {
      throw new BadRequestException("Only draft workflow templates can be edited.");
    }
  }

  private ensureWorkTypeActive(isActive: boolean): void {
    if (!isActive) {
      throw new BadRequestException("Archived work types must be restored before managing workflows.");
    }
  }

  private async copyStages(tx: WorkflowTx, sourceTemplateId: string, targetTemplateId: string): Promise<void> {
    const stages = await tx.workflowStageDefinition.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      where: {
        workflowTemplateId: sourceTemplateId,
      },
    });

    await tx.workflowStageDefinition.createMany({
      data: stages.map((stage) => ({
        allowedRoleCodes: stage.allowedRoleCodes ?? [],
        description: stage.description,
        estimatedDurationMinutes: stage.estimatedDurationMinutes,
        isFinal: stage.isFinal,
        isInitial: stage.isInitial,
        key: stage.key,
        name: stage.name,
        sortOrder: stage.sortOrder,
        workflowTemplateId: targetTemplateId,
      })),
    });
  }

  private async createStages(tx: WorkflowTx, templateId: string, stages: readonly NormalizedWorkflowStage[]): Promise<void> {
    if (stages.length === 0) {
      return;
    }

    await tx.workflowStageDefinition.createMany({
      data: stages.map((stage) => ({
        allowedRoleCodes: [...stage.allowedRoleCodes],
        description: stage.description,
        estimatedDurationMinutes: stage.estimatedDurationMinutes,
        isFinal: stage.isFinal,
        isInitial: stage.isInitial,
        key: stage.key,
        name: stage.name,
        sortOrder: stage.sortOrder,
        workflowTemplateId: templateId,
      })),
    });
  }

  private async recordAudit(
    tx: WorkflowTx,
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
      resourceType: WORKFLOW_TEMPLATES_RESOURCE_TYPE,
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
