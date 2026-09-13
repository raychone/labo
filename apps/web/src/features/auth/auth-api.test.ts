import { afterEach, describe, expect, it, vi } from "vitest";

import { demoLogin } from "./auth-api.js";

function response(body: unknown, status = 200): Response {
  return {
    clone: () => response(body, status),
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("auth API CSRF flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gets CSRF without cache and sends the matching token with demo login", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(response({ user: { id: "user_1" } }));
    vi.stubGlobal("fetch", fetchMock);

    await demoLogin("MANAGER");

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining("/auth/csrf"), expect.objectContaining({ cache: "no-store", credentials: "include" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/auth/demo-login"), expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({ "x-csrf-token": "csrf-token" }),
    }));
  });

  it("refreshes only after an explicit invalid-CSRF response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ csrfToken: "stale-token" }))
      .mockResolvedValueOnce(response({ message: "Invalid CSRF token." }, 403))
      .mockResolvedValueOnce(response({ csrfToken: "fresh-token" }))
      .mockResolvedValueOnce(response({ user: { id: "user_1" } }));
    vi.stubGlobal("fetch", fetchMock);

    await demoLogin("RECEPTIE");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(4, expect.stringContaining("/auth/demo-login"), expect.objectContaining({
      headers: expect.objectContaining({ "x-csrf-token": "fresh-token" }),
    }));
  });
});
