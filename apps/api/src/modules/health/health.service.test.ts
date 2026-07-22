import { describe, expect, it } from "vitest";

import { HealthService } from "./health.service.js";

describe("HealthService", () => {
  it("returns the application health status", () => {
    const service = new HealthService();

    expect(service.getHealth()).toMatchObject({
      status: "ok",
    });
  });
});
