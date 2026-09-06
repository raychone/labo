-- A technician may perform the same operation again for a later probe.
-- Historical rows remain for earnings/audit; the application scopes active
-- tooth coverage to the current probe cycle.
DROP INDEX IF EXISTS "technician_performed_operations_active_unique";
