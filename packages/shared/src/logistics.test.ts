import { describe, expect, it } from "vitest";

import { canAddWorkToPreparationGroup, deriveLogisticsDueState } from "./logistics.js";

describe("logistics helpers", () => {
  it("derives due states from promised date", () => {
    const now = new Date("2026-07-26T09:00:00.000Z");

    expect(deriveLogisticsDueState({ now, requestedDeliveryDate: new Date("2026-07-26T08:59:59.000Z") })).toBe("OVERDUE");
    expect(deriveLogisticsDueState({ now, requestedDeliveryDate: new Date("2026-07-27T08:59:59.000Z") })).toBe("DUE_SOON");
    expect(deriveLogisticsDueState({ now, requestedDeliveryDate: new Date("2026-07-28T09:00:00.000Z") })).toBe("ON_TRACK");
  });

  it("allows only ready works from the same clinic without active group", () => {
    expect(canAddWorkToPreparationGroup({
      groupClinicId: "clinic_a",
      groupStatus: "DRAFT",
      hasActiveGroup: false,
      workClinicId: "clinic_a",
      technicalReadiness: "PROBE_READY",
    })).toBe(true);

    expect(canAddWorkToPreparationGroup({
      groupClinicId: "clinic_a",
      groupStatus: "DRAFT",
      hasActiveGroup: true,
      workClinicId: "clinic_a",
      technicalReadiness: "FINAL_READY",
    })).toBe(false);

    expect(canAddWorkToPreparationGroup({
      groupClinicId: "clinic_a",
      groupStatus: "READY",
      hasActiveGroup: false,
      workClinicId: "clinic_a",
      technicalReadiness: "PROBE_READY",
    })).toBe(false);

    expect(canAddWorkToPreparationGroup({
      groupClinicId: "clinic_a",
      groupStatus: "DRAFT",
      hasActiveGroup: false,
      workClinicId: "clinic_a",
      technicalReadiness: null,
    })).toBe(false);
  });
});
