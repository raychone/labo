import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OperationalStatusResponse } from "@dental-lab/shared";

import { StatusPage } from "./status-page.js";

function renderWithProviders(component: ReactNode, initialEntries = ["/status"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Routes>
            <Route element={component} path="/status" />
            <Route element={<div>Works detail route</div>} path="/works" />
          </Routes>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    text: async () => JSON.stringify(body),
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

const operationalStatusResponse: OperationalStatusResponse = {
  counters: [
    { count: 2, label: "Astăzi", tab: "TODAY" },
    { count: 1, label: "În lucru", tab: "IN_PROGRESS" },
    { count: 1, label: "Disponibile", tab: "AVAILABLE" },
    { count: 1, label: "Întârziate", tab: "LATE" },
    { count: 0, label: "Plecate la medic", tab: "AT_CLINIC" },
    { count: 1, label: "Revenite", tab: "RETURNED" },
    { count: 0, label: "Finalizate", tab: "COMPLETED" },
  ],
  items: [
    {
      claimStatus: "CLAIMED",
      claimedAt: "2026-08-04T07:30:00.000Z",
      clinic: { id: "clinic_1", name: "Clinica Test" },
      createdAt: "2026-08-04T07:00:00.000Z",
      currentCycle: { code: "CYCLE_2", id: "cycle_2", label: "Ciclul 2", number: 2, reason: "ADJUSTMENT", status: "ACTIVE" },
      currentStageTechnician: { displayName: "Tehnician Ana", preferredColor: "#0f766e", publicId: "tech_1" },
      deadline: {
        badge: "Astăzi",
        effectiveDueAt: "2026-08-04T14:00:00.000Z",
        state: "DUE_TODAY",
        tooltip: "Termenul este astăzi.",
      },
      delivery: { code: null, plannedDate: null, status: null },
      doctor: { id: "doctor_1", name: "Dr. Ana Popescu" },
      executionCompany: { code: "NC", displayName: "Nicolaie Cristina" },
      id: "work_1",
      components: [],
      logistics: { status: "IN_PRODUCTION" },
      operationalStatus: "IN_LUCRU",
      patient: { id: "patient_1", name: "Maria Ionescu", reference: "MI-1" },
      priority: "URGENT",
      realLabSheet: {
        cycleNumber: 2,
        finalizedAt: null,
        label: "În lucru",
        lastModifiedAt: "2026-08-04T08:00:00.000Z",
        status: "IN_PROGRESS",
      },
      shade: "A2",
      updatedAt: "2026-08-04T08:00:00.000Z",
      workCode: "WO-2026-000001",
      workOwner: { displayName: "Tehnician Ana", preferredColor: "#0f766e", publicId: "tech_1" },
      workflow: {
        currentStage: { key: "ceramica", name: "Ceramică", status: "IN_PROGRESS" },
        progress: "1/4",
        progressCompleted: 1,
        progressTotal: 4,
        status: "ACTIVE",
      },
      workType: { id: "work_type_1", name: "Coroană zirconiu", symbol: "CZr" },
    },
  ],
  meta: {
    hasMore: true,
    page: 1,
    pageSize: 25,
    scannedRows: 1001,
    total: 1,
    totalPages: 1,
  },
};

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({
        permissions: [
          { key: "works.read_all", scopes: ["ALL"] },
          { key: "technician.workload.read", scopes: ["ALL"] },
        ],
      }));
    }
    if (url.includes("/status/operational")) {
      return Promise.resolve(createJsonResponse(operationalStatusResponse));
    }
    if (url.includes("/clinics/options")) {
      return Promise.resolve(createJsonResponse([{ code: "CL-1", id: "clinic_1", name: "Clinica Test" }]));
    }
    if (url.includes("/doctors/options")) {
      return Promise.resolve(createJsonResponse([{ clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" }]));
    }
    if (url.includes("/patients/options")) {
      return Promise.resolve(createJsonResponse([{ fullName: "Maria Ionescu", id: "patient_1" }]));
    }
    if (url.includes("/technicians/options")) {
      return Promise.resolve(createJsonResponse([{ activeAssignedStages: 0, displayName: "Tehnician Ana", email: "ana@example.test", id: "tech_1", preferredColor: "#0f766e" }]));
    }
    if (url.includes("/work-types/options")) {
        return Promise.resolve(createJsonResponse([{ basePriceMinor: 120_00, code: "WT-1", id: "work_type_1", name: "Coroană zirconiu", symbol: "Zr" }]));
    }
    return Promise.resolve(createJsonResponse({}, 404));
  });
}

function createFetchMockWithPermissions(permissionKeys: readonly string[]) {
  const fallback = createFetchMock();
  return vi.fn((input: RequestInfo | URL) => {
    if (String(input).includes("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({ permissions: permissionKeys.map((key) => ({ key, scopes: ["ALL"] })) }));
    }
    return fallback(input);
  });
}

describe("StatusPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders STATUS-001A counters and rows without financial data", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWithProviders(<StatusPage />);

    expect(await screen.findByRole("heading", { name: "Status" })).toBeDefined();
    await waitFor(() => expect(screen.getAllByText("Maria Ionescu").length).toBeGreaterThan(0));
    expect(screen.getByRole("columnheader", { name: "Clinica sau Medic" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Pacient" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Tip lucrare" })).toBeDefined();
    expect(screen.queryByText(/Rezultatele sunt plafonate/)).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Tehnician" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Preluare" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Termen" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Stare" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Alerte" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Livrare/Ridicare" })).toBeNull();
    expect(screen.getAllByText("CZr").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tehnician Ana").length).toBeGreaterThan(0);
    expect(screen.queryByText(/rezultate limitate la 1000/)).toBeNull();
    expect(screen.queryByText(/120,00|RON|factură|preț/i)).toBeNull();
    expect(screen.queryByTestId("status-kpi-icon")).toBeNull();
    expect(screen.getByText("Registru lucrări")).toBeDefined();
    expect(screen.getByRole("button", { name: /Total/ }).closest(".status-page__kpi-card")?.classList.contains("status-page__kpi-card--all")).toBe(true);
    expect(screen.getByRole("button", { name: /Finalizate/ }).closest(".status-page__kpi-card")?.classList.contains("status-page__kpi-card--completed")).toBe(true);
    expect(screen.queryByText("filtrele nu expun date financiare")).toBeNull();
    expect(screen.queryByText("Filtrele sunt ascunse. Deschide-le când ai nevoie de rafinare.")).toBeNull();
  });

  it("sends filters, sorting and tab state through the STATUS-001A API query", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<StatusPage />, ["/status?tab=LATE&search=Maria&sortBy=workCode&sortDirection=desc"]);

    await waitFor(() => expect(screen.getAllByText("Maria Ionescu").length).toBeGreaterThan(0));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/status/operational?"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("tab=LATE"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("search=Maria"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("sortBy=workCode"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("sortDirection=desc"), expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "Afișează filtrele" }));
    const legalEntitySelect = screen.getByLabelText("CDT / NG");
    fireEvent.focus(legalEntitySelect);
    fireEvent.change(legalEntitySelect, { target: { value: "" } });
    fireEvent.click(await screen.findByRole("option", { name: "CDT" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("executionLegalEntityCode=CDT"), expect.anything()));
  });

  it("keeps KPI counters sourced from the unfiltered register while the table tab changes", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<StatusPage />);

    await screen.findByText("Maria Ionescu");
    fireEvent.click(screen.getByRole("button", { name: /Finalizate/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("tab=COMPLETED"), expect.anything()));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("tab=ALL"), expect.anything());
  });

  it("opens the existing works detail flow from a status row", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWithProviders(<StatusPage experimental />);

    const openLink = await screen.findByRole("link", { name: "Maria Ionescu" });
    fireEvent.click(openLink!);
    expect(await screen.findByText("Works detail route")).toBeDefined();
  });

  it("opens work details from a safe row click, while inline operational controls do not navigate", async () => {
    vi.stubGlobal("fetch", createFetchMockWithPermissions(["works.read_all", "audit.read"]));

    renderWithProviders(<StatusPage experimental />);

    const deadline = await screen.findByLabelText("Termen WO-2026-000001");
    fireEvent.click(deadline);
    expect(screen.queryByText("Works detail route")).toBeNull();
    fireEvent.click(screen.getByText("Clinica Test"));
    expect(await screen.findByText("Works detail route")).toBeDefined();
  });

  it("keeps Termen and Stare editable for Manager and Logistică, but read-only for Recepție and Tehnician", async () => {
    const editableRoles: readonly (readonly string[])[] = [
      ["works.read_all", "audit.read"],
      ["works.read_all", "logistics.delivery_marker.update"],
    ];

    for (const permissions of editableRoles) {
      vi.stubGlobal("fetch", createFetchMockWithPermissions(permissions));
      const { unmount } = renderWithProviders(<StatusPage experimental />);
      expect((await screen.findByLabelText("Termen WO-2026-000001")).hasAttribute("disabled")).toBe(false);
      expect(screen.getAllByLabelText("Stare WO-2026-000001")[0]?.hasAttribute("disabled")).toBe(false);
      expect(screen.getByRole("columnheader", { name: "Alerte" })).toBeDefined();
      expect(screen.getByRole("columnheader", { name: "Livrare/Ridicare" })).toBeDefined();
      unmount();
      vi.unstubAllGlobals();
    }

    for (const permissions of [["works.read_all"], ["works.read_assigned"]] as const) {
      vi.stubGlobal("fetch", createFetchMockWithPermissions(permissions));
      const { unmount } = renderWithProviders(<StatusPage experimental />);
      await screen.findByText("Maria Ionescu");
      expect(screen.queryByLabelText("Termen WO-2026-000001")).toBeNull();
      expect(screen.queryByLabelText("Stare WO-2026-000001")).toBeNull();
      expect(screen.queryByRole("columnheader", { name: "Alerte" })).toBeNull();
      expect(screen.queryByRole("columnheader", { name: "Livrare/Ridicare" })).toBeNull();
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it("keeps the deadline warning immediately before the editable deadline and does not expose a patient reference in the row", async () => {
    vi.stubGlobal("fetch", createFetchMockWithPermissions(["works.read_all", "audit.read"]));

    renderWithProviders(<StatusPage experimental />);

    const deadline = await screen.findByLabelText("Termen WO-2026-000001");
    const deadlineControl = deadline.parentElement;
    expect(deadlineControl?.firstElementChild?.getAttribute("aria-label")).toBe("Termen apropiat");
    expect(screen.queryByText("MI-1")).toBeNull();
  });

  it("marks a probe-ready work for delivery only after the explicit Livrare action", async () => {
    const mutations: unknown[] = [];
    const response: OperationalStatusResponse = {
      ...operationalStatusResponse,
      items: operationalStatusResponse.items.map((item) => ({ ...item, requiresDelivery: false, technicalReadiness: "PROBE_READY" })),
    };
    const fallback = createFetchMock();
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) return Promise.resolve(createJsonResponse({ permissions: [
        { key: "logistics.delivery_marker.update", scopes: ["ALL"] },
        { key: "works.read_all", scopes: ["ALL"] },
      ] }));
      if (url.endsWith("/auth/csrf")) return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      if (url.includes("/status/operational")) return Promise.resolve(createJsonResponse(response));
      if (url.endsWith("/works/work_1/logistics-actions") && init?.method === "PATCH") {
        mutations.push(JSON.parse(String(init.body)));
        return Promise.resolve(createJsonResponse({ requiresDelivery: true, requiresPickup: false }));
      }
      return fallback(input);
    }));

    renderWithProviders(<StatusPage experimental />);
    expect(await screen.findByText("Maria Ionescu")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Livrare" }));

    await waitFor(() => expect(mutations).toEqual([{ requiresDelivery: true }]));
  });
});
