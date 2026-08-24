-- B13: canonical maneuver counting semantics. Existing maneuvers remain
-- nullable until a Manager explicitly classifies legacy catalog entries.
CREATE TYPE "TechnicianManeuverUnit" AS ENUM ('PER_ELEMENT', 'PER_UNIT', 'PER_ARCH', 'PER_CASE');

ALTER TABLE "technician_operations"
  ADD COLUMN "pricing_unit" "TechnicianManeuverUnit";
