import { describe, expect, it } from "vitest";

import { hasMatchingFileSignature } from "./file-signature.js";

describe("hasMatchingFileSignature", () => {
  it.each([
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ])("accepts content matching %s", (mimeType, bytes) => {
    expect(hasMatchingFileSignature(mimeType, Uint8Array.from(bytes))).toBe(true);
  });

  it("rejects a spoofed declared MIME type", () => {
    expect(hasMatchingFileSignature("image/png", Buffer.from("<script>alert(1)</script>"))).toBe(false);
    expect(hasMatchingFileSignature("application/octet-stream", Buffer.from("file"))).toBe(false);
  });
});
