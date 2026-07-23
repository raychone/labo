CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "work_orders" ADD COLUMN "qr_token" VARCHAR(64);
ALTER TABLE "work_orders" ADD COLUMN "qr_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "work_orders"
SET "qr_token" = encode(gen_random_bytes(32), 'hex')
WHERE "qr_token" IS NULL;

ALTER TABLE "work_orders" ALTER COLUMN "qr_token" SET NOT NULL;

CREATE UNIQUE INDEX "work_orders_qr_token_key" ON "work_orders"("qr_token");
CREATE INDEX "work_orders_qr_created_at_idx" ON "work_orders"("qr_created_at");
