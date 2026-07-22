import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/modules/auth/password.hashing.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const email = process.env.AUTH_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_SEED_PASSWORD;
  const displayName = process.env.AUTH_SEED_DISPLAY_NAME?.trim() ?? "Development Manager";

  if (!email || !password) {
    throw new Error("AUTH_SEED_EMAIL and AUTH_SEED_PASSWORD are required for the development seed.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    create: {
      displayName,
      email,
      passwordHash,
    },
    update: {
      displayName,
      isActive: true,
      passwordHash,
      passwordChangedAt: new Date(),
      version: {
        increment: 1,
      },
    },
    where: {
      email,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
