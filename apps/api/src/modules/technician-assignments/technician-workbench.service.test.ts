import { WorkStageExecutionStatus, WorkWorkflowExecutionStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { TechnicianWorkbenchService } from "./technician-workbench.service.js";
import type { TechnicianWorkbenchQueryDto } from "./dto/technician-assignments.dto.js";

const actor: AuthenticatedUser = {
  displayName: "Demo Manager",
  email: "manager@demo.local",
  id: "manager_1",
  isActive: true,
  mustChangePassword: false,
  preferredColor: null,
};

function createStage(overrides: Partial<{
  readonly code: string;
  readonly createdAt: Date;
  readonly dueDate: Date;
  readonly id: string;
  readonly priority: "NORMAL" | "URGENT";
  readonly assignedTechnicianId: string | null;
  readonly assignedUserId: string | null;
  readonly claimedByUserId: string | null;
  readonly claimStatus: "UNCLAIMED" | "CLAIMED";
}> = {}) {
  const code = overrides.code ?? "WO-2026-000001";
  const createdAt = overrides.createdAt ?? new Date("2026-08-01T08:00:00.000Z");
  const dueDate = overrides.dueDate ?? new Date("2026-08-01T18:00:00.000Z");
  const id = overrides.id ?? "stage_exec_1";
  const priority = overrides.priority ?? "NORMAL";
  const assignedTechnicianId = overrides.assignedTechnicianId ?? null;
  const assignedUserId = overrides.assignedUserId ?? null;
  const claimedByUserId = overrides.claimedByUserId ?? null;
  const claimStatus = overrides.claimStatus ?? "UNCLAIMED";

  return {
    allowedRoleCodesSnapshot: ["TEHNICIAN"],
    assignedAt: null,
    assignedBy: null,
    assignedUser: null,
    assignedUserId,
    id,
    stageKeySnapshot: "model",
    stageNameSnapshot: "Model",
    status: WorkStageExecutionStatus.PENDING,
    version: 1,
    workflowExecution: {
      id: `workflow_${id}`,
      stages: [{ status: WorkStageExecutionStatus.PENDING }],
      status: WorkWorkflowExecutionStatus.ACTIVE,
      workOrder: {
        activeCycle: null,
        clinic: { id: "clinic_1", name: "Clinic" },
        code,
        createdAt,
        doctor: { displayName: "Dr. Demo", id: "doctor_1" },
        patientName: "Pacient Demo",
        priority,
        requestedDeliveryDate: dueDate,
        workType: { id: "wt_1", name: "Tip" },
        assignedTechnicianId,
        claimStatus,
        claimedByUserId,
      },
    },
    workflowExecutionId: `workflow_${id}`,
  } as any;
}

function createService(stageRecords: readonly ReturnType<typeof createStage>[], effectiveScopes: readonly string[] = ["ALL"]): TechnicianWorkbenchService {
  const authorizationService = {
    hasPermission: vi.fn().mockResolvedValue({ effectiveScopes }),
  } as unknown as AuthorizationService;
  const prisma = {
    $transaction: vi.fn(async (operations: readonly Promise<unknown>[]) => Promise.all(operations)),
    workStageExecution: {
      count: vi.fn().mockResolvedValue(stageRecords.length),
      findMany: vi.fn().mockResolvedValue([...stageRecords]),
    },
    workWorkflowExecution: {
      findMany: vi.fn().mockResolvedValue(stageRecords.map((record) => ({ currentStageExecutionId: record.id }))),
    },
  } as unknown as PrismaService;

  return new TechnicianWorkbenchService(authorizationService, prisma);
}

describe("TechnicianWorkbenchService", () => {
  it("sorts workbench items with overdue and urgent work first", async () => {
    const service = createService([
      createStage({
        code: "WO-2026-000201",
        createdAt: new Date("2026-08-03T08:00:00.000Z"),
        dueDate: new Date("2026-08-20T18:00:00.000Z"),
        id: "stage_future_urgent",
        priority: "URGENT",
      }),
      createStage({
        code: "WO-2026-000199",
        createdAt: new Date("2026-07-30T08:00:00.000Z"),
        dueDate: new Date("2026-08-01T18:00:00.000Z"),
        id: "stage_overdue_urgent",
        priority: "URGENT",
      }),
      createStage({
        code: "WO-2026-000200",
        createdAt: new Date("2026-07-31T08:00:00.000Z"),
        dueDate: new Date("2026-08-02T18:00:00.000Z"),
        id: "stage_overdue_normal",
        priority: "NORMAL",
      }),
    ]);
    const query: TechnicianWorkbenchQueryDto = {
      page: 1,
      pageSize: 20,
      sortBy: "requestedDeliveryDate",
      sortOrder: "asc",
    };

    const result = await service.getWorkbench(actor, query);

    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.workCode)).toEqual([
      "WO-2026-000199",
      "WO-2026-000200",
      "WO-2026-000201",
    ]);
  });

  it("keeps a claimed work visible in the technician queue even before the current stage is explicitly assigned", async () => {
    const stage = createStage({
      assignedTechnicianId: actor.id,
      assignedUserId: null,
      claimedByUserId: actor.id,
      claimStatus: "CLAIMED",
      code: "WO-2026-000006",
      id: "stage_claimed",
    });
    const service = createService([stage], ["ASSIGNED"]);
    const prisma = Reflect.get(service, "prisma") as {
      readonly workStageExecution: {
        readonly findMany: { readonly mock: { readonly calls: readonly unknown[][] } };
      };
    };
    const query: TechnicianWorkbenchQueryDto = {
      page: 1,
      pageSize: 20,
      sortBy: "requestedDeliveryDate",
      sortOrder: "asc",
    };

    const result = await service.getWorkbench(actor, query);

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.workCode).toBe("WO-2026-000006");

    const where = (prisma.workStageExecution.findMany.mock.calls[0]?.[0] as { readonly where?: Record<string, unknown> } | undefined)?.where;
    expect(where).toMatchObject({
      OR: expect.arrayContaining([
        { assignedUserId: actor.id },
        { workflowExecution: { workOrder: { assignedTechnicianId: actor.id } } },
        { workflowExecution: { workOrder: { claimedByUserId: actor.id } } },
      ]),
    });
  });
});
