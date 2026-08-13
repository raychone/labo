import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { BillingStatementPrintPage } from "./billing-statement-print-page.js";

function renderWithProviders(component: ReactNode, entry: string): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route element={component} path="/billing/statements/:scope/print" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe("BillingStatementPrintPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the A5 statement header asset and selected documents", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/billing/statements/clinic")) {
        return Promise.resolve(createJsonResponse({
          clinicId: "clinic_1",
          clinicName: "Smile Avenue",
          currency: "RON",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
          documents: [
            {
              balanceMinor: 60000,
              documentId: "doc_1",
              documentNumber: "FACT-2026-000123",
              documentType: "INVOICE",
              dueDate: "2026-08-20T00:00:00.000Z",
              issueDate: "2026-08-13T00:00:00.000Z",
              paidMinor: 0,
              status: "ISSUED",
              totalMinor: 60000,
              workCodes: ["WO-2026-000001"],
            },
            {
              balanceMinor: 30000,
              documentId: "doc_2",
              documentNumber: "PF-2026-000222",
              documentType: "PROFORMA",
              dueDate: null,
              issueDate: "2026-08-18T00:00:00.000Z",
              paidMinor: 0,
              status: "ISSUED",
              totalMinor: 30000,
              workCodes: ["WO-2026-000002"],
            },
          ],
          generatedAt: "2026-08-13T12:00:00.000Z",
          paidMinor: 0,
          totalMinor: 90000,
          uninvoicedMinor: 0,
          uninvoicedWorks: [],
        }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(
      <BillingStatementPrintPage />,
      "/billing/statements/clinic/print?clinicId=clinic_1&dateFrom=2026-08-01&dateTo=2026-08-31&documentIds=doc_1,doc_2",
    );

    expect(await screen.findByText("Notă de plată")).toBeDefined();
    expect(screen.getByTitle("Antet notă de plată")).toBeDefined();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes("Smile Avenue") ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText("2 documente selectate din perioadă")).toBeDefined();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDefined();
  });
});
