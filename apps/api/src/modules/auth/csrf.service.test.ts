import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { CsrfService } from "./csrf.service.js";

describe("CsrfService", () => {
  it("creates URL-safe tokens", () => {
    const service = new CsrfService();

    expect(service.createToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("accepts matching cookie and header tokens", () => {
    const service = new CsrfService();
    const token = service.createToken();

    expect(() => service.assertValid(token, token)).not.toThrow();
  });

  it("reuses a well-formed cookie token so concurrent mutations cannot invalidate each other", () => {
    const service = new CsrfService();
    const existing = service.createToken();

    expect(service.reuseOrCreateToken(existing)).toBe(existing);
    expect(service.reuseOrCreateToken("invalid-token")).not.toBe("invalid-token");
  });

  it("rejects missing or mismatched tokens", () => {
    const service = new CsrfService();

    expect(() => service.assertValid("cookie", "header")).toThrow(ForbiddenException);
    expect(() => service.assertValid(undefined, "header")).toThrow(ForbiddenException);
  });
});
