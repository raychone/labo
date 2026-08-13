import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { BillingPrintPage } from "./billing-print-page.js";

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
          <Route element={component} path="/billing/documents/:id/print" />
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

describe("BillingPrintPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders company-scoped supplier and customer identity for printable documents", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/billing-documents/doc_1/print-view")) {
        return Promise.resolve(createJsonResponse({
          balanceMinor: 10000,
          clinicId: "clinic_1",
          clinicName: "Smile Avenue",
          clinicSnapshot: {
            address: "Str. Clinicii 1",
            email: "office@smile.test",
            legalName: "Smile Avenue Demo SRL",
            name: "Smile Avenue",
            phone: "+40711111111",
            registrationNumber: "J40/1234/2026",
            taxId: "RO12345678",
          },
          complianceNotice: "Document intern neintegrat cu RO e-Factura.",
          createdAt: "2026-08-13T10:00:00.000Z",
          currency: "RON",
          customer: {
            address: "Str. Pacienților 9",
            email: "clinic@example.test",
            legalName: "Cabinet Stomatologic Central",
            name: "Cabinet Stomatologic Central",
            phone: "+40722222222",
            registrationNumber: "J40/9876/2026",
            taxId: "RO87654321",
          },
          discountMinor: 0,
          documentTitle: "Factura",
          generatedAt: "2026-08-13T12:00:00.000Z",
          dueDate: "2026-08-20T00:00:00.000Z",
          formattedNumber: "FACT-2026-000123",
          id: "doc_1",
          issueDate: "2026-08-13T00:00:00.000Z",
          lines: [{
            cycleNumber: 1,
            description: "Coroană zirconiu",
            doctorNameSnapshot: "Dr. Ana Popescu",
            id: "line_1",
            lineTotalMinor: 10000,
            patientNameSnapshot: "Ion Pop",
            quantity: 1,
            sortOrder: 1,
            toothPositionSnapshot: null,
            unitPriceMinor: 10000,
            workCode: "WO-2026-000001",
            workCycleId: "cycle_1",
            workCreatedAtSnapshot: "2026-08-12T00:00:00.000Z",
            workOrderId: "work_1",
            workTypeNameSnapshot: "Coroană zirconiu",
          }],
          notes: "Test invoice note.",
          paidMinor: 0,
          payments: [],
          type: "INVOICE",
          paymentStatus: "UNPAID",
          legalEntityCode: "NC",
          legalEntityName: "Nicolaie Cristina",
          workCodes: ["WO-2026-000001"],
          workCount: 1,
          status: "ISSUED",
          subtotalMinor: 10000,
          supplier: {
            address: "București",
            email: "nc@example.test",
            legalName: "Nicolaie Cristina",
            name: "Nicolaie Cristina",
            phone: "+40723333333",
            registrationNumber: "J40/000001/2026",
            taxId: "RO10000001",
            website: "https://nc.example.test/",
          },
          taxMinor: 0,
          totalMinor: 10000,
        }));
      }
      if (url.endsWith("/billing-documents/doc_1/attachment")) {
        return Promise.resolve(createJsonResponse({
          complianceNotice: "Document intern neintegrat cu RO e-Factura.",
          currency: "RON",
          customer: {
            address: "Str. Pacienților 9",
            email: "clinic@example.test",
            legalName: "Cabinet Stomatologic Central",
            name: "Cabinet Stomatologic Central",
            phone: "+40722222222",
            registrationNumber: "J40/9876/2026",
            taxId: "RO87654321",
          },
          documentId: "doc_1",
          documentNumber: "FACT-2026-000123",
          documentTitle: "Factura",
          generatedAt: "2026-08-13T12:00:00.000Z",
          lines: [{
            cycleNumber: 1,
            description: "Coroană zirconiu",
            doctorNameSnapshot: "Dr. Ana Popescu",
            id: "line_1",
            lineTotalMinor: 10000,
            patientNameSnapshot: "Ion Pop",
            quantity: 1,
            sortOrder: 1,
            toothPositionSnapshot: null,
            unitPriceMinor: 10000,
            workCode: "WO-2026-000001",
            workCycleId: "cycle_1",
            workCreatedAtSnapshot: "2026-08-12T00:00:00.000Z",
            workOrderId: "work_1",
            workTypeNameSnapshot: "Coroană zirconiu",
          }],
          supplier: {
            address: "București",
            email: "nc@example.test",
            legalName: "Nicolaie Cristina",
            name: "Nicolaie Cristina",
            phone: "+40723333333",
            registrationNumber: "J40/000001/2026",
            taxId: "RO10000001",
            website: "https://nc.example.test/",
          },
          totalMinor: 10000,
        }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<BillingPrintPage />, "/billing/documents/doc_1/print");

    expect(await screen.findByRole("heading", { name: /Factura FACT-2026-000123/ })).toBeDefined();
    expect(screen.getAllByText("Nicolaie Cristina").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cabinet Stomatologic Central").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDefined();
    expect(screen.getAllByText("Document intern neintegrat cu RO e-Factura.").length).toBeGreaterThan(0);
    expect(screen.queryByText("Nicolaie Gabriel")).toBeNull();
  });
});
