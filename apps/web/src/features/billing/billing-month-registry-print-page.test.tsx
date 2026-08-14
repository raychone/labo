import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { BillingMonthRegistryPrintPage } from "./billing-month-registry-print-page.js";

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
          <Route element={component} path="/billing/month-registry/print" />
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

describe("BillingMonthRegistryPrintPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a dedicated financial month-end report and not the interactive UI", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({
          legalEntityCode: "NC",
          legalEntityDisplayName: "Nicolaie Cristina",
        }));
      }
      if (url.includes("/billing/month-registry")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
          generatedAt: "2026-08-13T10:15:00.000Z",
          paidMinor: 20000,
          paidTotalMinor: 10000,
          partialTotalMinor: 15000,
          payments: [{
            amountMinor: 5000,
            billingDocumentId: "doc_1",
            cancelledAt: null,
            clinicName: "Cabinet Stomatologic Central",
            documentNumber: "FACT-2026-000001",
            id: "payment_1",
            method: "BANK_TRANSFER",
            paymentDate: "2026-08-14T00:00:00.000Z",
            receiptDate: null,
            receiptNumber: "CH-001",
            reference: "REF-001",
          }],
          rows: [{
            balanceMinor: 15000,
            clinicName: "Cabinet Stomatologic Central",
            documentId: "doc_1",
            documentNumber: "FACT-2026-000001",
            documentType: "INVOICE",
            doctorNames: ["Dr. Ana Popescu"],
            dueDate: "2026-08-20T00:00:00.000Z",
            issueDate: "2026-08-13T00:00:00.000Z",
            paidMinor: 5000,
            patientNames: ["Ion Pop"],
            status: "PARTIALLY_PAID",
            totalMinor: 20000,
            workCodes: ["WO-2026-000001"],
          }],
          totalMinor: 20000,
          unpaidTotalMinor: 0,
        }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<BillingMonthRegistryPrintPage />, "/billing/month-registry/print?year=2026&month=8");

    expect(await screen.findByRole("heading", { name: "ÎNCHIDERE LUNĂ" })).toBeDefined();
    expect(screen.getByText("Registru lunar facturare")).toBeDefined();
    expect(screen.getByText("Perioada: 1 aug. 2026 – 31 aug. 2026")).toBeDefined();
    expect(screen.getByText(/Generat la:/)).toBeDefined();
    expect(screen.getAllByText("Cabinet Stomatologic Central").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dr. Ana Popescu").length).toBeGreaterThan(0);
    expect(screen.getByText("Ion Pop")).toBeDefined();
    expect(screen.getByText("Export PDF")).toBeDefined();
    expect(screen.getByRole("heading", { name: "ÎNCASĂRI ÎN PERIOADĂ" })).toBeDefined();
    expect(screen.queryByText("Vezi filtrele")).toBeNull();
    expect(screen.queryByText("Clinici")).toBeNull();
    expect(screen.queryByText("Medici")).toBeNull();
  });
});
