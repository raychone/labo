import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LogisticsPage } from "./logistics-page.js";

function renderWithProviders(component: ReactNode): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
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
        all: 4,
        blocked: 1,
        inPacking: 0,
        inProduction: 2,
        overdue: 1,
        readyForDelivery: 1,
        readyForDeliveryUnbilled: 1,
        readyForPacking: 0,
        receivedToday: 2,
        toDeliver: 1,
        toPickup: 1,
        unassigned: 1,
        urgent: 1,
        waiting: 1,
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
    if (url.endsWith("/pickup-requests")) {
      return Promise.resolve(createJsonResponse([{
        cancelledAt: null,
        clinic: { id: "clinic_1", name: "Clinica Test" },
        createdAt: "2026-08-20T10:00:00.000Z",
        doctor: { id: "doctor_1", name: "Dr. Ana" },
        exactTime: "09:30",
        id: "pickup_1",
        notes: null,
        scheduledDate: "2026-08-21",
        scheduleLabel: "09:30",
        scheduleType: "EXACT",
        status: "SCHEDULED",
        statusLabel: "Programată",
        updatedAt: "2026-08-20T10:00:00.000Z",
        version: 1,
        windowEndTime: null,
        windowStartTime: null,
      }]));
    }
    if (url.endsWith("/clinics/options")) {
      return Promise.resolve(createJsonResponse([{ code: "CL", id: "clinic_1", name: "Clinica Test" }]));
    }
    if (url.includes("/doctors/options")) {
      return Promise.resolve(createJsonResponse([{ displayName: "Dr. Ana", id: "doctor_1" }]));
    }
    if (url.includes("/patients/options")) {
      return Promise.resolve(createJsonResponse([{ birthDate: null, fullName: "Ion Pop", id: "patient_1" }]));
    }
    if (url.endsWith("/works/work-type-options")) {
      return Promise.resolve(createJsonResponse([{ code: "ZIRCONIA-FULL-ANATOMIC", id: "work_type_1", name: "Zirconia FULL anatomic", symbol: "Zr", unit: "ELEMENT" }]));
    }
    if (url.endsWith("/technicians/options")) {
      return Promise.resolve(createJsonResponse([{ displayName: "Tehnician Test", id: "tech_1", preferredColor: "#2563eb" }]));
    }
    if (url.includes("/users?")) {
      return Promise.resolve(createJsonResponse({ items: [{ displayName: "Recepție Test", id: "receptie_1" }], page: 1, pageCount: 1, pageSize: 100, total: 1 }));
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

  it("renders final logistics shortcut cards and advanced filters", async () => {
    vi.stubGlobal("fetch", createFetchMock(["logistics.center.read", "works.create"]));

    const result = renderWithProviders(<LogisticsPage />);

    expect(await screen.findByRole("heading", { name: "Centru operațional" })).toBeDefined();
    expect(result.container.querySelectorAll(".logistics-page__summary-card")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Toate" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Întârziate" })).toBeDefined();
    expect(screen.getByRole("button", { name: "În așteptare" })).toBeDefined();
    expect(screen.getByLabelText("De livrat")).toBeDefined();
    expect(screen.getByLabelText("De ridicat")).toBeDefined();
    expect(result.container.querySelector(".logistics-page__table-header")?.textContent).toContain("Clinica sau Medic");
    expect(result.container.querySelector(".logistics-page__table-header")?.textContent).toContain("Livrare/Ridicare");
    expect(result.container.querySelectorAll(".logistics-page__summary-window")).toHaveLength(2);
    expect(result.container.querySelectorAll(".logistics-page__summary-window button")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "Finalizate azi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Intrări azi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gata de livrare" })).toBeNull();
    expect(screen.queryByText("Facturare")).toBeNull();
    expect(screen.queryByText("Nefacturat")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Afișează filtrele" }));
    expect(screen.getByLabelText("Cabinet")).toBeDefined();
    expect(screen.getByLabelText("Medic")).toBeDefined();
    expect(screen.getByLabelText("Tehnician")).toBeDefined();
    expect(screen.getByLabelText("Recepție")).toBeDefined();
    expect(screen.getByLabelText("Tip lucrare")).toBeDefined();
    expect(screen.getByLabelText("Data exactă")).toBeDefined();
  });

  it("does not expose financial labels in the Logistics registry", async () => {
    vi.stubGlobal("fetch", createFetchMock(["logistics.center.read", "finance.read"]));

    renderWithProviders(<LogisticsPage />);

    expect(await screen.findByRole("heading", { name: "Centru operațional" })).toBeDefined();
    expect(screen.queryByText("Facturare")).toBeNull();
    expect(screen.queryByText("Nefacturat")).toBeNull();
  });

  it("opens logistics intake with one color field and file picker attachments", async () => {
    vi.stubGlobal("fetch", createFetchMock(["logistics.center.read", "works.create", "files.upload"]));

    renderWithProviders(<LogisticsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Lucrare nouă" }));

    expect(await screen.findByRole("heading", { name: "Lucrare nouă" })).toBeDefined();
    expect(screen.getAllByLabelText("Culoare")).toHaveLength(1);
    expect(screen.queryByLabelText("Nuanta")).toBeNull();
    expect(screen.queryByLabelText("Nuanță")).toBeNull();

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    const file = new File(["scan"], "scan.png", { type: "image/png" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(await screen.findByText("scan.png")).toBeDefined();
  });

  it("shows standalone pickup requests and exact/range schedule fields", async () => {
    vi.stubGlobal("fetch", createFetchMock(["logistics.center.read", "pickup.read", "pickup.create", "pickup.update", "pickup.cancel"]));

    renderWithProviders(<LogisticsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "De ridicat" }));
    expect(await screen.findByText("Cerere ridicare")).toBeDefined();
    expect(screen.getByLabelText("Selectează ridicarea de la Clinica Test")).toBeDefined();
    expect((await screen.findAllByText("Clinica Test")).length).toBeGreaterThanOrEqual(2);
    expect((await screen.findAllByText("Dr. Ana")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/09:30/)).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "Ridicare nouă" })[0]!);
    expect(await screen.findByRole("heading", { name: "Ridicare nouă" })).toBeDefined();
    expect(screen.getByLabelText("Clinica")).toBeDefined();
    expect(screen.getByLabelText("Medic")).toBeDefined();
    expect(screen.getByLabelText("Data")).toBeDefined();
    expect(screen.getByLabelText("Ora exactă")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Programare"), { target: { value: "RANGE" } });
    expect(screen.getByLabelText("De la")).toBeDefined();
    expect(screen.getByLabelText("Până la")).toBeDefined();
  });
});
