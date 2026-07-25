import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  AUTH_SEED_DISPLAY_NAME: z.string().optional(),
  AUTH_SEED_EMAIL: z.string().email().optional(),
  AUTH_SEED_PASSWORD: z.string().optional(),
  CSRF_COOKIE_NAME: z.string().min(1).default("dl_csrf"),
  CSRF_HEADER_NAME: z.string().min(1).default("x-csrf-token"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  PORT: z.coerce.number().int().positive().max(65535).default(3010),
  SESSION_COOKIE_NAME: z.string().min(1).default("dl_session"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 8),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export interface ServerEnvironment {
  readonly databaseUrl: string;
  readonly demoMode: boolean;
  readonly loginRateLimitMaxAttempts: number;
  readonly loginRateLimitWindowSeconds: number;
  readonly port: number;
  readonly sessionCookieName: string;
  readonly sessionTtlSeconds: number;
  readonly csrfCookieName: string;
  readonly csrfHeaderName: string;
  readonly webOrigin: string;
}

export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv,
): ServerEnvironment {
  const parsedEnvironment = serverEnvironmentSchema.parse(environment);

  return {
    databaseUrl: parsedEnvironment.DATABASE_URL,
    demoMode: parsedEnvironment.DEMO_MODE === "true",
    loginRateLimitMaxAttempts: parsedEnvironment.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    loginRateLimitWindowSeconds: parsedEnvironment.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    port: parsedEnvironment.PORT,
    sessionCookieName: parsedEnvironment.SESSION_COOKIE_NAME,
    sessionTtlSeconds: parsedEnvironment.SESSION_TTL_SECONDS,
    csrfCookieName: parsedEnvironment.CSRF_COOKIE_NAME,
    csrfHeaderName: parsedEnvironment.CSRF_HEADER_NAME.toLowerCase(),
    webOrigin: parsedEnvironment.WEB_ORIGIN,
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
