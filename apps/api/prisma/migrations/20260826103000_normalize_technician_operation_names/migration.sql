UPDATE "technician_operations"
SET "name" = CASE
  WHEN "code" IN ('TECH-METAL_TF', 'METAL_TF') OR "id" IN ('demo_operation_tf', 'technical_operation_metal_tf') THEN 'TF'
  WHEN "code" IN ('TECH-METAL_SF', 'METAL_SF') OR "id" IN ('demo_operation_sf', 'technical_operation_metal_sf') THEN 'SF'
  WHEN "code" IN ('TECH-GLAZURA', 'GLAZURA') OR "id" IN ('demo_operation_glazura', 'technical_operation_glazura') THEN 'Glaze'
  ELSE "name"
END
WHERE "code" IN ('TECH-METAL_TF', 'METAL_TF', 'TECH-METAL_SF', 'METAL_SF', 'TECH-GLAZURA', 'GLAZURA')
   OR "id" IN ('demo_operation_tf', 'technical_operation_metal_tf', 'demo_operation_sf', 'technical_operation_metal_sf', 'demo_operation_glazura', 'technical_operation_glazura');
