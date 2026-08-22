import { describe, expect, it } from "vitest";

import {
  FDI_ADULT_TOOTH_CODES,
  FDI_ADULT_TOOTH_QUADRANTS,
  isWorkFormFieldKey,
  normalizeFdiAdultToothSelection,
  normalizeWorkFormFieldsOrder,
  validateWorkFormFieldCompatibility,
  validateWorkFormOptions,
  type WorkFormFieldDefinition,
} from "./work-forms.js";

function field(overrides: Partial<WorkFormFieldDefinition>): WorkFormFieldDefinition {
  return {
    defaultValue: null,
    helpText: null,
    isActive: true,
    key: "shade",
    label: "Nuanta",
    options: [],
    placeholder: null,
    required: true,
    sortOrder: 1,
    type: "TEXT",
    validation: {},
    ...overrides,
  };
}

describe("work form helpers", () => {
  it("validates stable field keys and rejects reserved or unsafe keys", () => {
    expect(isWorkFormFieldKey("tooth_number")).toBe(true);
    expect(isWorkFormFieldKey("patient_name")).toBe(false);
    expect(isWorkFormFieldKey("Tooth")).toBe(false);
    expect(isWorkFormFieldKey("implant.system")).toBe(false);
  });

  it("normalizes field order without mutating the input", () => {
    const fields = [field({ key: "a", sortOrder: 9 }), field({ key: "b", sortOrder: 1 })];

    expect(normalizeWorkFormFieldsOrder(fields).map((entry) => entry.sortOrder)).toStrictEqual([1, 2]);
    expect(fields.map((entry) => entry.sortOrder)).toStrictEqual([9, 1]);
  });

  it("validates options with duplicate detection", () => {
    const result = validateWorkFormOptions([
      { label: "A1", value: "a1" },
      { label: "A1 duplicate", value: "a1" },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Duplicate option value");
  });

  it("defines adult permanent FDI teeth by canonical quadrants and normalizes selections", () => {
    expect(FDI_ADULT_TOOTH_QUADRANTS.map((quadrant) => quadrant.teeth)).toStrictEqual([
      ["18", "17", "16", "15", "14", "13", "12", "11"],
      ["21", "22", "23", "24", "25", "26", "27", "28"],
      ["31", "32", "33", "34", "35", "36", "37", "38"],
      ["48", "47", "46", "45", "44", "43", "42", "41"],
    ]);
    expect(FDI_ADULT_TOOTH_CODES).toHaveLength(32);
    expect(FDI_ADULT_TOOTH_CODES).not.toContain("51");
    expect(normalizeFdiAdultToothSelection(["22", "11", "11", "18", "51"])).toStrictEqual(["18", "11", "22"]);
  });

  it("checks field type compatibility", () => {
    expect(validateWorkFormFieldCompatibility(field({ type: "NUMBER", validation: { min: 1 }, defaultValue: 2 })).ok).toBe(true);
    expect(validateWorkFormFieldCompatibility(field({ type: "NUMBER", options: [{ label: "A", value: "a" }] })).ok).toBe(false);
    expect(validateWorkFormFieldCompatibility(field({ type: "SELECT", options: [] })).ok).toBe(false);
  });
});
