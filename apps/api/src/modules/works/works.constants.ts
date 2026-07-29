export const WORK_ORDER_RESOURCE_TYPE = "work_order";
export const WORK_ORDER_SORT_FIELDS = ["code", "createdAt", "priority", "requestedDeliveryDate", "status", "totalPriceMinor", "updatedAt"] as const;
export const WORK_PRIORITIES = ["NORMAL", "URGENT"] as const;
export const WORK_STATUSES = ["REGISTERED"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export const MAX_WORK_ORDER_QUANTITY = 99;

export const WORK_ORDER_AUDIT_ACTIONS = {
  created: "work_orders.created",
  deadlineCreated: "work_orders.deadline_created",
  deadlineManualSet: "work_orders.deadline_manual_set",
  deadlineRecalculated: "work_orders.deadline_recalculated",
  deadlineUnresolved: "work_orders.deadline_unresolved",
  updated: "work_orders.updated",
  updatedWithDeadlineRecalculation: "work_orders.updated_deadline_recalculated",
} as const;
