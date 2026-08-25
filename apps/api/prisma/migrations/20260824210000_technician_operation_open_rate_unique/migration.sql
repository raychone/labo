-- B13 foundation: concurrent rate writes must leave at most one open rate
-- for a technician and maneuver. Historical closed rates are untouched.
CREATE UNIQUE INDEX "technician_operation_rates_one_open_per_pair"
ON "technician_operation_rates" ("technician_id", "operation_id")
WHERE "valid_until" IS NULL;
