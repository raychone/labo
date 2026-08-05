import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LogisticsPage } from "./logistics-page.js";

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

function createFetchMock(permissionKeys: readonly string[]) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({
        permissions: permissionKeys.map((key) => ({ key, scopes: ["ALL"] })),
      }));
    }
    if (url.includes("/logistics/center/summary")) {
      return Promise.resolve(createJsonResponse({
        blocked: 1,
        inPacking: 0,
        inProduction: 2,
        overdue: 1,
        readyForDelivery: 1,
        readyForDeliveryUnbilled: 1,
        readyForPacking: 0,
        receivedToday: 2,
        unassigned: 1,
        urgent: 1,
      }));
    }
    if (url.includes("/logistics/center?")) {
      return Promise.resolve(createJsonResponse({
        items: [
          {
            actions: { block: false, completePacking: false, manageGroups: false, readyForPacking: false, startPacking: false, unblock: false, updateLocation: false },
            billing: { documentId: null, documentNumber: null, documentStatus: null, label: "Nefacturat", paymentStatus: null },
            clinic: { id: "clinic_1", name: "Clinica Test" },
            createdAt: "2026-08-04T08:00:00.000Z",
            doctor: { id: "doctor_1", name: "Dr. Ana" },
            dueState: "ON_TRACK",
            id: "log_1",
            logistics: { blockedAt: null, blockedReasonCode: null, blockedReasonLabel: null, blockedReasonNotes: null, locationCode: null, locationLabel: null, packingStartedAt: null, readyForDeliveryAt: null, readyForPackingAt: null, status: "IN_PRODUCTION", statusLabel: "În producție", version: 1 },
            patientName: "Ion Pop",
            patientReference: "P-1",
            preparationGroup: null,
            priority: "NORMAL",
            requestedDeliveryDate: "2026-08-05T00:00:00.000Z",
            workCode: "WO-2026-000001",
            workflow: { assignedUserName: null, completedAt: null, currentStageName: "Modelaj", progressCompleted: 1, progressTotal: 4, status: "ACTIVE" },
            workTypeName: "Coroană zirconiu",
          },
        ],
        page: 1,
        pageCount: 1,
        pageSize: 30,
        total: 1,
      }));
    }
    if (url.includes("/delivery-preparation-groups")) {
      return Promise.resolve(createJsonResponse([]));
    }
    if (url.includes("/works/log_1/logistics")) {
      return Promise.resolve(createJsonResponse({
        actions: { block: false, completePacking: false, manageGroups: false, readyForPacking: false, startPacking: false, unblock: false, updateLocation: false },
        billing: { documentId: null, documentNumber: null, documentStatus: null, label: "Nefacturat", paymentStatus: null },
        clinic: { id: "clinic_1", name: "Clinica Test" },
        createdAt: "2026-08-04T08:00:00.000Z",
        doctor: { id: "doctor_1", name: "Dr. Ana" },
        dueState: "ON_TRACK",
        events: [],
        formSnapshot: null,
        id: "log_1",
        logistics: { blockedAt: null, blockedReasonCode: null, blockedReasonLabel: null, blockedReasonNotes: null, locationCode: null, locationLabel: null, packingStartedAt: null, readyForDeliveryAt: null, readyForPackingAt: null, status: "IN_PRODUCTION", statusLabel: "În producție", version: 1 },
        patientName: "Ion Pop",
        patientReference: "P-1",
        preparationGroup: null,
        priority: "NORMAL",
        requestedDeliveryDate: "2026-08-05T00:00:00.000Z",
        workCode: "WO-2026-000001",
        workflow: { assignedUserName: null, completedAt: null, currentStageName: "Modelaj", progressCompleted: 1, progressTotal: 4, status: "ACTIVE" },
        workTypeName: "Coroană zirconiu",
      }));
    }
    return Promise.resolve(createJsonResponse({}, 404));
  });
}

describe("LogisticsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wraps tabs cleanly and hides billing labels without finance access", async () => {
    vi.stubGlobal("fetch", createFetchMock(["logistics.center.read", "works.create"]));

    renderWithProviders(<LogisticsPage />);

    expect(await screen.findByRole("heading", { name: "Centru operațional" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Toate" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Intrări azi" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Gata de livrare" })).toBeDefined();
    expect(screen.queryByText("Facturare")).toBeNull();
    expect(screen.queryByText("Nefacturat")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Intrări azi" }));
    expect(screen.getByRole("button", { name: "Intrări azi" })).toBeDefined();
  });

  it("shows billing labels only when finance access exists", async () => {
    vi.stubGlobal("fetch", createFetchMock(["logistics.center.read", "finance.read"]));

    renderWithProviders(<LogisticsPage />);

    expect(await screen.findByText("Facturare")).toBeDefined();
    expect(screen.getByText("Nefacturat")).toBeDefined();
  });
});
