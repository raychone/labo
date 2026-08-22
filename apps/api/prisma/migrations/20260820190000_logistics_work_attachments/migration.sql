CREATE TABLE "work_attachments" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_attachments_work_order_id_idx" ON "work_attachments"("work_order_id");
CREATE INDEX "work_attachments_uploaded_by_user_id_idx" ON "work_attachments"("uploaded_by_user_id");

ALTER TABLE "work_attachments" ADD CONSTRAINT "work_attachments_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_attachments" ADD CONSTRAINT "work_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
