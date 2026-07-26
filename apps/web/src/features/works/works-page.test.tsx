import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorksPage } from "./works-page.js";

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
    arrayBuffer: async () => new ArrayBuffer(0),
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
  } as Response;
}

function createPngResponse(): Response {
  const bytes = new Uint8Array([137, 80, 78, 71]);

  return {
    arrayBuffer: async () => bytes.buffer,
    blob: async () => new Blob([bytes], { type: "image/png" }),
    headers: new Headers({ "content-type": "image/png" }),
    json: async () => ({}),
    ok: true,
    status: 200,
  } as Response;
}

const workSummary = {
  clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
  code: "WO-2026-000001",
  createdAt: "2026-07-22T12:00:00.000Z",
  currency: null,
  doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
  id: "work_order_1",
  invoicedDocumentId: null,
  patientName: "Ion Pop",
  patientReference: "P-100",
  priority: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "2026-08-01T00:00:00.000Z",
  status: "REGISTERED",
  totalPriceMinor: null,
  updatedAt: "2026-07-22T12:00:00.000Z",
  workflow: {
    currentStageName: "Recepție",
    progressCompleted: 0,
    progressTotal: 2,
    status: "ACTIVE",
  },
  workType: { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu" },
};

const workDetail = {
  ...workSummary,
  baseUnitPriceMinor: null,
  clinicalNotes: null,
  createdByUserId: "user_1",
  externalReference: null,
  internalNotes: null,
  updatedByUserId: "user_1",
  version: 1,
  workForm: null,
  workflow: null,
};

const workflowResponse = {
  actions: {
    canCompleteCurrentStage: false,
    canStartCurrentStage: true,
    reason: null,
  },
  completedAt: null,
  createdAt: "2026-07-22T12:00:00.000Z",
  currentStage: {
    allowedRoleCodes: ["RECEPTIE"],
    allowedRoleLabels: ["Recepție"],
    completedAt: null,
    completedBy: null,
    description: null,
    estimatedDurationMinutes: 10,
    id: "stage_exec_1",
    isCurrent: true,
    key: "receptie",
    name: "Recepție",
    sortOrder: 1,
    startedAt: null,
    startedBy: null,
    status: "PENDING",
    version: 1,
  },
  events: [
    {
      actor: { displayName: "Receptie", id: "user_1" },
      id: "event_1",
      metadata: null,
      occurredAt: "2026-07-22T12:01:00.000Z",
      stageExecutionId: "stage_exec_1",
      type: "WORKFLOW_CREATED",
    },
  ],
  id: "workflow_exec_1",
  progress: { completed: 0, total: 2 },
  stages: [
    {
      allowedRoleCodes: ["RECEPTIE"],
      allowedRoleLabels: ["Recepție"],
      completedAt: null,
      completedBy: null,
      description: null,
      estimatedDurationMinutes: 10,
      id: "stage_exec_1",
      isCurrent: true,
      key: "receptie",
      name: "Recepție",
      sortOrder: 1,
      startedAt: null,
      startedBy: null,
      status: "PENDING",
      version: 1,
    },
    {
      allowedRoleCodes: ["TEHNICIAN"],
      allowedRoleLabels: ["Tehnician"],
      completedAt: null,
      completedBy: null,
      description: null,
      estimatedDurationMinutes: 120,
      id: "stage_exec_2",
      isCurrent: false,
      key: "modelaj",
      name: "Modelaj",
      sortOrder: 2,
      startedAt: null,
      startedBy: null,
      status: "PENDING",
      version: 1,
    },
  ],
  startedAt: "2026-07-22T12:00:00.000Z",
  status: "ACTIVE",
  updatedAt: "2026-07-22T12:00:00.000Z",
  version: 1,
  workflowName: "Flux zirconiu",
  workflowTemplateId: "template_1",
  workflowVersion: 3,
};

const qrResponse = {
  label: {
    clinicName: "Clinica Test",
    doctorName: "Dr. Ana Popescu",
    dueDate: "2026-08-01T00:00:00.000Z",
    patientDisplay: "P-100",
    priority: "NORMAL",
    quantity: 1,
    workTypeName: "Coroana zirconiu",
  },
  workCode: "WO-2026-000001",
  workId: "work_order_1",
};

const clinicOptionsResponse = [
  { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
  { code: "CL-0002", id: "clinic_2", name: "Clinica Noua" },
];

const doctorOptionsResponse = [
  { clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" },
];

const workTypeOptionsResponse = [
  { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu", unit: "UNIT" },
];

describe("WorksPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the reception register without pricing access", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "clinics.read", scopes: ["ALL"] },
            { key: "doctors.read", scopes: ["ALL"] },
            { key: "works.create", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
            { key: "works.update", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse({ items: [workSummary], page: 1, pageCount: 1, pageSize: 20, total: 1 }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);

    expect(await screen.findByRole("heading", { name: "Lucrări" })).toBeDefined();
    expect(await screen.findByText("WO-2026-000001")).toBeDefined();
    expect(await screen.findByText("Restricționat")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/work-types/options"), expect.anything());
  });

  it("resets doctor selection when clinic changes in the create form", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "clinics.read", scopes: ["ALL"] },
            { key: "doctors.read", scopes: ["ALL"] },
            { key: "works.create", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse(doctorOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse({ items: [workSummary], page: 1, pageCount: 1, pageSize: 20, total: 1 }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Adaugă lucrare" }));
    const clinicSelect = screen.getAllByLabelText("Cabinet").at(-1);
    const doctorSelect = screen.getAllByLabelText("Medic").at(-1);

    if (!(clinicSelect instanceof HTMLSelectElement) || !(doctorSelect instanceof HTMLSelectElement)) {
      throw new Error("Expected form selects to be rendered.");
    }

    fireEvent.change(clinicSelect, { target: { value: "clinic_1" } });
    await screen.findByRole("option", { name: "Dr. Ana Popescu" });
    fireEvent.change(doctorSelect, { target: { value: "doctor_1" } });
    expect(doctorSelect.value).toBe("doctor_1");

    fireEvent.change(clinicSelect, { target: { value: "clinic_2" } });
    await waitFor(() => expect(doctorSelect.value).toBe(""));
  });

  it("shows access denied without works.read_all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ permissions: [] })));

    renderWithProviders(<WorksPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });

  it("opens QR details from the work drawer without exposing token text in the label", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/qr-image");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "works.read_all", scopes: ["ALL"] },
            { key: "works.update", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/works/work_order_1/qr-image")) {
        return Promise.resolve(createPngResponse());
      }
      if (url.includes("/works/work_order_1/qr")) {
        return Promise.resolve(createJsonResponse(qrResponse));
      }
      if (url.includes("/works/work_order_1/workflow")) {
        return Promise.resolve(createJsonResponse(workflowResponse));
      }
      if (url.includes("/works/work_order_1")) {
        return Promise.resolve(createJsonResponse(workDetail));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse({ items: [workSummary], page: 1, pageCount: 1, pageSize: 20, total: 1 }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    fireEvent.click(await screen.findByRole("button", { name: "Vezi QR" }));

    const dialog = await screen.findByRole("dialog", { name: "QR lucrare" });
    expect((await within(dialog).findByRole("img", { name: "QR WO-2026-000001" })).getAttribute("src")).toBe("blob:http://localhost/qr-image");
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    await waitFor(() => expect(within(dialog).getAllByText("WO-2026-000001")).toHaveLength(2));
    expect(await within(dialog).findByText("P-100")).toBeDefined();
    expect(screen.queryByText("dl-work:secure_token_12345678901234567890")).toBeNull();
    revokeObjectUrl.mockRestore();
    createObjectUrl.mockRestore();
  });

  it("shows workflow execution and starts the current stage", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "workflow.start_stage", scopes: ["OWN_STAGE"] },
            { key: "works.read_all", scopes: ["ALL"] },
            { key: "works.update", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.includes("/works/work_order_1/workflow/stages/stage_exec_1/start")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ expectedStageVersion: 1, expectedWorkflowVersion: 1 }));
        return Promise.resolve(createJsonResponse({
          ...workflowResponse,
          actions: { canCompleteCurrentStage: true, canStartCurrentStage: false, reason: null },
          currentStage: { ...workflowResponse.currentStage, status: "IN_PROGRESS", version: 2 },
          stages: workflowResponse.stages.map((stage) => stage.id === "stage_exec_1" ? { ...stage, status: "IN_PROGRESS", version: 2 } : stage),
          version: 2,
        }));
      }
      if (url.includes("/works/work_order_1/workflow")) {
        return Promise.resolve(createJsonResponse(workflowResponse));
      }
      if (url.includes("/works/work_order_1")) {
        return Promise.resolve(createJsonResponse(workDetail));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse({ items: [workSummary], page: 1, pageCount: 1, pageSize: 20, total: 1 }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    expect(await screen.findByRole("heading", { name: "Flux producție" })).toBeDefined();
    expect(await screen.findByText("Flux zirconiu · versiunea 3")).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: "Pornește etapa" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/workflow/stages/stage_exec_1/start"), expect.objectContaining({ method: "POST" })));
  });
});
