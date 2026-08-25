import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { seedTechnicalCatalog } from "./technical/technical-seed.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

seedTechnicalCatalog(prisma)
  .then(async (result) => {
    console.log(`Seeded technical catalog: ${result.workTypes} work types, ${result.probeTypes} probe types, ${result.operations} operations.`);
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
