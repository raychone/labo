-- Canonical work catalog configuration: probe route, optional add-ons and
-- mutually exclusive operational groups. Existing work/order snapshots remain
-- untouched.
ALTER TABLE "work_types"
  ADD COLUMN "probe_family" VARCHAR(24),
  ADD COLUMN "probe_type_codes" JSONB,
  ADD COLUMN "allowed_add_ons" JSONB,
  ADD COLUMN "exclusive_group" VARCHAR(80);

CREATE INDEX "work_types_probe_family_idx" ON "work_types"("probe_family");
CREATE INDEX "work_types_exclusive_group_idx" ON "work_types"("exclusive_group");

ALTER TABLE "work_order_items"
  ADD COLUMN "selected_add_ons" JSONB;

ALTER TABLE "probe_types"
  ADD COLUMN "code" VARCHAR(40),
  ADD COLUMN "symbol" VARCHAR(16);

CREATE UNIQUE INDEX "probe_types_code_key" ON "probe_types"("code");
