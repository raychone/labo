import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { assertDemoSeedAllowed } from "./demo/demo-guard.js";
import { resetDemoData } from "./demo/demo-reset.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

assertDemoSeedAllowed();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

resetDemoData(prisma)
  .then(async () => {
    console.log("Reset demo dataset.");
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
