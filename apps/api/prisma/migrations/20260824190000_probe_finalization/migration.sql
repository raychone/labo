-- B12: canonical technical completion and probe-ready lifecycle signals.
CREATE TYPE "WorkTechnicalReadiness" AS ENUM ('PROBE_READY', 'FINAL_READY');
CREATE TYPE "ProbeCycleCompletionOutcome" AS ENUM ('PROBE_READY', 'FINALIZED');

ALTER TABLE "work_orders"
  ADD COLUMN "technical_readiness" "WorkTechnicalReadiness",
  ADD COLUMN "probe_ready_at" TIMESTAMP(3),
  ADD COLUMN "probe_received_at" TIMESTAMP(3),
  ADD COLUMN "finalized_at" TIMESTAMP(3);

ALTER TABLE "probe_cycles"
  ADD COLUMN "completion_outcome" "ProbeCycleCompletionOutcome";

CREATE INDEX "work_orders_technical_readiness_idx" ON "work_orders"("technical_readiness");
