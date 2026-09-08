import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller.js";
import type { HealthService } from "./health.service.js";

describe("HealthController", () => {
  it("returns HTTP 503 semantics when readiness dependencies are unavailable", async () => {
    const healthService = {
      getHealth: async () => ({ applicationName: "Dental Lab Management", database: "unavailable", status: "unavailable" as const }),
    } as HealthService;
    const controller = new HealthController(healthService);

    await expect(controller.getReadiness()).rejects.toMatchObject({
      response: { database: "unavailable", status: "unavailable" },
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(controller.getLiveness()).toStrictEqual({ applicationName: "Dental Lab Management", status: "ok" });
  });
});
