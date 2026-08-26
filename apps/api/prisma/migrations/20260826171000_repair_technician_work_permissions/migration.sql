-- Repair permissions for installations where the technical catalog/role data
-- was seeded before technician editing permissions were introduced.
INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at")
VALUES
  ('repair_permission_probe_types_read', 'probe_types.read', 'Read probe types.', 'probe_types', 'read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_update', 'works.update', 'Update assigned works.', 'works', 'update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_item_create', 'works.item.create', 'Add work components.', 'works', 'item.create', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_item_update', 'works.item.update', 'Update work components.', 'works', 'item.update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_item_remove', 'works.item.remove', 'Remove work components.', 'works', 'item.remove', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_scope_update', 'works.scope.update', 'Update work anatomical scope.', 'works', 'scope.update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_works_connections_manage', 'works.connections.manage', 'Manage tooth connections.', 'works', 'connections.manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."key" = 'TEHNICIAN'
  AND p."key" IN ('probe_types.read', 'works.update', 'works.item.create', 'works.item.update', 'works.item.remove', 'works.scope.update', 'works.connections.manage');

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ASSIGNED'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN'
  AND p."key" IN ('probe_types.read', 'works.update', 'works.item.create', 'works.item.update', 'works.item.remove', 'works.scope.update', 'works.connections.manage');
