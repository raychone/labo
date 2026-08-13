import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthenticatedRoute, PermissionRoute } from "../../app/route-guards.js";
import { type AuthState, useAuthState } from "../../app/auth-state.js";
import { operationalStatusReadPermissions } from "../../app/route-registry.js";
import { StatusTvPage } from "./status-tv-page.js";

vi.mock("../../app/auth-state.js", () => ({
  useAuthState: vi.fn(),
}));

function renderWithProviders(component: ReactNode, initialEntries = ["/status/tv"]): void {
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
        <ToastProvider>{component}</ToastProvider>
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

function createAuthState(status: AuthState["status"], permissionKeys: readonly string[] = []): AuthState {
  return {
    error: null,
    permissionKeys,
    permissions: undefined,
    refetch: vi.fn(),
    status,
    user: status === "authenticated"
      ? {
          displayName: "Demo Manager",
          email: "manager@example.test",
          id: "user_1",
          preferredColor: null,
        }
      : null,
  };
}

const statusTvResponse = {
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
      clinic: { id: "clinic_1", name: "Clinica Test" },
      createdAt: "2026-08-13T07:00:00.000Z",
      currentCycle: { code: "CYCLE_2", id: "cycle_2", label: "Ciclul 2", number: 2, reason: "ADJUSTMENT", status: "ACTIVE" },
      currentStageTechnician: { displayName: "Tehnician Ana", preferredColor: "#0f766e", publicId: "tech_1" },
      deadline: {
        badge: "Astăzi",
        effectiveDueAt: "2026-08-13T14:00:00.000Z",
        state: "DUE_TODAY",
        tooltip: "Termenul este astăzi.",
      },
      delivery: { code: null, plannedDate: null, status: null },
      doctor: { id: "doctor_1", name: "Dr. Ana Popescu" },
      executionCompany: { code: "NC", displayName: "Nicolaie Cristina" },
      id: "work_1",
      logistics: { status: "IN_PRODUCTION" },
      patient: { id: "patient_1", name: "Maria Ionescu", reference: "MI-1" },
      priority: "URGENT",
      realLabSheet: {
        cycleNumber: 2,
        finalizedAt: null,
        label: "În lucru",
        lastModifiedAt: "2026-08-13T08:00:00.000Z",
        status: "IN_PROGRESS",
      },
      updatedAt: "2026-08-13T08:00:00.000Z",
      workCode: "WO-2026-000001",
      workOwner: { displayName: "Tehnician Ana", preferredColor: "#0f766e", publicId: "tech_1" },
      workflow: {
        currentStage: { key: "ceramica", name: "Ceramică", status: "IN_PROGRESS" },
        progress: "1/4",
        progressCompleted: 1,
        progressTotal: 4,
        status: "ACTIVE",
      },
      workType: { id: "work_type_1", name: "Coroană zirconiu" },
    },
  ],
  meta: {
    hasMore: true,
    page: 1,
    pageSize: 12,
    scannedRows: 24,
    total: 24,
    totalPages: 2,
  },
} as const;

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/status/operational")) {
      return Promise.resolve(createJsonResponse(statusTvResponse));
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
      return Promise.resolve(createJsonResponse([{ basePriceMinor: 120_00, code: "WT-1", id: "work_type_1", name: "Coroană zirconiu" }]));
    }
    return Promise.resolve(createJsonResponse({}, 404));
  });
}

function renderProtectedRoute(authState: AuthState): void {
  vi.mocked(useAuthState).mockReturnValue(authState);
  renderWithProviders(
    <Routes>
      <Route element={<div>Login page</div>} path="/login" />
      <Route element={<div>Forbidden page</div>} path="/forbidden" />
      <Route
        element={(
          <AuthenticatedRoute>
            <PermissionRoute requiredPermissions={operationalStatusReadPermissions}>
              <StatusTvPage />
            </PermissionRoute>
          </AuthenticatedRoute>
        )}
        path="/status/tv"
      />
    </Routes>,
  );
}

describe("StatusTvPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.mocked(useAuthState).mockReset();
  });

  it("renders the fullscreen TV layout without shell navigation or financial fields", async () => {
    vi.stubGlobal("fetch", createFetchMock());
    renderProtectedRoute(createAuthState("authenticated", ["works.read_all", "works.read_assigned"]));

    expect(await screen.findByRole("heading", { name: "Panou operațional live" })).toBeDefined();
    await waitFor(() => expect(screen.getByText("Maria Ionescu")).toBeDefined());
    expect(screen.getByText("Coroană zirconiu")).toBeDefined();
    expect(screen.getByLabelText("Tehnician Ana").getAttribute("style")).toContain("background-color");
    expect(screen.getByText("Azi")).toBeDefined();
    expect(screen.queryByText("WO-2026-000001")).toBeNull();
    expect(screen.queryByText("Ciclul 2")).toBeNull();
    expect(screen.queryByText("Deschide navigația")).toBeNull();
    expect(screen.queryByText("Deconectare")).toBeNull();
    expect(screen.queryByRole("button", { name: /Preia|Continuă|Finalizează|Salvează/i })).toBeNull();
    expect(screen.queryByText(/RON|factură|preț/i)).toBeNull();
    expect(screen.getAllByText("În lucru").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Întârziate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Revenite").length).toBeGreaterThan(0);
    expect(screen.queryByText("Disponibile")).toBeNull();
    expect(screen.queryByText("Finalizate")).toBeNull();
  });

  it("polls the live read model without requiring interaction", async () => {
    vi.useFakeTimers();
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    renderProtectedRoute(createAuthState("authenticated", ["works.read_all"]));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Maria Ionescu")).toBeDefined();
    const initialStatusCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/status/operational")).length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });

    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/status/operational")).length).toBeGreaterThan(initialStatusCalls);
  });

  it("rotates to the next page automatically when there are multiple pages", async () => {
    vi.useFakeTimers();
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    renderProtectedRoute(createAuthState("authenticated", ["works.read_all"]));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });

    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/status/operational") && String(input).includes("page=2"))).toBe(true);
  });

  it("redirects anonymous users to login", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderProtectedRoute(createAuthState("anonymous"));
    expect(await screen.findByText("Login page")).toBeDefined();
  });

  it("denies authenticated users without status permission", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderProtectedRoute(createAuthState("authenticated", []));
    expect(await screen.findByText("Forbidden page")).toBeDefined();
  });
});
