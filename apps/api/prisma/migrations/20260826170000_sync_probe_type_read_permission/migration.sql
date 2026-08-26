-- Keep the database permission in sync with the technician probe-type route.
-- Probe types are a read-only global catalog, so technicians need the catalog
-- while editing their assigned works.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."key" = 'TEHNICIAN'
  AND p."key" = 'probe_types.read';

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ASSIGNED'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN' AND p."key" = 'probe_types.read';
