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
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({
        permissions: [
          { key: "technician.workbench.read", scopes: ["ALL"] },
          { key: "works.claim.available.read", scopes: ["ALL"] },
          { key: "works.claim.own.read", scopes: ["ALL"] },
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
            patientName: "Elena Stoica",
            priority: "NORMAL",
            requestedDeliveryDate: "2026-08-14T10:00:00.000Z",
            executionSnapshot: {
              summary: {
                exists: true,
                legalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
              },
            },
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
    vi.stubGlobal("fetch", createFetchMock());
    const matchMedia = createMatchMedia(true);
    vi.stubGlobal("matchMedia", matchMedia);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

    renderWithProviders(<TechnicianWorkbenchPage />);

    expect(await screen.findByRole("heading", { name: "Atelier tehnician" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Afișează filtrele" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Încărcare tehnicieni" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Preia" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Afișează filtrele" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ascunde filtrele" })).toBeDefined());
    expect(screen.getByLabelText("Căutare")).toBeDefined();

    fireEvent.click(screen.getByText("De început").closest("button")!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Lucrările mele" }).getAttribute("aria-pressed")).toBe("true"));
    await waitFor(() => {
      expect(screen.getByText(/WO-2026-000003/)).toBeDefined();
      expect(screen.getByText(/Elena Stoica/)).toBeDefined();
    });
  });
});
