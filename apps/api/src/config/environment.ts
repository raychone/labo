import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
});

export interface ServerEnvironment {
  readonly databaseUrl: string;
  readonly port: number;
}

export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv,
): ServerEnvironment {
  const parsedEnvironment = serverEnvironmentSchema.parse(environment);

  return {
    databaseUrl: parsedEnvironment.DATABASE_URL,
    port: parsedEnvironment.PORT,
  };
}

export function loadServerEnvironment(): ServerEnvironment {
  loadDotenv({
    path: resolve(process.cwd(), ".env"),
    quiet: true,
  });
  loadDotenv({
    path: resolve(process.cwd(), "../../.env"),
    quiet: true,
  });

  return parseServerEnvironment(process.env);
}
