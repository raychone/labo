-- Keep the canonical technical pricing catalog as the single active catalog.
-- Legacy/demo rows remain available for historical work orders, but must not
-- appear as selectable work types for new work.
UPDATE "work_types" AS legacy
SET "archived_at" = COALESCE(legacy."archived_at", CURRENT_TIMESTAMP),
    "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE legacy."is_active" = true
  AND (legacy."id" LIKE 'demo_creative_wt_%' OR legacy."id" LIKE 'technical_work_type_%')
  AND EXISTS (
    SELECT 1
    FROM "work_types" AS canonical
    WHERE canonical."id" LIKE 'technical_pricing_work_type_%'
      AND canonical."is_active" = true
      AND lower(trim(canonical."name")) = lower(trim(legacy."name"))
  );
