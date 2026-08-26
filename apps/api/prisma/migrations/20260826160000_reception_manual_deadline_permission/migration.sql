-- Reception may enter or clear the optional deadline time on a work.
INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at")
VALUES (
  'repair_permission_reception_deadline_set_manual',
  'works.deadline.set_manual',
  'Set or clear manual work deadlines.',
  'works',
  'deadline.set_manual',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."key" = 'RECEPTIE'
  AND p."key" = 'works.deadline.set_manual'
ON CONFLICT DO NOTHING;
