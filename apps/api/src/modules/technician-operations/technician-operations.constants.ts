export const TECHNICIAN_OPERATION_RESOURCE_TYPES = {
  operation: "technician_operation",
  performedOperation: "technician_performed_operation",
  rate: "technician_operation_rate",
} as const;

export const TECHNICIAN_OPERATION_AUDIT_ACTIONS = {
  operationArchived: "technician_operations.archived",
  operationCreated: "technician_operations.created",
  operationRestored: "technician_operations.restored",
  operationUpdated: "technician_operations.updated",
  operationUnitChanged: "technician_operations.unit_changed",
  performedOperationCreated: "technician_performed_operations.created",
  performedOperationRemoved: "technician_performed_operations.removed",
  rateSet: "technician_rates.set",
} as const;

export const MAX_TECHNICIAN_RATE_MINOR = 100_000_000;
