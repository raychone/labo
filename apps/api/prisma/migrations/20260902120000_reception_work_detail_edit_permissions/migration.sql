-- Reception can correct the intake record after a work is created.
-- Keep financial permissions and technical execution permissions unchanged.
WITH desired("permission_key", "scope") AS (
  VALUES
    ('works.update', 'ALL'),
    ('works.item.create', 'ALL'),
    ('works.item.update', 'ALL'),
    ('works.item.remove', 'ALL'),
    ('works.scope.update', 'ALL'),
    ('works.connections.manage', 'ALL')
)
DELETE FROM "role_permissions" rp
USING (
  SELECT r."id" AS "role_id", p."id" AS "permission_id", desired."scope"::"PermissionScope" AS "scope"
  FROM desired
  JOIN "roles" r ON r."key" = 'RECEPTIE'
  JOIN "permissions" p ON p."key" = desired."permission_key"
) canonical
WHERE rp."role_id" = canonical."role_id"
  AND rp."permission_id" = canonical."permission_id"
  AND rp."scope" <> canonical."scope";

WITH desired("permission_key", "scope") AS (
  VALUES
    ('works.update', 'ALL'),
    ('works.item.create', 'ALL'),
    ('works.item.update', 'ALL'),
    ('works.item.remove', 'ALL'),
    ('works.scope.update', 'ALL'),
    ('works.connections.manage', 'ALL')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", desired."scope"::"PermissionScope"
FROM desired
JOIN "roles" r ON r."key" = 'RECEPTIE'
JOIN "permissions" p ON p."key" = desired."permission_key"
WHERE NOT EXISTS (
  SELECT 1
  FROM "role_permissions" existing
  WHERE existing."role_id" = r."id"
    AND existing."permission_id" = p."id"
    AND existing."scope" = desired."scope"::"PermissionScope"
);
