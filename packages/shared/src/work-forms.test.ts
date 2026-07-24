import { describe, expect, it } from "vitest";

import {
  isWorkFormFieldKey,
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

  it("checks field type compatibility", () => {
    expect(validateWorkFormFieldCompatibility(field({ type: "NUMBER", validation: { min: 1 }, defaultValue: 2 })).ok).toBe(true);
    expect(validateWorkFormFieldCompatibility(field({ type: "NUMBER", options: [{ label: "A", value: "a" }] })).ok).toBe(false);
    expect(validateWorkFormFieldCompatibility(field({ type: "SELECT", options: [] })).ok).toBe(false);
  });
});
