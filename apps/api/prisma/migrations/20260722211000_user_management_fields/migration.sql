ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "users_is_active_idx" ON "users"("is_active");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
