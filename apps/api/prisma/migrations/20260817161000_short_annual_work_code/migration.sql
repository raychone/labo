CREATE TABLE "work_order_code_counters" (
  "year" INTEGER NOT NULL,
  "last_value" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "work_order_code_counters_pkey" PRIMARY KEY ("year"),
  CONSTRAINT "work_order_code_counters_year_check" CHECK ("year" >= 0 AND "year" <= 99),
  CONSTRAINT "work_order_code_counters_last_value_check" CHECK ("last_value" >= 0)
);

INSERT INTO "work_order_code_counters" ("year", "last_value", "updated_at")
SELECT
  substring("code" from 4 for 2)::integer AS "year",
  max(substring("code" from 7 for 4)::integer) AS "last_value",
  CURRENT_TIMESTAMP AS "updated_at"
FROM "work_orders"
WHERE "code" ~ '^WO-[0-9]{2}-[0-9]{4}$'
GROUP BY substring("code" from 4 for 2)::integer;
