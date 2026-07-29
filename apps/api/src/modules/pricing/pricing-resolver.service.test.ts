import type { ExecutionTimeRule, PriceCatalogItem, PricingAgreement, PricingAgreementRule } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  applyPricingAdjustment,
  findApplicableRule,
  findFirstApplicableAgreementRule,
  selectExecutionTimeRule,
} from "./pricing-resolver.service.js";

function rule(input: Partial<PricingAgreementRule>): PricingAgreementRule {
  return {
    adjustmentPercentageBasisPoints: null,
    adjustmentType: "PERCENTAGE",
    adjustmentValueMinor: null,
    category: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    id: "rule_1",
    overridePriceMinor: null,
    priceCatalogItemId: null,
    pricingAgreementId: "agreement_1",
    scope: "ALL",
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...input,
  };
}

function agreement(id: string, rules: readonly PricingAgreementRule[]): PricingAgreement & { readonly rules: readonly PricingAgreementRule[] } {
  return {
    archivedAt: null,
    archivedByUserId: null,
    clinicId: "clinic_1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    createdByUserId: "user_1",
    doctorId: null,
    id,
    isActive: true,
    legalEntityId: "legal_nc",
    name: id,
    notes: null,
    rules,
    subjectType: "CLINIC",
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedByUserId: "user_1",
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
    validUntil: null,
  };
}

function executionRule(input: Partial<ExecutionTimeRule>): ExecutionTimeRule {
  return {
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    createdByUserId: "user_1",
    executionDays: 3,
    id: "execution_rule_1",
    isActive: true,
    maxQuantity: 3,
    minQuantity: 1,
    priceCatalogItemId: "catalog_1",
    priority: 1,
    requiresManualDueDate: false,
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedByUserId: "user_1",
    ...input,
  };
}

const catalogItem = {
  category: "Zirconiu",
  id: "catalog_1",
} satisfies Pick<PriceCatalogItem, "category" | "id">;

describe("pricing resolver pure rules", () => {
  it("applies item rules before category and global rules", () => {
    const selected = findApplicableRule([
      rule({ id: "all", scope: "ALL" }),
      rule({ category: "Zirconiu", id: "category", scope: "CATEGORY" }),
      rule({ id: "item", priceCatalogItemId: "catalog_1", scope: "ITEM" }),
    ], catalogItem);

    expect(selected?.id).toBe("item");
  });

  it("uses the first agreement that has an applicable rule", () => {
    const selected = findFirstApplicableAgreementRule([
      agreement("agreement_without_match", [rule({ category: "Ceramică", id: "wrong_category", scope: "CATEGORY" })]),
      agreement("agreement_with_match", [rule({ category: "Zirconiu", id: "right_category", scope: "CATEGORY" })]),
    ], catalogItem);

    expect(selected?.agreement.id).toBe("agreement_with_match");
    expect(selected?.rule.id).toBe("right_category");
  });

  it("calculates fixed, percentage and override adjustments in minor units", () => {
    expect(applyPricingAdjustment(30_000, rule({ adjustmentType: "FIXED_AMOUNT", adjustmentValueMinor: 5_000 }))).toBe(25_000);
    expect(applyPricingAdjustment(30_000, rule({ adjustmentPercentageBasisPoints: 1_000, adjustmentType: "PERCENTAGE" }))).toBe(27_000);
    expect(applyPricingAdjustment(30_000, rule({ adjustmentType: "OVERRIDE_PRICE", overridePriceMinor: 28_000 }))).toBe(28_000);
  });

  it("selects the matching execution interval by quantity and priority", () => {
    const selected = selectExecutionTimeRule([
      executionRule({ id: "one_to_three", maxQuantity: 3, minQuantity: 1, priority: 1 }),
      executionRule({ executionDays: 4, id: "four_to_seven", maxQuantity: 7, minQuantity: 4, priority: 2 }),
      executionRule({ executionDays: null, id: "manual", maxQuantity: null, minQuantity: 8, priority: 3, requiresManualDueDate: true }),
    ], 6);

    expect(selected?.id).toBe("four_to_seven");
    expect(selected?.executionDays).toBe(4);
  });
});
