import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  APP_DEPLOYMENT_PROFILE: z.enum(["demo", "development", "production"]).optional(),
  AUTH_SEED_DISPLAY_NAME: z.string().optional(),
  AUTH_SEED_EMAIL: z.string().email().optional(),
  AUTH_SEED_PASSWORD: z.string().optional(),
  CSRF_COOKIE_NAME: z.string().min(1).default("dl_csrf"),
  CSRF_HEADER_NAME: z.string().min(1).default("x-csrf-token"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  DEMO_LOGIN_ENABLED: z.enum(["true", "false"]).default("false"),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3010),
  RATE_LIMIT_MAX_BUCKETS: z.coerce.number().int().positive().max(100_000).default(10_000),
  REALTIME_HEARTBEAT_SECONDS: z.coerce.number().int().min(5).max(60).default(15),
  REALTIME_MAX_CONNECTIONS: z.coerce.number().int().positive().max(10_000).default(500),
  REALTIME_MAX_CONNECTIONS_PER_USER: z.coerce.number().int().positive().max(50).default(8),
  REALTIME_SESSION_RECHECK_SECONDS: z.coerce.number().int().min(5).max(300).default(30),
  SESSION_COOKIE_NAME: z.string().min(1).default("dl_session"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 8),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  WEB_ORIGIN: z.string().min(1).default("http://localhost:3000,http://127.0.0.1:3000"),
});

export interface ServerEnvironment {
  readonly deploymentProfile: "demo" | "development" | "production";
  readonly databaseUrl: string;
  readonly demoMode: boolean;
  readonly demoLoginEnabled: boolean;
  readonly loginRateLimitMaxAttempts: number;
  readonly loginRateLimitWindowSeconds: number;
  readonly nodeEnvironment: "development" | "production" | "test";
  readonly port: number;
  readonly rateLimitMaxBuckets: number;
  readonly realtimeHeartbeatSeconds: number;
  readonly realtimeMaxConnections: number;
  readonly realtimeMaxConnectionsPerUser: number;
  readonly realtimeSessionRecheckSeconds: number;
  readonly sessionCookieName: string;
  readonly sessionTtlSeconds: number;
  readonly trustProxyHops: number;
  readonly csrfCookieName: string;
  readonly csrfHeaderName: string;
  readonly cookieSameSite: "lax" | "strict" | "none";
  readonly webOrigins: readonly string[];
}

export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv,
): ServerEnvironment {
  const parsedEnvironment = serverEnvironmentSchema.parse(environment);
  const deploymentProfile = parsedEnvironment.APP_DEPLOYMENT_PROFILE
    ?? (parsedEnvironment.NODE_ENV === "production" ? "production" : "development");
  const webOrigins = parseWebOrigins(parsedEnvironment.WEB_ORIGIN);

  assertSafeDeploymentProfile({
    deploymentProfile,
    demoLoginEnabled: parsedEnvironment.DEMO_LOGIN_ENABLED === "true",
    demoMode: parsedEnvironment.DEMO_MODE === "true",
    nodeEnvironment: parsedEnvironment.NODE_ENV,
    webOrigins,
  });

  return {
    deploymentProfile,
    databaseUrl: parsedEnvironment.DATABASE_URL,
    demoMode: parsedEnvironment.DEMO_MODE === "true",
    demoLoginEnabled: parsedEnvironment.DEMO_LOGIN_ENABLED === "true",
    loginRateLimitMaxAttempts: parsedEnvironment.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    loginRateLimitWindowSeconds: parsedEnvironment.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    nodeEnvironment: parsedEnvironment.NODE_ENV,
    port: parsedEnvironment.PORT,
    rateLimitMaxBuckets: parsedEnvironment.RATE_LIMIT_MAX_BUCKETS,
    realtimeHeartbeatSeconds: parsedEnvironment.REALTIME_HEARTBEAT_SECONDS,
    realtimeMaxConnections: parsedEnvironment.REALTIME_MAX_CONNECTIONS,
    realtimeMaxConnectionsPerUser: parsedEnvironment.REALTIME_MAX_CONNECTIONS_PER_USER,
    realtimeSessionRecheckSeconds: parsedEnvironment.REALTIME_SESSION_RECHECK_SECONDS,
    sessionCookieName: parsedEnvironment.SESSION_COOKIE_NAME,
    sessionTtlSeconds: parsedEnvironment.SESSION_TTL_SECONDS,
    trustProxyHops: parsedEnvironment.TRUST_PROXY_HOPS,
    csrfCookieName: parsedEnvironment.CSRF_COOKIE_NAME,
    csrfHeaderName: parsedEnvironment.CSRF_HEADER_NAME.toLowerCase(),
    cookieSameSite: parsedEnvironment.COOKIE_SAME_SITE,
    webOrigins,
  };
}

function assertSafeDeploymentProfile(input: {
  readonly deploymentProfile: "demo" | "development" | "production";
  readonly demoLoginEnabled: boolean;
  readonly demoMode: boolean;
  readonly nodeEnvironment: "development" | "production" | "test";
  readonly webOrigins: readonly string[];
}): void {
  if (input.deploymentProfile !== "production") return;

  if (input.nodeEnvironment !== "production") {
    throw new Error("APP_DEPLOYMENT_PROFILE=production requires NODE_ENV=production.");
  }
  if (input.demoLoginEnabled || input.demoMode) {
    throw new Error("Demo access must be disabled for the production deployment profile.");
  }
  if (input.webOrigins.some((origin) => new URL(origin).protocol !== "https:")) {
    throw new Error("Production WEB_ORIGIN values must use HTTPS.");
  }
}

function parseWebOrigins(value: string): readonly string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => {
      const parsedOrigin = new URL(origin);

      return parsedOrigin.origin;
    });
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
