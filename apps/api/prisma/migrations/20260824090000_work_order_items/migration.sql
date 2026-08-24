CREATE TYPE "WorkOrderItemScope" AS ENUM ('TOOTH', 'TEETH', 'UPPER_ARCH', 'LOWER_ARCH', 'BOTH_ARCHES', 'CASE');

CREATE TABLE "work_order_items" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "scope" "WorkOrderItemScope" NOT NULL,
    "work_type_id" TEXT,
    "custom_work_type_snapshot" JSONB,
    "shade" VARCHAR(80),
    "implant_platform" VARCHAR(80),
    "custom_implant_platform_snapshot" JSONB,
    "restoration_type" VARCHAR(120),
    "technical_code_notes" VARCHAR(2000),
    "notes" VARCHAR(2000),
    "base_unit_price_minor" INTEGER,
    "total_price_minor" INTEGER,
    "currency" CHAR(3),
    "commercial_snapshot" JSONB,
    "archived_at" TIMESTAMP(3),
    "archived_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_order_item_teeth" (
    "id" TEXT NOT NULL,
    "work_order_item_id" TEXT NOT NULL,
    "fdi_tooth" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_item_teeth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_order_item_teeth_work_order_item_id_fdi_tooth_key" ON "work_order_item_teeth"("work_order_item_id", "fdi_tooth");
CREATE INDEX "work_order_items_work_order_id_sort_order_idx" ON "work_order_items"("work_order_id", "sort_order");
CREATE INDEX "work_order_items_work_order_id_scope_idx" ON "work_order_items"("work_order_id", "scope");
CREATE INDEX "work_order_items_work_type_id_idx" ON "work_order_items"("work_type_id");
CREATE INDEX "work_order_items_archived_at_idx" ON "work_order_items"("archived_at");
CREATE INDEX "work_order_item_teeth_fdi_tooth_idx" ON "work_order_item_teeth"("fdi_tooth");
CREATE INDEX "work_order_item_teeth_work_order_item_id_sort_order_idx" ON "work_order_item_teeth"("work_order_item_id", "sort_order");

ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_order_item_teeth" ADD CONSTRAINT "work_order_item_teeth_work_order_item_id_fkey" FOREIGN KEY ("work_order_item_id") REFERENCES "work_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
