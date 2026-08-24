-- B05 / TOOTH-CONNECTIONS-001: persisted case-level canonical adjacent-tooth connections.
CREATE TABLE "work_order_tooth_connections" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "tooth_a" INTEGER NOT NULL,
    "tooth_b" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_tooth_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_order_tooth_connections_work_order_id_tooth_a_tooth_b_key"
    ON "work_order_tooth_connections"("work_order_id", "tooth_a", "tooth_b");

CREATE INDEX "work_order_tooth_connections_work_order_id_idx"
    ON "work_order_tooth_connections"("work_order_id");

ALTER TABLE "work_order_tooth_connections"
    ADD CONSTRAINT "work_order_tooth_connections_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
