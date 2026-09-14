-- Keep the internal codes for compatibility, but expose the current user
-- language consistently throughout the application.
UPDATE "technician_operations"
SET "name" = 'Placare',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" IN ('TECH-COROANE_ADIACENTE', 'COROANE_ADIACENTE')
  AND lower("name") LIKE '%adiacent%';
