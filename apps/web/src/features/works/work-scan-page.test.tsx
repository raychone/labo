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

const workDetail = {
  baseUnitPriceMinor: null,
  clinicalNotes: null,
  clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
  code: "WO-2026-000001",
  createdAt: "2026-07-22T12:00:00.000Z",
  createdByUserId: "user_1",
  currency: null,
  doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
  externalReference: null,
  id: "work_order_1",
  internalNotes: null,
  patientName: "Ion Pop",
  patientReference: "P-100",
  priority: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "2026-08-01T00:00:00.000Z",
  status: "REGISTERED",
  totalPriceMinor: null,
  updatedAt: "2026-07-22T12:00:00.000Z",
  updatedByUserId: "user_1",
  version: 1,
  workType: { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu" },
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
          permissions: [{ key: "works.read_all", scopes: ["ALL"] }],
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/works/resolve-qr")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ payload: "WO-2026-000001", source: "manual" }));
        return Promise.resolve(createJsonResponse({ work: workDetail }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorkScanPage />);

    fireEvent.change(await screen.findByLabelText("Cod lucrare sau payload QR"), { target: { value: "WO-2026-000001" } });
    fireEvent.click(screen.getByRole("button", { name: "Cauta" }));

    expect(await screen.findByText("Lucrare gasita")).toBeDefined();
    expect(await screen.findByText("WO-2026-000001")).toBeDefined();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/works/resolve-qr"), expect.anything()));
  });

  it("shows access denied without works.read_all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ permissions: [] })));

    renderWithProviders(<WorkScanPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });
});
