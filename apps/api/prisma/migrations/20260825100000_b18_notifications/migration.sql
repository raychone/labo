CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "recipient_user_id" TEXT NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "dedupe_key" VARCHAR(240) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "severity" VARCHAR(24) NOT NULL DEFAULT 'INFO',
  "resource_type" VARCHAR(80) NOT NULL,
  "resource_id" TEXT,
  "deep_link" VARCHAR(500) NOT NULL,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_recipient_user_id_dedupe_key_key"
  ON "notifications"("recipient_user_id", "dedupe_key");
CREATE INDEX "notifications_recipient_user_id_read_at_idx"
  ON "notifications"("recipient_user_id", "read_at");
CREATE INDEX "notifications_recipient_user_id_created_at_idx"
  ON "notifications"("recipient_user_id", "created_at");
CREATE INDEX "notifications_recipient_user_id_resolved_at_idx"
  ON "notifications"("recipient_user_id", "resolved_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
