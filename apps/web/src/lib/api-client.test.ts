import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./api-client.js";

describe("resolveApiBaseUrl", () => {
  it("derives the API host from the browser origin in development when no override is set", () => {
    expect(resolveApiBaseUrl({
      isDev: true,
      location: {
        hostname: "localhost",
        protocol: "http:",
      },
    })).toBe("http://localhost:3010");

    expect(resolveApiBaseUrl({
      isDev: true,
      location: {
        hostname: "127.0.0.1",
        protocol: "http:",
      },
    })).toBe("http://127.0.0.1:3010");
  });

  it("prefers an explicit configured base URL", () => {
    expect(resolveApiBaseUrl({
      configuredBaseUrl: "https://api.example.test",
      isDev: true,
      location: {
        hostname: "localhost",
        protocol: "http:",
      },
    })).toBe("https://api.example.test");
  });
});
