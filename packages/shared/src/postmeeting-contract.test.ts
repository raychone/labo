import { describe, expect, it } from "vitest";

import {
  ADULT_FDI_TEETH,
  B17_LOGISTICS_NOTIFICATION_EVENTS,
  B18_NOTIFICATION_LABELS_RO,
  B18_NOTIFICATION_TYPES,
  ANATOMICAL_SCOPE_TYPES,
  DENTAL_ASSET_DIRECTORY,
  LEGACY_COMPATIBILITY_MAPPINGS,
  POSTMODEL_UI_TERMINOLOGY_RO,
  PROBE_LIFECYCLE_TRANSITIONS,
  calculateTechnicianManeuverElementQuantity,
  calculateTechnicianManeuverTotalMinor,
  TECHNICIAN_MANEUVER_SELECTION_ORDER,
  TECHNICIAN_PERFORMED_MANEUVER_UNIQUENESS_SCOPE,
  URGENCY_SURCHARGE_PERCENT,
  calculateUrgencySurchargeMinor,
  isAdultFdiTooth,
  isAllowedProbeTransition,
  getB17LogisticsNotificationKey,
  resolveMirroredFdiTooth,
} from "./postmeeting-contract.js";

describe("POSTMODEL-001 canonical contract", () => {
  it("defines all semantic anatomical scopes without activating persistence", () => {
    expect(ANATOMICAL_SCOPE_TYPES).toEqual(["TOOTH", "TEETH", "UPPER_ARCH", "LOWER_ARCH", "BOTH_ARCHES", "CASE"]);
    expect(ADULT_FDI_TEETH).toContain(11);
    expect(ADULT_FDI_TEETH).toContain(21);
    expect(isAdultFdiTooth(11)).toBe(true);
    expect(isAdultFdiTooth(20)).toBe(false);
  });

  it("keeps mirrored visual identity separate from source asset identity", () => {
    expect(DENTAL_ASSET_DIRECTORY).toBe("assets/dinti");
    expect(resolveMirroredFdiTooth(11, false)).toBe(11);
    expect(resolveMirroredFdiTooth(11, true)).toBe(21);
    expect(resolveMirroredFdiTooth(41, true)).toBe(31);
  });

  it("defines maneuver quantity semantics independently", () => {
    expect(calculateTechnicianManeuverElementQuantity([11])).toBe(1);
    expect(calculateTechnicianManeuverElementQuantity([11, 12])).toBe(2);
    expect(calculateTechnicianManeuverElementQuantity([11, 12, 21])).toBe(3);
    expect(calculateTechnicianManeuverElementQuantity([11, 12, 13, 14, 15, 21, 22, 23, 24, 25])).toBe(10);
  });

  it("calculates maneuver quantities without inferring teeth, probes, or work quantity", () => {
    expect(() => calculateTechnicianManeuverElementQuantity([])).toThrow("cel puțin un dinte");
    expect(calculateTechnicianManeuverElementQuantity([11, 11, 12])).toBe(2);
    expect(calculateTechnicianManeuverElementQuantity([11, 12, 21, 21])).toBe(3);
    expect(() => calculateTechnicianManeuverElementQuantity([20])).toThrow("dinți adulți FDI");
    expect(calculateTechnicianManeuverElementQuantity([11, 12])).toBe(2);
  });

  it("freezes the future B14 tooth-first and global uniqueness contract", () => {
    expect(TECHNICIAN_MANEUVER_SELECTION_ORDER).toEqual(["TEETH_FIRST", "MANEUVER_SECOND"]);
    expect(TECHNICIAN_PERFORMED_MANEUVER_UNIQUENESS_SCOPE).toEqual(["workOrderId", "operationId", "fdiTooth"]);
  });

  it("uses integer minor-unit arithmetic for maneuver totals", () => {
    expect(calculateTechnicianManeuverTotalMinor(1, 3500)).toBe(3500);
    expect(calculateTechnicianManeuverTotalMinor(2, 3500)).toBe(7000);
    expect(calculateTechnicianManeuverTotalMinor(3, 3500)).toBe(10500);
    expect(calculateTechnicianManeuverTotalMinor(10, 3500)).toBe(35000);
  });

  it("defines the active-first-cycle transition contract", () => {
    expect(PROBE_LIFECYCLE_TRANSITIONS).toHaveLength(3);
    expect(isAllowedProbeTransition("ACTIVE", "PROBE_READY")).toBe(true);
    expect(isAllowedProbeTransition("PROBE_HISTORY", "RECEIVED")).toBe(true);
    expect(isAllowedProbeTransition("ACTIVE", "RECEIVED")).toBe(false);
    expect(isAllowedProbeTransition("PROBE_HISTORY", "PROBE_READY")).toBe(false);
    expect(isAllowedProbeTransition("RECEIVED", "FINALIZED")).toBe(true);
  });

  it("keeps the urgency model and Romanian terminology canonical", () => {
    expect(URGENCY_SURCHARGE_PERCENT).toEqual({ NORMAL: 0, URGENCY_1: 35, URGENCY_2: 50, URGENCY_3: 75, URGENCY_4: 100 });
    expect(POSTMODEL_UI_TERMINOLOGY_RO.probeReady).toBe("Probă gata");
    expect(POSTMODEL_UI_TERMINOLOGY_RO.received).toBe("Recepționată");
    expect(POSTMODEL_UI_TERMINOLOGY_RO.finalized).toBe("Finalizată");
  });

  it("calculates the customer urgency surcharge once with integer arithmetic", () => {
    expect(calculateUrgencySurchargeMinor(200000, "NORMAL")).toBe(0);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_1")).toBe(70000);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_2")).toBe(100000);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_3")).toBe(150000);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_4")).toBe(200000);
    expect(calculateUrgencySurchargeMinor(101, "URGENCY_1")).toBe(35);
  });

  it("classifies current concepts as compatibility reads, not premature migrations", () => {
    expect(LEGACY_COMPATIBILITY_MAPPINGS.genericPriority).toContain("READ_ONLY_HISTORICAL");
    expect(LEGACY_COMPATIBILITY_MAPPINGS.legacyCycle).toContain("do not infer item-level cycles");
    expect(LEGACY_COMPATIBILITY_MAPPINGS.legacySingleWorkTypeFields).toBe("READ_THROUGH_UNTIL_ITEM_MIGRATION");
  });

  it("provides deterministic B17 Logistics event identities for the notification runtime", () => {
    expect(B17_LOGISTICS_NOTIFICATION_EVENTS).toEqual({
      newWork: "NEW_WORK",
      probeReady: "PROBE_READY",
      finalWorkReady: "FINAL_WORK_READY",
      deliveryCompleted: "DELIVERY_COMPLETED",
      deliveryFailed: "DELIVERY_FAILED",
    });
    expect(getB17LogisticsNotificationKey("NEW_WORK", { workOrderId: "wo-1" })).toBe("new-work:wo-1");
    expect(getB17LogisticsNotificationKey("PROBE_READY", { workOrderId: "wo-1", probeCycleId: "probe-2" })).toBe("probe-ready:wo-1:probe-2");
    expect(getB17LogisticsNotificationKey("FINAL_WORK_READY", { workOrderId: "wo-1" })).toBe("final-ready:wo-1");
    expect(getB17LogisticsNotificationKey("DELIVERY_COMPLETED", { workOrderId: "wo-1", movementId: "delivery-3" })).toBe("delivery-completed:delivery-3");
    expect(getB17LogisticsNotificationKey("DELIVERY_FAILED", { workOrderId: "wo-1", movementId: "delivery-3" })).toBe("delivery-failed:delivery-3");
    expect(() => getB17LogisticsNotificationKey("PROBE_READY", { workOrderId: "wo-1" })).toThrow("ProbeCycle");
  });

  it("defines the bounded B18 notification vocabulary", () => {
    expect(B18_NOTIFICATION_TYPES).toHaveLength(18);
    expect(B18_NOTIFICATION_LABELS_RO.NEW_WORK_AVAILABLE).toBe("Lucrare nouă disponibilă");
    expect(B18_NOTIFICATION_LABELS_RO.PAYMENT_NOTE_REQUIRED).toBe("Notă de plată de generat");
  });
});
