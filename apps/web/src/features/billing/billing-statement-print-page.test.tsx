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

  it("renders the A4 asset-backed note sheet with real work-line columns", async () => {
    const noteLines = Array.from({ length: 13 }, (_, index) => ({
      cycleNumber: 1,
      description: index === 0 ? "Punți zirconiu" : `Lucrare restantă ${index + 1}`,
      doctorNameSnapshot: "Dr. Ana Popescu",
      id: `line_${index + 1}`,
      lineTotalMinor: 2000,
      patientNameSnapshot: index === 0 ? "Maria Ionescu" : `Pacient ${index + 1}`,
      quantity: 1,
      sortOrder: index + 1,
      toothPositionSnapshot: index === 0 ? "12-14" : `${10 + index}`,
      unitPriceMinor: 2000,
      workTypeUnitSnapshot: "UNIT",
      workCode: index === 0 ? "WO-2026-000002" : `WO-2026-0002${index + 1}`,
      workCycleId: `cycle_${index + 1}`,
      workCreatedAtSnapshot: `2026-08-${String(13 + index).padStart(2, "0")}T00:00:00.000Z`,
      workOrderId: `work_${index + 1}`,
      workTypeNameSnapshot: index === 0 ? "Punți zirconiu" : "Coroană zirconiu",
    }));

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
              balanceMinor: 0,
              documentId: "doc_1",
              documentNumber: "FACT-2026-000123",
              documentType: "INVOICE",
              dueDate: "2026-08-20T00:00:00.000Z",
              issueDate: "2026-08-13T00:00:00.000Z",
              paidMinor: 60000,
              status: "ISSUED",
              totalMinor: 60000,
              workCodes: ["WO-2026-000001"],
            },
            {
              balanceMinor: 30000,
              documentId: "doc_2",
              documentNumber: "FACT-2026-000222",
              documentType: "INVOICE",
              dueDate: "2026-08-18T00:00:00.000Z",
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
          documentTitle: "Anexa factura",
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
            toothPositionSnapshot: "11",
            unitPriceMinor: 10000,
            workTypeUnitSnapshot: "UNIT",
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

      if (url.endsWith("/billing-documents/doc_2/attachment")) {
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
          documentId: "doc_2",
          documentNumber: "PF-2026-000222",
          documentTitle: "Anexa factura",
          generatedAt: "2026-08-13T12:00:00.000Z",
          lines: noteLines,
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
          totalMinor: 20000,
        }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(
      <BillingStatementPrintPage />,
      "/billing/statements/clinic/print?clinicId=clinic_1&dateFrom=2026-08-01&dateTo=2026-08-31&documentIds=doc_1",
    );

    expect(await screen.findAllByText("Catre:")).toHaveLength(1);
    expect(screen.getAllByTitle("Antet notă de plată A4")).toHaveLength(1);
    expect(screen.queryByText("Perioadă")).toBeNull();
    expect(screen.queryByText("2 documente selectate din perioadă")).toBeNull();
    expect(screen.getByText("Anexa la factura FACT-2026-000123")).toBeDefined();
    for (const label of ["Data", "Doctor", "Nume pacient", "Simbol", "Poziție arcadă", "Nr. elem.", "Preț / elem.", "Valoare"] as const) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.queryByText("Tip lucrare")).toBeNull();
    expect(screen.queryByText("Valoare lei")).toBeNull();
    expect(screen.queryByText(/RON|lei/i)).toBeNull();
    expect(screen.queryByText("WO-2026-000001")).toBeNull();
    expect(screen.queryByText("WO-2026-000002")).toBeNull();
    expect(screen.getByText("Restante existente")).toBeDefined();
    expect(screen.getByText("FACT-2026-000222")).toBeDefined();
    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.queryByText("Suma factura curenta:")).toBeNull();
    expect(screen.queryByText("Total de plata curent:")).toBeNull();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDefined();
  });

  it("keeps the A5 format available when requested explicitly", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/billing/statements/clinic")) {
        return Promise.resolve(createJsonResponse({
          clinicId: "clinic_1",
          clinicName: "Smile Avenue",
          currency: "RON",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
          documents: [{
            balanceMinor: 0,
            documentId: "doc_1",
            documentNumber: "FACT-2026-000123",
            documentType: "INVOICE",
            dueDate: "2026-08-20T00:00:00.000Z",
            issueDate: "2026-08-13T00:00:00.000Z",
            paidMinor: 0,
            status: "ISSUED",
            totalMinor: 0,
            workCodes: [],
          }],
          generatedAt: "2026-08-13T12:00:00.000Z",
          paidMinor: 0,
          totalMinor: 0,
          uninvoicedMinor: 0,
          uninvoicedWorks: [],
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
          documentTitle: "Anexa factura",
          generatedAt: "2026-08-13T12:00:00.000Z",
          lines: [],
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
          totalMinor: 0,
        }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(
      <BillingStatementPrintPage />,
      "/billing/statements/clinic/print?clinicId=clinic_1&dateFrom=2026-08-01&dateTo=2026-08-31&format=a5",
    );

    expect(await screen.findByText("Catre:")).toBeDefined();
    expect(screen.getByTitle("Antet notă de plată A5")).toBeDefined();
  });
});
