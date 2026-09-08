import { describe, expect, it } from "vitest";

import { resolveRequestId } from "./http-hardening.js";

describe("resolveRequestId", () => {
  it("preserves a bounded safe correlation ID", () => {
    expect(resolveRequestId("pilot-request:42")).toBe("pilot-request:42");
  });

  it("replaces malformed or oversized header values", () => {
    expect(resolveRequestId("contains a space")).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId("x".repeat(129))).toMatch(/^[0-9a-f-]{36}$/);
  });
});
