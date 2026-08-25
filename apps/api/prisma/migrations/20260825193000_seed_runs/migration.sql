CREATE TABLE "seed_runs" (
    "key" VARCHAR(120) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" VARCHAR(40),
    "metadata" JSONB,
    CONSTRAINT "seed_runs_pkey" PRIMARY KEY ("key")
);
