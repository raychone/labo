-- Keep the technician queue and its notification center usable on databases
-- that were seeded before the probe-return permissions were introduced.
INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at")
VALUES
  ('repair_permission_technician_workbench_read', 'technician.workbench.read', 'Read the technician workbench.', 'technician', 'workbench.read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_claim_available_read', 'works.claim.available.read', 'Read works available for technician claim.', 'works', 'claim.available.read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_notifications_read_own_technician', 'notifications.read_own', 'Read own notifications.', 'notifications', 'read_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_notifications_mark_read_own_technician', 'notifications.mark_read_own', 'Mark own notifications as read.', 'notifications', 'mark_read_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_notifications_dismiss_own_technician', 'notifications.dismiss_own', 'Dismiss own notifications.', 'notifications', 'dismiss_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- role_permissions has a three-column primary key on current databases, while
-- older seeds may already contain the same role/permission with another scope.
-- Remove only those conflicting historical rows before inserting the canonical
-- scope; this avoids relying on a two-column unique constraint.
WITH desired("role_key", "permission_key", "scope") AS (
  VALUES
    ('TEHNICIAN', 'technician.workbench.read', 'ASSIGNED'),
    ('TEHNICIAN', 'works.claim.available.read', 'ALL'),
    ('TEHNICIAN', 'notifications.read_own', 'ALL'),
    ('TEHNICIAN', 'notifications.mark_read_own', 'ALL'),
    ('TEHNICIAN', 'notifications.dismiss_own', 'ALL'),
    ('MANAGER', 'notifications.read_own', 'ALL'),
    ('MANAGER', 'notifications.mark_read_own', 'ALL'),
    ('MANAGER', 'notifications.dismiss_own', 'ALL')
)
DELETE FROM "role_permissions" rp
USING (
  SELECT r."id" AS "role_id", p."id" AS "permission_id", desired."scope"::"PermissionScope" AS "scope"
  FROM desired
  JOIN "roles" r ON r."key" = desired."role_key"
  JOIN "permissions" p ON p."key" = desired."permission_key"
) canonical
WHERE rp."role_id" = canonical."role_id"
  AND rp."permission_id" = canonical."permission_id"
  AND rp."scope" <> canonical."scope";

WITH desired("role_key", "permission_key", "scope") AS (
  VALUES
    ('TEHNICIAN', 'technician.workbench.read', 'ASSIGNED'),
    ('TEHNICIAN', 'works.claim.available.read', 'ALL'),
    ('TEHNICIAN', 'notifications.read_own', 'ALL'),
    ('TEHNICIAN', 'notifications.mark_read_own', 'ALL'),
    ('TEHNICIAN', 'notifications.dismiss_own', 'ALL'),
    ('MANAGER', 'notifications.read_own', 'ALL'),
    ('MANAGER', 'notifications.mark_read_own', 'ALL'),
    ('MANAGER', 'notifications.dismiss_own', 'ALL')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", desired."scope"::"PermissionScope"
FROM desired
JOIN "roles" r ON r."key" = desired."role_key"
JOIN "permissions" p ON p."key" = desired."permission_key"
WHERE NOT EXISTS (
  SELECT 1 FROM "role_permissions" existing
  WHERE existing."role_id" = r."id"
    AND existing."permission_id" = p."id"
    AND existing."scope" = desired."scope"::"PermissionScope"
);
