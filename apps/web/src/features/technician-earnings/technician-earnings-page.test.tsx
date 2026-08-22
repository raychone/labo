import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TechnicianEarningsPage } from "./technician-earnings-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={["/earnings"]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{component}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status } as Response;
}

describe("TechnicianEarningsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders own earnings from snapshot totals and work-operation breakdown", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [{ key: "technician.earnings.read_own", scopes: ["ASSIGNED"] }],
        }));
      }
      if (url.includes("/technician-operations/earnings/me?")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          generatedAt: "2026-08-20T12:00:00.000Z",
          period: "DAY",
          periodEnd: "2026-08-21T00:00:00.000Z",
          periodStart: "2026-08-20T00:00:00.000Z",
          settlementStatus: "EARNED_NOT_SETTLED",
          technician: { displayName: "Tehnician Ana", id: "tech_1" },
          totalMinor: 4500,
          works: [
            {
              currency: "RON",
              operations: [
                {
                  currency: "RON",
                  earningMinor: 3000,
                  operation: { code: "CER", id: "operation_1", name: "Ceramică" },
                  performedAt: "2026-08-20T10:00:00.000Z",
                  performedOperationId: "performed_1",
                },
                {
                  currency: "RON",
                  earningMinor: 1500,
                  operation: { code: "GLZ", id: "operation_2", name: "Glazurare" },
                  performedAt: "2026-08-20T11:00:00.000Z",
                  performedOperationId: "performed_2",
                },
              ],
              patientName: "Ion Pop",
              totalMinor: 4500,
              workCode: "WO-26-0001",
              workOrderId: "work_1",
            },
          ],
        }));
      }
      return Promise.resolve(createJsonResponse({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TechnicianEarningsPage />);

    await waitFor(() => expect(screen.getByText("WO-26-0001")).toBeDefined());
    expect(screen.getByText("Manoperele finalizate generează o sumă de primit. Plata apare doar după ce Managerul o înregistrează.")).toBeDefined();
    expect(screen.getByText("CER · Ceramică")).toBeDefined();
    expect(screen.getByText("GLZ · Glazurare")).toBeDefined();
    expect(screen.getAllByText(/45,00/).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/technician-operations/earnings/me?"), expect.objectContaining({ credentials: "include" }));
  });
});
