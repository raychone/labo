import { describe, expect, it } from "vitest";

import {
  type DatabaseQueryClient,
  DatabaseHealthService,
} from "./database-health.service.js";

describe("DatabaseHealthService", () => {
  it("returns ok when the database query succeeds", async () => {
    const pool: DatabaseQueryClient = {
      query: async () => Promise.resolve([{ result: 1 }]),
    };
    const service = new DatabaseHealthService(pool);

    await expect(service.getStatus()).resolves.toBe("ok");
  });

  it("returns unavailable when the database query fails", async () => {
    const pool: DatabaseQueryClient = {
      query: async () => Promise.reject(new Error("connection failed")),
    };
    const service = new DatabaseHealthService(pool);

    await expect(service.getStatus()).resolves.toBe("unavailable");
  });
});
