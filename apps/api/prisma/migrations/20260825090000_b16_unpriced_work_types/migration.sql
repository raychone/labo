-- B16: operational catalog entries may exist before Manager configures a price.
ALTER TABLE "work_types"
  ALTER COLUMN "base_price_minor" DROP NOT NULL;

ALTER TABLE "work_orders"
  ALTER COLUMN "base_unit_price_minor" DROP NOT NULL,
  ALTER COLUMN "total_price_minor" DROP NOT NULL,
  ALTER COLUMN "currency" DROP NOT NULL;
