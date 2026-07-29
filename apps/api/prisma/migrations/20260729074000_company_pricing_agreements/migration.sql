DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ELEMENT' AND enumtypid = '"WorkTypeUnit"'::regtype) THEN
    ALTER TYPE "WorkTypeUnit" ADD VALUE 'ELEMENT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ARCH' AND enumtypid = '"WorkTypeUnit"'::regtype) THEN
    ALTER TYPE "WorkTypeUnit" ADD VALUE 'ARCH';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CASE' AND enumtypid = '"WorkTypeUnit"'::regtype) THEN
    ALTER TYPE "WorkTypeUnit" ADD VALUE 'CASE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REPAIR' AND enumtypid = '"WorkTypeUnit"'::regtype) THEN
    ALTER TYPE "WorkTypeUnit" ADD VALUE 'REPAIR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OTHER' AND enumtypid = '"WorkTypeUnit"'::regtype) THEN
    ALTER TYPE "WorkTypeUnit" ADD VALUE 'OTHER';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PricingAgreementSubjectType') THEN
    CREATE TYPE "PricingAgreementSubjectType" AS ENUM ('CLINIC', 'DOCTOR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PricingRuleScope') THEN
    CREATE TYPE "PricingRuleScope" AS ENUM ('ALL', 'CATEGORY', 'ITEM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PricingAdjustmentType') THEN
    CREATE TYPE "PricingAdjustmentType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE', 'OVERRIDE_PRICE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "price_catalog_items" (
  "id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "work_type_id" TEXT NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "unit" "WorkTypeUnit" NOT NULL DEFAULT 'UNIT',
  "standard_price_minor" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(1000),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "archived_at" TIMESTAMP(3),
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_catalog_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_catalog_items_standard_price_minor_check" CHECK ("standard_price_minor" >= 0),
  CONSTRAINT "price_catalog_items_category_trim_check" CHECK (length(btrim("category")) > 0),
  CONSTRAINT "price_catalog_items_display_name_trim_check" CHECK (length(btrim("display_name")) > 0)
);

CREATE TABLE IF NOT EXISTS "execution_time_rules" (
  "id" TEXT NOT NULL,
  "price_catalog_item_id" TEXT NOT NULL,
  "min_quantity" INTEGER NOT NULL,
  "max_quantity" INTEGER,
  "execution_days" INTEGER,
  "requires_manual_due_date" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "execution_time_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "execution_time_rules_quantity_check" CHECK ("min_quantity" >= 1 AND ("max_quantity" IS NULL OR "max_quantity" >= "min_quantity")),
  CONSTRAINT "execution_time_rules_due_check" CHECK (
    (requires_manual_due_date = true AND execution_days IS NULL)
    OR
    (requires_manual_due_date = false AND execution_days IS NOT NULL AND execution_days > 0)
  )
);

CREATE TABLE IF NOT EXISTS "pricing_agreements" (
  "id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "subject_type" "PricingAgreementSubjectType" NOT NULL,
  "clinic_id" TEXT,
  "doctor_id" TEXT,
  "name" VARCHAR(160) NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_until" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" VARCHAR(1000),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "archived_at" TIMESTAMP(3),
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_agreements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_agreements_subject_check" CHECK (
    ("subject_type" = 'CLINIC' AND "clinic_id" IS NOT NULL AND "doctor_id" IS NULL)
    OR
    ("subject_type" = 'DOCTOR' AND "doctor_id" IS NOT NULL AND "clinic_id" IS NULL)
  ),
  CONSTRAINT "pricing_agreements_valid_range_check" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from"),
  CONSTRAINT "pricing_agreements_name_trim_check" CHECK (length(btrim("name")) > 0)
);

CREATE TABLE IF NOT EXISTS "pricing_agreement_rules" (
  "id" TEXT NOT NULL,
  "pricing_agreement_id" TEXT NOT NULL,
  "scope" "PricingRuleScope" NOT NULL,
  "price_catalog_item_id" TEXT,
  "category" VARCHAR(100),
  "adjustment_type" "PricingAdjustmentType" NOT NULL,
  "adjustment_value_minor" INTEGER,
  "adjustment_percentage_basis_points" INTEGER,
  "override_price_minor" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_agreement_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_agreement_rules_scope_check" CHECK (
    ("scope" = 'ALL' AND "price_catalog_item_id" IS NULL AND "category" IS NULL)
    OR
    ("scope" = 'CATEGORY' AND "price_catalog_item_id" IS NULL AND "category" IS NOT NULL AND length(btrim("category")) > 0)
    OR
    ("scope" = 'ITEM' AND "price_catalog_item_id" IS NOT NULL AND "category" IS NULL)
  ),
  CONSTRAINT "pricing_agreement_rules_adjustment_check" CHECK (
    ("adjustment_type" = 'FIXED_AMOUNT' AND "adjustment_value_minor" IS NOT NULL AND "adjustment_value_minor" >= 0 AND "adjustment_percentage_basis_points" IS NULL AND "override_price_minor" IS NULL)
    OR
    ("adjustment_type" = 'PERCENTAGE' AND "adjustment_percentage_basis_points" IS NOT NULL AND "adjustment_percentage_basis_points" >= 0 AND "adjustment_percentage_basis_points" <= 10000 AND "adjustment_value_minor" IS NULL AND "override_price_minor" IS NULL)
    OR
    ("adjustment_type" = 'OVERRIDE_PRICE' AND "override_price_minor" IS NOT NULL AND "override_price_minor" >= 0 AND "adjustment_value_minor" IS NULL AND "adjustment_percentage_basis_points" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS "price_catalog_items_legal_entity_id_idx" ON "price_catalog_items"("legal_entity_id");
CREATE INDEX IF NOT EXISTS "price_catalog_items_work_type_id_idx" ON "price_catalog_items"("work_type_id");
CREATE INDEX IF NOT EXISTS "price_catalog_items_is_active_idx" ON "price_catalog_items"("is_active");
CREATE INDEX IF NOT EXISTS "price_catalog_items_legal_entity_category_sort_display_idx" ON "price_catalog_items"("legal_entity_id", "category", "sort_order", "display_name");
CREATE INDEX IF NOT EXISTS "price_catalog_items_created_by_user_id_idx" ON "price_catalog_items"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "price_catalog_items_updated_by_user_id_idx" ON "price_catalog_items"("updated_by_user_id");
CREATE INDEX IF NOT EXISTS "price_catalog_items_archived_by_user_id_idx" ON "price_catalog_items"("archived_by_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "price_catalog_items_one_active_per_entity_work_type_idx" ON "price_catalog_items"("legal_entity_id", "work_type_id") WHERE "is_active" = true AND "archived_at" IS NULL;

CREATE INDEX IF NOT EXISTS "execution_time_rules_price_catalog_item_id_idx" ON "execution_time_rules"("price_catalog_item_id");
CREATE INDEX IF NOT EXISTS "execution_time_rules_item_active_min_idx" ON "execution_time_rules"("price_catalog_item_id", "is_active", "min_quantity");
CREATE INDEX IF NOT EXISTS "execution_time_rules_created_by_user_id_idx" ON "execution_time_rules"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "execution_time_rules_updated_by_user_id_idx" ON "execution_time_rules"("updated_by_user_id");

CREATE INDEX IF NOT EXISTS "pricing_agreements_legal_entity_id_idx" ON "pricing_agreements"("legal_entity_id");
CREATE INDEX IF NOT EXISTS "pricing_agreements_clinic_id_idx" ON "pricing_agreements"("clinic_id");
CREATE INDEX IF NOT EXISTS "pricing_agreements_doctor_id_idx" ON "pricing_agreements"("doctor_id");
CREATE INDEX IF NOT EXISTS "pricing_agreements_subject_type_idx" ON "pricing_agreements"("subject_type");
CREATE INDEX IF NOT EXISTS "pricing_agreements_is_active_idx" ON "pricing_agreements"("is_active");
CREATE INDEX IF NOT EXISTS "pricing_agreements_entity_subject_active_dates_idx" ON "pricing_agreements"("legal_entity_id", "subject_type", "is_active", "valid_from", "valid_until");
CREATE INDEX IF NOT EXISTS "pricing_agreements_created_by_user_id_idx" ON "pricing_agreements"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "pricing_agreements_updated_by_user_id_idx" ON "pricing_agreements"("updated_by_user_id");
CREATE INDEX IF NOT EXISTS "pricing_agreements_archived_by_user_id_idx" ON "pricing_agreements"("archived_by_user_id");

CREATE INDEX IF NOT EXISTS "pricing_agreement_rules_pricing_agreement_id_idx" ON "pricing_agreement_rules"("pricing_agreement_id");
CREATE INDEX IF NOT EXISTS "pricing_agreement_rules_price_catalog_item_id_idx" ON "pricing_agreement_rules"("price_catalog_item_id");
CREATE INDEX IF NOT EXISTS "pricing_agreement_rules_scope_idx" ON "pricing_agreement_rules"("scope");
CREATE INDEX IF NOT EXISTS "pricing_agreement_rules_category_idx" ON "pricing_agreement_rules"("category");

ALTER TABLE "price_catalog_items" ADD CONSTRAINT "price_catalog_items_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_catalog_items" ADD CONSTRAINT "price_catalog_items_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_catalog_items" ADD CONSTRAINT "price_catalog_items_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_catalog_items" ADD CONSTRAINT "price_catalog_items_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "price_catalog_items" ADD CONSTRAINT "price_catalog_items_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "execution_time_rules" ADD CONSTRAINT "execution_time_rules_price_catalog_item_id_fkey" FOREIGN KEY ("price_catalog_item_id") REFERENCES "price_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_time_rules" ADD CONSTRAINT "execution_time_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "execution_time_rules" ADD CONSTRAINT "execution_time_rules_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pricing_agreements" ADD CONSTRAINT "pricing_agreements_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pricing_agreements" ADD CONSTRAINT "pricing_agreements_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pricing_agreements" ADD CONSTRAINT "pricing_agreements_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pricing_agreements" ADD CONSTRAINT "pricing_agreements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pricing_agreements" ADD CONSTRAINT "pricing_agreements_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pricing_agreements" ADD CONSTRAINT "pricing_agreements_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pricing_agreement_rules" ADD CONSTRAINT "pricing_agreement_rules_pricing_agreement_id_fkey" FOREIGN KEY ("pricing_agreement_id") REFERENCES "pricing_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_agreement_rules" ADD CONSTRAINT "pricing_agreement_rules_price_catalog_item_id_fkey" FOREIGN KEY ("price_catalog_item_id") REFERENCES "price_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "price_catalog_items" (
  "id",
  "legal_entity_id",
  "work_type_id",
  "category",
  "display_name",
  "unit",
  "standard_price_minor",
  "is_active",
  "sort_order",
  "notes",
  "created_at",
  "updated_at"
)
SELECT
  'pci_backfill_' || lower(le."code") || '_' || wt."id",
  le."id",
  wt."id",
  'Alte lucrări',
  wt."name",
  wt."unit",
  wt."base_price_minor",
  wt."is_active",
  row_number() OVER (PARTITION BY le."id" ORDER BY wt."name", wt."code"),
  'Backfill determinist din WorkType.basePriceMinor legacy.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "legal_entities" le
CROSS JOIN "work_types" wt
WHERE le."code" IN ('NC', 'NG')
  AND NOT EXISTS (
    SELECT 1
    FROM "price_catalog_items" existing
    WHERE existing."legal_entity_id" = le."id"
      AND existing."work_type_id" = wt."id"
  );
