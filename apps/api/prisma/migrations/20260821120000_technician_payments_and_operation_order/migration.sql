ALTER TABLE "technician_operations" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "technician_operations_sort_order_idx" ON "technician_operations"("sort_order");

CREATE TABLE "technician_payments" (
    "id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'RON',
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(500),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "technician_payments_technician_id_paid_at_idx" ON "technician_payments"("technician_id", "paid_at");
CREATE INDEX "technician_payments_created_by_user_id_idx" ON "technician_payments"("created_by_user_id");
ALTER TABLE "technician_payments" ADD CONSTRAINT "technician_payments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_payments" ADD CONSTRAINT "technician_payments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_route_stops" ADD COLUMN "address_override" VARCHAR(300);
ALTER TABLE "courier_route_stops" ADD COLUMN "phone_override" VARCHAR(40);
ALTER TABLE "courier_route_stops" ADD COLUMN "stop_notes" VARCHAR(500);

INSERT INTO "permissions" ("key", "description", "resource", "action") VALUES
  ('technician.payments.read_own', 'Read own technician payments and balance.', 'technician', 'payments.read_own'),
  ('technician.payments.read_all', 'Read all technician payments and balances.', 'technician', 'payments.read_all'),
  ('technician.payments.create', 'Record a technician payment.', 'technician', 'payments.create')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "resource" = EXCLUDED."resource", "action" = EXCLUDED."action";

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'MANAGER' AND p."key" IN ('technician.payments.read_all', 'technician.payments.create')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ASSIGNED'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN' AND p."key" = 'technician.payments.read_own'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", CASE WHEN p."key" = 'technician.earnings.read_own' THEN 'ASSIGNED'::"PermissionScope" ELSE 'ALL'::"PermissionScope" END
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'TEHNICIAN' AND p."key" IN ('technician.operations.read', 'technician.operations.manage_own', 'technician.earnings.read_own')
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT r."id", p."id", 'ALL'::"PermissionScope"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'MANAGER' AND p."key" IN ('technician.earnings.read_all', 'technician.rates.read', 'technician.rates.manage')
ON CONFLICT DO NOTHING;
