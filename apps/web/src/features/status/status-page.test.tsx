import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OperationalStatusResponse } from "@dental-lab/shared";

import { StatusPage } from "./status-page.js";

function renderWithProviders(component: ReactNode, initialEntries = ["/status"]): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
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

describe("StatusPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders STATUS-001A counters, rows and bounded-result state without financial data", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWithProviders(<StatusPage />);

    expect(await screen.findByRole("heading", { name: "Status" })).toBeDefined();
    await waitFor(() => expect(screen.getAllByText("Maria Ionescu").length).toBeGreaterThan(0));
    expect(screen.getByRole("columnheader", { name: "Clinica sau Medic" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Pacient" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Tip lucrare" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Culoare" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Tehnician" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Preluare" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Termen" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Stare" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Alerte" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Livrare/Ridicare" })).toBeDefined();
    expect(screen.getAllByText("A2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tehnician Ana").length).toBeGreaterThan(0);
    expect(screen.getByText(/rezultate limitate la 1000/)).toBeDefined();
    expect(screen.queryByText(/120,00|RON|factură|preț/i)).toBeNull();
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

  it("opens the existing works detail flow from a status row", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWithProviders(<StatusPage />);

    const openLink = (await screen.findAllByRole("link", { name: "Deschide" }))[0];
    fireEvent.click(openLink!);
    expect(await screen.findByText("Works detail route")).toBeDefined();
  });
});
