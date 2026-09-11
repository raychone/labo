import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterProvider, createMemoryRouter } from "react-router";

import { BillingPage } from "./billing-page.js";

function renderWithProviders(component: ReactNode): void {
  renderWithRouter(component, ["/billing"]);
}

function renderWithRouter(component: ReactNode, initialEntries: string[]): ReturnType<typeof createMemoryRouter> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter([
    {
      element: <ToastProvider>{component}</ToastProvider>,
      path: "/billing",
    },
  ], {
    initialEntries,
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    text: async () => JSON.stringify(body),
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe("BillingPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders month-end cards, billable works and document actions", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
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
      if (url.endsWith("/clinics/options")) {
        return Promise.resolve(createJsonResponse([{ code: "CL-001", id: "clinic_1", name: "Clinica Test" }]));
      }
      if (url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse([{ clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" }]));
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
          documents: [{
            balanceMinor: 0,
            documentId: "invoice_paid_1",
            documentNumber: "FACT-2026-000099",
            documentType: "INVOICE",
            dueDate: "2026-08-10T00:00:00.000Z",
            issueDate: "2026-07-23T12:00:00.000Z",
            paidMinor: 35000,
            status: "PAID",
            totalMinor: 35000,
            workCodes: ["WO-2026-000099"],
          }],
          generatedAt: "2026-08-04T00:00:00.000Z",
          paidMinor: 35000,
          totalMinor: 35000,
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
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          generatedAt: "2026-08-04T00:00:00.000Z",
          items: [{
            balanceMinor: 35000,
            clinicName: "Clinica Test",
            currency: "RON",
            daysOverdue: 12,
            doctorNames: ["Dr. Ana Popescu"],
            documentId: "invoice_1",
            documentNumber: "FACT-2026-000001",
            dueDate: "2026-08-10T00:00:00.000Z",
            issueDate: "2026-07-23T12:00:00.000Z",
            paidMinor: 0,
            patientNames: ["Ion Pop"],
            status: "ISSUED",
            totalMinor: 35000,
            workCodes: ["WO-2026-000002"],
          }],
          overdueCount: 1,
          totalBalanceMinor: 35000,
        }));
      }
      if (url.endsWith("/billing/ambiguous-legacy")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.endsWith("/billing/month-registry/archives")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            archiveId: "archive_1",
            closedAt: "2026-08-13T10:15:00.000Z",
            closedByDisplayName: "Demo Manager",
            closedByEmail: "manager@demo.local",
            closedByUserId: "user_1",
            currency: "RON",
            month: 8,
            paidMinor: 10000,
            paidTotalMinor: 10000,
            partialTotalMinor: 0,
            periodEnd: "2026-08-31",
            periodStart: "2026-08-01",
            reportVersion: "1",
            totalMinor: 15000,
            unpaidTotalMinor: 5000,
            year: 2026,
          }],
        }));
      }
      if (url.includes("/billing/month-registry")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", dateFrom: "2026-08-01", dateTo: "2026-08-31", generatedAt: "2026-08-04T00:00:00.000Z", paidMinor: 0, paidTotalMinor: 0, partialTotalMinor: 0, payments: [], rows: [], totalMinor: 0, unpaidTotalMinor: 0 }));
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
            stornoDocumentId: null,
            stornoOfDocumentId: null,
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
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("open", vi.fn());

    renderWithProviders(<BillingPage />);

    expect(await screen.findByRole("heading", { name: "Facturare" })).toBeDefined();
    expect(within(await screen.findByLabelText("Indicatori facturare")).getAllByRole("button")).toHaveLength(4);
    const filters = screen.getByLabelText("Filtre facturare");
    const clinicFilter = within(filters).getByLabelText("Clinică");
    expect(within(filters).getByLabelText("Medic")).toBeDefined();
    expect(within(filters).getByLabelText("Căutare")).toBeDefined();
    fireEvent.click(clinicFilter);
    fireEvent.click(await screen.findByRole("option", { name: "Clinica Test" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("clinicId=clinic_1"))).toBe(true));
    expect(screen.queryByLabelText("Status încasare")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Filtre avansate" }));
    expect(await screen.findByLabelText("Status încasare")).toBeDefined();
    expect(screen.queryByText("Arhivă închideri")).toBeNull();
    expect((await screen.findAllByText("Nefacturat")).length).toBeGreaterThan(0);
    for (const tabName of ["De facturat", "Facturi", "Note de plată", "Încasări", "Restanțe", "Storno", "Arhivă"]) {
      expect(screen.getByRole("tab", { name: tabName })).toBeDefined();
    }
    expect(screen.queryByRole("tab", { name: "Închidere lună" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "De facturat" }));
    const billableCheckbox = await screen.findByRole("checkbox", { name: "Selectează WO-2026-000001" });
    expect(billableCheckbox.classList.contains("billing-page__row-selection-checkbox")).toBe(true);
    const billableToolbar = screen.getByRole("group", { name: "Toolbar de facturat" });
    expect(within(billableToolbar).getByRole("button", { name: "Export CSV" })).toBeDefined();
    expect((within(billableToolbar).getByRole("button", { name: "Revizuiește valorile" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(billableToolbar).getByRole("button", { name: "Emite factură" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(billableCheckbox);
    expect(await screen.findByText(/1 lucrări selectate/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Revizuiește valorile" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Emite factură" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Creează notă de plată" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Revizuiește valorile" }));
    expect(await screen.findByRole("heading", { name: "Revizuiește valorile" })).toBeDefined();
    expect(screen.getByText(/Total revizuit:/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Creează proformă" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Proforme" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Prezentare generală" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Ghid facturare" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Facturi" }));
    expect(await screen.findByRole("button", { name: "Deschide" })).toBeDefined();
    const invoicesToolbar = screen.getByRole("group", { name: "Toolbar facturi" });
    expect(within(invoicesToolbar).getByRole("button", { name: "Export CSV" })).toBeDefined();
    expect((within(invoicesToolbar).getByRole("button", { name: "Încasează" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(invoicesToolbar).getByRole("button", { name: "Export PDF" }) as HTMLButtonElement).disabled).toBe(true);
    const invoiceCheckbox = await screen.findByRole("checkbox", { name: "Selectează FACT-2026-000001" });
    expect(invoiceCheckbox.classList.contains("billing-page__row-selection-checkbox")).toBe(true);
    fireEvent.click(invoiceCheckbox);
    expect(screen.getByRole("button", { name: "Încasează" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Încasează" }));
    fireEvent.change(await screen.findByLabelText("Sumă încasată"), { target: { value: "50.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează încasarea" }));
    expect(screen.queryByText("Incaseaza sold")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Restanțe" }));
    const receivablesToolbar = await screen.findByRole("group", { name: "Toolbar restanțe" });
    expect(within(receivablesToolbar).getByRole("button", { name: "Export CSV" })).toBeDefined();
    expect((within(receivablesToolbar).getByRole("button", { name: "Deschide documentul" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(receivablesToolbar).getByRole("button", { name: "Înregistrează încasare" }) as HTMLButtonElement).disabled).toBe(true);
    const receivableCheckbox = await screen.findByRole("checkbox", { name: "Selectează FACT-2026-000001" });
    expect(receivableCheckbox.classList.contains("billing-page__row-selection-checkbox")).toBe(true);
    fireEvent.click(receivableCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează încasare" }));
    expect(await screen.findByLabelText("Sumă încasată")).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Note de plată" }));
    expect(await screen.findByRole("heading", { name: "Clinica Test" })).toBeDefined();
    const statementsToolbar = screen.getByRole("group", { name: "Toolbar note de plată" });
    expect(within(statementsToolbar).getByRole("button", { name: "Clinică" })).toBeDefined();
    expect(within(statementsToolbar).getByRole("button", { name: "Medic" })).toBeDefined();
    expect(within(statementsToolbar).getByRole("button", { name: "Documente emise" })).toBeDefined();
    expect(within(statementsToolbar).getByRole("button", { name: "Lucrări nefacturate" })).toBeDefined();
    expect(within(statementsToolbar).getByRole("button", { name: "Export PDF" })).toBeDefined();
    expect(within(statementsToolbar).getByRole("button", { name: "Trimite email" })).toBeDefined();
    expect(within(statementsToolbar).getByRole("button", { name: "Trimite WhatsApp" })).toBeDefined();
    expect(screen.getByText("FACT-2026-000099")).toBeDefined();
    expect(screen.getByRole("checkbox", { name: "Selectează FACT-2026-000099" }).classList.contains("billing-page__row-selection-checkbox")).toBe(true);
    expect(screen.getAllByText("350,00 RON").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Încasări" }));
    expect(await screen.findByText("Nu există încasări.")).toBeDefined();
    expect(within(screen.getByRole("group", { name: "Toolbar încasări" })).getByRole("button", { name: "Export CSV" })).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "Storno" }));
    const stornoToolbar = await screen.findByRole("group", { name: "Toolbar storno" });
    expect(within(stornoToolbar).getByRole("button", { name: "Export PDF" })).toBeDefined();
    expect((within(stornoToolbar).getByRole("button", { name: "Creează storno" }) as HTMLButtonElement).disabled).toBe(true);
    const stornoCheckbox = await screen.findByRole("checkbox", { name: "Selectează FACT-2026-000001" });
    expect(stornoCheckbox.classList.contains("billing-page__row-selection-checkbox")).toBe(true);
    fireEvent.click(stornoCheckbox);
    expect((within(stornoToolbar).getByRole("button", { name: "Creează storno" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Arhivă" }));
    expect(await screen.findByRole("heading", { name: "Arhiva lunilor închise" })).toBeDefined();
    expect(screen.getByText("august 2026")).toBeDefined();
  }, 30000);

  it("keeps monthly close in contextual actions and invokes the existing close endpoint", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "finance.read", scopes: ["ALL"] },
            { key: "finance.read_reports", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", legalEntityCode: "NC", legalEntityDisplayName: "Nicolaie Cristina", locale: "ro-RO" }));
      }
      if (url.endsWith("/clinics/options") || url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse([]));
      }
      if (url.endsWith("/billing/month-registry/archives")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.includes("/billing/month-registry/close")) {
        expect(init?.method).toBe("POST");
        return Promise.resolve(createJsonResponse({
          archiveId: "archive_1",
          closedAt: "2026-08-31T20:00:00.000Z",
          currency: "RON",
          month: 8,
          year: 2026,
        }));
      }
      if (url.includes("/billing/month-registry")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", dateFrom: "2026-08-01", dateTo: "2026-08-31", generatedAt: "2026-08-31T20:00:00.000Z", paidMinor: 0, paidTotalMinor: 0, partialTotalMinor: 0, payments: [], rows: [], totalMinor: 0, unpaidTotalMinor: 0 }));
      }
      if (url.includes("/billing/overview")) {
        return Promise.resolve(createJsonResponse({
          ambiguousLegacyCount: 0,
          currency: "RON",
          documentCount: 0,
          from: "2026-08-01",
          groups: [],
          invoiceCount: 0,
          openProformaCount: 0,
          outstandingMinor: 0,
          overdueInvoiceCount: 0,
          paidInvoiceCount: 0,
          paidMinor: 0,
          partialInvoiceCount: 0,
          proformaMinor: 0,
          to: "2026-08-31",
          totalIssuedMinor: 0,
          uninvoicedMinor: 0,
          uninvoicedWorkCount: 0,
          unpaidInvoiceCount: 0,
          workValueMinor: 0,
        }));
      }
      if (url.includes("/billing/billable-works")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<BillingPage />, ["/billing?year=2026&month=8"]);

    expect(await screen.findByRole("heading", { name: "Facturare" })).toBeDefined();
    fireEvent.click(await screen.findByRole("button", { name: "Acțiuni" }));
    const closeAction = await screen.findByRole("button", { name: "Închide și arhivează luna" });
    fireEvent.click(closeAction);
    expect(await screen.findByRole("dialog", { name: "Închide și arhivează luna" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Confirmă închiderea lunii" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => (
      String(input).includes("/billing/month-registry/close?") && (init as RequestInit | undefined)?.method === "POST"
    ))).toBe(true));
  });

  it("keeps the selected historical month stable in the URL when navigating months", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "finance.read", scopes: ["ALL"] },
            { key: "finance.read_reports", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", legalEntityCode: "NC", legalEntityDisplayName: "Nicolaie Cristina", locale: "ro-RO" }));
      }
      if (url.endsWith("/clinics/options") || url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse([]));
      }
      if (url.includes("/billing/overview")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          documentCount: 0,
          ambiguousLegacyCount: 0,
          from: "2026-06-01",
          groups: [],
          invoiceCount: 0,
          openProformaCount: 0,
          overdueInvoiceCount: 0,
          outstandingMinor: 0,
          paidMinor: 0,
          paidInvoiceCount: 0,
          partialInvoiceCount: 0,
          proformaMinor: 0,
          to: "2026-06-30",
          totalIssuedMinor: 0,
          unpaidInvoiceCount: 0,
          uninvoicedMinor: 0,
          uninvoicedWorkCount: 0,
          workValueMinor: 0,
        }));
      }
      if (url.includes("/billing/statements/clinic")) {
        return Promise.resolve(createJsonResponse({ clinicId: "clinic_1", clinicName: "Clinica Test", currency: "RON", dateFrom: "2026-06-01", dateTo: "2026-06-30", documents: [], generatedAt: "2026-08-04T00:00:00.000Z", paidMinor: 0, totalMinor: 0, uninvoicedMinor: 0, uninvoicedWorks: [] }));
      }
      if (url.includes("/billing/statements/doctor")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", dateFrom: "2026-06-01", dateTo: "2026-06-30", doctorId: "doctor_1", doctorName: "Dr. Ana Popescu", documents: [], generatedAt: "2026-08-04T00:00:00.000Z", paidMinor: 0, totalMinor: 0, uninvoicedMinor: 0, uninvoicedWorks: [] }));
      }
      if (url.includes("/billing/billable-works")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.includes("/billing/receivables")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", generatedAt: "2026-08-04T00:00:00.000Z", items: [], overdueCount: 0, totalBalanceMinor: 0 }));
      }
      if (url.endsWith("/billing/ambiguous-legacy")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.endsWith("/billing/month-registry/archives")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.includes("/billing/month-registry")) {
        return Promise.resolve(createJsonResponse({ currency: "RON", dateFrom: "2026-06-01", dateTo: "2026-06-30", generatedAt: "2026-08-04T00:00:00.000Z", paidMinor: 0, paidTotalMinor: 0, partialTotalMinor: 0, payments: [], rows: [], totalMinor: 0, unpaidTotalMinor: 0 }));
      }
      if (url.includes("/billing-documents")) {
        return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 20, total: 0 }));
      }
      if (url.endsWith("/payments")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      if (url.endsWith("/billing-series")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    const router = renderWithRouter(<BillingPage />, ["/billing?year=2026&month=6"]);

    expect(await screen.findByRole("heading", { name: "Facturare" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Luna următoare" }));
    expect(router.state.location.search).toBe("?year=2026&month=7");
    fireEvent.click(screen.getByRole("button", { name: "Luna anterioară" }));
    expect(router.state.location.search).toBe("?year=2026&month=6");
    expect(screen.getByLabelText("Perioadă financiară")).toBeDefined();
  });
});
