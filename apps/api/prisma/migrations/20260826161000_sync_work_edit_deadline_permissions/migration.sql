-- Synchronize role permissions used by work editing and deadline controls.
-- role_permissions has a composite primary key including scope, so replace
-- affected grants explicitly instead of using a two-column upsert.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."key" = 'LOGISTICA'
  AND p."key" = 'works.deadline.set_manual';

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'LOGISTICA' AND p."key" = 'works.deadline.set_manual';

DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."key" = 'TEHNICIAN'
  AND p."key" IN ('clinics.read', 'doctors.read', 'works.update', 'works.item.create', 'works.item.remove', 'works.item.update', 'works.scope.update', 'works.connections.manage', 'works.technical_details.update');

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN' AND p."key" IN ('clinics.read', 'doctors.read');

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ASSIGNED'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN'
  AND p."key" IN ('works.update', 'works.item.create', 'works.item.remove', 'works.item.update', 'works.scope.update', 'works.connections.manage', 'works.technical_details.update');
