INSERT INTO "permissions" ("id", "key", "description", "resource", "action", "created_at", "updated_at") VALUES
  ('repair_permission_organization_context_read', 'organization_context.read', 'Read active organization context.', 'organization_context', 'read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_operations_read', 'technician.operations.read', 'Read technician operation catalog and performed operations.', 'technician', 'operations.read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_operations_manage_own', 'technician.operations.manage_own', 'Manage own performed technician operations.', 'technician', 'operations.manage_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_earnings_read_own', 'technician.earnings.read_own', 'Read own technician earnings.', 'technician', 'earnings.read_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_earnings_read_all', 'technician.earnings.read_all', 'Read all technician earnings.', 'technician', 'earnings.read_all', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_rates_read', 'technician.rates.read', 'Read technician operation rates.', 'technician', 'rates.read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_rates_manage', 'technician.rates.manage', 'Manage technician operation rates.', 'technician', 'rates.manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_payments_read_own', 'technician.payments.read_own', 'Read own technician payments and balance.', 'technician', 'payments.read_own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_payments_read_all', 'technician.payments.read_all', 'Read all technician payments and balances.', 'technician', 'payments.read_all', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('repair_permission_technician_payments_create', 'technician.payments.create', 'Record a technician payment.', 'technician', 'payments.create', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" IN ('MANAGER', 'LOGISTICA', 'RECEPTIE', 'TEHNICIAN', 'CURIER', 'MEDIC')
  AND p."key" = 'organization_context.read'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN'
  AND p."key" IN ('technician.operations.read')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ASSIGNED'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN'
  AND p."key" IN ('technician.operations.manage_own', 'technician.earnings.read_own', 'technician.payments.read_own')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'MANAGER'
  AND p."key" IN ('technician.earnings.read_all', 'technician.rates.read', 'technician.rates.manage', 'technician.payments.read_all', 'technician.payments.create')
ON CONFLICT DO NOTHING;
