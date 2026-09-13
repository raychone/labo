CREATE TYPE "TechnicianOperationQuantityRule" AS ENUM ('PER_ELEMENT', 'PER_ARCH', 'PER_WORK');

-- Older databases may predate the explicit catalog-read grants even though the
-- canonical MANAGER matrix already grants both permissions. Keep deployed RBAC
-- rows aligned so /pricing can load the two global catalogs during CREATE.
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope")
SELECT role."id", permission."id", 'ALL'::"PermissionScope"
FROM "roles" role
CROSS JOIN "permissions" permission
WHERE role."key" = 'MANAGER'
  AND permission."key" IN ('technician.operations.read', 'probe_types.read')
ON CONFLICT DO NOTHING;

ALTER TABLE "work_types"
  ADD COLUMN "allowed_anatomical_scopes" JSONB,
  ADD COLUMN "operation_applicability_configured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "probe_applicability_configured" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "technician_operations"
  ADD COLUMN "quantity_rule" "TechnicianOperationQuantityRule" NOT NULL DEFAULT 'PER_ELEMENT';

ALTER TABLE "technician_performed_operations"
  ADD COLUMN "quantity_rule_snapshot" "TechnicianOperationQuantityRule";

-- Existing earnings were calculated per selected element. Freeze that legacy
-- semantic before making the snapshot mandatory for all future records.
UPDATE "technician_performed_operations"
SET "quantity_rule_snapshot" = 'PER_ELEMENT'
WHERE "quantity_rule_snapshot" IS NULL;

ALTER TABLE "technician_performed_operations"
  ALTER COLUMN "quantity_rule_snapshot" SET NOT NULL;

CREATE TABLE "work_type_technician_operations" (
  "work_type_id" TEXT NOT NULL,
  "operation_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_type_technician_operations_pkey" PRIMARY KEY ("work_type_id", "operation_id")
);

CREATE TABLE "work_type_probe_types" (
  "work_type_id" TEXT NOT NULL,
  "probe_type_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_type_probe_types_pkey" PRIMARY KEY ("work_type_id", "probe_type_id")
);

CREATE INDEX "work_type_probe_types_probe_type_id_idx" ON "work_type_probe_types"("probe_type_id");
CREATE INDEX "work_type_probe_types_work_type_id_sort_order_idx" ON "work_type_probe_types"("work_type_id", "sort_order");

ALTER TABLE "work_type_probe_types"
  ADD CONSTRAINT "work_type_probe_types_work_type_id_fkey"
  FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_type_probe_types"
  ADD CONSTRAINT "work_type_probe_types_probe_type_id_fkey"
  FOREIGN KEY ("probe_type_id") REFERENCES "probe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "work_type_technician_operations_operation_id_idx"
  ON "work_type_technician_operations"("operation_id");

CREATE INDEX "work_type_technician_operations_work_type_id_sort_order_idx"
  ON "work_type_technician_operations"("work_type_id", "sort_order");

ALTER TABLE "work_type_technician_operations"
  ADD CONSTRAINT "work_type_technician_operations_work_type_id_fkey"
  FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_type_technician_operations"
  ADD CONSTRAINT "work_type_technician_operations_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "technician_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Anatomical scope was unrestricted before this migration. Persist that exact
-- behavior as the starting configuration instead of guessing from unit labels.
UPDATE "work_types"
SET "allowed_anatomical_scopes" = '["TOOTH","TEETH","UPPER_ARCH","LOWER_ARCH","BOTH_ARCHES","CASE"]'::jsonb;

-- Preserve the exact per-work-type order already encoded in probe_type_codes.
INSERT INTO "work_type_probe_types" ("work_type_id", "probe_type_id", "sort_order")
SELECT wt."id", pt."id", configured.ordinality - 1
FROM "work_types" wt
CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(wt."probe_type_codes", '[]'::jsonb)) WITH ORDINALITY AS configured(code, ordinality)
JOIN "probe_types" pt ON pt."code" = configured.code
ON CONFLICT ("work_type_id", "probe_type_id") DO NOTHING;

UPDATE "work_types"
SET "probe_applicability_configured" = true;

-- Materialize the legacy family/category inference so the manager can edit it.
-- Unknown legacy/custom work types previously saw the whole operation catalog;
-- known families keep the exact category mapping used by the application.
WITH work_type_family AS (
  SELECT
    wt."id",
    CASE
      WHEN wt."probe_family" IS NOT NULL THEN wt."probe_family"
      WHEN lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE ANY (ARRAY['%tf%', '%sf%', '%metalo%', '%metaloceramic%']) THEN 'MC'
      WHEN lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE '%zrp%'
        OR lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE '%zirconia placat%' THEN 'ZRP'
      WHEN lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) = 'zr'
        OR lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE '% zr %'
        OR lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE '%zircon%' THEN 'ZR'
      WHEN lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE '%protez%'
        OR lower(coalesce(wt."symbol", '') || ' ' || coalesce(wt."name", '')) LIKE '%lingură individuală%' THEN 'PRO'
      ELSE NULL
    END AS family
  FROM "work_types" wt
)
INSERT INTO "work_type_technician_operations" ("work_type_id", "operation_id", "sort_order")
SELECT wtf."id", operation."id", operation."sort_order"
FROM work_type_family wtf
CROSS JOIN "technician_operations" operation
WHERE
  operation."is_active" = true
  AND (
  wtf.family IS NULL
  OR (wtf.family = 'MC' AND operation."category" = 'Coroană ceramică')
  OR (wtf.family IN ('ZR', 'ZRP') AND operation."category" = 'Coroană zirconiu')
  OR (wtf.family = 'PRO' AND operation."category" = 'Altele')
  )
ON CONFLICT ("work_type_id", "operation_id") DO NOTHING;

UPDATE "work_types"
SET "operation_applicability_configured" = true;
