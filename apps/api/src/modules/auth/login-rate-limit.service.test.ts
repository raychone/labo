import { HttpException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";

import { LoginRateLimitService } from "./login-rate-limit.service.js";

describe("LoginRateLimitService", () => {
  beforeEach(() => {
    process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = "2";
    process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS = "60";
  });

  it("throws 429 after the configured login attempt limit", () => {
    const service = new LoginRateLimitService();

    service.consume("127.0.0.1", "manager@example.test");
    service.consume("127.0.0.1", "manager@example.test");

    expect(() => service.consume("127.0.0.1", "manager@example.test")).toThrow(HttpException);
  });

  it("clears successful login buckets", () => {
    const service = new LoginRateLimitService();

    service.consume("127.0.0.1", "manager@example.test");
    service.clear("127.0.0.1", "manager@example.test");

    expect(() => service.consume("127.0.0.1", "manager@example.test")).not.toThrow();
  });
});
