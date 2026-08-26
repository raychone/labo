CREATE TABLE "probe_cycle_probe_types" (
  "id" TEXT NOT NULL,
  "probe_cycle_id" TEXT NOT NULL,
  "probe_type_id" TEXT NOT NULL,
  "probe_type_name_snapshot" VARCHAR(120) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "probe_cycle_probe_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "probe_cycle_probe_types_probe_cycle_id_sort_order_key" ON "probe_cycle_probe_types"("probe_cycle_id", "sort_order");
CREATE INDEX "probe_cycle_probe_types_probe_cycle_id_sort_order_idx" ON "probe_cycle_probe_types"("probe_cycle_id", "sort_order");
CREATE INDEX "probe_cycle_probe_types_probe_type_id_idx" ON "probe_cycle_probe_types"("probe_type_id");

ALTER TABLE "probe_cycle_probe_types" ADD CONSTRAINT "probe_cycle_probe_types_probe_cycle_id_fkey" FOREIGN KEY ("probe_cycle_id") REFERENCES "probe_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "probe_cycle_probe_types" ADD CONSTRAINT "probe_cycle_probe_types_probe_type_id_fkey" FOREIGN KEY ("probe_type_id") REFERENCES "probe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "probe_cycle_probe_types" ("id", "probe_cycle_id", "probe_type_id", "probe_type_name_snapshot", "sort_order")
SELECT 'legacy_' || pc."id", pc."id", pc."probe_type_id", pc."probe_type_name_snapshot", 0
FROM "probe_cycles" pc;
