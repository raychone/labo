import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { assertDemoSeedAllowed } from "./demo/demo-guard.js";
import { getDemoWorkflowTemplateCount, seedDemoData } from "./demo/demo-seed.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

assertDemoSeedAllowed();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

seedDemoData(prisma)
  .then(async (dataset) => {
    console.log(`Seeded demo dataset for ${dataset.year}: ${dataset.users.length} users, ${dataset.clinics.length} clinics, ${dataset.doctors.length} doctors, ${dataset.workTypes.length} work types, ${getDemoWorkflowTemplateCount()} workflow templates, ${dataset.works.length} works.`);
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
