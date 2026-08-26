ALTER TABLE work_types ADD COLUMN color_hex VARCHAR(7);

UPDATE work_types
SET color_hex = CASE
  WHEN lower(name) LIKE '%emax%' OR lower(name) LIKE '%integral ceramic%' THEN '#7C3AED'
  WHEN lower(name) LIKE '%acrilic%' OR lower(name) LIKE '%capse%' THEN '#DC2626'
  WHEN lower(name) LIKE '%flexibil%' THEN '#FACC15'
  WHEN lower(name) LIKE '%metalo%' OR lower(name) LIKE '%metaloceramic%' OR lower(code) LIKE '%mc%' THEN '#2563EB'
  WHEN lower(name) LIKE '%zircon%' OR lower(name) LIKE '%zirconia%' OR lower(code) LIKE '%zr%' THEN '#F97316'
  ELSE color_hex
END
WHERE color_hex IS NULL;
