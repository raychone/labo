import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClinicsPage } from "./clinics-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{component}</ToastProvider>
    </QueryClientProvider>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

const clinicSummary = {
  city: "Bucuresti",
  code: "CL-0001",
  contactPersonName: "Ana Reception",
  createdAt: "2026-01-01T00:00:00.000Z",
  email: "clinic@example.test",
  id: "clinic_1",
  isActive: true,
  name: "Clinica Test",
  phone: "+40722111222",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const clinicsResponse = {
  items: [clinicSummary],
  page: 1,
  pageCount: 1,
  pageSize: 20,
  total: 1,
};

const clinicOptionsResponse = [
  { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
  { code: "CL-0002", id: "clinic_2", name: "Clinica Noua" },
];

const doctorOptionsResponse = [
  { clinicId: "clinic_1", displayName: "Dr. Ana Popescu", id: "doctor_1" },
];

describe("ClinicsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders clinic management and resets doctor selection when clinic changes", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "clinics.create", scopes: ["ALL"] },
            { key: "clinics.read", scopes: ["ALL"] },
            { key: "doctors.read", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.includes("/clinics/options")) {
        return Promise.resolve(createJsonResponse(clinicOptionsResponse));
      }
      if (url.includes("/doctors/options")) {
        return Promise.resolve(createJsonResponse(doctorOptionsResponse));
      }
      if (url.includes("/clinics?")) {
        return Promise.resolve(createJsonResponse(clinicsResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<ClinicsPage />);

    expect(await screen.findByRole("heading", { name: "Clinici și medici" })).toBeDefined();
    expect(await screen.findByText("Clinica Test")).toBeDefined();

    const clinicSelect = await screen.findByLabelText("Clinică");
    const doctorSelect = await screen.findByLabelText("Medic");

    fireEvent.change(clinicSelect, { target: { value: "clinic_1" } });
    await screen.findByRole("option", { name: "Dr. Ana Popescu" });
    fireEvent.change(doctorSelect, { target: { value: "doctor_1" } });
    expect(doctorSelect).toHaveProperty("value", "doctor_1");

    fireEvent.change(clinicSelect, { target: { value: "clinic_2" } });
    await waitFor(() => expect(doctorSelect).toHaveProperty("value", ""));
  });

  it("shows an access error without clinics.read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ permissions: [] })));

    renderWithProviders(<ClinicsPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });
});
