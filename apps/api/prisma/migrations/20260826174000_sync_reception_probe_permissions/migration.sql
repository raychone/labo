-- Reception must be able to read/select probe types and register the next
-- cycle after a returned work is received.
-- Keep this migration idempotent for databases that were seeded before the
-- reception probe flow was introduced.
INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at")
VALUES
  ('repair_permission_probe_types_read_reception', 'probe_types.read', 'Read the global laboratory ProbeType catalog.', 'probe_types', 'read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_cycles_create_next_reception', 'cycles.create_next', 'Register a returned work and create the next work cycle.', 'cycles', 'create_next', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_cycles_probe_type_select_reception', 'cycles.probe_type.select', 'Select probe types for a work cycle.', 'cycles', 'probe_type_select', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."key" = 'RECEPTIE'
  AND p."key" IN ('probe_types.read', 'cycles.create_next', 'cycles.probe_type.select')
ON CONFLICT DO NOTHING;
