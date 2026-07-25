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
      databaseUrl: "postgresql://user:password@localhost:5432/database",
      demoMode: false,
      loginRateLimitMaxAttempts: 5,
      loginRateLimitWindowSeconds: 60,
      port: 3001,
      sessionCookieName: "dl_session",
      sessionTtlSeconds: 28800,
      webOrigin: "http://localhost:3000",
    });
  });

  it("parses explicit demo mode", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      DEMO_MODE: "true",
    });

    expect(environment.demoMode).toBe(true);
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
});
