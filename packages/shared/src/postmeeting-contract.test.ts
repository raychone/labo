import { describe, expect, it } from "vitest";

import {
  ADULT_FDI_TEETH,
  ANATOMICAL_SCOPE_TYPES,
  DENTAL_ASSET_DIRECTORY,
  LEGACY_COMPATIBILITY_MAPPINGS,
  MANEUVER_QUANTITY_FIXTURES,
  POSTMODEL_UI_TERMINOLOGY_RO,
  PROBE_LIFECYCLE_TRANSITIONS,
  TECHNICIAN_MANEUVER_UNITS,
  calculateManeuverQuantity,
  calculateManeuverTotalMinor,
  URGENCY_SURCHARGE_PERCENT,
  calculateUrgencySurchargeMinor,
  isAdultFdiTooth,
  isAllowedProbeTransition,
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
    expect(TECHNICIAN_MANEUVER_UNITS).toEqual(["PER_ELEMENT", "PER_UNIT", "PER_ARCH", "PER_CASE"]);
    expect(MANEUVER_QUANTITY_FIXTURES).toEqual([
      { unit: "PER_ELEMENT", selectedToothCount: 1, expectedQuantity: 1 },
      { unit: "PER_ELEMENT", selectedToothCount: 2, expectedQuantity: 2 },
      { unit: "PER_ELEMENT", selectedToothCount: 3, expectedQuantity: 3 },
      { unit: "PER_UNIT", selectedItemCount: 1, expectedQuantity: 1 },
      { unit: "PER_UNIT", selectedItemCount: 2, expectedQuantity: 2 },
      { unit: "PER_ARCH", selectedArchCount: 1, expectedQuantity: 1 },
      { unit: "PER_ARCH", selectedArchCount: 2, expectedQuantity: 2 },
      { unit: "PER_CASE", expectedQuantity: 1 },
    ]);
  });

  it("calculates maneuver quantities without inferring teeth, probes, or work quantity", () => {
    expect(calculateManeuverQuantity({ unit: "PER_ELEMENT", selectedToothCount: 1 })).toBe(1);
    expect(calculateManeuverQuantity({ unit: "PER_ELEMENT", selectedToothCount: 3, selectedItemCount: 16 })).toBe(3);
    expect(calculateManeuverQuantity({ unit: "PER_UNIT", selectedItemCount: 1, selectedToothCount: 3 })).toBe(1);
    expect(calculateManeuverQuantity({ unit: "PER_ARCH", selectedArchCount: 2, selectedToothCount: 32 })).toBe(2);
    expect(calculateManeuverQuantity({ unit: "PER_CASE", selectedToothCount: 32, selectedItemCount: 10, selectedArchCount: 2 })).toBe(1);
  });

  it("uses integer minor-unit arithmetic for maneuver totals", () => {
    expect(calculateManeuverTotalMinor(3, 3500)).toBe(10500);
    expect(calculateManeuverTotalMinor(1, 4000)).toBe(4000);
    expect(calculateManeuverTotalMinor(2, 4000)).toBe(8000);
    expect(calculateManeuverTotalMinor(2, 2000)).toBe(4000);
    expect(calculateManeuverTotalMinor(1, 3000)).toBe(3000);
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
    expect(URGENCY_SURCHARGE_PERCENT).toEqual({ NORMAL: 0, URGENCY_1: 25, URGENCY_2: 50, URGENCY_3: 75, URGENCY_4: 100 });
    expect(POSTMODEL_UI_TERMINOLOGY_RO.probeReady).toBe("Probă gata");
    expect(POSTMODEL_UI_TERMINOLOGY_RO.received).toBe("Recepționată");
    expect(POSTMODEL_UI_TERMINOLOGY_RO.finalized).toBe("Finalizată");
  });

  it("calculates the customer urgency surcharge once with integer arithmetic", () => {
    expect(calculateUrgencySurchargeMinor(200000, "NORMAL")).toBe(0);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_1")).toBe(50000);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_2")).toBe(100000);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_3")).toBe(150000);
    expect(calculateUrgencySurchargeMinor(200000, "URGENCY_4")).toBe(200000);
    expect(calculateUrgencySurchargeMinor(101, "URGENCY_1")).toBe(25);
  });

  it("classifies current concepts as compatibility reads, not premature migrations", () => {
    expect(LEGACY_COMPATIBILITY_MAPPINGS.genericPriority).toContain("READ_ONLY_HISTORICAL");
    expect(LEGACY_COMPATIBILITY_MAPPINGS.legacyCycle).toContain("do not infer item-level cycles");
    expect(LEGACY_COMPATIBILITY_MAPPINGS.legacySingleWorkTypeFields).toBe("READ_THROUGH_UNTIL_ITEM_MIGRATION");
  });
});
