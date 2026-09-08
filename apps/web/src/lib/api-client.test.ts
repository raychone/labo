import { describe, expect, it } from "vitest";

import { ApiError, parseApiResponse, resolveApiBaseUrl } from "./api-client.js";

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

  it("falls back to the current origin outside development instead of localhost", () => {
    expect(resolveApiBaseUrl({
      isDev: false,
      location: {
        hostname: "laborator.example.test",
        origin: "https://laborator.example.test",
        protocol: "https:",
      },
    })).toBe("https://laborator.example.test");
  });
});

describe("parseApiResponse", () => {
  it("preserves a malformed error-body parsing failure as the API error cause", async () => {
    const response = new Response("not-json", {
      headers: { "Content-Type": "application/json" },
      status: 502,
    });

    const error = await parseApiResponse(response).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Request-ul a eșuat.", status: 502 });
    expect((error as ApiError).cause).toBeInstanceOf(SyntaxError);
  });
});
