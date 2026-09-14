-- These legacy demo rows represent add-ons, not selectable work types.
UPDATE "work_types"
SET "archived_at" = COALESCE("archived_at", CURRENT_TIMESTAMP),
    "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" IN (
  'demo_creative_wt_gingie-ceramica-compozit',
  'demo_creative_wt_placata-4-plus'
)
  AND "is_active" = true;
