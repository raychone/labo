import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "dotenv -e ../../.env -- env -u ELECTRON_RUN_AS_NODE tsx prisma/seed.ts",
  },
  schema: "prisma/schema.prisma",
});
