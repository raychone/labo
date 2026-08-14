CREATE TABLE "billing_month_close_archives" (
  "id" TEXT NOT NULL,
  "legal_entity_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "closed_at" TIMESTAMP(3) NOT NULL,
  "closed_by_user_id" TEXT,
  "report_version" VARCHAR(24) NOT NULL DEFAULT '1',
  "currency" CHAR(3) NOT NULL,
  "total_minor" INTEGER NOT NULL,
  "paid_minor" INTEGER NOT NULL,
  "paid_total_minor" INTEGER NOT NULL,
  "partial_total_minor" INTEGER NOT NULL,
  "unpaid_total_minor" INTEGER NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "billing_month_close_archives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_month_close_archives_legal_entity_id_year_month_key"
  ON "billing_month_close_archives"("legal_entity_id", "year", "month");
CREATE INDEX "billing_month_close_archives_legal_entity_id_closed_at_idx"
  ON "billing_month_close_archives"("legal_entity_id", "closed_at");
CREATE INDEX "billing_month_close_archives_legal_entity_id_period_start_idx"
  ON "billing_month_close_archives"("legal_entity_id", "period_start");
CREATE INDEX "billing_month_close_archives_closed_by_user_id_idx"
  ON "billing_month_close_archives"("closed_by_user_id");

ALTER TABLE "billing_month_close_archives"
  ADD CONSTRAINT "billing_month_close_archives_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_month_close_archives"
  ADD CONSTRAINT "billing_month_close_archives_closed_by_user_id_fkey"
  FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
