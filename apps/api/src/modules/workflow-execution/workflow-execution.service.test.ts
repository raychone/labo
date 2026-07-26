import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { WORKFLOW_STALE_TEMPLATE_MESSAGE } from "./workflow-execution.constants.js";
import { WorkflowExecutionService } from "./workflow-execution.service.js";

function createService(): WorkflowExecutionService {
  return new WorkflowExecutionService({} as PrismaService, {} as AuthorizationService);
}

function createTx(overrides: Partial<Prisma.TransactionClient> = {}): Prisma.TransactionClient {
  return {
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    workStageEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    workStageExecution: {
      create: vi.fn()
        .mockResolvedValueOnce({ id: "stage_exec_1", sortOrder: 1, stageKeySnapshot: "receptie" })
        .mockResolvedValueOnce({ id: "stage_exec_2", sortOrder: 2, stageKeySnapshot: "modelaj" }),
    },
    workWorkflowExecution: {
      create: vi.fn().mockResolvedValue({ id: "workflow_exec_1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    workflowTemplate: {
      findFirst: vi.fn().mockResolvedValue({
        id: "template_1",
        name: "Flux zirconiu",
        stages: [
          { allowedRoleCodes: ["RECEPTIE"], description: null, estimatedDurationMinutes: 10, id: "stage_1", key: "receptie", name: "Recepție", sortOrder: 1 },
          { allowedRoleCodes: ["TEHNICIAN"], description: "Modelaj", estimatedDurationMinutes: 120, id: "stage_2", key: "modelaj", name: "Modelaj", sortOrder: 2 },
        ],
        version: 3,
      }),
    },
    ...overrides,
  } as unknown as Prisma.TransactionClient;
}

describe("WorkflowExecutionService", () => {
  it("creates an immutable execution snapshot from the active template", async () => {
    const service = createService();
    const tx = createTx();

    const executionId = await service.createSnapshotForWork(tx, {
      actorUserId: "user_1",
      expectedWorkflowTemplateId: "template_1",
      expectedWorkflowTemplateVersion: 3,
      requestMetadata: { ipAddress: "127.0.0.1" },
      workCode: "WO-2026-000001",
      workOrderId: "work_1",
      workTypeId: "work_type_1",
    });

    expect(executionId).toBe("workflow_exec_1");
    expect(tx.workflowTemplate.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "ACTIVE", workTypeId: "work_type_1" },
    }));
    expect(tx.workStageExecution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        allowedRoleCodesSnapshot: ["RECEPTIE"],
        stageDefinitionId: "stage_1",
        stageNameSnapshot: "Recepție",
        workflowExecutionId: "workflow_exec_1",
      }),
    });
    expect(tx.workWorkflowExecution.update).toHaveBeenCalledWith({
      data: { currentStageExecutionId: "stage_exec_1" },
      where: { id: "workflow_exec_1" },
    });
    expect(tx.workStageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stageExecutionId: "stage_exec_1", type: "WORKFLOW_CREATED" }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "workflow.execution_created",
        resourceId: "work_1",
        resourceType: "work_workflow_execution",
      }),
    });
  });

  it("allows work creation without an active template", async () => {
    const service = createService();
    const tx = createTx({
      workflowTemplate: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Partial<Prisma.TransactionClient>);

    await expect(service.createSnapshotForWork(tx, {
      actorUserId: "user_1",
      requestMetadata: {},
      workCode: "WO-2026-000001",
      workOrderId: "work_1",
      workTypeId: "work_type_1",
    })).resolves.toBeNull();
  });

  it("rejects stale workflow template confirmation", async () => {
    const service = createService();
    const tx = createTx();

    await expect(service.createSnapshotForWork(tx, {
      actorUserId: "user_1",
      expectedWorkflowTemplateId: "template_1",
      expectedWorkflowTemplateVersion: 2,
      requestMetadata: {},
      workCode: "WO-2026-000001",
      workOrderId: "work_1",
      workTypeId: "work_type_1",
    })).rejects.toThrow(WORKFLOW_STALE_TEMPLATE_MESSAGE);
  });
});
