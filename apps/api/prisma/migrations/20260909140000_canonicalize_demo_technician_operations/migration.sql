-- Keep the original demo operations and their rate/execution history intact,
-- but make the technical catalog the single active source for future work.
-- A canonical current rate is copied only when it is absent for that
-- technician; historical demo rates and performed-operation snapshots remain
-- linked to their original rows.
WITH duplicate_operations AS (
  SELECT legacy.id AS legacy_operation_id, canonical.id AS canonical_operation_id
  FROM "technician_operations" AS legacy
  JOIN "technician_operations" AS canonical
    ON canonical.id = CONCAT('technical_operation_', LOWER(legacy.code))
  WHERE legacy.id LIKE 'demo_operation_%'
    AND canonical.code = CONCAT('TECH-', legacy.code)
), missing_current_rates AS (
  SELECT legacy_rate.*, duplicate_operations.canonical_operation_id
  FROM "technician_operation_rates" AS legacy_rate
  JOIN duplicate_operations ON duplicate_operations.legacy_operation_id = legacy_rate.operation_id
  WHERE legacy_rate.valid_until IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "technician_operation_rates" AS canonical_rate
      WHERE canonical_rate.technician_id = legacy_rate.technician_id
        AND canonical_rate.operation_id = duplicate_operations.canonical_operation_id
        AND canonical_rate.valid_until IS NULL
    )
)
INSERT INTO "technician_operation_rates" (
  "id", "technician_id", "operation_id", "rate_minor", "currency",
  "effective_from", "valid_until", "created_by_user_id", "created_at"
)
SELECT
  CONCAT('canonical_rate_', "id"), "technician_id", "canonical_operation_id", "rate_minor", "currency",
  "effective_from", NULL, "created_by_user_id", CURRENT_TIMESTAMP
FROM missing_current_rates
ON CONFLICT ("id") DO NOTHING;

UPDATE "technician_operations" AS legacy
SET "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE legacy.id LIKE 'demo_operation_%'
  AND EXISTS (
    SELECT 1
    FROM "technician_operations" AS canonical
    WHERE canonical.id = CONCAT('technical_operation_', LOWER(legacy.code))
      AND canonical.code = CONCAT('TECH-', legacy.code)
  );

UPDATE "technician_operations"
SET "description" = NULL,
    "updated_at" = CURRENT_TIMESTAMP
WHERE id LIKE 'technical_operation_%'
  AND description IN ('Manoperă din catalogul tehnic.', 'Manoperă demonstrativă pentru câștiguri.');
