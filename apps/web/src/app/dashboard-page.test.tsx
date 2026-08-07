import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "./dashboard-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <MemoryRouter>
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

const permissions = {
  manager: [
    "finance.read",
    "finance.record_payment",
    "invoice.read",
    "organization_context.read",
    "pricing.read",
    "scan.use",
    "settings.read",
    "users.read",
    "works.create",
    "works.read_all",
  ],
  reception: ["patients.read", "clinics.read", "cycles.create_next", "scan.use", "works.create", "works.read_all"],
  technician: ["scan.use", "technician.workbench.read", "works.claim.available.read", "works.claim.own.read", "works.read_assigned"],
} as const;

const deadlineDashboard = {
  completedOnTimeLast7Days: 3,
  dueToday: 2,
  dueTomorrow: 1,
  late: 4,
  manual: 0,
  next7Days: 7,
  unresolved: 1,
};

const workSummary = {
  clinic: { code: "CL-1", id: "clinic_1", name: "Clinica Test" },
  claim: {
    canCurrentUserClaim: true,
    canCurrentUserReassign: false,
    canCurrentUserRelease: false,
    claimedAt: null,
    executionLegalEntity: null,
    releasedAt: null,
    releaseReason: null,
    revision: 1,
    source: null,
    status: "UNCLAIMED",
    technician: null,
  },
  code: "WO-2026-000001",
  createdAt: "2026-08-04T08:00:00.000Z",
  currency: null,
  deadline: {
    badge: "Astăzi",
    calculatedAt: "2026-08-04T08:00:00.000Z",
    calculatedDueAt: "2026-08-04T14:00:00.000Z",
    color: "yellow",
    countdown: "azi",
    effectiveDueAt: "2026-08-04T14:00:00.000Z",
    executionDays: 1,
    explanation: "Termen calculat.",
    includeStartDay: false,
    isLocked: false,
    manualDueAt: null,
    mode: "CALCULATED",
    reasonCode: null,
    revision: 1,
    source: "CREATION",
    startAt: "2026-08-04T08:00:00.000Z",
    status: "DUE_TODAY",
    timezone: "Europe/Bucharest",
    tooltip: "Termen astăzi.",
  },
  doctor: { displayName: "Dr. Ana", id: "doctor_1" },
  executionSnapshot: {
    currentTechnician: null,
    deadline: null,
    originalTechnician: null,
    pricing: null,
    summary: { createdAt: null, exists: false, legalEntity: null, lockedAt: null, status: "NOT_CREATED", version: null },
  },
  id: "work_1",
  invoicedDocumentId: null,
  patient: { firstName: "Ion", fullName: "Ion Pop", id: "patient_1", lastName: "Pop" },
  patientName: "Ion Pop",
  patientReference: "P-1",
  priority: "URGENT",
  quantity: 1,
  requestedDeliveryDate: "2026-08-04T00:00:00.000Z",
  status: "REGISTERED",
  totalPriceMinor: null,
  updatedAt: "2026-08-04T08:00:00.000Z",
  workflow: { currentStageName: "Modelaj", progressCompleted: 1, progressTotal: 4, status: "ACTIVE" },
  workType: { code: "WT-1", id: "work_type_1", name: "Coroană zirconiu" },
};

const statusRow = {
  claimStatus: "CLAIMED",
  clinic: { id: "clinic_1", name: "Clinica Test" },
  createdAt: "2026-08-04T08:00:00.000Z",
  currentCycle: { code: "CYCLE-1", id: "cycle_1", label: "Ciclul 1", number: 1, reason: "INITIAL", status: "ACTIVE" },
  currentStageTechnician: { displayName: "Tehnician Ana", publicId: "tech_1" },
  deadline: { badge: "Astăzi", effectiveDueAt: "2026-08-04T14:00:00.000Z", state: "DUE_TODAY", tooltip: "Termen astăzi." },
  delivery: { code: null, plannedDate: null, status: null },
  doctor: { id: "doctor_1", name: "Dr. Ana" },
  executionCompany: { code: "NC", displayName: "Nicolaie Cristina" },
  id: "work_1",
  logistics: { status: "READY_FOR_DELIVERY" },
  patient: { id: "patient_1", name: "Ion Pop", reference: "P-1" },
  priority: "URGENT",
  realLabSheet: { cycleNumber: 1, finalizedAt: null, label: "În lucru", lastModifiedAt: null, status: "IN_PROGRESS" },
  updatedAt: "2026-08-04T08:00:00.000Z",
  workCode: "WO-2026-000001",
  workOwner: { displayName: "Tehnician Ana", publicId: "tech_1" },
  workflow: { currentStage: { key: "modelaj", name: "Modelaj", status: "IN_PROGRESS" }, progress: "1/4", progressCompleted: 1, progressTotal: 4, status: "ACTIVE" },
  workType: { id: "work_type_1", name: "Coroană zirconiu" },
};

const technicianItem = {
  assignment: { assignedAt: "2026-08-04T08:00:00.000Z", assignedBy: null, assignedUser: { displayName: "Tehnician Ana", email: "ana@example.test", id: "tech_1" } },
  categories: ["IN_PROGRESS", "URGENT", "DUE_TODAY"],
  clinic: { id: "clinic_1", name: "Clinica Test" },
  doctor: { displayName: "Dr. Ana", id: "doctor_1" },
  dueDate: "2026-08-04T14:00:00.000Z",
  id: "stage_1",
  patientName: "Ion Pop",
  priority: "URGENT",
  progress: { completed: 1, total: 4 },
  realLabSheet: { cycleNumber: 1, label: "În lucru", status: "IN_PROGRESS" },
  stage: { allowedRoleLabels: ["Tehnician"], id: "stage_1", key: "modelaj", name: "Modelaj", status: "IN_PROGRESS", version: 1 },
  workCode: "WO-2026-000001",
  workId: "work_1",
  workType: { id: "work_type_1", name: "Coroană zirconiu" },
  workflowStatus: "ACTIVE",
};

function createFetchMock(permissionKeys: readonly string[], options: { readonly emptyTechnician?: boolean; readonly failBilling?: boolean; readonly loadingTechnician?: boolean } = {}) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return Promise.resolve(createJsonResponse({ user: { displayName: "Demo User", email: "demo@example.test", id: "user_1" } }));
    }
    if (url.endsWith("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({ permissions: permissionKeys.map((key) => ({ key, scopes: ["ALL"] })) }));
    }
    if (url.endsWith("/settings")) {
      return Promise.resolve(createJsonResponse({ laboratoryName: "Laborator Test" }));
    }
    if (url.endsWith("/organization-context")) {
      return Promise.resolve(createJsonResponse({ active: { code: "NC", displayName: "Nicolaie Cristina" }, available: [], canSwitch: true }));
    }
    if (url.includes("/billing/overview")) {
      return Promise.resolve(options.failBilling ? createJsonResponse({ message: "fail" }, 500) : createJsonResponse({
        ambiguousLegacyCount: 0,
        currency: "RON",
        documentCount: 2,
        from: "2026-08-01",
        groups: [],
        invoiceCount: 1,
        openProformaCount: 0,
        overdueInvoiceCount: 1,
        outstandingMinor: 10000,
        paidMinor: 5000,
        paidInvoiceCount: 0,
        partialInvoiceCount: 1,
        proformaMinor: 0,
        to: "2026-08-31",
        totalIssuedMinor: 15000,
        unpaidInvoiceCount: 1,
        uninvoicedMinor: 20000,
        uninvoicedWorkCount: 5,
        workValueMinor: 35000,
      }));
    }
    if (url.includes("/works/available-for-claim")) {
      return Promise.resolve(createJsonResponse({ deadlineDashboard, items: options.emptyTechnician ? [] : [workSummary], page: 1, pageCount: 1, pageSize: 5, total: options.emptyTechnician ? 0 : 1 }));
    }
    if (url.includes("/works/my-claimed")) {
      return Promise.resolve(createJsonResponse({ deadlineDashboard, items: options.emptyTechnician ? [] : [{ ...workSummary, claim: { ...workSummary.claim, status: "CLAIMED", technician: { displayName: "Tehnician Ana", id: "tech_1", publicId: "tech_1" } } }], page: 1, pageCount: 1, pageSize: 5, total: options.emptyTechnician ? 0 : 1 }));
    }
    if (url.includes("/works?")) {
      return Promise.resolve(createJsonResponse({ deadlineDashboard, items: [workSummary], page: 1, pageCount: 1, pageSize: 5, total: 1 }));
    }
    if (url.includes("/status/operational")) {
      return Promise.resolve(createJsonResponse({
        counters: [
          { count: 2, label: "Astăzi", tab: "TODAY" },
          { count: 1, label: "În lucru", tab: "IN_PROGRESS" },
          { count: 1, label: "Disponibile", tab: "AVAILABLE" },
          { count: 1, label: "Întârziate", tab: "LATE" },
          { count: 0, label: "Plecate", tab: "AT_CLINIC" },
          { count: 1, label: "Revenite", tab: "RETURNED" },
          { count: 0, label: "Finalizate", tab: "COMPLETED" },
        ],
        items: [statusRow],
        meta: { hasMore: false, page: 1, pageSize: 8, scannedRows: 1, total: 1, totalPages: 1 },
      }));
    }
    if (url.includes("/technician/workbench")) {
      if (options.loadingTechnician) {
        return new Promise(() => undefined);
      }
      return Promise.resolve(createJsonResponse({
        items: options.emptyTechnician ? [] : [technicianItem],
        page: 1,
        pageCount: 1,
        pageSize: 5,
        summary: { dueToday: options.emptyTechnician ? 0 : 1, inProgress: options.emptyTechnician ? 0 : 1, overdue: 0, totalActive: options.emptyTechnician ? 0 : 1, unstarted: 0, urgent: options.emptyTechnician ? 0 : 1 },
        total: options.emptyTechnician ? 0 : 1,
      }));
    }
    return Promise.resolve(createJsonResponse({}, 404));
  });
}

describe("DashboardPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders technician operational widgets and hides finance", async () => {
    vi.stubGlobal("fetch", createFetchMock(permissions.technician));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Tehnician" })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Disponibile pentru preluare" })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Lucrările mele" })).toBeDefined();
    expect((await screen.findAllByText("Continuă lucrarea")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Preia lucrarea")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Situație financiară")).toBeNull();
    expect(screen.queryByText("Facturare")).toBeNull();
  });

  it("renders technician empty state with available and QR actions", async () => {
    vi.stubGlobal("fetch", createFetchMock(permissions.technician, { emptyTechnician: true }));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Nu ai lucrări preluate.")).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Vezi lucrări disponibile" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Scanează QR" })).toBeDefined();
  });

  it("shows technician loading state while workbench data is pending", async () => {
    vi.stubGlobal("fetch", createFetchMock(permissions.technician, { loadingTechnician: true }));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Se încarcă atenționările")).toBeDefined();
  });

  it("renders reception actions without finance or technician workbench actions", async () => {
    vi.stubGlobal("fetch", createFetchMock(permissions.reception));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Recepție" })).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Lucrare nouă" }).length).toBe(1);
    expect(screen.getByRole("button", { name: "Înregistrează revenirea" })).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Scanează lucrare" }).length).toBe(1);
    expect(screen.queryByText("Situație financiară")).toBeNull();
    expect(screen.queryByRole("link", { name: "Lucrările mele" })).toBeNull();
  });

  it("renders manager company context and finance widgets when permitted", async () => {
    vi.stubGlobal("fetch", createFetchMock(permissions.manager));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Manager" })).toBeDefined();
    expect(await screen.findByText(/NC · Nicolaie Cristina/)).toBeDefined();
    expect(await screen.findByText("Situație financiară")).toBeDefined();
    expect(screen.getAllByText("Lucrări nefacturate").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Înregistrează încasare" })).toBeDefined();
  });

  it("renders manager operational content when optional finance query fails", async () => {
    vi.stubGlobal("fetch", createFetchMock(permissions.manager, { failBilling: true }));

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Manager" })).toBeDefined();
    expect(await screen.findByText("Activitate operațională")).toBeDefined();
    expect(await screen.findByText("Secțiunea nu a fost încărcată")).toBeDefined();
  });
});
