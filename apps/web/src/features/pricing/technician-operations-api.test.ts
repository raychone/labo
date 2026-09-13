import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchTechnicianOperationCatalog } from "./technician-operations-api.js";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("../../lib/api-client.js", () => ({
  apiFetch: (...args: unknown[]) => mocks.apiFetch(...args),
  parseApiResponse: (response: unknown) => Promise.resolve(response),
}));

vi.mock("../auth/auth-api.js", () => ({
  fetchCsrfToken: vi.fn(),
}));

describe("technician operation catalog query", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
  });

  it("loads every page from the existing catalog endpoint", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce({ items: [{ id: "operation-1" }], page: 1, pageCount: 3, pageSize: 100, total: 3 })
      .mockResolvedValueOnce({ items: [{ id: "operation-2" }], page: 2, pageCount: 3, pageSize: 100, total: 3 })
      .mockResolvedValueOnce({ items: [{ id: "operation-3" }], page: 3, pageCount: 3, pageSize: 100, total: 3 });

    await expect(fetchTechnicianOperationCatalog()).resolves.toEqual([
      { id: "operation-1" },
      { id: "operation-2" },
      { id: "operation-3" },
    ]);
    expect(mocks.apiFetch).toHaveBeenCalledTimes(3);
    expect(mocks.apiFetch.mock.calls.map(([url]) => String(url))).toEqual([
      "/technician-operations?page=1&pageSize=100&sortBy=name&sortDirection=asc",
      "/technician-operations?page=2&pageSize=100&sortBy=name&sortDirection=asc",
      "/technician-operations?page=3&pageSize=100&sortBy=name&sortDirection=asc",
    ]);
  });
});
