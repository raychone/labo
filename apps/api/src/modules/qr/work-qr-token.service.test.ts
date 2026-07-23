import { describe, expect, it, vi } from "vitest";

import { QR_TOKEN_BYTES } from "./qr.constants.js";
import { createQrToken, WorkQrTokenService } from "./work-qr-token.service.js";

describe("createQrToken", () => {
  it("creates URL-safe opaque tokens with enough entropy", () => {
    const token = createQrToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{32,64}$/);
    expect(Buffer.from(token, "base64url").byteLength).toBe(QR_TOKEN_BYTES);
  });
});

describe("WorkQrTokenService", () => {
  it("retries when a generated token already exists", async () => {
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ id: "existing_work" })
      .mockResolvedValueOnce(null);
    const service = new WorkQrTokenService({} as never);

    const token = await service.generate({ workOrder: { findUnique } } as never);

    expect(token).toMatch(/^[A-Za-z0-9_-]{32,64}$/);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
