export const OPERATIONAL_STATUS_TABS = ["TODAY", "IN_PROGRESS", "AVAILABLE", "LATE", "AT_CLINIC", "RETURNED", "COMPLETED"] as const;
export const OPERATIONAL_STATUS_SORT_FIELDS = ["effectiveDueAt", "priority", "createdAt", "updatedAt", "workCode", "clinicName", "patientName"] as const;
export const OPERATIONAL_STATUS_SORT_DIRECTIONS = ["asc", "desc"] as const;
export const OPERATIONAL_STATUS_DEADLINE_STATES = ["UNKNOWN", "UNRESOLVED", "ON_TIME", "DUE_TODAY", "DUE_TOMORROW", "WARNING", "LATE", "MANUAL"] as const;
export const OPERATIONAL_STATUS_LOGISTICS_STATUSES = ["RECEIVED", "IN_PRODUCTION", "BLOCKED", "READY_FOR_PACKING", "PACKING", "READY_FOR_DELIVERY", "HANDED_TO_DELIVERY", "DELIVERED"] as const;
export const OPERATIONAL_STATUS_DELIVERY_STATUSES = ["PLANNED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"] as const;
export const OPERATIONAL_STATUS_PRIORITIES = ["NORMAL", "URGENT"] as const;
export const OPERATIONAL_STATUS_LEGAL_ENTITY_CODES = ["NC", "NG"] as const;
export const OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE = 25;
export const OPERATIONAL_STATUS_MAX_PAGE_SIZE = 100;
export const OPERATIONAL_STATUS_MAX_SCANNED_ROWS = 1_000;

export type OperationalStatusTab = (typeof OPERATIONAL_STATUS_TABS)[number];
export type OperationalStatusSortField = (typeof OPERATIONAL_STATUS_SORT_FIELDS)[number];
export type OperationalStatusSortDirection = (typeof OPERATIONAL_STATUS_SORT_DIRECTIONS)[number];
