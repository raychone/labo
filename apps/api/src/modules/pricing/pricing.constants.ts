export const PRICING_RESOURCE_TYPES = {
  agreement: "pricing_agreement",
  catalogItem: "price_catalog_item",
} as const;

export const PRICING_AUDIT_ACTIONS = {
  agreementArchived: "pricing.agreement_archived",
  agreementCreated: "pricing.agreement_created",
  agreementRestored: "pricing.agreement_restored",
  agreementRulesReplaced: "pricing.agreement_rules_replaced",
  agreementUpdated: "pricing.agreement_updated",
  catalogItemArchived: "pricing.catalog_item_archived",
  catalogItemCreated: "pricing.catalog_item_created",
  catalogItemRestored: "pricing.catalog_item_restored",
  catalogItemUpdated: "pricing.catalog_item_updated",
  executionRulesReplaced: "pricing.execution_rules_replaced",
} as const;

export const PRICING_CATEGORIES = [
  "Ceramică",
  "Zirconiu",
  "Implanturi",
  "Proteze mobile",
  "Reparații",
  "Modele și ghiduri",
  "Alte lucrări",
] as const;

export const PRICING_SORT_FIELDS = ["category", "displayName", "standardPriceMinor", "sortOrder", "updatedAt"] as const;
export const PRICING_AGREEMENT_SORT_FIELDS = ["name", "validFrom", "validUntil", "updatedAt"] as const;
export const PRICING_AGREEMENT_SUBJECT_TYPES = ["CLINIC", "DOCTOR"] as const;
export const PRICING_RULE_SCOPES = ["ALL", "CATEGORY", "ITEM"] as const;
export const PRICING_ADJUSTMENT_TYPES = ["FIXED_AMOUNT", "PERCENTAGE", "OVERRIDE_PRICE"] as const;
export const MAX_PRICE_MINOR = 100_000_000;
export const MAX_PERCENTAGE_BASIS_POINTS = 10_000;
