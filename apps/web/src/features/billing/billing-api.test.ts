import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/auth-api.js", async () => {
  const actual = await vi.importActual<typeof import("../auth/auth-api.js")>("../auth/auth-api.js");
  return {
    ...actual,
    fetchCsrfToken: vi.fn(async () => "csrf-test-token"),
  };
});

import { closeMonthRegistry } from "./billing-api.js";

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe("billing-api month close", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the CSRF token when closing a month registry", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf")) {
        return createJsonResponse({ csrfToken: "csrf-test-token" });
      }
      if (url.includes("/billing/month-registry/close")) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          "Content-Type": "application/json",
          "x-csrf-token": "csrf-test-token",
        });
        return createJsonResponse({
          archiveId: "archive_1",
          closedAt: "2026-08-14T00:00:00.000Z",
          closedByUserId: "user_1",
          currency: "RON",
          month: 7,
          paidMinor: 0,
          paidTotalMinor: 0,
          partialTotalMinor: 0,
          periodEnd: "2026-07-31",
          periodStart: "2026-07-01",
          reportVersion: 1,
          totalMinor: 0,
          unpaidTotalMinor: 0,
          year: 2026,
        });
      }

      return createJsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchSpy);

    await closeMonthRegistry({ dateFrom: "2026-07-01", dateTo: "2026-07-31", month: 7, year: 2026 });

    expect(fetchSpy).toHaveBeenCalled();
  });
});
