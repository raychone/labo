import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkScanPage } from "./work-scan-page.js";

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

const scanContext = {
  actions: [
    { enabled: true, reason: null, type: "OPEN_WORK" },
    { enabled: true, reason: null, type: "START_STAGE" },
    { enabled: false, reason: "Etapa trebuie să fie în lucru.", type: "COMPLETE_STAGE" },
    { enabled: false, reason: "Etapa are deja responsabil.", type: "ASSIGN_STAGE" },
    { enabled: false, reason: "Nu ai permisiunea necesară.", type: "REASSIGN_STAGE" },
  ],
  logistics: {
    activeGroup: null,
    blockedReason: null,
    locationCode: "PRODUCTIE",
    status: "IN_PRODUCTION",
  },
  realLabSheet: {
    cycleNumber: 1,
    label: "Necompletată",
    status: "NOT_STARTED",
  },
  resolvedAt: "2026-07-22T12:00:00.000Z",
  work: {
    clinicName: "Clinica Test",
    code: "WO-26-0001",
    doctorName: "Dr. Ana Popescu",
    id: "work_order_1",
    patientName: "Ion Pop",
    priority: "NORMAL",
    requestedDeliveryDate: "2026-08-01T00:00:00.000Z",
    status: "REGISTERED",
    workTypeName: "Coroana zirconiu",
  },
  workflow: {
    currentStage: {
      allowedRoleLabels: ["Tehnician"],
      assignedUser: { displayName: "Tehnician Demo", id: "tech_1" },
      id: "stage_1",
      name: "Modelare",
      status: "PENDING",
      version: 1,
    },
    id: "workflow_1",
    progress: { completed: 0, total: 3 },
    status: "ACTIVE",
    version: 1,
    workflowName: "Flux standard",
  },
};

describe("WorkScanPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves work codes through the manual fallback", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "scan.use", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
            { key: "workflow.start_stage", scopes: ["OWN_STAGE"] },
          ],
        }));
      }
      if (url.endsWith("/clinics/options")) {
        return Promise.resolve(createJsonResponse([{ code: "NC", id: "clinic_1", name: "Clinica Test" }]));
      }
      if (url.startsWith("/works?")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            clinic: { code: "NC", id: "clinic_1", name: "Clinica Test" },
            code: "WO-26-0001",
            doctor: { clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" },
            id: "work_order_1",
            patientName: "Ion Pop",
            priority: "NORMAL",
            status: "REGISTERED",
            workType: { code: "CZR", id: "work_type_1", name: "Coroana zirconiu", symbol: "CZr", unit: "PIECE" },
          }],
          page: 1,
          pageCount: 1,
          pageSize: 5,
          total: 1,
        }));
      }
      if (url.endsWith("/scan/resolve")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ payload: "WO-26-0001", source: "manual" }));
        return Promise.resolve(createJsonResponse(scanContext));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorkScanPage />);

    fireEvent.change(await screen.findByLabelText("Cod scanat sau cod lucrare"), { target: { value: "WO-26-0001" } });
    fireEvent.click(screen.getByRole("button", { name: "Caută lucrarea" }));

    expect(await screen.findByText("Lucrare găsită")).toBeDefined();
    expect(await screen.findByText("WO-26-0001")).toBeDefined();
    expect(await screen.findByText("Flux standard")).toBeDefined();
    expect(await screen.findByText("Tehnician Demo")).toBeDefined();
    expect(await screen.findByText("Necompletată")).toBeDefined();
    expect(await screen.findByRole("button", { name: "Completează fișa" })).toBeDefined();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/scan/resolve"), expect.anything()));
  });

  it("filters manual lookup by clinic, doctor and patient name", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "scan.use", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/clinics/options")) {
        return Promise.resolve(createJsonResponse([{ code: "NC", id: "clinic_1", name: "Clinica Test" }]));
      }
      if (url.includes("/works?")) {
        expect(url).toContain("clinicId=clinic_1");
        expect(url).toContain("search=Dr.+Ana+Popescu+Ion+Pop");
        return Promise.resolve(createJsonResponse({
          items: [{
            clinic: { code: "NC", id: "clinic_1", name: "Clinica Test" },
            code: "WO-2026-000001",
            doctor: { clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" },
            id: "work_order_1",
            patientName: "Ion Pop",
            priority: "NORMAL",
            status: "REGISTERED",
            workType: { code: "CZR", id: "work_type_1", name: "Coroana zirconiu", symbol: "CZr", unit: "PIECE" },
          }],
          page: 1,
          pageCount: 1,
          pageSize: 5,
          total: 1,
        }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorkScanPage />);

    const clinicSelect = await screen.findByLabelText("Clinică");
    fireEvent.focus(clinicSelect);
    fireEvent.change(clinicSelect, { target: { value: "" } });
    fireEvent.click(await screen.findByRole("option", { name: "NC · Clinica Test" }));
    fireEvent.change(await screen.findByLabelText("Medic"), { target: { value: "Dr. Ana Popescu" } });
    fireEvent.change(await screen.findByLabelText("Nume pacient"), { target: { value: "Ion Pop" } });

    expect(await screen.findByText("Rezultate căutare")).toBeDefined();
    expect(await screen.findByText("WO-2026-000001")).toBeDefined();
    expect(await screen.findByRole("link", { name: "Deschide lucrarea" })).toBeDefined();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/works?"), expect.anything()));
  });

  it("shows access denied without scan.use", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ permissions: [] })));

    renderWithProviders(<WorkScanPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });
});
