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
  resolvedAt: "2026-07-22T12:00:00.000Z",
  work: {
    clinicName: "Clinica Test",
    code: "WO-2026-000001",
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
      if (url.endsWith("/scan/resolve")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ payload: "WO-2026-000001", source: "manual" }));
        return Promise.resolve(createJsonResponse(scanContext));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<WorkScanPage />);

    fireEvent.change(await screen.findByLabelText("Cod scanat sau cod lucrare"), { target: { value: "WO-2026-000001" } });
    fireEvent.click(screen.getByRole("button", { name: "Caută lucrarea" }));

    expect(await screen.findByText("Lucrare găsită")).toBeDefined();
    expect(await screen.findByText("WO-2026-000001")).toBeDefined();
    expect(await screen.findByText("Flux standard")).toBeDefined();
    expect(await screen.findByText("Tehnician Demo")).toBeDefined();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/scan/resolve"), expect.anything()));
  });

  it("shows access denied without scan.use", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ permissions: [] })));

    renderWithProviders(<WorkScanPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });
});
