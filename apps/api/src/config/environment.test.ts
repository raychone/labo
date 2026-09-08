import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "./environment.js";

describe("parseServerEnvironment", () => {
  it("parses a valid server environment", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      PORT: "3001",
    });

    expect(environment).toStrictEqual({
      csrfCookieName: "dl_csrf",
      csrfHeaderName: "x-csrf-token",
      cookieSameSite: "lax",
      databaseUrl: "postgresql://user:password@localhost:5432/database",
      deploymentProfile: "development",
      demoMode: false,
      demoLoginEnabled: false,
      loginRateLimitMaxAttempts: 5,
      loginRateLimitWindowSeconds: 60,
      nodeEnvironment: "development",
      port: 3001,
      rateLimitMaxBuckets: 10000,
      realtimeHeartbeatSeconds: 15,
      realtimeMaxConnections: 500,
      realtimeMaxConnectionsPerUser: 8,
      realtimeSessionRecheckSeconds: 30,
      sessionCookieName: "dl_session",
      sessionTtlSeconds: 28800,
      trustProxyHops: 0,
      webOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    });
  });

  it("parses explicit demo mode", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      DEMO_MODE: "true",
    });

    expect(environment.demoMode).toBe(true);
  });

  it("parses multiple allowed web origins", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      WEB_ORIGIN: "http://localhost:3000, http://127.0.0.1:3000",
    });

    expect(environment.webOrigins).toStrictEqual([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]);
  });

  it("uses the default port when PORT is not provided", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
    });

    expect(environment.port).toBe(3010);
  });

  it("rejects a missing database URL", () => {
    expect(() => parseServerEnvironment({ PORT: "3000" })).toThrow();
  });

  it("rejects demo access and insecure origins in a production profile", () => {
    const base = {
      APP_DEPLOYMENT_PROFILE: "production",
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      NODE_ENV: "production",
      WEB_ORIGIN: "https://app.example.test",
    };

    expect(() => parseServerEnvironment({ ...base, DEMO_LOGIN_ENABLED: "true" })).toThrow(/Demo access/);
    expect(() => parseServerEnvironment({ ...base, WEB_ORIGIN: "http://app.example.test" })).toThrow(/HTTPS/);
  });

  it("accepts an explicit production-safe profile", () => {
    const environment = parseServerEnvironment({
      APP_DEPLOYMENT_PROFILE: "production",
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      NODE_ENV: "production",
      TRUST_PROXY_HOPS: "1",
      WEB_ORIGIN: "https://app.example.test",
    });

    expect(environment.deploymentProfile).toBe("production");
    expect(environment.trustProxyHops).toBe(1);
  });
});
