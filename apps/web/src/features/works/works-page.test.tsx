import { ToastProvider } from "@dental-lab/ui";
import type { WorkFormFieldDefinition } from "@dental-lab/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";

import { WorkFormFields } from "./work-dynamic-form.js";
import { defaultWorkFormValues } from "./work-form.js";
import type { WorkFormValues } from "./works-page.schema.js";
import { WorksPage } from "./works-page.js";

function renderWithProviders(component: ReactNode, initialEntries = ["/works"]): void {
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
  code: "WO-26-0001",
  createdAt: "2026-07-22T12:00:00.000Z",
  currency: null,
  deadline: {
    badge: "În termen",
    calculatedAt: "2026-07-22T12:00:00.000Z",
    calculatedDueAt: "2026-08-01T10:00:00.000Z",
    color: "green",
    countdown: "4 zile",
    effectiveDueAt: "2026-08-01T10:00:00.000Z",
    executionDays: 4,
    explanation: "Termen calculat automat.",
    includeStartDay: false,
    isLocked: false,
    manualDueAt: null,
    mode: "CALCULATED",
    reasonCode: null,
    revision: 1,
    source: "CREATION",
    startAt: "2026-07-22T12:00:00.000Z",
    status: "ON_TIME",
    timezone: "Europe/Bucharest",
    tooltip: "Lucrarea este în termen.",
  },
  executionSnapshot: {
    currentTechnician: null,
    deadline: null,
    originalTechnician: null,
    pricing: null,
    summary: {
      createdAt: null,
      exists: false,
      legalEntity: null,
      lockedAt: null,
      status: "NOT_CREATED",
      version: null,
    },
  },
  doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
  id: "work_order_1",
  invoicedDocumentId: null,
  patientName: "Ion Pop",
  patient: {
    birthDate: "1990-01-15T00:00:00.000Z",
    firstName: "Ion",
    fullName: "Ion Pop",
    id: "patient_1",
    lastName: "Pop",
    sex: "MALE",
  },
  patientReference: "P-100",
  priority: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "2026-08-01T00:00:00.000Z",
  shade: "A2",
  status: "REGISTERED",
  totalPriceMinor: null,
  updatedAt: "2026-07-22T12:00:00.000Z",
  workflow: {
    currentStageName: "Recepție",
    progressCompleted: 0,
    progressTotal: 2,
    status: "ACTIVE",
  },
  workType: { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu", symbol: "CZr" },
};

const deadlineDashboard = {
  completedOnTimeLast7Days: 0,
  dueToday: 0,
  dueTomorrow: 0,
  late: 0,
  manual: 0,
  next7Days: 1,
  unresolved: 0,
};

const worksListResponse = {
  deadlineDashboard,
  items: [workSummary],
  page: 1,
  pageCount: 1,
  pageSize: 20,
  total: 1,
};

const workDetail = {
  ...workSummary,
  assignmentHistory: [],
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
  workCode: "WO-26-0001",
  workId: "work_order_1",
};

const cycleHistoryResponse = {
  activeCycleId: "cycle_2",
  cycles: [
    {
      clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
      closedAt: "2026-08-02T10:00:00.000Z",
      createdBy: { displayName: "Receptie", publicId: "user_1" },
      cycleNumber: 1,
      deadline: { effectiveDueAt: "2026-08-01T10:00:00.000Z", mode: "CALCULATED", snapshot: null },
      delivery: { activePreparationItemCount: 0 },
      doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
      executionCompany: { code: "NC", displayName: "Nicolaie Cristina" },
      executionSnapshot: { snapshot: null, status: "LOCKED", version: 1 },
      id: "cycle_1",
      logistics: { id: "logistics_1", status: "DELIVERED" },
      openedAt: "2026-07-22T12:00:00.000Z",
      pricingSnapshot: null,
      reason: "INITIAL",
      reasonNotes: null,
      status: "CLOSED",
      workflow: { id: "workflow_1", status: "COMPLETED" },
    },
    {
      clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
      closedAt: null,
      createdBy: { displayName: "Receptie", publicId: "user_1" },
      cycleNumber: 2,
      deadline: { effectiveDueAt: "2026-08-05T10:00:00.000Z", mode: "CALCULATED", snapshot: null },
      delivery: { activePreparationItemCount: 0 },
      doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
      executionCompany: null,
      executionSnapshot: { snapshot: null, status: null, version: null },
      id: "cycle_2",
      logistics: { id: "logistics_2", status: "RECEIVED" },
      openedAt: "2026-08-02T10:00:00.000Z",
      pricingSnapshot: null,
      reason: "PROBA",
      reasonNotes: null,
      status: "ACTIVE",
      workflow: { id: "workflow_2", status: "ACTIVE" },
    },
  ],
  work: {
    clinicId: "clinic_1",
    code: "WO-2026-000001",
    doctorId: "doctor_1",
    id: "work_order_1",
    patientId: "patient_1",
    patientName: "Ion Pop",
  },
  };

const patientOptionsResponse = [
  { birthDate: null, fullName: "Ion Pop", id: "patient_1", workCount: 3 },
  { birthDate: null, fullName: "Mara Ionescu", id: "patient_2", workCount: 1 },
  { birthDate: null, fullName: "Maria Pop", id: "patient_3", workCount: 2 },
  { birthDate: null, fullName: "Mihai Popescu", id: "patient_4", workCount: 0 },
];

const clinicOptionsResponse = [
  { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
  { code: "CL-0002", id: "clinic_2", name: "Clinica Noua" },
];

const doctorOptionsResponse = [
  { clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" },
];

const workTypeOptionsResponse = [
  { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu", symbol: "CZr", unit: "UNIT" },
  { code: "WT-0002", id: "work_type_2", name: "Punte zirconiu", symbol: "PZr", unit: "UNIT" },
  { code: "WT-0003", id: "work_type_3", name: "Proteză totală", symbol: "PT", unit: "CASE" },
];

const dynamicFieldTestDefinitions: readonly WorkFormFieldDefinition[] = [
  {
    copyToNextCyclePolicy: "NEVER",
    cycleScope: "WORK",
    defaultValue: false,
    editableUntil: "NEVER",
    helpText: null,
    id: "field_checkbox",
    isActive: true,
    key: "confirm",
    label: "Confirmă",
    options: [],
    placeholder: null,
    printable: true,
    required: true,
    roleOwner: "SHARED",
    sectionLabel: "Secțiune test",
    sortOrder: 1,
    sourceKind: "USER_ENTERED",
    type: "CHECKBOX",
    validation: {},
  },
  {
    copyToNextCyclePolicy: "NEVER",
    cycleScope: "WORK",
    defaultValue: null,
    editableUntil: "NEVER",
    helpText: null,
    id: "field_radio",
    isActive: true,
    key: "choice",
    label: "Alege",
    options: [
      { label: "Prima", value: "FIRST" },
      { label: "A doua", value: "SECOND" },
    ],
    placeholder: null,
    printable: true,
    required: true,
    roleOwner: "SHARED",
    sectionLabel: "Secțiune test",
    sortOrder: 2,
    sourceKind: "USER_ENTERED",
    type: "RADIO",
    validation: {},
  },
];

const toothFieldTestDefinitions: readonly WorkFormFieldDefinition[] = [
  {
    copyToNextCyclePolicy: "NEVER",
    cycleScope: "WORK",
    defaultValue: null,
    editableUntil: "NEVER",
    helpText: null,
    id: "field_teeth",
    isActive: true,
    key: "teeth",
    label: "Dinți",
    options: [],
    placeholder: null,
    printable: true,
    required: false,
    roleOwner: "SHARED",
    sectionLabel: "Secțiune test",
    sortOrder: 1,
    sourceKind: "USER_ENTERED",
    type: "TOOTH",
    validation: {},
  },
];

const realLabSheetResponse = {
  canEdit: true,
  canFinalize: false,
  canMarkComplete: true,
  cycleNumber: 2,
  fields: [
    {
      copyToNextCyclePolicy: "NEVER",
      cycleScope: "PER_CYCLE",
      defaultValue: null,
      editableUntil: "FINALIZED",
      helpText: null,
      key: "observations",
      label: "Observații",
      options: [],
      placeholder: null,
      printable: true,
      required: true,
      roleOwner: "SHARED",
      sectionKey: "technical",
      sectionLabel: "Date tehnice",
      sortOrder: 1,
      sourceKind: "USER_ENTERED",
      type: "TEXTAREA",
      validation: {},
    },
  ],
  finalizedAt: null,
  finalizedBy: null,
  isFinalized: false,
  isReadOnly: false,
  lastModifiedAt: "2026-08-04T08:00:00.000Z",
  lastModifiedBy: { displayName: "Receptie", publicId: "user_1" },
  revision: 1,
  status: "IN_PROGRESS",
  submittedAt: "2026-08-04T08:00:00.000Z",
  templateId: "template_real",
  templateKind: "REAL_LAB_SHEET",
  templateName: "Fișă laborator reală",
  templateVersion: 1,
  updatedAt: "2026-08-04T08:00:00.000Z",
  values: {},
  workCycleId: "cycle_2",
  workOrderId: "work_order_1",
};

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
            { key: "probe_types.read", scopes: ["ALL"] },
            { key: "works.update", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/works/probe-types")) {
        return Promise.resolve(createJsonResponse([{ id: "probe_type_1", isArchived: false, name: "Lingură", sortOrder: 0 }]));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/patients/options")) {
        return Promise.resolve(createJsonResponse(patientOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);

    expect(await screen.findByRole("heading", { name: "Lucrări" })).toBeDefined();
    expect(await screen.findByText("Ion Pop")).toBeDefined();
    expect(await screen.findByText("Coroana zirconiu")).toBeDefined();
    expect(await screen.findByText("În lucru")).toBeDefined();
    expect(await screen.findByText("Normal")).toBeDefined();
    expect(screen.getByRole("button", { name: "Deschide" })).toBeDefined();
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
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Adaugă lucrare" }));
    const clinicInput = screen.getAllByLabelText("Clinică").at(-1);
    const doctorInput = screen.getAllByLabelText("Medic").at(-1);

    if (!(clinicInput instanceof HTMLInputElement) || !(doctorInput instanceof HTMLInputElement)) {
      throw new Error("Expected searchable clinic and doctor inputs to be rendered.");
    }

    fireEvent.change(clinicInput, { target: { value: "clinic_1" } });
    fireEvent.focus(doctorInput);
    await screen.findByRole("option", { name: "Dr. Ana Popescu" });
    fireEvent.change(doctorInput, { target: { value: "doctor_1" } });
    expect(doctorInput.value).toBe("Dr. Ana Popescu");

    fireEvent.change(clinicInput, { target: { value: "clinic_2" } });
    await waitFor(() => expect(doctorInput.value).toBe(""));
  });

  it("shows a small searchable suggestion list for patients and work types in the create form", async () => {
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
      if (url.includes("/patients/options")) {
        return Promise.resolve(createJsonResponse(patientOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Adaugă lucrare" }));

    const patientInput = await screen.findByLabelText("Pacient");
    fireEvent.focus(patientInput);

    const patientListbox = await screen.findByRole("listbox");
    expect(within(patientListbox).getAllByRole("option")).toHaveLength(3);
    expect(within(patientListbox).getByText("Ion Pop")).toBeDefined();

    fireEvent.keyDown(patientInput, { key: "ArrowDown" });
    fireEvent.keyDown(patientInput, { key: "Enter" });
    expect((patientInput as HTMLInputElement).value).toBe("Mara Ionescu");

    fireEvent.focus(patientInput);
    fireEvent.change(patientInput, { target: { value: "Maria" } });
    const filteredPatientListbox = await screen.findByRole("listbox");
    await waitFor(() => expect(within(filteredPatientListbox).getAllByRole("option")).toHaveLength(1));
    expect(within(filteredPatientListbox).getByText("Maria Pop")).toBeDefined();

    fireEvent.click(within(filteredPatientListbox).getByRole("option", { name: /Maria Pop/ }));
    expect((patientInput as HTMLInputElement).value).toBe("Maria Pop");

    const workTypeInput = await screen.findByLabelText("Tip lucrare");
    fireEvent.focus(workTypeInput);
    const workTypeListbox = await screen.findByRole("listbox");
    expect(within(workTypeListbox).getAllByRole("option")).toHaveLength(3);

    fireEvent.change(workTypeInput, { target: { value: "punte" } });
    await waitFor(() => expect(within(workTypeListbox).getAllByRole("option")).toHaveLength(1));
    expect(within(workTypeListbox).getByText("Punte zirconiu")).toBeDefined();
    expect(within(workTypeListbox).getByText("PZr · Bucată")).toBeDefined();
  });

  it("submits canonical reception intake fields from the create form", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "clinics.read", scopes: ["ALL"] },
            { key: "doctors.read", scopes: ["ALL"] },
            { key: "works.create", scopes: ["ALL"] },
            { key: "works.deadline.preview", scopes: ["ALL"] },
            { key: "works.deadline.set_manual", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
            { key: "probe_types.read", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/works/probe-types")) {
        return Promise.resolve(createJsonResponse([{ id: "probe_type_1", isArchived: false, name: "Lingură", sortOrder: 0 }]));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse(doctorOptionsResponse));
      }
      if (url.includes("/patients/options")) {
        return Promise.resolve(createJsonResponse(patientOptionsResponse));
      }
      if (url.includes("/work-types/") && url.includes("/form-template")) {
        return Promise.resolve(createJsonResponse(null));
      }
      if (url.includes("/works/deadline-preview")) {
        return Promise.resolve(createJsonResponse({
          badge: "Manual",
          calculatedDueAt: null,
          color: "green",
          countdown: "manual",
          effectiveDueAt: "2026-08-20T09:30:00.000Z",
          executionDays: null,
          explanation: "Termen manual.",
          manualDueAt: "2026-08-20T09:30:00.000Z",
          mode: "MANUAL",
          status: "ON_TIME",
          tooltip: "Termen manual.",
        }));
      }
      if (url.endsWith("/works") && init?.method === "POST") {
        return Promise.resolve(createJsonResponse({
          ...workSummary,
          clinicalNotes: "Lucrare prioritară",
          quantity: 3,
          requestedDeliveryDate: "2026-08-20T00:00:00.000Z",
          shade: "A2",
        }));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Adaugă lucrare" }));

    const patientInput = await screen.findByLabelText("Pacient");
    fireEvent.focus(patientInput);
    fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: /Ion Pop/ }));

    const workTypeInput = await screen.findByLabelText("Tip lucrare");
    fireEvent.focus(workTypeInput);
    fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: /Punte zirconiu/ }));

    fireEvent.change(screen.getByLabelText("Clinică"), { target: { value: "clinic_1" } });
    fireEvent.change(await screen.findByLabelText("Medic"), { target: { value: "doctor_1" } });
    fireEvent.change(screen.getByLabelText("Culoare"), { target: { value: "A2" } });
    fireEvent.click(screen.getByRole("button", { name: "Dinte 11" }));
    fireEvent.click(screen.getByRole("button", { name: "Adaugă componentă" }));
    expect(await screen.findByText(/1\. Punte zirconiu/)).toBeDefined();
    fireEvent.change(screen.getByLabelText("Data termenului"), { target: { value: "2026-08-20" } });
    fireEvent.change(screen.getByLabelText("Ora termenului"), { target: { value: "09:30" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Lucrare prioritară" } });
    fireEvent.submit(document.getElementById("create-work-form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/works"), expect.objectContaining({ method: "POST" })));
    const createCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/works") && (init as RequestInit | undefined)?.method === "POST");
    expect(createCall).toBeDefined();
    const body = JSON.parse(String((createCall?.[1] as RequestInit).body));
    expect(body).toMatchObject({
      clinicId: "clinic_1",
      clinicalNotes: "Lucrare prioritară",
      doctorId: "doctor_1",
      patientId: "patient_1",
      quantity: 1,
      requestedDeliveryDate: "2026-08-20",
      shade: "A2",
      workTypeId: "work_type_2",
      items: [expect.objectContaining({ scope: "TOOTH", teeth: [11], workTypeId: "work_type_2", shade: "A2" })],
    });
    expect(body.manualDueAt).toEqual(expect.stringMatching(/^2026-08-20T/));
    expect(body).not.toHaveProperty("probeTypeId");
    expect(body).not.toHaveProperty("probeDeadlineAt");
  });

  it("submits boolean and radio dynamic fields through the create form contract", async () => {
    function Harness({ onSubmit }: { readonly onSubmit: (values: WorkFormValues) => void }): ReactNode {
      const form = useForm<WorkFormValues>({
        defaultValues: {
          ...defaultWorkFormValues,
          workFormValues: {},
        },
      });

      return (
        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
          <WorkFormFields fields={dynamicFieldTestDefinitions} form={form} isDisabled={false} />
          <button type="submit">Salvează</button>
        </form>
      );
    }

    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText("Confirmă"));
    fireEvent.click(screen.getByRole("radio", { name: "Prima" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].workFormValues).toEqual({
      choice: "FIRST",
      confirm: true,
    });
  });

  it("renders tooth selections by quadrant and submits them in canonical order", async () => {
    function Harness({ onSubmit }: { readonly onSubmit: (values: WorkFormValues) => void }): ReactNode {
      const form = useForm<WorkFormValues>({
        defaultValues: {
          ...defaultWorkFormValues,
          workFormValues: {},
        },
      });

      return (
        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
          <WorkFormFields fields={toothFieldTestDefinitions} form={form} isDisabled={false} />
          <button type="submit">Salvează</button>
        </form>
      );
    }

    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    expect(screen.getByRole("region", { name: "FDI 18-11" })).toBeDefined();
    expect(screen.getByRole("region", { name: "FDI 21-28" })).toBeDefined();
    expect(screen.getByRole("region", { name: "FDI 31-38" })).toBeDefined();
    expect(screen.getByRole("region", { name: "FDI 48-41" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "22" }));
    fireEvent.click(screen.getByRole("button", { name: "11" }));
    fireEvent.click(screen.getByRole("button", { name: "18" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].workFormValues).toEqual({
      teeth: ["18", "11", "22"],
    });
  });

  it("opens the create modal from the dashboard query flag", async () => {
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
      if (url.includes("/patients/options")) {
        return Promise.resolve(createJsonResponse(patientOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />, ["/works?create=1"]);

    expect(await screen.findByRole("heading", { name: "Lucrare nouă" })).toBeDefined();
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
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    fireEvent.click(await screen.findByRole("button", { name: "Vezi QR" }));

    const dialog = await screen.findByRole("dialog", { name: "QR lucrare" });
    expect((await within(dialog).findByRole("img", { name: "QR WO-26-0001" })).getAttribute("src")).toBe("blob:http://localhost/qr-image");
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    await waitFor(() => expect(within(dialog).getAllByText("WO-26-0001")).toHaveLength(2));
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
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    expect(await screen.findByText("Detaliile lucrării")).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Flux producție" })).toBeDefined();
    expect(await screen.findByText("Flux zirconiu · versiunea 3")).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: "Începe etapa" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/workflow/stages/stage_exec_1/start"), expect.objectContaining({ method: "POST" })));
  });

  it("shows cycle history in the work detail drawer for authorized users", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "cycles.history.read", scopes: ["ALL"] },
            { key: "cycles.read", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/works/work_order_1/cycles")) {
        return Promise.resolve(createJsonResponse(cycleHistoryResponse));
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
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    fireEvent.click(await screen.findByRole("button", { name: "Deschide Probe" }));

    expect(await screen.findByRole("heading", { name: "Cicluri" })).toBeDefined();
    expect((await screen.findAllByText("Ciclul 2")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Probă")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Înregistrează proba" })).toBeNull();
  });

  it("renders canonical completed probes from immutable snapshots and only the active probe is editable", async () => {
    const canonicalWork = {
      ...workDetail,
      workflow: workflowResponse,
      activeProbeCycle: {
        completedAt: null,
        deadlineAt: "2026-08-25T10:00:00.000Z",
        id: "probe_active",
        openedAt: "2026-08-24T08:00:00.000Z",
        probeType: { id: "probe_archived", isArchived: true, name: "Denumire veche", sortOrder: 0 },
        probeTypeNameSnapshot: "Denumire veche",
        sequence: 2,
        status: "ACTIVE" as const,
      },
      completedProbeCycles: [{
        completedAt: "2026-08-23T15:00:00.000Z",
        deadlineAt: "2026-08-23T10:00:00.000Z",
        id: "probe_completed",
        openedAt: "2026-08-22T08:00:00.000Z",
        probeType: { id: "probe_archived", isArchived: true, name: "Nume catalog nou", sortOrder: 0 },
        probeTypeNameSnapshot: "Lingură istorică",
        sequence: 1,
        status: "COMPLETED" as const,
      }],
    };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) return Promise.resolve(createJsonResponse({ permissions: [{ key: "cycles.probe_type.select", scopes: ["ALL"] }, { key: "probe_types.read", scopes: ["ALL"] }, { key: "works.read_all", scopes: ["ALL"] }] }));
      if (url.endsWith("/works/probe-types")) return Promise.resolve(createJsonResponse([{ id: "probe_active_2", isArchived: false, name: "Biscuit", sortOrder: 1 }]));
      if (url.includes("/works/work_order_1/workflow")) return Promise.resolve(createJsonResponse(workflowResponse));
      if (url.includes("/works/work_order_1")) return Promise.resolve(createJsonResponse(canonicalWork));
      if (url.includes("/works/work-type-options")) return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      if (url.includes("/works?")) return Promise.resolve(createJsonResponse(worksListResponse));
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorksPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    expect(screen.queryByText("Proba 1 trecută · Lingură istorică")).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Deschide Probe" }));
    expect(await screen.findByText("Proba 1 trecută · Lingură istorică")).toBeDefined();
    expect(screen.getByLabelText("Tip probă")).toBeDefined();
    expect(screen.getByText("Tip probă istoric: Lingură istorică")).toBeDefined();
  });

  it("registers a returned work with clinic, doctor and distinct return reason", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "cycles.create_next", scopes: ["ALL"] },
            { key: "cycles.history.read", scopes: ["ALL"] },
            { key: "cycles.read", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.includes("/works/work_order_1/cycles/next")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({
          clinicId: "clinic_1",
          doctorId: "doctor_1",
          expectedActiveCycleId: "cycle_2",
          notes: "Necesită clarificare ocluzie",
          reason: "CLARIFICATION",
        }));
        return Promise.resolve(createJsonResponse({
          ...cycleHistoryResponse,
          activeCycleId: "cycle_3",
          cycles: [
            ...cycleHistoryResponse.cycles.map((cycle) => cycle.id === "cycle_2" ? { ...cycle, closedAt: "2026-08-03T10:00:00.000Z", status: "CLOSED" } : cycle),
            {
              ...cycleHistoryResponse.cycles[1],
              cycleNumber: 3,
              id: "cycle_3",
              openedAt: "2026-08-03T10:00:00.000Z",
              reason: "CLARIFICATION",
              reasonNotes: "Necesită clarificare ocluzie",
              status: "ACTIVE",
            },
          ],
        }));
      }
      if (url.includes("/works/work_order_1/cycles")) {
        return Promise.resolve(createJsonResponse(cycleHistoryResponse));
      }
      if (url.includes("/works/work_order_1/workflow")) {
        return Promise.resolve(createJsonResponse(workflowResponse));
      }
      if (url.includes("/works/work_order_1")) {
        return Promise.resolve(createJsonResponse(workDetail));
      }
      if (url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse(doctorOptionsResponse));
      }
      if (url.includes("/works/work-type-options")) {
        return Promise.resolve(createJsonResponse(workTypeOptionsResponse));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/works?")) {
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    fireEvent.click(await screen.findByRole("button", { name: "Înregistrează proba" }));

    const dialog = await screen.findByRole("dialog", { name: "Înregistrează proba" });
    fireEvent.change(within(dialog).getByLabelText("Motiv probă"), { target: { value: "CLARIFICATION" } });
    fireEvent.change(within(dialog).getByLabelText("Note"), { target: { value: "Necesită clarificare ocluzie" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Înregistrează proba" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/works/work_order_1/cycles/next"), expect.objectContaining({ method: "POST" })));
  });

  it("saves real laboratory sheet drafts and marks complete with revision", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "cycles.history.read", scopes: ["ALL"] },
            { key: "cycles.read", scopes: ["ALL"] },
            { key: "work_forms.real.finalize", scopes: ["ALL"] },
            { key: "work_forms.real.read", scopes: ["ALL"] },
            { key: "work_forms.real.update", scopes: ["ALL"] },
            { key: "works.read_all", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.includes("/works/work_order_1/cycles/cycle_2/real-lab-sheet") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body).toMatchObject({
          expectedRevision: 1,
          saveMode: expect.stringMatching(/DRAFT|COMPLETE/),
          templateId: "template_real",
          templateVersion: 1,
        });
        return Promise.resolve(createJsonResponse({
          ...realLabSheetResponse,
          canFinalize: body.saveMode === "COMPLETE",
          revision: 2,
          status: body.saveMode === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS",
          values: body.values,
        }));
      }
      if (url.includes("/works/work_order_1/cycles/cycle_2/real-lab-sheet")) {
        return Promise.resolve(createJsonResponse(realLabSheetResponse));
      }
      if (url.includes("/works/work_order_1/cycles")) {
        return Promise.resolve(createJsonResponse(cycleHistoryResponse));
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
        return Promise.resolve(createJsonResponse(worksListResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorksPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Deschide" }));
    expect(await screen.findByRole("heading", { name: "Fișă laborator" })).toBeDefined();
    expect(await screen.findByLabelText("Observații")).toBeDefined();
    const saveDraftButton = await screen.findByRole("button", { name: "Salvează schița" });
    fireEvent.submit(saveDraftButton.closest("form") as HTMLFormElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/works/work_order_1/cycles/cycle_2/real-lab-sheet"),
      expect.objectContaining({ method: "PATCH" }),
    ));

    fireEvent.change(screen.getByLabelText("Observații"), { target: { value: "Ajustare ocluzie" } });
    fireEvent.click(screen.getByRole("button", { name: "Marchează completă" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/works/work_order_1/cycles/cycle_2/real-lab-sheet"),
      expect.objectContaining({ body: expect.stringContaining("\"saveMode\":\"COMPLETE\""), method: "PATCH" }),
    ));
  });
});
