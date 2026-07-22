import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "./environment.js";

describe("parseServerEnvironment", () => {
  it("parses a valid server environment", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      PORT: "3001",
    });

    expect(environment).toStrictEqual({
      databaseUrl: "postgresql://user:password@localhost:5432/database",
      port: 3001,
    });
  });

  it("uses the default port when PORT is not provided", () => {
    const environment = parseServerEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
    });

    expect(environment.port).toBe(3000);
  });

  it("rejects a missing database URL", () => {
    expect(() => parseServerEnvironment({ PORT: "3000" })).toThrow();
  });
});
