import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkOrderCodeService } from "./work-order-code.service.js";

describe("WorkOrderCodeService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates short annual work codes", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ value: 1 }]);
    const service = new WorkOrderCodeService({ $queryRaw: queryRaw } as never);

    await expect(service.generate()).resolves.toBe("WO-26-0001");
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("pads sequence values and keeps the two-digit year", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ value: 42 }]);
    const service = new WorkOrderCodeService({ $queryRaw: queryRaw } as never);

    await expect(service.generate()).resolves.toBe("WO-26-0042");
  });

  it("fails when the annual sequence is exhausted", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ value: 10_000 }]);
    const service = new WorkOrderCodeService({ $queryRaw: queryRaw } as never);

    await expect(service.generate()).rejects.toThrow("Work order annual sequence for 26 is exhausted.");
  });
});
