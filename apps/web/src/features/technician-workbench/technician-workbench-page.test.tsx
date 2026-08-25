import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TechnicianWorkbenchPage } from "./technician-workbench-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <MemoryRouter initialEntries={["/workbench"]}>
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

function createFetchMock(): ReturnType<typeof vi.fn> {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
    }
    if (url.endsWith("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({
        permissions: [
          { key: "technician.workbench.read", scopes: ["ALL"] },
          { key: "works.claim.available.read", scopes: ["ALL"] },
          { key: "works.claim.own.read", scopes: ["ALL"] },
          { key: "technician.operations.manage_own", scopes: ["ASSIGNED"] },
          { key: "technician.operations.read", scopes: ["ALL"] },
          { key: "technician.workload.read", scopes: ["ALL"] },
        ],
      }));
    }
    if (url.endsWith("/organization-context")) {
      return Promise.resolve(createJsonResponse({
        active: { code: "NC", displayName: "Nicolaie Cristina" },
        available: [
          { code: "NC", displayName: "Nicolaie Cristina" },
          { code: "NG", displayName: "Nicolaie Gabriel" },
        ],
        canSwitch: true,
      }));
    }
    if (url.includes("/technician/workbench")) {
      return Promise.resolve(createJsonResponse({
        items: [
          {
            assignment: {
              assignedAt: null,
              assignedBy: null,
              assignedUser: null,
            },
            categories: ["ALL", "UNSTARTED"],
            clinic: { id: "clinic_1", name: "Clinica Test" },
            doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
            dueDate: "2026-08-15T10:00:00.000Z",
            id: "stage_exec_1",
            patientName: "Ion Pop",
            priority: "NORMAL",
            progress: { completed: 0, total: 3 },
            realLabSheet: { cycleNumber: 1, label: "Necompletată", status: "NOT_STARTED" },
            stage: {
              allowedRoleLabels: ["Recepție"],
              id: "stage_exec_1",
              key: "reception",
              name: "Recepție",
              status: "PENDING",
              version: 1,
            },
            workCode: "WO-2026-000001",
            workId: "work_1",
            workType: { id: "work_type_1", name: "Coroană zirconiu" },
            workflowStatus: "ACTIVE",
          },
        ],
        page: 1,
        pageCount: 1,
        pageSize: 20,
        summary: {
          dueToday: 0,
          inProgress: 1,
          overdue: 0,
          totalActive: 1,
          unstarted: 1,
          urgent: 0,
        },
        total: 1,
      }));
    }
    if (url.includes("/works/available-for-claim?")) {
      return Promise.resolve(createJsonResponse({
        items: [
          {
            claim: {
              canCurrentUserClaim: true,
              canCurrentUserReassign: false,
              canCurrentUserRelease: false,
              claimedAt: null,
              executionLegalEntity: null,
              releasedAt: null,
              releaseReason: null,
              revision: 0,
              source: null,
              status: "UNCLAIMED",
              technician: null,
            },
            code: "WO-2026-000002",
            clinic: { code: "CL-1", id: "clinic_1", name: "Clinica Test" },
            doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
            deadline: {
              badge: "Mâine",
              effectiveDueAt: "2026-08-15T10:00:00.000Z",
              status: "DUE_TOMORROW",
            },
            id: "work_2",
            patientName: "Maria Ionescu",
            priority: "URGENT",
            requestedDeliveryDate: "2026-08-15T10:00:00.000Z",
            executionSnapshot: {
              summary: {
                exists: false,
                legalEntity: null,
              },
            },
            status: "RECEPTIE",
            statusChangedAt: "2026-08-14T08:00:00.000Z",
            waitingStartedAt: null,
            completedAt: null,
            completedByUserId: null,
            workType: { id: "work_type_1", name: "Coroană zirconiu" },
          },
        ],
        page: 1,
        pageCount: 1,
        pageSize: 20,
        total: 1,
      }));
    }
    if (url.includes("/works/my-claimed?")) {
      return Promise.resolve(createJsonResponse({
        items: [
          {
            claim: {
              canCurrentUserClaim: false,
              canCurrentUserReassign: false,
              canCurrentUserRelease: true,
              claimedAt: "2026-08-14T08:00:00.000Z",
              executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
              releasedAt: null,
              releaseReason: null,
              revision: 1,
              source: null,
              status: "CLAIMED",
              technician: {
                displayName: "Tehnician Ana",
                id: "tech_1",
              },
            },
            code: "WO-2026-000003",
            clinic: { code: "CL-1", id: "clinic_1", name: "Clinica Test" },
            doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
            deadline: {
              badge: "Astăzi",
              effectiveDueAt: "2026-08-14T10:00:00.000Z",
              status: "DUE_TODAY",
            },
            id: "work_3",
            cycleNumber: 2,
            patientName: "Elena Stoica",
            priority: "NORMAL",
            requestedDeliveryDate: "2026-08-14T10:00:00.000Z",
            executionSnapshot: {
              summary: {
                exists: true,
                legalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
              },
            },
            status: "IN_LUCRU",
            statusChangedAt: "2026-08-14T08:00:00.000Z",
            waitingStartedAt: null,
            completedAt: null,
            completedByUserId: null,
            workType: { id: "work_type_1", name: "Coroană zirconiu" },
          },
        ],
        page: 1,
        pageCount: 1,
        pageSize: 20,
        total: 1,
      }));
    }
    if (url.endsWith("/technician/workload")) {
      return Promise.resolve(createJsonResponse([
        {
          displayName: "Tehnician Ana",
          dueToday: 0,
          email: "ana@example.test",
          id: "tech_1",
          inProgress: 1,
          overdue: 0,
          pending: 1,
          totalActive: 2,
          urgent: 0,
        },
      ]));
    }
    if (url.endsWith("/technician-operations/options")) {
      return Promise.resolve(createJsonResponse([
        { category: "Coroană ceramică", code: "CERAMICA", id: "operation_1", name: "Ceramică" },
        { category: "Altele", code: "GLAZE", id: "operation_2", name: "Glazurare" },
      ]));
    }
    if (url.includes("/technician-operations/performed?")) {
      return Promise.resolve(createJsonResponse([
        {
          createdAt: "2026-08-14T09:00:00.000Z",
          createdByUserId: "tech_1",
          currency: "RON",
          earningMinor: 3000,
          id: "performed_1",
          operation: { code: "CERAMICA", id: "operation_1", name: "Ceramică" },
          performedAt: "2026-08-14T09:00:00.000Z",
          rateId: "rate_1",
          removalReason: null,
          removedAt: null,
          removedByUserId: null,
          technicianId: "tech_1",
          workOrderId: "work_3",
        },
      ]));
    }
    if (url.endsWith("/technician-operations/performed") && init?.method === "POST") {
      return Promise.resolve(createJsonResponse({
        createdAt: "2026-08-14T09:05:00.000Z",
        createdByUserId: "tech_1",
        currency: "RON",
        earningMinor: 2500,
        id: "performed_2",
        operation: { code: "GLAZE", id: "operation_2", name: "Glazurare" },
        performedAt: "2026-08-14T09:05:00.000Z",
        rateId: "rate_2",
        removalReason: null,
        removedAt: null,
        removedByUserId: null,
        technicianId: "tech_1",
        workOrderId: "work_3",
      }));
    }
    if (url.endsWith("/technician-operations/performed/performed_1/remove") && init?.method === "POST") {
      return Promise.resolve(createJsonResponse({
        createdAt: "2026-08-14T09:00:00.000Z",
        createdByUserId: "tech_1",
        currency: "RON",
        earningMinor: 3000,
        id: "performed_1",
        operation: { code: "CERAMICA", id: "operation_1", name: "Ceramică" },
        performedAt: "2026-08-14T09:00:00.000Z",
        rateId: "rate_1",
        removalReason: "Debifată de tehnician din modalul Manopere.",
        removedAt: "2026-08-14T09:10:00.000Z",
        removedByUserId: "tech_1",
        technicianId: "tech_1",
        workOrderId: "work_3",
      }));
    }
    if (url.endsWith("/technicians/options")) {
      return Promise.resolve(createJsonResponse([
        {
          activeAssignedStages: 1,
          displayName: "Tehnician Ana",
          email: "ana@example.test",
          id: "tech_1",
          preferredColor: "#0f766e",
        },
      ]));
    }
    if (url.includes("/works/work_3") && !url.includes("/works/work_3/") && (!init || init.method === undefined || init.method === "GET")) {
      return Promise.resolve(createJsonResponse({
        assignmentHistory: [],
        baseUnitPriceMinor: null,
        claim: {
          canCurrentUserClaim: false,
          canCurrentUserReassign: false,
          canCurrentUserRelease: true,
          claimedAt: "2026-08-14T08:00:00.000Z",
          executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
          releasedAt: null,
          releaseReason: null,
          revision: 1,
          source: null,
          status: "CLAIMED",
          technician: {
            displayName: "Tehnician Ana",
            id: "tech_1",
          },
        },
        clinicalNotes: "Note recepție",
        clinic: { code: "CL-1", id: "clinic_1", name: "Clinica Test" },
        code: "WO-2026-000003",
        completedAt: null,
        completedByUserId: null,
        createdAt: "2026-08-14T07:30:00.000Z",
        createdByUserId: "reception_1",
        currency: null,
        deadline: {
          badge: "Astăzi",
          calculatedAt: null,
          calculatedDueAt: null,
          color: "green",
          countdown: "azi",
          effectiveDueAt: "2026-08-14T10:00:00.000Z",
          executionDays: null,
          explanation: null,
          includeStartDay: null,
          isLocked: false,
          manualDueAt: null,
          mode: "MANUAL",
          reasonCode: null,
          revision: 1,
          source: "CREATION",
          startAt: null,
          status: "DUE_TODAY",
          timezone: null,
          tooltip: "",
        },
        doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
        executionSnapshot: {
          currentTechnician: null,
          deadline: null,
          originalTechnician: null,
          pricing: null,
          summary: {
            createdAt: null,
            exists: true,
            legalEntity: { code: "NC", displayName: "Nicolaie Cristina", publicId: "legal_nc" },
            lockedAt: null,
            status: "LOCKED",
            version: 1,
          },
        },
        externalReference: null,
        id: "work_3",
        internalNotes: "Note interne",
        invoicedDocumentId: null,
        items: [{
          archivedAt: null,
          customImplantPlatformSnapshot: null,
          customWorkTypeSnapshot: null,
          id: "item_1",
          implantPlatform: null,
          notes: null,
          restorationType: null,
          scope: "TEETH",
          shade: "A2",
          sortOrder: 0,
          technicalCodeNotes: null,
          teeth: [{ fdiTooth: 11 }, { fdiTooth: 12 }],
          workType: { code: "WT-1", id: "work_type_1", name: "Coroană zirconiu", probeTypeCodes: ["PROBA"], symbol: "CZr" },
        }],
        patient: null,
        patientName: "Elena Stoica",
        patientReference: null,
        priority: "NORMAL",
        quantity: 2,
        requestedDeliveryDate: "2026-08-14T10:00:00.000Z",
        shade: "A2",
        status: "IN_LUCRU",
        statusChangedAt: "2026-08-14T08:00:00.000Z",
        technicalCodeNotes: "COD-INIȚIAL",
        totalPriceMinor: null,
        updatedAt: "2026-08-14T08:00:00.000Z",
        updatedByUserId: null,
        version: 1,
        waitingStartedAt: null,
        workForm: null,
        workflow: null,
        workType: { code: "WT-1", id: "work_type_1", name: "Coroană zirconiu", symbol: "CZr" },
        toothConnections: [],
      }));
    }
    if (url.includes("/works/work_3/technician-details") && init?.method === "PATCH") {
      return Promise.resolve(createJsonResponse({
        code: "WO-2026-000003",
        id: "work_3",
        technicalCodeNotes: "COD-NOU",
      }));
    }
    if (url.includes("/works/work_3/status") && init?.method === "POST") {
      return Promise.resolve(createJsonResponse({
        code: "WO-2026-000003",
        id: "work_3",
        status: "FINALIZATA",
      }));
    }

    return Promise.resolve(createJsonResponse({}, 404));
  });
}

function createMatchMedia(matches: boolean): typeof window.matchMedia {
  return ((query: string) => ({
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })) as typeof window.matchMedia;
}

describe("TechnicianWorkbenchPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("switches to a compact mobile layout with hidden workload and toggleable filters", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const matchMedia = createMatchMedia(true);
    vi.stubGlobal("matchMedia", matchMedia);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

    renderWithProviders(<TechnicianWorkbenchPage />);

    expect(await screen.findByRole("heading", { name: "Atelier tehnician" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Afișează filtrele" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Încărcare tehnicieni" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Preia" })).toBeDefined();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/works/available-for-claim?") && String(input).includes("sortBy=createdAt"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Afișează filtrele" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ascunde filtrele" })).toBeDefined());
    expect(screen.getByLabelText("Căutare")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "Lucrările mele" }).at(-1)!);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Lucrările mele" }).at(-1)?.getAttribute("aria-pressed")).toBe("true"));
    await waitFor(() => {
      expect(screen.getByText(/WO-2026-000003/)).toBeDefined();
      expect(screen.getByText(/Elena Stoica/)).toBeDefined();
    });
  });

  it("shows claimed work actions and finalizes through the canonical endpoint", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const matchMedia = createMatchMedia(false);
    vi.stubGlobal("matchMedia", matchMedia);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

    renderWithProviders(<TechnicianWorkbenchPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Lucrările mele" }));
    expect(await screen.findByText(/WO-2026-000003/)).toBeDefined();
    expect(screen.queryByText("Revendicată")).toBeNull();
    expect(screen.getByText("Probă")).toBeDefined();
    expect(screen.getByRole("button", { name: "Detalii" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Manopere" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Finalizata" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Detalii" }));
    expect(screen.queryByRole("heading", { name: "Detalii" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Manopere" }));
    expect(await screen.findByRole("heading", { name: "Manopere" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Închide" }));

    fireEvent.click(screen.getByRole("button", { name: "Finalizata" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalizează" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/works/work_3/finalize"), expect.objectContaining({
        method: "POST",
      }));
    });
  });
});
