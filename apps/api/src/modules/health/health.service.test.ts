import { describe, expect, it } from "vitest";

import type { DatabaseHealthStatus } from "../database/database-health.service.js";
import { type DatabaseHealthReader, HealthService } from "./health.service.js";

class DatabaseHealthServiceStub implements DatabaseHealthReader {
  public constructor(private readonly status: DatabaseHealthStatus = "ok") {}

  public async getStatus(): Promise<DatabaseHealthStatus> {
    return this.status;
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

  it("marks readiness unavailable when PostgreSQL cannot be reached", async () => {
    const service = new HealthService(new DatabaseHealthServiceStub("unavailable"));

    await expect(service.getHealth()).resolves.toStrictEqual({
      applicationName: "Dental Lab Management",
      database: "unavailable",
      status: "unavailable",
    });
  });
});
