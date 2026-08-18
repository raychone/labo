import { BadRequestException } from "@nestjs/common";
import { WorkflowTemplateStatus, type WorkType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { WorkflowTemplateValidationService } from "./workflow-template-validation.service.js";
import { WorkflowTemplatesService } from "./workflow-templates.service.js";

interface StageRow {
  readonly allowedRoleCodes: readonly string[];
  readonly createdAt: Date;
  readonly description: string | null;
  readonly estimatedDurationMinutes: number | null;
  readonly id: string;
  readonly isFinal: boolean;
  readonly isInitial: boolean;
  readonly key: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly updatedAt: Date;
  readonly workflowTemplateId: string;
}

interface TemplateRow {
  readonly activatedAt: Date | null;
  readonly activatedByUserId: string | null;
  readonly archivedAt: Date | null;
  readonly archivedByUserId: string | null;
  readonly createdAt: Date;
  readonly createdByUserId: string;
  readonly description: string | null;
  readonly id: string;
  readonly name: string;
  readonly stages: readonly StageRow[];
  readonly status: WorkflowTemplateStatus;
  readonly updatedAt: Date;
  readonly updatedByUserId: string;
  readonly version: number;
  readonly workType: WorkType;
  readonly workTypeId: string;
}

const now = new Date("2026-07-26T00:00:00.000Z");

function workType(overrides: Partial<WorkType> = {}): WorkType {
  return {
    archivedAt: null,
    archivedByUserId: null,
    basePriceMinor: 100000,
    code: "WT-0001",
    createdAt: now,
    createdByUserId: "actor_1",
    description: null,
    id: "work_type_1",
    isActive: true,
    name: "Coroană zirconiu",
    symbol: "Zr",
    unit: "UNIT",
    updatedAt: now,
    updatedByUserId: "actor_1",
    version: 1,
    ...overrides,
  };
}

function stage(overrides: Partial<StageRow> = {}): StageRow {
  return {
    allowedRoleCodes: ["TEHNICIAN"],
    createdAt: now,
    description: null,
    estimatedDurationMinutes: 120,
    id: "stage_1",
    isFinal: false,
    isInitial: true,
    key: "receptie",
    name: "Recepție",
    sortOrder: 1,
    updatedAt: now,
    workflowTemplateId: "template_1",
    ...overrides,
  };
}

function template(overrides: Partial<TemplateRow> = {}): TemplateRow {
  const parentWorkType = workType();
  return {
    activatedAt: null,
    activatedByUserId: null,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: now,
    createdByUserId: "actor_1",
    description: "Flux standard",
    id: "template_1",
    name: "Flux v1",
    stages: [
      stage({ isFinal: false, isInitial: true, key: "receptie", name: "Recepție", sortOrder: 1 }),
      stage({ id: "stage_2", isFinal: true, isInitial: false, key: "livrare", name: "Pregătire livrare", sortOrder: 2 }),
    ],
    status: WorkflowTemplateStatus.DRAFT,
    updatedAt: now,
    updatedByUserId: "actor_1",
    version: 1,
    workType: parentWorkType,
    workTypeId: parentWorkType.id,
    ...overrides,
  };
}

function createService(prisma: unknown): WorkflowTemplatesService {
  return new WorkflowTemplatesService(prisma as PrismaService, new WorkflowTemplateValidationService());
}

const actor = { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } };

describe("WorkflowTemplatesService", () => {
  it("creates a draft with the next deterministic version and audit entry", async () => {
    const created = template({ stages: [] });
    const auditCreate = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue(created);
    const findUnique = vi.fn()
      .mockResolvedValueOnce(workType())
      .mockResolvedValueOnce(created);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: vi.fn().mockResolvedValue(0),
          auditLog: { create: auditCreate },
          workType: { findUnique },
          workflowTemplate: {
            aggregate: vi.fn().mockResolvedValue({ _max: { version: 2 } }),
            create,
            findUnique,
          },
        }),
      ),
    });

    const result = await service.createTemplate(actor, "work_type_1", { description: null, name: "Flux nou" });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdByUserId: "actor_1",
        name: "Flux nou",
        version: 3,
        workTypeId: "work_type_1",
      }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "workflow.template_created",
        resourceId: "template_1",
        resourceType: "workflow_template",
      }),
    });
    expect(result.version).toBe(1);
  });

  it("replaces draft stages with normalized order and audit metadata", async () => {
    const draft = template();
    const auditCreate = vi.fn().mockResolvedValue({});
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          workflowStageDefinition: {
            createMany,
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          workflowTemplate: {
            findUnique: vi.fn().mockResolvedValue(draft),
            update: vi.fn().mockResolvedValue(draft),
          },
        }),
      ),
      workflowTemplate: {
        findUnique: vi.fn().mockResolvedValue(draft),
      },
    });

    await service.replaceStages(actor, "template_1", {
      stages: [
        { allowedRoleCodes: ["LOGISTICA"], isFinal: false, isInitial: false, key: "livrare", name: "Livrare", sortOrder: 10 },
        { allowedRoleCodes: ["RECEPTIE"], isFinal: false, isInitial: false, key: "receptie", name: "Recepție", sortOrder: 1 },
      ],
    });

    expect(createMany.mock.calls[0]?.[0].data).toStrictEqual([
      expect.objectContaining({ isFinal: false, isInitial: true, key: "receptie", sortOrder: 1 }),
      expect.objectContaining({ isFinal: true, isInitial: false, key: "livrare", sortOrder: 2 }),
    ]);
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "workflow.stages_replaced",
        metadata: expect.objectContaining({ stageKeys: ["receptie", "livrare"] }),
      }),
    });
  });

  it("activates one draft and archives previous active templates in the same work type", async () => {
    const draft = template();
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ ...draft, status: WorkflowTemplateStatus.ACTIVE });
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: vi.fn().mockResolvedValue(0),
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          workflowTemplate: {
            findUnique: vi.fn().mockResolvedValue(draft),
            update,
            updateMany,
          },
        }),
      ),
    });

    const result = await service.activateTemplate(actor, "template_1");

    expect(updateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: WorkflowTemplateStatus.ARCHIVED }),
      where: expect.objectContaining({
        status: WorkflowTemplateStatus.ACTIVE,
        workTypeId: "work_type_1",
      }),
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: WorkflowTemplateStatus.ACTIVE }),
    }));
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects edits on active templates", async () => {
    const service = createService({
      workflowTemplate: {
        findUnique: vi.fn().mockResolvedValue(template({ status: WorkflowTemplateStatus.ACTIVE })),
      },
    });

    await expect(service.updateTemplate(actor, "template_1", { name: "Flux actualizat" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
