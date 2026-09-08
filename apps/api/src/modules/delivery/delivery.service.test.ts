import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { DeliveryService } from "./delivery.service.js";

describe("DeliveryService creation concurrency", () => {
  it("uses a serializable transaction and reports exhausted serialization conflicts as a domain conflict", async () => {
    const serializationError = new Prisma.PrismaClientKnownRequestError("write conflict", {
      clientVersion: "test",
      code: "P2034",
    });
    const transaction = vi.fn().mockRejectedValue(serializationError);
    const service = new DeliveryService(
      { hasPermission: vi.fn().mockResolvedValue({ allowed: true }) } as never,
      {} as never,
      { $transaction: transaction } as never,
    );

    await expect(service.createDelivery({
      actor: { displayName: "Logistică Test", email: "logistica@example.test", id: "user-1", isActive: true, mustChangePassword: false },
      requestMetadata: {},
    }, "group-1", {
      plannedDate: "2026-09-08T08:00:00.000Z",
    })).rejects.toBeInstanceOf(ConflictException);

    expect(transaction).toHaveBeenCalledTimes(3);
    for (const call of transaction.mock.calls) {
      expect(call[1]).toEqual({ isolationLevel: "Serializable" });
    }
  });
});
