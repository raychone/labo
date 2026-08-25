import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { seedTechnicalCatalog } from "./technical/technical-seed.js";
import { seedDemoData } from "./demo/demo-seed.js";
import { assertDemoSeedAllowed } from "./demo/demo-guard.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const seedKey = "initial-deployment";

async function main(): Promise<void> {
  const existing = await prisma.seedRun.findUnique({ where: { key: seedKey } });
  if (existing) {
    console.log(`Seed skipped: ${seedKey} already completed on ${existing.completedAt.toISOString()}.`);
    return;
  }
  await seedTechnicalCatalog(prisma);
  if (process.env.SEED_DEMO_ON_FIRST_DEPLOY === "true") {
    assertDemoSeedAllowed();
    await seedDemoData(prisma, new Date(), { includeTechnicalCatalog: false });
  }
  await prisma.seedRun.create({ data: { key: seedKey, metadata: { demo: process.env.SEED_DEMO_ON_FIRST_DEPLOY === "true", technical: true }, version: "1" } });
  console.log("Initial deployment seed completed. Future deploys will not reseed.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
