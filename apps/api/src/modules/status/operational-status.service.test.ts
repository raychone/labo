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
  readonly deliveryCompletedAt?: Date;
  readonly deliveredAt?: Date | null;
  readonly effectiveDueAt?: Date | null;
  readonly finalizedAt?: Date | null;
  readonly probeReadyAt?: Date | null;
  readonly pickupAt?: Date | null;
  readonly status?: "REGISTERED" | "RECEPTIE" | "IN_LUCRU" | "IN_ASTEPTARE" | "FINALIZATA";
  readonly technicalReadiness?: "PROBE_READY" | "FINAL_READY" | null;
} = {}): OperationalStatusWorkRecord {
  const deliveryCompletedAt = input.deliveryCompletedAt ?? new Date("2026-08-04T09:00:00.000Z");
  return {
    assignedTechnician: null,
    assignedTechnicianId: null,
    claimStatus: input.claimStatus ?? "UNCLAIMED",
    claimedBy: input.claimedByUserId ? { displayName: "Tehnician", id: input.claimedByUserId, preferredColor: null } : null,
    claimedByUserId: input.claimedByUserId ?? null,
    activeCycleId: "work-cycle-1",
    clinic: {
      id: "clinic_1",
      name: "Clinica Demo",
      pickupRequests: input.pickupAt ? [{
        doctorId: "doctor_1",
        id: "pickup_1",
        routeStops: [{ outcomeAt: input.pickupAt, outcomeStatus: "PICKED_UP", type: "PICKUP" }],
      }] : [],
    },
    clinicId: "clinic_1",
    code: `WO-2026-${id}`,
    createdAt: new Date("2026-08-01T08:00:00.000Z"),
    deadlineMode: input.effectiveDueAt === null ? null : "CALCULATED",
    deliveryPreparationItems: input.deliveryStatus
      ? [{
          group: {
            deliveries: [{
              code: "DL-1",
              createdAt: new Date(deliveryCompletedAt.getTime() - 60 * 60 * 1000),
              deliveredAt: deliveryCompletedAt,
              id: "delivery_1",
              plannedDate: new Date("2026-08-04T08:00:00.000Z"),
              status: input.deliveryStatus,
              updatedAt: deliveryCompletedAt,
            }],
          },
          addedAt: new Date(deliveryCompletedAt.getTime() - 2 * 60 * 60 * 1000),
          removedAt: deliveryCompletedAt,
          workCycleId: "work-cycle-1",
        }]
      : [],
    courierRouteStops: input.deliveredAt ? [{ outcomeAt: input.deliveredAt, outcomeStatus: "DELIVERED", type: "DELIVERY" }] : [],
    doctor: { displayName: "Dr. Demo", id: "doctor_1" },
    doctorId: "doctor_1",
    effectiveDueAt: input.effectiveDueAt ?? null,
    executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
    id,
    finalizedAt: input.finalizedAt ?? null,
    logisticsState: null,
    patient: { id: "patient_1" },
    patientName: "Pacient Demo",
    patientReference: null,
    priority: "NORMAL",
    probeReadyAt: input.probeReadyAt ?? (input.technicalReadiness === "PROBE_READY" ? new Date("2026-08-04T07:30:00.000Z") : null),
    technicalReadiness: input.technicalReadiness ?? null,
    status: input.status ?? "RECEPTIE",
    updatedAt: new Date("2026-08-02T08:00:00.000Z"),
    workflowExecution: {
      currentStage: null,
      stages: [],
      status: "ACTIVE",
    },
    workType: { id: "type_1", name: "Coroană", symbol: "Cr" },
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T08:00:00.000Z"));

    try {
      const rows = [
        createWorkRecord("000001", { effectiveDueAt: new Date("2026-08-07T10:00:00.000Z") }),
        createWorkRecord("000002", { claimStatus: "CLAIMED", claimedByUserId: "tech_1", effectiveDueAt: new Date("2026-08-08T10:00:00.000Z") }),
        createWorkRecord("000003", { deliveryStatus: "DELIVERED", effectiveDueAt: new Date("2026-08-09T10:00:00.000Z"), status: "FINALIZATA", technicalReadiness: "FINAL_READY" }),
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
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides a delivered probe until a new cycle is opened", async () => {
    const { service } = createService({
      findManyRows: [createWorkRecord("probe-delivered", { deliveryStatus: "DELIVERED", technicalReadiness: "PROBE_READY" })],
      readAll: true,
    });

    const response = await service.getOperationalStatus(actor, {
      page: 1,
      pageSize: 25,
      sortBy: "updatedAt",
      sortDirection: "desc",
      tab: "TODAY",
    });

    expect(response.items).toHaveLength(0);
    expect(response.counters.every((counter) => counter.count === 0)).toBe(true);
  });

  it("shows a delivered probe only after a pickup later than that delivery", async () => {
    const deliveryCompletedAt = new Date("2026-08-04T09:00:00.000Z");
    const { service } = createService({
      findManyRows: [
        createWorkRecord("pickup-before", { deliveryCompletedAt, deliveryStatus: "DELIVERED", pickupAt: new Date("2026-08-04T08:30:00.000Z"), technicalReadiness: "PROBE_READY" }),
        createWorkRecord("pickup-after", { deliveryCompletedAt, deliveryStatus: "DELIVERED", pickupAt: new Date("2026-08-04T10:00:00.000Z"), technicalReadiness: "PROBE_READY" }),
      ],
      readAll: true,
    });

    const response = await service.getOperationalStatus(actor, {
      page: 1,
      pageSize: 25,
      sortBy: "workCode",
      sortDirection: "asc",
      tab: "ALL",
    });

    expect(response.items.map((row) => row.workCode)).toEqual(["WO-2026-pickup-after"]);
    expect(response.items[0]?.hasCompletedPickup).toBe(true);
  });

  it("keeps a finalized work visible until its current final delivery", async () => {
    const finalizedAt = new Date("2026-08-08T10:00:00.000Z");
    const { service } = createService({
      findManyRows: [
        createWorkRecord("final-ready", { deliveredAt: new Date("2026-08-08T09:00:00.000Z"), effectiveDueAt: new Date("2026-08-08T12:00:00.000Z"), finalizedAt, status: "FINALIZATA", technicalReadiness: "FINAL_READY" }),
        createWorkRecord("final-delivered", { deliveredAt: new Date("2026-08-08T11:00:00.000Z"), effectiveDueAt: new Date("2026-08-08T12:00:00.000Z"), finalizedAt, status: "FINALIZATA", technicalReadiness: "FINAL_READY" }),
        createWorkRecord("final-modern-delivered", { deliveryCompletedAt: new Date("2026-08-08T11:30:00.000Z"), deliveryStatus: "DELIVERED", effectiveDueAt: new Date("2026-08-08T12:00:00.000Z"), finalizedAt, status: "FINALIZATA", technicalReadiness: "FINAL_READY" }),
      ],
      readAll: true,
    });

    const response = await service.getOperationalStatus(actor, {
      page: 1,
      pageSize: 25,
      sortBy: "updatedAt",
      sortDirection: "desc",
      tab: "ALL",
    });

    expect(response.items.map((row) => row.workCode)).toEqual(["WO-2026-final-ready"]);
  });

  it("does not hide a relevant row beyond the old scan cap", async () => {
    const rows = Array.from({ length: 1_001 }, (_, index) => createWorkRecord(String(index).padStart(6, "0"), { effectiveDueAt: new Date("2026-08-04T10:00:00.000Z") }));
    const { service } = createService({ findManyRows: rows, readAll: true });

    const response = await service.getOperationalStatus(actor, { page: 1, pageSize: 25, sortBy: "workCode", sortDirection: "asc", tab: "TODAY" });

    expect(response.meta.scannedRows).toBe(1_001);
    expect(response.meta.hasMore).toBe(false);
  });

  it("keeps delivery exclusion together with search and owner filters", async () => {
    const { findMany, service } = createService({ readAll: true });

    await service.getOperationalStatus(actor, {
      ownerUserId: "tech_1",
      page: 1,
      pageSize: 25,
      search: "0009",
      sortBy: "updatedAt",
      sortDirection: "desc",
      tab: "TODAY",
    });

    const where = findMany.mock.calls[0]?.[0].where as { AND: readonly Record<string, unknown>[] };
    const nested = where.AND[1]?.AND as readonly Record<string, unknown>[];
    expect(nested.filter((condition) => "OR" in condition)).toHaveLength(3);
  });
});
