import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import type { QrRateLimitService } from "../qr/qr-rate-limit.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { ScanService } from "./scan.service.js";

function createWork() {
  return {
    clinic: { name: "Clinica Test" },
    code: "WO-2026-000001",
    doctor: { displayName: "Dr. Ana Popescu" },
    deliveryPreparationItems: [],
    id: "work_1",
    activeCycle: {
      logisticsState: {
        blockedReasonCode: null,
        blockedReasonNotes: null,
        physicalLocationCode: "PRODUCTIE",
        status: "IN_PRODUCTION",
      },
      workFormSubmissions: [{
        finalizedAt: null,
        realLabSheetStatus: "COMPLETE",
      }],
      workflowExecution: {
        currentStageExecutionId: "stage_1",
        id: "workflow_1",
        stages: [
          {
            allowedRoleCodesSnapshot: ["TEHNICIAN"],
            assignedUser: { displayName: "Tehnician Demo", id: "actor_1" },
            assignedUserId: "actor_1",
            id: "stage_1",
            stageNameSnapshot: "Modelare",
            status: "PENDING",
            version: 3,
          },
        ],
        status: "ACTIVE",
        version: 5,
        workflowNameSnapshot: "Flux standard",
      },
    },
    patientName: "Ion Pop",
    priority: "NORMAL",
    requestedDeliveryDate: new Date("2026-08-01T00:00:00.000Z"),
    status: "REGISTERED",
    workType: { name: "Coroana zirconiu" },
  };
}

describe("ScanService", () => {
  it("resolves operational scan context without exposing QR tokens or pricing", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const authorization = {
      hasPermission: vi.fn(({ permission }: { readonly permission: string }) => Promise.resolve({
        allowed: ["scan.resolve", "works.read_all", "workflow.start_stage"].includes(permission),
        effectiveScopes: permission === "scan.resolve" || permission === "works.read_all" ? ["ALL"] : ["OWN_STAGE"],
      })),
    };
    const service = new ScanService(
      authorization as unknown as AuthorizationService,
      {
        auditLog: { create: auditCreate },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            roles: [{ role: { isActive: true, key: "TEHNICIAN" } }],
          }),
        },
        workOrder: { findFirst: vi.fn().mockResolvedValue(createWork()) },
      } as unknown as PrismaService,
      { assertAllowed: vi.fn() } as unknown as QrRateLimitService,
    );

    const result = await service.resolveScan(
      {
        actor: {
          displayName: "Tehnician Demo",
          email: "tech@example.test",
          id: "actor_1",
          isActive: true,
          mustChangePassword: false,
        },
        requestMetadata: { ipAddress: "127.0.0.1", userAgent: "vitest" },
      },
      { payload: "dl-work:secure_token_12345678901234567890", source: "camera" },
    );

    expect(result.work.code).toBe("WO-2026-000001");
    expect(result.workflow?.currentStage?.name).toBe("Modelare");
    expect(result.realLabSheet).toEqual({ cycleNumber: null, label: "Completă", status: "COMPLETE" });
    expect(result.actions.find((action) => action.type === "START_STAGE")?.enabled).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secure_token_12345678901234567890");
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "scan.qr_resolved",
        metadata: {
          source: "camera",
          workCode: "WO-2026-000001",
          workId: "work_1",
        },
      }),
    });
  });
});
