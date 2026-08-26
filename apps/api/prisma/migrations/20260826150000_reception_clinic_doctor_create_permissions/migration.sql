-- Reception creates clinics and doctors from the new-work intake form.
-- Keep this migration idempotent so it is safe for existing installations.
INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at")
VALUES
  ('repair_permission_clinics_create_reception', 'clinics.create', 'Create dental clinics.', 'clinics', 'create', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_doctors_create_reception', 'doctors.create', 'Create doctors.', 'doctors', 'create', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."key" = 'RECEPTIE'
  AND p."key" IN ('clinics.create', 'doctors.create')
ON CONFLICT DO NOTHING;
