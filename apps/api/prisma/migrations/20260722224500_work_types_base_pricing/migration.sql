CREATE TYPE "WorkTypeUnit" AS ENUM ('UNIT');

CREATE SEQUENCE "work_type_code_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE "work_types" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1000),
  "base_price_minor" INTEGER NOT NULL,
  "unit" "WorkTypeUnit" NOT NULL DEFAULT 'UNIT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "archived_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "work_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_types_base_price_minor_check" CHECK ("base_price_minor" >= 0)
);

CREATE UNIQUE INDEX "work_types_code_key" ON "work_types"("code");
CREATE INDEX "work_types_name_idx" ON "work_types"("name");
CREATE INDEX "work_types_base_price_minor_idx" ON "work_types"("base_price_minor");
CREATE INDEX "work_types_is_active_idx" ON "work_types"("is_active");
CREATE INDEX "work_types_created_at_idx" ON "work_types"("created_at");
CREATE INDEX "work_types_updated_at_idx" ON "work_types"("updated_at");
CREATE INDEX "work_types_created_by_user_id_idx" ON "work_types"("created_by_user_id");
CREATE INDEX "work_types_updated_by_user_id_idx" ON "work_types"("updated_by_user_id");
CREATE INDEX "work_types_archived_by_user_id_idx" ON "work_types"("archived_by_user_id");

ALTER TABLE "work_types" ADD CONSTRAINT "work_types_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_types" ADD CONSTRAINT "work_types_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_types" ADD CONSTRAINT "work_types_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
