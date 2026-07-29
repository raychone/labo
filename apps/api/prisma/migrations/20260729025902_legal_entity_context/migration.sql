-- CreateTable
CREATE TABLE "legal_entities" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "active_legal_entity_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "legal_entities_code_key" ON "legal_entities"("code");

-- CreateIndex
CREATE INDEX "legal_entities_is_active_sort_order_code_idx" ON "legal_entities"("is_active", "sort_order", "code");

-- CreateIndex
CREATE INDEX "sessions_active_legal_entity_id_idx" ON "sessions"("active_legal_entity_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_legal_entity_id_fkey" FOREIGN KEY ("active_legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
