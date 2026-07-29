import { describe, expect, it } from "vitest";

import type { DeadlineExecutionRuleInput } from "./deadline.types.js";
import { selectDeadlineExecutionRule } from "./deadline-rule-selector.js";

function rule(input: Partial<DeadlineExecutionRuleInput>): DeadlineExecutionRuleInput {
  return {
    executionDays: 3,
    isActive: true,
    maxQuantity: 5,
    minQuantity: 1,
    priority: 10,
    requiresManualDueDate: false,
    ...input,
  };
}

describe("selectDeadlineExecutionRule", () => {
  it("selects the active matching rule by deterministic priority", () => {
    const selected = selectDeadlineExecutionRule([
      rule({ executionDays: 5, maxQuantity: null, minQuantity: 1, priority: 20 }),
      rule({ executionDays: 2, maxQuantity: 4, minQuantity: 1, priority: 5 }),
    ], 3);

    expect(selected).toEqual({
      mode: "MATCHED",
      rule: {
        executionDays: 2,
        maxQuantity: 4,
        minQuantity: 1,
        priority: 5,
        requiresManualDueDate: false,
      },
    });
  });

  it("returns MANUAL-compatible rules without execution days", () => {
    const selected = selectDeadlineExecutionRule([
      rule({ executionDays: null, maxQuantity: null, minQuantity: 8, priority: 1, requiresManualDueDate: true }),
    ], 10);

    expect(selected.mode).toBe("MATCHED");
    expect(selected.mode === "MATCHED" ? selected.rule.requiresManualDueDate : false).toBe(true);
  });

  it("refuses ambiguous active rules with the same priority", () => {
    const selected = selectDeadlineExecutionRule([
      rule({ id: "a", maxQuantity: 5, minQuantity: 1, priority: 1 }),
      rule({ id: "b", maxQuantity: 7, minQuantity: 1, priority: 1 }),
    ], 4);

    expect(selected).toEqual({ mode: "UNRESOLVED", reason: "AMBIGUOUS_EXECUTION_RULES" });
  });

  it("ignores inactive rules and reports missing coverage", () => {
    const selected = selectDeadlineExecutionRule([
      rule({ isActive: false, maxQuantity: 10, minQuantity: 1 }),
    ], 2);

    expect(selected).toEqual({ mode: "UNRESOLVED", reason: "NO_EXECUTION_RULE" });
  });

  it("rejects invalid execution rule configuration", () => {
    const selected = selectDeadlineExecutionRule([
      rule({ executionDays: null, requiresManualDueDate: false }),
    ], 2);

    expect(selected).toEqual({ mode: "UNRESOLVED", reason: "INVALID_EXECUTION_RULE" });
  });
});
