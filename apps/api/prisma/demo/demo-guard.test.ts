import { describe, expect, it } from "vitest";

import { assertDemoSeedAllowed } from "./demo-guard.js";

describe("demo seed guard", () => {
  it("refuses production even with the explicit flag", () => {
    expect(() => assertDemoSeedAllowed({ ALLOW_DEMO_SEED: "true", NODE_ENV: "production" })).toThrow("production");
  });

  it("requires the explicit demo seed flag", () => {
    expect(() => assertDemoSeedAllowed({ NODE_ENV: "development" })).toThrow("ALLOW_DEMO_SEED=true");
  });

  it("allows non-production with the explicit flag", () => {
    expect(() => assertDemoSeedAllowed({ ALLOW_DEMO_SEED: "true", NODE_ENV: "development" })).not.toThrow();
  });
});
