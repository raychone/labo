export const LOGISTICS_AUDIT_ACTIONS = {
  groupCancelled: "logistics.group_cancelled",
  groupCreated: "logistics.group_created",
  groupMarkedReady: "logistics.group_marked_ready",
  groupUpdated: "logistics.group_updated",
  locationUpdated: "logistics.location_updated",
  packingCompleted: "logistics.packing_completed",
  packingStarted: "logistics.packing_started",
  readyForPackingConfirmed: "logistics.ready_for_packing_confirmed",
  workAddedToGroup: "logistics.work_added_to_group",
  workBlocked: "logistics.work_blocked",
  workReceived: "logistics.work_received",
  workRemovedFromGroup: "logistics.work_removed_from_group",
  workUnblocked: "logistics.work_unblocked",
} as const;

export const LOGISTICS_RESOURCE_TYPES = {
  deliveryPreparationGroup: "delivery_preparation_group",
  workLogistics: "work_logistics",
} as const;
