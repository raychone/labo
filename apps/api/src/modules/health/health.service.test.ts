import { describe, expect, it } from "vitest";

import type { DatabaseHealthStatus } from "../database/database-health.service.js";
import { type DatabaseHealthReader, HealthService } from "./health.service.js";

class DatabaseHealthServiceStub implements DatabaseHealthReader {
  public async getStatus(): Promise<DatabaseHealthStatus> {
    return "ok";
  }
}

describe("HealthService", () => {
  it("returns the application and database health status", async () => {
    const service = new HealthService(new DatabaseHealthServiceStub());

    await expect(service.getHealth()).resolves.toStrictEqual({
      applicationName: "Dental Lab Management",
      database: "ok",
      status: "ok",
    });
  });
});
