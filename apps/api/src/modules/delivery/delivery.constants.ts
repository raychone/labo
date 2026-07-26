export const DELIVERY_AUDIT_ACTIONS = {
  assigned: "delivery.courier_assigned",
  cancelled: "delivery.cancelled",
  completed: "delivery.completed",
  created: "delivery.created",
  failed: "delivery.failed",
  pickedUp: "delivery.picked_up",
  rescheduled: "delivery.rescheduled",
  startedTransit: "delivery.started_transit",
  unassigned: "delivery.courier_unassigned",
  updated: "delivery.updated",
} as const;

export const DELIVERY_RESOURCE_TYPE = "delivery";

