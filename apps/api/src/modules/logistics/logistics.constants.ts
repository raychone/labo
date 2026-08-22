export const LOGISTICS_AUDIT_ACTIONS = {
  attachmentUploaded: "logistics.attachment_uploaded",
  groupCancelled: "logistics.group_cancelled",
  groupCreated: "logistics.group_created",
  groupMarkedReady: "logistics.group_marked_ready",
  groupUpdated: "logistics.group_updated",
  locationUpdated: "logistics.location_updated",
  packingCompleted: "logistics.packing_completed",
  packingStarted: "logistics.packing_started",
  pickupCancelled: "pickup.cancelled",
  pickupCreated: "pickup.created",
  pickupUpdated: "pickup.updated",
  readyForPackingConfirmed: "logistics.ready_for_packing_confirmed",
  routeCreated: "route.created",
  routeStopOutcomeCorrected: "route.stop_outcome_corrected",
  routeStopOutcomeRecorded: "route.stop_outcome_recorded",
  routeUpdated: "route.updated",
  routeCancelled: "route.cancelled",
  workAddedToGroup: "logistics.work_added_to_group",
  workBlocked: "logistics.work_blocked",
  workReceived: "logistics.work_received",
  workRemovedFromGroup: "logistics.work_removed_from_group",
  workUnblocked: "logistics.work_unblocked",
  workActionsUpdated: "logistics.work_actions_updated",
} as const;

export const LOGISTICS_RESOURCE_TYPES = {
  deliveryPreparationGroup: "delivery_preparation_group",
  courierRoute: "courier_route",
  pickupRequest: "pickup_request",
  workAttachment: "work_attachment",
  workLogistics: "work_logistics",
} as const;

export const LOGISTICS_ATTACHMENT_LIMITS = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 8,
  maxTotalBytes: 20 * 1024 * 1024,
} as const;
