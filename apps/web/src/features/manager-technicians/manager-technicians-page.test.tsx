import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ManagerTechniciansPage } from "./manager-technicians-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={["/technicians"]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{component}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status } as Response;
}

describe("ManagerTechniciansPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows technician earnings snapshots and saves future rates through the rate API", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "technician.earnings.read_all", scopes: ["ALL"] },
            { key: "technician.rates.read", scopes: ["ALL"] },
            { key: "technician.rates.manage", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/users?")) {
        return Promise.resolve(createJsonResponse({
          items: [{ createdAt: "", displayName: "Tehnician Ana", email: "ana@example.test", id: "tech_1", isActive: true, mustChangePassword: false, preferredColor: null, roles: [{ key: "TEHNICIAN", name: "Tehnician" }], updatedAt: "" }],
          page: 1,
          pageCount: 1,
          pageSize: 100,
          total: 1,
        }));
      }
      if (url.includes("/technician-operations/rates") && init?.method === "POST") {
        return Promise.resolve(createJsonResponse({
          createdAt: "2026-08-20T12:00:00.000Z",
          createdByUserId: "manager_1",
          currency: "RON",
          effectiveFrom: "2026-08-21T00:00:00.000Z",
          id: "rate_1",
          operation: { code: "CER", id: "operation_1", name: "Ceramică" },
          rateMinor: 4000,
          technician: { displayName: "Tehnician Ana", id: "tech_1" },
          validUntil: null,
        }));
      }
      if (url.includes("/technician-operations/rates?")) {
        return Promise.resolve(createJsonResponse([]));
      }
      if (url.includes("/technician-operations/earnings?")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          generatedAt: "2026-08-20T12:00:00.000Z",
          period: "DAY",
          periodEnd: "2026-08-21T00:00:00.000Z",
          periodStart: "2026-08-20T00:00:00.000Z",
          settlementStatus: "EARNED_NOT_SETTLED",
          technician: null,
          totalMinor: 3000,
          works: [
            {
              currency: "RON",
              operations: [{
                currency: "RON",
                earningMinor: 3000,
                operation: { code: "CER", id: "operation_1", name: "Ceramică" },
                performedAt: "2026-08-20T10:00:00.000Z",
                performedOperationId: "performed_1",
              }],
              patientName: "Ion Pop",
              totalMinor: 3000,
              workCode: "WO-26-0001",
              workOrderId: "work_1",
            },
          ],
        }));
      }
      if (url.includes("/technician-operations?")) {
        return Promise.resolve(createJsonResponse({
          items: [{ code: "CER", createdAt: "", description: null, id: "operation_1", isActive: true, name: "Ceramică", updatedAt: "" }],
          page: 1,
          pageCount: 1,
          pageSize: 100,
          total: 1,
        }));
      }
      return Promise.resolve(createJsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<ManagerTechniciansPage />);

    await waitFor(() => expect(screen.getByText("WO-26-0001")).toBeDefined());
    expect(screen.getByText("Câștiguri realizate, rate pe manoperă și achitări către tehnicieni.")).toBeDefined();

    fireEvent.focus(screen.getByLabelText("Tehnician"));
    fireEvent.change(screen.getByLabelText("Tehnician"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("option", { name: "Tehnician Ana" }));
    fireEvent.focus(screen.getByLabelText("Manoperă"));
    fireEvent.click(screen.getByRole("option", { name: "CER · Ceramică" }));
    fireEvent.change(screen.getByLabelText("Câștig RON"), { target: { value: "40.00" } });
    fireEvent.change(screen.getByLabelText("Valabil de la"), { target: { value: "2026-08-21" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează rata" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/technician-operations/rates"),
      expect.objectContaining({
        body: expect.stringContaining("\"rateMinor\":4000"),
        method: "POST",
      }),
    ));
  });
});
