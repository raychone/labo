import { describe, expect, it } from "vitest";

import { resolveProbeReturnEvidence, type ProbeReturnEvidence } from "./probe-return-evidence.js";

const readyAt = new Date("2026-08-26T08:00:00.000Z");

function evidence(overrides: Partial<ProbeReturnEvidence> = {}): ProbeReturnEvidence {
  return {
    activeWorkCycleId: "work-cycle-2",
    directRouteStops: [],
    doctorId: "doctor-1",
    pickupRequests: [],
    preparationItems: [],
    ...overrides,
  };
}

describe("probe return evidence", () => {
  it("accepts a modern delivery followed by a clinic-wide pickup", () => {
    const result = resolveProbeReturnEvidence(evidence({
      pickupRequests: [{
        doctorId: null,
        routeStops: [{ outcomeAt: new Date("2026-08-26T11:00:00.000Z"), outcomeStatus: "PICKED_UP", type: "PICKUP" }],
      }],
      preparationItems: [{
        addedAt: new Date("2026-08-26T08:30:00.000Z"),
        deliveries: [{ createdAt: new Date("2026-08-26T09:00:00.000Z"), deliveredAt: new Date("2026-08-26T10:00:00.000Z"), status: "DELIVERED" }],
        removedAt: new Date("2026-08-26T10:00:00.000Z"),
        workCycleId: "work-cycle-2",
      }],
    }), readyAt);

    expect(result).toEqual({
      deliveredAt: new Date("2026-08-26T10:00:00.000Z"),
      pickedUpAt: new Date("2026-08-26T11:00:00.000Z"),
    });
  });

  it("rejects pickup evidence that predates the current delivery", () => {
    const result = resolveProbeReturnEvidence(evidence({
      directRouteStops: [
        { outcomeAt: new Date("2026-08-26T09:00:00.000Z"), outcomeStatus: "PICKED_UP", type: "PICKUP" },
        { outcomeAt: new Date("2026-08-26T10:00:00.000Z"), outcomeStatus: "DELIVERED", type: "DELIVERY" },
      ],
    }), readyAt);

    expect(result.deliveredAt).toEqual(new Date("2026-08-26T10:00:00.000Z"));
    expect(result.pickedUpAt).toBeNull();
  });

  it("ignores a modern delivery linked only to an older work cycle", () => {
    const result = resolveProbeReturnEvidence(evidence({
      preparationItems: [{
        addedAt: new Date("2026-08-26T08:30:00.000Z"),
        deliveries: [{ createdAt: new Date("2026-08-26T09:00:00.000Z"), deliveredAt: new Date("2026-08-26T10:00:00.000Z"), status: "DELIVERED" }],
        removedAt: new Date("2026-08-26T10:00:00.000Z"),
        workCycleId: "work-cycle-1",
      }],
    }), readyAt);

    expect(result).toEqual({ deliveredAt: null, pickedUpAt: null });
  });

  it("does not let a pickup for another doctor unlock the return", () => {
    const result = resolveProbeReturnEvidence(evidence({
      directRouteStops: [{ outcomeAt: new Date("2026-08-26T10:00:00.000Z"), outcomeStatus: "DELIVERED", type: "DELIVERY" }],
      pickupRequests: [{
        doctorId: "doctor-2",
        routeStops: [{ outcomeAt: new Date("2026-08-26T11:00:00.000Z"), outcomeStatus: "PICKED_UP", type: "PICKUP" }],
      }],
    }), readyAt);

    expect(result.deliveredAt).toEqual(new Date("2026-08-26T10:00:00.000Z"));
    expect(result.pickedUpAt).toBeNull();
  });
});
