-- Preserve demo rows for historical rates, executions and snapshots, while
-- removing them from the active global catalog used for future work.
UPDATE "technician_operations"
SET "archived_at" = COALESCE("archived_at", CURRENT_TIMESTAMP),
    "description" = NULL,
    "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" LIKE 'demo_operation_%'
  AND (
    "is_active" = true
    OR "archived_at" IS NULL
    OR "description" IS NOT NULL
  );
