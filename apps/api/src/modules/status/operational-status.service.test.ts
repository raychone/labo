import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { OperationalStatusService } from "./operational-status.service.js";
import type { OperationalStatusWorkRecord } from "./operational-status.view.js";

const actor = {
  displayName: "Tehnician",
  email: "tech@demo.local",
  id: "tech_1",
  isActive: true,
  mustChangePassword: false,
  preferredColor: null,
} satisfies AuthenticatedUser;

function createWorkRecord(id: string, input: {
  readonly claimStatus?: "CLAIMED" | "UNCLAIMED";
  readonly claimedByUserId?: string | null;
  readonly deliveryStatus?: "DELIVERED" | null;
  readonly effectiveDueAt?: Date | null;
} = {}): OperationalStatusWorkRecord {
  return {
    assignedTechnician: null,
    assignedTechnicianId: null,
    claimStatus: input.claimStatus ?? "UNCLAIMED",
    claimedBy: input.claimedByUserId ? { displayName: "Tehnician", id: input.claimedByUserId, preferredColor: null } : null,
    claimedByUserId: input.claimedByUserId ?? null,
    clinic: { id: "clinic_1", name: "Clinica Demo" },
    code: `WO-2026-${id}`,
    createdAt: new Date("2026-08-01T08:00:00.000Z"),
    deadlineMode: input.effectiveDueAt === null ? null : "CALCULATED",
    deliveryPreparationItems: input.deliveryStatus
      ? [{
          group: {
            deliveries: [{
              code: "DL-1",
              id: "delivery_1",
              plannedDate: new Date("2026-08-04T08:00:00.000Z"),
              status: input.deliveryStatus,
              updatedAt: new Date("2026-08-04T09:00:00.000Z"),
            }],
          },
        }]
      : [],
    doctor: { displayName: "Dr. Demo", id: "doctor_1" },
    effectiveDueAt: input.effectiveDueAt ?? null,
    executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
    id,
    logisticsState: null,
    patient: { id: "patient_1" },
    patientName: "Pacient Demo",
    patientReference: null,
    priority: "NORMAL",
    updatedAt: new Date("2026-08-02T08:00:00.000Z"),
    workflowExecution: {
      currentStage: null,
      stages: [],
      status: "ACTIVE",
    },
    workType: { id: "type_1", name: "Coroană" },
  } as unknown as OperationalStatusWorkRecord;
}

function createService(input: {
  readonly findManyRows?: readonly OperationalStatusWorkRecord[];
  readonly readAll?: boolean;
  readonly readAssignedScopes?: readonly string[];
}) {
  const findMany = vi.fn().mockResolvedValue(input.findManyRows ?? []);
  const hasPermission = vi.fn()
    .mockResolvedValueOnce({ allowed: input.readAll ?? true, effectiveScopes: input.readAll ? ["ALL"] : [], permission: "works.read_all" })
    .mockResolvedValueOnce({ allowed: (input.readAssignedScopes ?? []).length > 0, effectiveScopes: input.readAssignedScopes ?? [], permission: "works.read_assigned" });
  const service = new OperationalStatusService(
    { hasPermission } as unknown as AuthorizationService,
    { workOrder: { findMany } } as unknown as PrismaService,
  );

  return { findMany, hasPermission, service };
}

describe("OperationalStatusService", () => {
  it("rejects users without work read permissions", async () => {
    const { service } = createService({ readAll: false, readAssignedScopes: [] });

    await expect(service.getOperationalStatus(actor, { page: 1, pageSize: 25, sortBy: "effectiveDueAt", sortDirection: "asc", tab: "TODAY" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("adds resource visibility constraints for assigned work readers", async () => {
    const { findMany, service } = createService({ readAll: false, readAssignedScopes: ["OWN_STAGE"] });

    await service.getOperationalStatus(actor, { page: 1, pageSize: 25, sortBy: "effectiveDueAt", sortDirection: "asc", tab: "IN_PROGRESS" });

    expect(JSON.stringify(findMany.mock.calls[0]?.[0].where)).toContain("tech_1");
    expect(JSON.stringify(findMany.mock.calls[0]?.[0].where)).toContain("assignedUserId");
  });

  it("returns filtered counters, pagination metadata and no financial fields", async () => {
    const rows = [
      createWorkRecord("000001", { effectiveDueAt: new Date("2026-08-07T10:00:00.000Z") }),
      createWorkRecord("000002", { claimStatus: "CLAIMED", claimedByUserId: "tech_1", effectiveDueAt: new Date("2026-08-08T10:00:00.000Z") }),
      createWorkRecord("000003", { deliveryStatus: "DELIVERED", effectiveDueAt: new Date("2026-08-09T10:00:00.000Z") }),
    ];
    const { service } = createService({ findManyRows: rows, readAll: true });

    const response = await service.getOperationalStatus(actor, {
      page: 1,
      pageSize: 1,
      sortBy: "workCode",
      sortDirection: "asc",
      tab: "TODAY",
    });

    expect(response.items).toHaveLength(1);
    expect(response.meta.total).toBe(1);
    expect(response.meta.hasMore).toBe(false);
    expect(response.counters.find((counter) => counter.tab === "IN_PROGRESS")?.count).toBe(1);
    expect(response.counters.find((counter) => counter.tab === "COMPLETED")?.count).toBe(1);
    expect(JSON.stringify(response)).not.toContain("PriceMinor");
  });

  it("marks the response as bounded when base rows exceed the scan cap", async () => {
    const rows = Array.from({ length: 1_001 }, (_, index) => createWorkRecord(String(index).padStart(6, "0"), { effectiveDueAt: new Date("2026-08-04T10:00:00.000Z") }));
    const { service } = createService({ findManyRows: rows, readAll: true });

    const response = await service.getOperationalStatus(actor, { page: 1, pageSize: 25, sortBy: "workCode", sortDirection: "asc", tab: "TODAY" });

    expect(response.meta.scannedRows).toBe(1_000);
    expect(response.meta.hasMore).toBe(true);
  });
});
