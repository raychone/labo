-- Logistics needs to read the technical probe catalog when inspecting or
-- preparing returned/probe work.
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."key" = 'LOGISTICA'
  AND p."key" = 'probe_types.read'
ON CONFLICT DO NOTHING;
