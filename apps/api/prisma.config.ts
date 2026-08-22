import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    // Migrations must use Neon's direct connection. The pooled URL remains
    // appropriate for the running API, but can interfere with Prisma's
    // session-level advisory lock during deploys.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "dotenv -e ../../.env -- env -u ELECTRON_RUN_AS_NODE tsx prisma/seed.ts",
  },
  schema: "prisma/schema.prisma",
});
