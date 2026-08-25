ALTER TABLE "technician_operations" ADD COLUMN "category" VARCHAR(80) NOT NULL DEFAULT 'Altele';
CREATE INDEX "technician_operations_category_sort_order_idx" ON "technician_operations"("category", "sort_order");
