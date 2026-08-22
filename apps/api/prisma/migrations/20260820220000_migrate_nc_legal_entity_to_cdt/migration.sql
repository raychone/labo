-- Preserve the existing legal entity row, IDs, relations, documents, payments and audit history.
-- Historical snapshots intentionally remain unchanged; only the canonical entity code changes.
UPDATE "legal_entities"
SET "code" = 'CDT', "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'NC'
  AND NOT EXISTS (SELECT 1 FROM "legal_entities" WHERE "code" = 'CDT');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "legal_entities" WHERE "code" = 'NC') THEN
    RAISE EXCEPTION 'Cannot migrate NC to CDT because a canonical CDT legal entity already exists';
  END IF;
END $$;
