import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BillingPage } from "./billing-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{component}</ToastProvider>
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

describe("BillingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders month-end cards, billable works and document actions", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "finance.read", scopes: ["ALL"] },
            { key: "finance.read_reports", scopes: ["ALL"] },
            { key: "finance.record_payment", scopes: ["ALL"] },
            { key: "invoice.create", scopes: ["ALL"] },
            { key: "invoice.download", scopes: ["ALL"] },
            { key: "invoice.read", scopes: ["ALL"] },
            { key: "invoice.configure_series", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", legalEntityCode: "NC", legalEntityDisplayName: "Nicolaie Cristina", locale: "ro-RO" }));
      }
      if (url.includes("/billing/overview")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          documentCount: 1,
          ambiguousLegacyCount: 0,
          from: "2026-07-01",
          groups: [{ balanceMinor: 35000, count: 1, invoicedMinor: 0, key: "clinic_1", label: "Clinica Test", paidMinor: 0, uninvoicedMinor: 35000 }],
          invoiceCount: 0,
          openProformaCount: 0,
          overdueInvoiceCount: 0,
          outstandingMinor: 0,
          paidMinor: 0,
          paidInvoiceCount: 0,
          partialInvoiceCount: 0,
          proformaMinor: 0,
          to: "2026-07-31",
          totalIssuedMinor: 0,
          unpaidInvoiceCount: 0,
          uninvoicedMinor: 35000,
          uninvoicedWorkCount: 1,
          workValueMinor: 35000,
        }));
      }
      if (url.includes("/billing/statements/clinic")) {
        return Promise.resolve(createJsonResponse({
          clinicId: "clinic_1",
          clinicName: "Clinica Test",
          currency: "RON",
          dateFrom: "2026-07-01",
          dateTo: "2026-07-31",
          documents: [],
          generatedAt: "2026-08-04T00:00:00.000Z",
          paidMinor: 0,
          totalMinor: 0,
          uninvoicedMinor: 0,
          uninvoicedWorks: [],
        }));
      }
      if (url.includes("/billing/statements/doctor")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          dateFrom: "2026-07-01",
          dateTo: "2026-07-31",
          doctorId: "doctor_1",
          doctorName: "Dr. Ana Popescu",
          documents: [],
          generatedAt: "2026-08-04T00:00:00.000Z",
          paidMinor: 0,
          totalMinor: 0,
          uninvoicedMinor: 0,
          uninvoicedWorks: [],
        }));
      }
      if (url.includes("/billing/billable-works")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            baseUnitPriceMinor: 35000,
            clinicId: "clinic_1",
            clinicName: "Clinica Test",
            code: "WO-2026-000001",
            createdAt: "2026-07-22T12:00:00.000Z",
            currency: "RON",
            doctorId: "doctor_1",
            doctorName: "Dr. Ana Popescu",
            id: "work_order_1",
            invoicedDocumentId: null,
            isBillable: true,
            legalEntityCode: "NC",
            legalEntityName: "Nicolaie Cristina",
            patientName: "Ion Pop",
            patientReference: null,
            quantity: 1,
            requestedDeliveryDate: "2026-08-01T00:00:00.000Z",
            status: "REGISTERED",
            totalPriceMinor: 35000,
            unavailableReason: null,
            workCycleId: "cycle_1",
            workCycleNumber: 1,
            workTypeName: "Coroana zirconiu",
          }],
        }));
      }
      if (url.includes("/billing/receivables")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", generatedAt: "2026-08-04T00:00:00.000Z", items: [], overdueCount: 0, totalBalanceMinor: 0 }));
      }
      if (url.endsWith("/billing/ambiguous-legacy")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.includes("/billing/month-registry")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", dateFrom: "2026-08-01", dateTo: "2026-08-31", generatedAt: "2026-08-04T00:00:00.000Z", paidMinor: 0, paidTotalMinor: 0, partialTotalMinor: 0, rows: [], totalMinor: 0, unpaidTotalMinor: 0 }));
      }
      if (url.includes("/billing-documents") && url.includes("type=PROFORMA")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            balanceMinor: 35000,
            clinicId: "clinic_1",
            clinicName: "Clinica Test",
            createdAt: "2026-07-22T12:00:00.000Z",
            currency: "RON",
            doctorId: "doctor_1",
            doctorName: "Dr. Ana Popescu",
            dueDate: null,
            formattedNumber: "PF-2026-000001",
            id: "proforma_1",
            issueDate: "2026-07-22T12:00:00.000Z",
            legalEntityCode: "NC",
            legalEntityName: "Nicolaie Cristina",
            paidMinor: 0,
            paymentStatus: "UNPAID",
            status: "ISSUED",
            totalMinor: 35000,
            type: "PROFORMA",
            workCodes: ["WO-2026-000001"],
            workCount: 1,
          }],
          page: 1,
          pageCount: 1,
          pageSize: 20,
          total: 1,
        }));
      }
      if (url.includes("/billing-documents") && url.includes("type=INVOICE")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            balanceMinor: 10000,
            clinicId: "clinic_1",
            clinicName: "Clinica Test",
            createdAt: "2026-07-23T12:00:00.000Z",
            currency: "RON",
            doctorId: "doctor_1",
            doctorName: "Dr. Ana Popescu",
            dueDate: "2026-08-10T00:00:00.000Z",
            formattedNumber: "FACT-2026-000001",
            id: "invoice_1",
            issueDate: "2026-07-23T12:00:00.000Z",
            legalEntityCode: "NC",
            legalEntityName: "Nicolaie Cristina",
            paidMinor: 0,
            paymentStatus: "UNPAID",
            status: "ISSUED",
            totalMinor: 10000,
            type: "INVOICE",
            workCodes: ["WO-2026-000002"],
            workCount: 1,
          }],
          page: 1,
          pageCount: 1,
          pageSize: 20,
          total: 1,
        }));
      }
      if (url.includes("/billing-documents")) {
        return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 20, total: 0 }));
      }
      if (url.endsWith("/payments")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.endsWith("/billing-series")) {
        return Promise.resolve(createJsonResponse({ items: [{ currentNumber: 0, documentType: "INVOICE", id: "series_1", isActive: true, prefix: "FACT", year: 2026 }] }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<BillingPage />);

    expect(await screen.findByRole("heading", { name: "Facturare" })).toBeDefined();
    expect(screen.queryByLabelText("Status încasare")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Vezi filtrele" }));
    expect(await screen.findByLabelText("Status încasare")).toBeDefined();
    expect((await screen.findAllByText("Nefacturat")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Lucrări nefacturate/ }));
    expect(await screen.findByRole("checkbox", { name: "Selectează WO-2026-000001" })).toBeDefined();
    fireEvent.click(screen.getByLabelText("Selectează WO-2026-000001"));
    expect(await screen.findByText(/1 lucrări selectate/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Creează proformă" })).toBeNull();
    expect(screen.getByRole("button", { name: "Creează factură" })).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "Proforme" }));
    fireEvent.click(await screen.findByRole("button", { name: "Selectează" }));
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează încasare" }));
    fireEvent.change(screen.getByLabelText("Sumă încasată"), { target: { value: "350.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează încasarea" }));
    expect(screen.queryByText("Incaseaza sold")).toBeNull();
  });
});
