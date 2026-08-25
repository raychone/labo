import type { Notification } from "@prisma/client";

export interface NotificationView {
  readonly createdAt: string;
  readonly deepLink: string;
  readonly id: string;
  readonly message: string;
  readonly metadata: Record<string, unknown> | null;
  readonly readAt: string | null;
  readonly resolvedAt: string | null;
  readonly resourceId: string | null;
  readonly resourceType: string;
  readonly severity: string;
  readonly title: string;
  readonly type: string;
}

export interface PaginatedNotificationsView {
  readonly items: readonly NotificationView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
  readonly unreadCount: number;
}

export function toNotificationView(notification: Notification): NotificationView {
  return {
    createdAt: notification.createdAt.toISOString(),
    deepLink: notification.deepLink,
    id: notification.id,
    message: notification.message,
    metadata: notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata)
      ? notification.metadata as Record<string, unknown>
      : null,
    readAt: notification.readAt?.toISOString() ?? null,
    resolvedAt: notification.resolvedAt?.toISOString() ?? null,
    resourceId: notification.resourceId,
    resourceType: notification.resourceType,
    severity: notification.severity,
    title: notification.title,
    type: notification.type,
  };
}
