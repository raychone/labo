UPDATE technician_operations
SET is_active = false
WHERE id <> 'technical_operation_glazura'
  AND (
    LOWER(code) IN ('glazurare', 'tech-glazurare')
    OR LOWER(name) = 'glazurare'
  );
