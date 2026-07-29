-- CreateEnum
CREATE TYPE "WorkDeadlineMode" AS ENUM ('CALCULATED', 'MANUAL', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "WorkDeadlineSource" AS ENUM ('CREATION', 'WORK_UPDATE', 'MANUAL_OVERRIDE', 'MANUAL_RECALCULATION', 'LEGACY_BACKFILL', 'FUTURE_TECH_CLAIM');

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "calculated_due_at" TIMESTAMP(3),
ADD COLUMN     "deadline_calculated_at" TIMESTAMP(3),
ADD COLUMN     "deadline_due_hour" INTEGER,
ADD COLUMN     "deadline_due_minute" INTEGER,
ADD COLUMN     "deadline_execution_days" INTEGER,
ADD COLUMN     "deadline_explanation" VARCHAR(1000),
ADD COLUMN     "deadline_include_start_day" BOOLEAN,
ADD COLUMN     "deadline_locked_at" TIMESTAMP(3),
ADD COLUMN     "deadline_locked_reason" VARCHAR(500),
ADD COLUMN     "deadline_mode" "WorkDeadlineMode",
ADD COLUMN     "deadline_reason_code" VARCHAR(80),
ADD COLUMN     "deadline_revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deadline_rule_snapshot" JSONB,
ADD COLUMN     "deadline_source" "WorkDeadlineSource",
ADD COLUMN     "deadline_start_at" TIMESTAMP(3),
ADD COLUMN     "deadline_timezone" VARCHAR(64),
ADD COLUMN     "effective_due_at" TIMESTAMP(3),
ADD COLUMN     "manual_due_at" TIMESTAMP(3);

-- Deterministic legacy backfill.
-- The current schema has no promised_at column; requested_delivery_date is the existing
-- compatibility field used by Works as the promised delivery date.
UPDATE "work_orders"
SET
  "deadline_mode" = 'MANUAL',
  "manual_due_at" = "requested_delivery_date",
  "effective_due_at" = "requested_delivery_date",
  "deadline_start_at" = "created_at",
  "deadline_include_start_day" = false,
  "deadline_due_hour" = 17,
  "deadline_due_minute" = 0,
  "deadline_timezone" = 'Europe/Bucharest',
  "deadline_execution_days" = NULL,
  "deadline_rule_snapshot" = jsonb_build_object(
    'version', 1,
    'sourceType', 'NONE',
    'pricingSourceType', 'STANDARD',
    'executionTimeRuleCode', NULL,
    'minQuantity', NULL,
    'maxQuantity', NULL,
    'executionDays', NULL,
    'requiresManualDueDate', false,
    'includeStartDay', false,
    'dueHour', 17,
    'dueMinute', 0,
    'timezone', 'Europe/Bucharest',
    'workingWeekdays', jsonb_build_array(1, 2, 3, 4, 5),
    'calendarCoverage', jsonb_build_object('fromYear', 2026, 'toYear', 2030),
    'legacySourceField', 'requestedDeliveryDate'
  ),
  "deadline_explanation" = 'Termen preluat din câmpul istoric requestedDeliveryDate.',
  "deadline_reason_code" = NULL,
  "deadline_calculated_at" = "created_at",
  "deadline_source" = 'LEGACY_BACKFILL',
  "deadline_revision" = 1,
  "deadline_locked_at" = "created_at",
  "deadline_locked_reason" = 'Termen legacy preluat din requestedDeliveryDate.'
WHERE "deadline_revision" = 0
  AND "deadline_mode" IS NULL
  AND "requested_delivery_date" IS NOT NULL;

-- CreateIndex
CREATE INDEX "work_orders_effective_due_at_idx" ON "work_orders"("effective_due_at");

-- CreateIndex
CREATE INDEX "work_orders_deadline_mode_idx" ON "work_orders"("deadline_mode");
