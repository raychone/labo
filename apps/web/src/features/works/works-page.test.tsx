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
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
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
  payload: "dl-work:secure_token_12345678901234567890",
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
      if (url.includes("/works/work_order_1/qr")) {
        return Promise.resolve(createJsonResponse(qrResponse));
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
    await waitFor(() => expect(within(dialog).getAllByText("WO-2026-000001")).toHaveLength(2));
    expect(await within(dialog).findByText("P-100")).toBeDefined();
    expect(screen.queryByText("dl-work:secure_token_12345678901234567890")).toBeNull();
  });
});
