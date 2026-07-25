import { describe, expect, it } from "vitest";

import {
  formatWorkflowDuration,
  getChangedWorkflowStageKeys,
  isWorkflowStageKey,
  normalizeWorkflowStagesOrder,
  validateWorkflowInitialFinal,
  validateWorkflowRoleCodes,
  type WorkflowStageDefinition,
} from "./workflow-templates.js";

function stage(overrides: Partial<WorkflowStageDefinition>): WorkflowStageDefinition {
  return {
    allowedRoleCodes: ["TEHNICIAN"],
    description: null,
    estimatedDurationMinutes: null,
    isFinal: false,
    isInitial: false,
    key: "model",
    name: "Model",
    sortOrder: 1,
    ...overrides,
  };
}

describe("workflow template helpers", () => {
  it("validates stable stage keys", () => {
    expect(isWorkflowStageKey("pregatire_livrare")).toBe(true);
    expect(isWorkflowStageKey("Pregatire")).toBe(false);
    expect(isWorkflowStageKey("work_order")).toBe(false);
    expect(isWorkflowStageKey("cad.scan")).toBe(false);
  });

  it("normalizes linear stage order and derives initial/final markers", () => {
    const input = [
      stage({ key: "cad", sortOrder: 9 }),
      stage({ key: "receptie", sortOrder: 1 }),
    ];

    const result = normalizeWorkflowStagesOrder(input);

    expect(result.map((item) => item.sortOrder)).toStrictEqual([1, 2]);
    expect(result.map((item) => [item.key, item.isInitial, item.isFinal])).toStrictEqual([
      ["receptie", true, false],
      ["cad", false, true],
    ]);
    expect(input[0]?.sortOrder).toBe(9);
  });

  it("validates role codes with duplicate detection", () => {
    expect(validateWorkflowRoleCodes(["TEHNICIAN", "MANAGER"]).ok).toBe(true);
    expect(validateWorkflowRoleCodes(["TEHNICIAN", "TEHNICIAN", "ADMIN"]).errors).toContain("Duplicate role code: TEHNICIAN.");
  });

  it("validates initial and final markers", () => {
    const result = validateWorkflowInitialFinal([
      stage({ key: "a", isInitial: true, sortOrder: 1 }),
      stage({ key: "b", isFinal: true, sortOrder: 2 }),
    ]);

    expect(result.ok).toBe(true);
  });

  it("formats durations and compares changed stages", () => {
    expect(formatWorkflowDuration(null)).toBe("Fără durată estimată");
    expect(formatWorkflowDuration(120)).toBe("2 h");
    expect(getChangedWorkflowStageKeys([stage({ key: "a" })], [stage({ key: "a", name: "Alt" })])).toStrictEqual(["a"]);
  });
});
