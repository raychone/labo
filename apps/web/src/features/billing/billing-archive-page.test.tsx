import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { BillingArchivePage } from "./billing-archive-page.js";

function renderArchivePage(entry: string): void {
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
          <Route element={<BillingArchivePage />} path="/billing/archive" />
          <Route element={<BillingArchivePage />} path="/billing/archive/:year/:month" />
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

describe("BillingArchivePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the dedicated archive home workspace for the active company", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({
          legalEntityCode: "NC",
          legalEntityDisplayName: "Nicolaie Cristina",
          locale: "ro-RO",
        }));
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
            periodEnd: "2026-08-31",
            periodStart: "2026-08-01",
            paidMinor: 10000,
            paidTotalMinor: 5000,
            partialTotalMinor: 2500,
            reportVersion: "1",
            totalMinor: 15000,
            unpaidTotalMinor: 5000,
            year: 2026,
          }],
        }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderArchivePage("/billing/archive?year=2026");

    expect(await screen.findByRole("heading", { name: "Arhivă facturare" })).toBeDefined();
    expect(screen.getByText("NC — Nicolaie Cristina")).toBeDefined();
    expect(screen.getByText("1 lună arhivată pentru compania activă.")).toBeDefined();
    expect(screen.getByText("august 2026")).toBeDefined();
    expect(screen.getByRole("button", { name: "Deschide" })).toBeDefined();
    expect(screen.getByRole("button", { name: "PDF" })).toBeDefined();
    expect(screen.getByRole("button", { name: "CSV" })).toBeDefined();
  });

  it("opens a historical archive snapshot on the detail route", async () => {
    const createObjectUrlSpy = vi.fn(() => "blob:download");
    const revokeObjectUrlSpy = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(globalThis.URL, "createObjectURL", { configurable: true, value: createObjectUrlSpy });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrlSpy });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({
          legalEntityCode: "NC",
          legalEntityDisplayName: "Nicolaie Cristina",
          locale: "ro-RO",
        }));
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
            periodEnd: "2026-08-31",
            periodStart: "2026-08-01",
            paidMinor: 10000,
            paidTotalMinor: 5000,
            partialTotalMinor: 2500,
            reportVersion: "1",
            totalMinor: 15000,
            unpaidTotalMinor: 5000,
            year: 2026,
          }],
        }));
      }
      if (url.includes("/billing/month-registry?")) {
        return Promise.resolve(createJsonResponse({
          currency: "RON",
          dateFrom: "2026-08-01",
          dateTo: "2026-08-31",
          generatedAt: "2026-08-13T10:15:00.000Z",
          paidMinor: 5000,
          paidTotalMinor: 5000,
          partialTotalMinor: 2500,
          payments: [],
          rows: [{
            balanceMinor: 5000,
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
            totalMinor: 10000,
            workCodes: ["WO-2026-000001"],
          }],
          totalMinor: 10000,
          unpaidTotalMinor: 0,
        }));
      }
      if (url.startsWith("http://localhost:3010/billing/month-registry/pdf")) {
        return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), {
          headers: {
            "Content-Disposition": "attachment; filename=\"registru-lunar-facturare-2026-08-blob.pdf\"",
            "Content-Type": "application/pdf",
          },
          status: 200,
        }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderArchivePage("/billing/archive/2026/8");

    expect(await screen.findByRole("heading", { name: "Arhivă facturare" })).toBeDefined();
    expect(screen.getByText("Snapshot arhivat")).toBeDefined();
    expect(screen.getByText("august 2026")).toBeDefined();
    expect(screen.getAllByText("Cabinet Stomatologic Central").length).toBeGreaterThan(0);
    expect(screen.getByText("Registru lunar facturare")).toBeDefined();
    expect(screen.getByRole("button", { name: "Înapoi la arhivă" })).toBeDefined();
    expect(screen.getByRole("button", { name: "PDF" })).toBeDefined();
    expect(screen.getByRole("button", { name: "CSV" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(createObjectUrlSpy).toHaveBeenCalled());
    await waitFor(() => expect(revokeObjectUrlSpy).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/billing/month-registry/pdf?year=2026&month=8"), expect.any(Object));
  });
});
