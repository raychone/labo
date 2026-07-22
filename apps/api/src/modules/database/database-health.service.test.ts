import { describe, expect, it } from "vitest";

import {
  type DatabaseQueryClient,
  DatabaseHealthService,
} from "./database-health.service.js";
import type { PrismaService } from "./prisma.service.js";

describe("DatabaseHealthService", () => {
  it("returns ok when the database query succeeds", async () => {
    const pool: DatabaseQueryClient = {
      $queryRaw: async () => Promise.resolve([{ result: 1 }]),
    };
    const service = new DatabaseHealthService(pool as PrismaService);

    await expect(service.getStatus()).resolves.toBe("ok");
  });

  it("returns unavailable when the database query fails", async () => {
    const pool: DatabaseQueryClient = {
      $queryRaw: async () => Promise.reject(new Error("connection failed")),
    };
    const service = new DatabaseHealthService(pool as PrismaService);

    await expect(service.getStatus()).resolves.toBe("unavailable");
  });
});
