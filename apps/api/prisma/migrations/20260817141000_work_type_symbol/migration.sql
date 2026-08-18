ALTER TABLE "work_types" ADD COLUMN "symbol" VARCHAR(40);

UPDATE "work_types"
SET "symbol" = "code"
WHERE "symbol" IS NULL;

ALTER TABLE "work_types" ALTER COLUMN "symbol" SET NOT NULL;

CREATE UNIQUE INDEX "work_types_symbol_key" ON "work_types"("symbol");
CREATE INDEX "work_types_symbol_idx" ON "work_types"("symbol");
