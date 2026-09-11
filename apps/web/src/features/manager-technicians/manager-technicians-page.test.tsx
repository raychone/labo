import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ManagerTechniciansPage } from "./manager-technicians-page.js";

function response(body: unknown, status = 200): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as Response;
}

function renderPage(component: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter><QueryClientProvider client={client}><ToastProvider>{component}</ToastProvider></QueryClientProvider></MemoryRouter>);
}

const earnings = {
  currency: "RON",
  currencyTotals: [{ balanceMinor: 1800, cumulativeEarnedMinor: 3000, cumulativePaidMinor: 1200, currency: "RON", paidMinor: 1200, periodEarnedMinor: 3000, periodPaidMinor: 1200, remainingMinor: 1800, settlementStatus: "PARTIALLY_PAID", totalMinor: 3000 }],
  generatedAt: "2026-09-09T12:00:00.000Z",
  paidMinor: 1200,
  payments: [{ amountMinor: 1200, createdAt: "2026-09-09T12:00:00.000Z", createdByDisplayName: "Demo Manager", createdByUserId: "manager_1", currency: "RON", id: "payment_1", notes: "Achitare septembrie", paidAt: "2026-09-09T12:00:00.000Z", technicianId: "tech_1" }],
  period: "MONTH",
  periodEnd: "2026-10-01T00:00:00.000Z",
  periodStart: "2026-09-01T00:00:00.000Z",
  remainingMinor: 1800,
  settlementStatus: "PARTIALLY_PAID",
  technician: { displayName: "Tehnician Ana", id: "tech_1" },
  totalMinor: 3000,
  works: [{ currency: "RON", operations: [{ currency: "RON", earningMinor: 3000, isLegacy: false, operation: { category: "Coroană ceramică", code: "CER", id: "operation_1", name: "Ceramică" }, operationCodeSnapshot: "CER", operationNameSnapshot: "Ceramică", performedAt: "2026-09-08T10:00:00.000Z", performedOperationId: "performed_1", probeCycle: null, quantity: 1, rateMinorSnapshot: 3000, removedAt: null, removalReason: null, selectedTeeth: [11], technician: { displayName: "Tehnician Ana", id: "tech_1" } }], patientName: "Ion Pop", totalMinor: 3000, workCode: "WO-26-0001", workOrderId: "work_1" }],
};

describe("ManagerTechniciansPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the real payment history with clear financial semantics and RON-only payment entry", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf")) return Promise.resolve(response({ csrfToken: "csrf" }));
      if (url.endsWith("/auth/permissions")) return Promise.resolve(response({ permissions: ["technician.earnings.read_all", "technician.rates.read", "technician.rates.manage", "technician.payments.create"].map((key) => ({ key, scopes: ["ALL"] })) }));
      if (url.includes("/users?")) return Promise.resolve(response({ items: [{ createdAt: "", displayName: "Tehnician Ana", email: "ana@example.test", id: "tech_1", isActive: true, mustChangePassword: false, preferredColor: null, roles: [{ key: "TEHNICIAN", name: "Tehnician" }], updatedAt: "" }], page: 1, pageCount: 1, pageSize: 100, total: 1 }));
      if (url.includes("/technician-operations/earnings?")) return Promise.resolve(response(earnings));
      if (url.includes("/technician-operations/rates?") && !init?.method) return Promise.resolve(response([]));
      if (url.includes("/technician-operations?") && !url.includes("earnings")) return Promise.resolve(response({ items: [{ category: "Coroană ceramică", code: "CER", createdAt: "", description: null, id: "operation_1", isActive: true, name: "Ceramică", sortOrder: 0, updatedAt: "" }], page: 1, pageCount: 1, pageSize: 100, total: 1 }));
      if (url.endsWith("/technician-operations/payments") && init?.method === "POST") return Promise.resolve(response({ ...earnings.payments[0], id: "payment_2" }));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderPage(<ManagerTechniciansPage />);

    await screen.findByText("WO-26-0001");
    expect(screen.queryByRole("button", { name: "Gestionează catalogul" })).toBeNull();
    expect(screen.getByText("Valoare realizată în perioadă")).toBeDefined();
    expect(screen.getByText("Plătit în perioadă")).toBeDefined();
    expect(screen.getByText("Sold total de plată")).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Rate manopere" }));
    expect(await screen.findByRole("heading", { name: "Rate manopere" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Adaugă rată" })).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Plăți" }));
    await screen.findByText("Situația plăților");
    expect(screen.getByText("Demo Manager")).toBeDefined();
    expect(screen.queryByText(/ledger/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Înregistrează plată" }));
    expect(screen.getByLabelText("Sumă (RON)")).toBeDefined();
    expect(screen.queryByLabelText("Monedă")).toBeNull();
    fireEvent.change(screen.getByLabelText("Sumă (RON)"), { target: { value: "10.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează plata" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/technician-operations/payments"), expect.objectContaining({ body: expect.stringContaining("\"currency\":\"RON\""), method: "POST" })));

    fireEvent.click(screen.getByRole("tab", { name: "Istoric" }));
    await screen.findByText("Istoric financiar");
    expect(screen.getByText("Achitare septembrie")).toBeDefined();
    expect(screen.getByText("WO-26-0001 · Ceramică")).toBeDefined();
  });
});
