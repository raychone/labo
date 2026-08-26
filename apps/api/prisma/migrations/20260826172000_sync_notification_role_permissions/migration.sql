-- Keep the notification bell and persistent notification center available to
-- the operational roles even when the database was seeded before the current
-- RBAC matrix was introduced.
INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at")
VALUES
  ('repair_permission_notifications_read_own', 'notifications.read_own', 'Read own notifications.', 'notifications', 'read_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_notifications_mark_read_own', 'notifications.mark_read_own', 'Mark own notifications as read.', 'notifications', 'mark_read_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_notifications_dismiss_own', 'notifications.dismiss_own', 'Dismiss own notifications.', 'notifications', 'dismiss_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."key" IN ('MANAGER', 'LOGISTICA', 'RECEPTIE', 'TEHNICIAN', 'CURIER')
  AND p."key" IN ('notifications.read_own', 'notifications.mark_read_own', 'notifications.dismiss_own')
ON CONFLICT DO NOTHING;
