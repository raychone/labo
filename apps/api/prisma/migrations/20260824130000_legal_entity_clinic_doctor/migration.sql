-- B07 / LEGALENTITY-001: existing records may remain unresolved until explicitly assigned.
ALTER TABLE "clinics" ADD COLUMN "legal_entity_id" TEXT;
ALTER TABLE "doctors" ADD COLUMN "legal_entity_id" TEXT;

CREATE INDEX "clinics_legal_entity_id_idx" ON "clinics"("legal_entity_id");
CREATE INDEX "doctors_legal_entity_id_idx" ON "doctors"("legal_entity_id");

ALTER TABLE "clinics" ADD CONSTRAINT "clinics_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
