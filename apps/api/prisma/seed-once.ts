import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { seedTechnicalCatalog } from "./technical/technical-seed.js";

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
  await prisma.seedRun.create({ data: { key: seedKey, metadata: { demo: false, technical: true }, version: "2" } });
  console.log("Initial deployment seed completed. Future deploys will not reseed.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
