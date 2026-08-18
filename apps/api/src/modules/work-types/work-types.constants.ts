export const WORK_TYPE_RESOURCE_TYPE = "work_type";
export const WORK_TYPE_UNITS = ["ELEMENT", "UNIT", "ARCH", "CASE", "REPAIR", "OTHER"] as const;
export const WORK_TYPE_SORT_FIELDS = ["basePriceMinor", "code", "createdAt", "name", "symbol", "updatedAt"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export const MAX_BASE_PRICE_MINOR = 100_000_000;

export const WORK_TYPES_AUDIT_ACTIONS = {
  archived: "work_types.archived",
  created: "work_types.created",
  priceUpdated: "work_types.price_updated",
  restored: "work_types.restored",
  updated: "work_types.updated",
} as const;
