export const NOTIFICATION_RESOURCE_TYPE = "notification";

export const NOTIFICATION_SEVERITIES = ["INFO", "SUCCESS", "WARNING", "ERROR", "ACTION"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const NOTIFICATION_AUDIT_ACTIONS = {
  created: "notification.created",
  read: "notification.read",
  readAll: "notification.read_all",
  reconciled: "notification.reconciled",
  resolved: "notification.resolved",
} as const;
