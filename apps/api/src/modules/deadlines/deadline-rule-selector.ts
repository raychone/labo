import type { DeadlineExecutionRuleInput, DeadlineMatchedRule, DeadlineUnresolvedReason } from "./deadline.types.js";

export type DeadlineRuleSelection =
  | { readonly mode: "MATCHED"; readonly rule: DeadlineMatchedRule }
  | { readonly mode: "UNRESOLVED"; readonly reason: DeadlineUnresolvedReason };

export function selectDeadlineExecutionRule(
  rules: readonly DeadlineExecutionRuleInput[],
  quantity: number,
): DeadlineRuleSelection {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return { mode: "UNRESOLVED", reason: "INVALID_QUANTITY" };
  }

  for (const rule of rules) {
    if (!isValidDeadlineRule(rule)) {
      return { mode: "UNRESOLVED", reason: "INVALID_EXECUTION_RULE" };
    }
  }

  const matches = rules
    .filter((rule) => rule.isActive !== false)
    .filter((rule) => quantity >= rule.minQuantity && (rule.maxQuantity === null || rule.maxQuantity === undefined || quantity <= rule.maxQuantity))
    .map(toMatchedRule)
    .sort((left, right) => left.priority - right.priority || left.minQuantity - right.minQuantity);

  if (matches.length === 0) {
    return { mode: "UNRESOLVED", reason: "NO_EXECUTION_RULE" };
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    return { mode: "UNRESOLVED", reason: "NO_EXECUTION_RULE" };
  }

  const topPriority = firstMatch.priority;
  const topMatches = matches.filter((rule) => rule.priority === topPriority);

  if (topMatches.length > 1) {
    return { mode: "UNRESOLVED", reason: "AMBIGUOUS_EXECUTION_RULES" };
  }

  return { mode: "MATCHED", rule: firstMatch };
}

function isValidDeadlineRule(rule: DeadlineExecutionRuleInput): boolean {
  if (!Number.isSafeInteger(rule.minQuantity) || rule.minQuantity < 1) {
    return false;
  }

  if (rule.maxQuantity !== null && rule.maxQuantity !== undefined) {
    if (!Number.isSafeInteger(rule.maxQuantity) || rule.maxQuantity < rule.minQuantity) {
      return false;
    }
  }

  const priority = rule.priority ?? 0;
  if (!Number.isSafeInteger(priority)) {
    return false;
  }

  if (rule.requiresManualDueDate) {
    return rule.executionDays === null || rule.executionDays === undefined;
  }

  return Number.isSafeInteger(rule.executionDays) && (rule.executionDays ?? 0) >= 0;
}

function toMatchedRule(rule: DeadlineExecutionRuleInput): DeadlineMatchedRule {
  return {
    executionDays: rule.executionDays ?? null,
    maxQuantity: rule.maxQuantity ?? null,
    minQuantity: rule.minQuantity,
    priority: rule.priority ?? 0,
    requiresManualDueDate: rule.requiresManualDueDate,
  };
}
