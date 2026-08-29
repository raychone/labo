import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const isDryRun = process.env.MINIMAL_RESET_DRY_RUN === "true";
const isConfirmed = process.env.ALLOW_MINIMAL_NEON_RESET === "true";

if (!connectionString) throw new Error("DATABASE_URL is required.");
if (connectionString.includes("-pooler.")) throw new Error("Resetul Neon trebuie rulat cu DATABASE_URL directă, fără hostul -pooler.");
if (!connectionString.includes(".neon.tech")) throw new Error("Resetul minimal este permis doar pentru o bază Neon.");
if (!isDryRun && !isConfirmed) throw new Error("Resetul este blocat. Pentru execuție setează ALLOW_MINIMAL_NEON_RESET=true.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function listResetTables(): Promise<readonly string[]> {
  const rows = await prisma.$queryRaw<Array<{ readonly tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;
  return rows.map((row) => row.tablename);
}

async function main(): Promise<void> {
  const tables = await listResetTables();
  console.log(`${isDryRun ? "DRY RUN · " : ""}Tabele care vor fi golite (${tables.length}): ${tables.join(", ")}`);
  if (isDryRun) return;

  // Keep the migration ledger and schema intact. CASCADE handles the FK graph
  // in one server-side operation, avoiding a client-side delete per row/table.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((table) => `"${table.replaceAll('"', '""')}"`).join(", ")} RESTART IDENTITY CASCADE`);
  process.env.RUN_SEED_ENTRYPOINT = "false";
  const { seedCore } = await import("./seed.js");
  const { seedTechnicalCatalog } = await import("./technical/technical-seed.js");
  await seedCore(prisma);
  const technical = await seedTechnicalCatalog(prisma);
  console.log(`Seed minimal finalizat: ${technical.workTypes} tipuri de lucrări, ${technical.probeTypes} probe, ${technical.operations} manopere.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
