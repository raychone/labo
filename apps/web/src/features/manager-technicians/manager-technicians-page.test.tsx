import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ManagerTechniciansPage } from "./manager-technicians-page.js";

function response(body: unknown, status = 200): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as Response;
}

function renderPage(entry = "/technicians", component: ReactNode = <ManagerTechniciansPage />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ element: <ToastProvider>{component}</ToastProvider>, path: "/technicians" }], { initialEntries: [entry] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
}

const permissions = ["technician.earnings.read_all", "technician.rates.read", "technician.rates.manage", "technician.payments.create"];
const technicians = [
  { createdAt: "", displayName: "Tehnician Ana", email: "ana@example.test", id: "tech_1", isActive: true, mustChangePassword: false, preferredColor: null, roles: [{ key: "TEHNICIAN", name: "Tehnician" }], updatedAt: "" },
  { createdAt: "", displayName: "Tehnician Bogdan", email: "bogdan@example.test", id: "tech_2", isActive: false, mustChangePassword: false, preferredColor: null, roles: [{ key: "TEHNICIAN", name: "Tehnician" }], updatedAt: "" },
];
const operations = [
  { category: "Coroană zirconiu", code: "TECH-DESIGN", createdAt: "", description: null, id: "operation_1", isActive: true, name: "Design", quantityRule: "PER_ELEMENT", sortOrder: 0, updatedAt: "", workTypeIds: [] },
  { category: "Coroană ceramică", code: "TECH-FREZARE", createdAt: "", description: null, id: "operation_2", isActive: true, name: "Frezare", quantityRule: "PER_WORK", sortOrder: 1, updatedAt: "", workTypeIds: [] },
];
const rates = [{
  createdAt: "2026-08-01T00:00:00.000Z",
  createdByUserId: "manager_1",
  currency: "RON",
  effectiveFrom: "2026-09-01T00:00:00.000Z",
  id: "rate_1",
  operation: { ...operations[0], currency: "RON", rateMinor: 3500 },
  rateMinor: 3500,
  technician: { displayName: "Tehnician Ana", id: "tech_1" },
  validUntil: null,
}];
const currentOperation = {
  currency: "RON",
  earningMinor: 17500,
  isLegacy: false,
  operation: { ...operations[0], currency: "RON", rateMinor: 3500 },
  operationCodeSnapshot: "TECH-DESIGN",
  operationNameSnapshot: "Design",
  performedAt: "2026-09-08T10:00:00.000Z",
  performedOperationId: "performed_1",
  probeCycle: null,
  quantity: 5,
  rateMinorSnapshot: 3500,
  removedAt: null,
  removalReason: null,
  selectedTeeth: [11, 12, 13, 14, 15],
  technician: { displayName: "Tehnician Ana", id: "tech_1" },
};
const removedOperation = {
  ...currentOperation,
  earningMinor: 2000,
  operation: { ...operations[1], currency: "RON", rateMinor: 2000 },
  operationCodeSnapshot: "TECH-FREZARE",
  operationNameSnapshot: "Frezare",
  performedOperationId: "performed_removed",
  quantity: 1,
  rateMinorSnapshot: 2000,
  removedAt: "2026-09-09T10:00:00.000Z",
  removalReason: "Corecție",
};

function earnings(includeRemoved = false) {
  const selectedOperations = includeRemoved ? [currentOperation, removedOperation] : [currentOperation];
  return {
    currency: "RON",
    currencyTotals: [{ balanceMinor: 16300, cumulativeEarnedMinor: 17500, cumulativePaidMinor: 1200, currency: "RON", paidMinor: 1200, periodEarnedMinor: 17500, periodPaidMinor: 1200, remainingMinor: 16300, settlementStatus: "PARTIALLY_PAID", totalMinor: 17500 }],
    generatedAt: "2026-09-09T12:00:00.000Z",
    paidMinor: 1200,
    payments: [{ amountMinor: 1200, createdAt: "2026-09-09T12:00:00.000Z", createdByDisplayName: "Demo Manager", createdByUserId: "manager_1", currency: "RON", id: "payment_1", notes: "Achitare septembrie", paidAt: "2026-09-09T12:00:00.000Z", technicianId: "tech_1" }],
    period: "MONTH",
    periodEnd: "2026-10-01T00:00:00.000Z",
    periodStart: "2026-09-01T00:00:00.000Z",
    remainingMinor: 16300,
    settlementStatus: "PARTIALLY_PAID",
    technician: { displayName: "Tehnician Ana", id: "tech_1" },
    totalMinor: 17500,
    works: [{ currency: "RON", operations: selectedOperations, patientName: "Ion Pop", totalMinor: 17500, workCode: "WO-26-0001", workOrderId: "work_1" }],
  };
}

function installFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(response({ csrfToken: "csrf" }));
    if (url.endsWith("/auth/permissions")) return Promise.resolve(response({ permissions: permissions.map((key) => ({ key, scopes: ["ALL"] })) }));
    if (url.includes("/users?")) return Promise.resolve(response({ items: technicians, page: 1, pageCount: 1, pageSize: 100, total: technicians.length }));
    if (url.includes("/technician-operations/earnings?")) return Promise.resolve(response(earnings(url.includes("includeRemoved=true"))));
    if (url.includes("/technician-operations/rates?") && !init?.method) return Promise.resolve(response(url.includes("tech_2") ? [] : rates));
    if (url.includes("/technician-operations?") && !url.includes("earnings")) return Promise.resolve(response({ items: operations, page: 1, pageCount: 1, pageSize: 100, total: operations.length }));
    if (url.endsWith("/technician-operations/rates") && init?.method === "POST") return Promise.resolve(response(rates[0]));
    if (url.endsWith("/technician-operations/payments") && init?.method === "POST") return Promise.resolve(response({ ...earnings().payments[0], id: "payment_2" }));
    return Promise.resolve(response({}));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ManagerTechniciansPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the compact master/detail workspace, renamed tabs and the canonical catalog link", async () => {
    installFetch();
    const router = renderPage();

    expect(await screen.findByRole("heading", { name: "Manopere & tarife" })).toBeDefined();
    await waitFor(() => expect(router.state.location.search).toContain("technicianId=tech_1"));
    expect(screen.getAllByText("ana@example.test").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Manopere & tarife" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Câștiguri" })).toBeDefined();
    expect(screen.queryByRole("tab", { name: "Rate manopere" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gestionează catalogul" })).toBeNull();
    expect(screen.getByRole("link", { name: "Catalog manopere →" }).getAttribute("href")).toBe("/pricing?tab=operations");
    expect(await screen.findByText("35,00 RON")).toBeDefined();
    expect(screen.getByText("Coroană zirconiu")).toBeDefined();
    expect(screen.queryByText("TECH-DESIGN")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Tehnician Bogdan/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Tehnician Bogdan/ }).getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByRole("heading", { name: "Tehnician Bogdan" })).toBeDefined();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Manopere & tarife" }), { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Câștiguri" }).getAttribute("aria-selected")).toBe("true"));
  });

  it("keeps technician and tab selection in URL state for deep links and browser history", async () => {
    installFetch();
    const router = renderPage("/technicians?tab=payments&technicianId=tech_2");

    expect(await screen.findByRole("heading", { name: "Tehnician Bogdan" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Plăți" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: "Istoric" }));
    await waitFor(() => expect(router.state.location.search).toContain("tab=history"));
    expect(router.state.location.search).toContain("technicianId=tech_2");

    await act(async () => {
      await router.navigate(-1);
    });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Plăți" }).getAttribute("aria-selected")).toBe("true"));
    expect(screen.getByRole("heading", { name: "Tehnician Bogdan" })).toBeDefined();
  });

  it("adds and updates technician tariffs without exposing operation codes", async () => {
    const fetchMock = installFetch();
    renderPage();
    await screen.findByText("35,00 RON");

    fireEvent.click(screen.getByRole("button", { name: "Adaugă tarif" }));
    const addDialog = screen.getByRole("dialog", { name: "Adaugă tarif" });
    fireEvent.click(within(addDialog).getByLabelText("Manoperă"));
    fireEvent.click(within(addDialog).getByRole("option", { name: /Frezare/ }));
    fireEvent.change(within(addDialog).getByLabelText("Tarif"), { target: { value: "42.50" } });
    fireEvent.click(within(addDialog).getByRole("button", { name: "Salvează tariful" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/technician-operations/rates"), expect.objectContaining({ body: expect.stringContaining('"rateMinor":4250'), method: "POST" })));

    fireEvent.click(screen.getByRole("button", { name: "Actualizează" }));
    const updateDialog = screen.getByRole("dialog", { name: "Actualizează tarif" });
    expect(within(updateDialog).getByLabelText("Manoperă").hasAttribute("disabled")).toBe(true);
    fireEvent.change(within(updateDialog).getByLabelText("Tarif"), { target: { value: "40.00" } });
    fireEvent.click(within(updateDialog).getByRole("button", { name: "Salvează tariful" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/technician-operations/rates"), expect.objectContaining({ body: expect.stringContaining('"rateMinor":4000'), method: "POST" })));
    expect(screen.queryByText("TECH-DESIGN")).toBeNull();

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Actualizează tarif" })).toBeNull());
    fireEvent.click(screen.getByRole("tab", { name: "Câștiguri" }));
    expect(await screen.findByText("5 elemente")).toBeDefined();
    expect(screen.getAllByText("35,00 RON").length).toBeGreaterThan(0);
    expect(screen.getAllByText("175,00 RON").length).toBeGreaterThan(0);
  });

  it("shows quantity, applied historical tariff and removed operations only when requested", async () => {
    const fetchMock = installFetch();
    renderPage();
    await screen.findByRole("heading", { name: "Manopere & tarife" });
    fireEvent.click(screen.getByRole("tab", { name: "Câștiguri" }));

    expect(await screen.findByText("WO-26-0001")).toBeDefined();
    expect(screen.getByText("Câștigat în perioadă")).toBeDefined();
    expect(screen.getByText("5 elemente")).toBeDefined();
    expect(screen.getAllByText("35,00 RON").length).toBeGreaterThan(0);
    expect(screen.getAllByText("175,00 RON").length).toBeGreaterThan(0);
    expect(screen.queryByText("Frezare")).toBeNull();
    expect(screen.queryByText(/snapshot/i)).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Include manopere eliminate" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("includeRemoved=true"))).toBe(true));
    expect(await screen.findByText("Frezare")).toBeDefined();
    expect(screen.getByText("Eliminată din evidența curentă")).toBeDefined();
  });

  it("keeps payments in RON, validates the amount and renders actor and chronological history", async () => {
    const fetchMock = installFetch();
    renderPage();
    await screen.findByRole("heading", { name: "Manopere & tarife" });
    fireEvent.click(screen.getByRole("tab", { name: "Plăți" }));

    expect(await screen.findByText("Demo Manager")).toBeDefined();
    expect(screen.getByText("Achitare septembrie")).toBeDefined();
    expect(screen.queryByText("Monedă")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează plată" }));
    const dialog = screen.getByRole("dialog", { name: "Înregistrează plată" });
    expect(within(dialog).getByText("Sold de plată")).toBeDefined();
    expect(within(dialog).getByText("163,00 RON")).toBeDefined();
    expect(within(dialog).queryByLabelText("Monedă")).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Sumă"), { target: { value: "-1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Înregistrează plata" }));
    expect(fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/technician-operations/payments") && (init as RequestInit | undefined)?.method === "POST")).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText("Sumă"), { target: { value: "10.00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Înregistrează plata" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/technician-operations/payments"), expect.objectContaining({ body: expect.stringContaining('"currency":"RON"'), method: "POST" })));

    fireEvent.click(screen.getByRole("tab", { name: "Istoric" }));
    expect(await screen.findByText("WO-26-0001 · Design")).toBeDefined();
    expect(screen.getByText("Înregistrată de Demo Manager")).toBeDefined();
    expect(screen.getByText("Achitare septembrie")).toBeDefined();
    expect(screen.queryByText(/ledger|snapshot|TECH-DESIGN/i)).toBeNull();
  });
});
