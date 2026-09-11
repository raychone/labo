-- Logistics registers a returned probe in the same Status modal as Reception.
-- Sync existing deployments, which are not reseeded on every release.
DELETE FROM "role_permissions" AS rp
USING "roles" AS r, "permissions" AS p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."key" = 'LOGISTICA'
  AND p."key" = 'cycles.create_next';

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" AS r
CROSS JOIN "permissions" AS p
WHERE r."key" = 'LOGISTICA'
  AND p."key" = 'cycles.create_next';
