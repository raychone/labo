import { BadRequestException } from "@nestjs/common";
import { WorkStageExecutionStatus, WorkWorkflowExecutionStatus, type Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { TechnicianAssignmentsService } from "./technician-assignments.service.js";

const actor: AuthenticatedUser = {
  displayName: "Demo Manager",
  email: "manager@demo.local",
  id: "manager_1",
  isActive: true,
  mustChangePassword: false,
};

function createStage(overrides: Partial<{
  readonly assignedUserId: string | null;
  readonly status: WorkStageExecutionStatus;
}> = {}) {
  return {
    allowedRoleCodesSnapshot: ["TEHNICIAN", "MANAGER"],
    assignedUserId: overrides.assignedUserId ?? "tech_old",
    id: "stage_exec_1",
    stageKeySnapshot: "model",
    status: overrides.status ?? WorkStageExecutionStatus.IN_PROGRESS,
    version: 2,
    workflowExecution: {
      status: WorkWorkflowExecutionStatus.ACTIVE,
      workOrder: { code: "WO-2026-000001" },
      workOrderId: "work_1",
    },
    workflowExecutionId: "workflow_exec_1",
  };
}

function createTx(stage = createStage()): Prisma.TransactionClient {
  return {
    $queryRaw: vi.fn().mockResolvedValue([]),
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        displayName: "Demo Tehnician 2",
        id: "tech_new",
        isActive: true,
        roles: [{ role: { isActive: true, key: "TEHNICIAN" } }],
      }),
    },
    workStageEvent: { create: vi.fn().mockResolvedValue({}) },
    workStageExecution: {
      findUnique: vi.fn().mockResolvedValue(stage),
      update: vi.fn().mockResolvedValue({ id: "stage_exec_1" }),
    },
    workWorkflowExecution: {
      findUnique: vi.fn().mockResolvedValue({
        currentStageExecutionId: "stage_exec_1",
        id: "workflow_exec_1",
      }),
      update: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Prisma.TransactionClient;
}

function createService(tx: Prisma.TransactionClient): TechnicianAssignmentsService {
  const authorizationService = {
    hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"] }),
  } as unknown as AuthorizationService;
  const prisma = {
    $transaction: vi.fn((callback: (transaction: Prisma.TransactionClient) => Promise<unknown>) => callback(tx)),
  } as unknown as PrismaService;

  return new TechnicianAssignmentsService(authorizationService, prisma);
}

describe("TechnicianAssignmentsService", () => {
  it("requires explicit confirmation before reassigning an in-progress stage", async () => {
    const service = createService(createTx());

    await expect(service.assignStage(
      { actor, requestMetadata: {} },
      "work_1",
      "stage_exec_1",
      { expectedVersion: 2, userId: "tech_new" },
    )).rejects.toThrow(BadRequestException);
  });

  it("rejects assigning a stage to the technician already responsible", async () => {
    const service = createService(createTx(createStage({ assignedUserId: "tech_new", status: WorkStageExecutionStatus.PENDING })));

    await expect(service.assignStage(
      { actor, requestMetadata: {} },
      "work_1",
      "stage_exec_1",
      { expectedVersion: 2, userId: "tech_new" },
    )).rejects.toThrow("Etapa este deja asignată acestui tehnician.");
  });
});
