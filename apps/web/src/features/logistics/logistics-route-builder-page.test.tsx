import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LogisticsRouteBuilderPage } from "./logistics-route-builder-page.js";

function renderWithProviders(component: ReactNode, initialEntries: readonly string[] = ["/routes"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[...initialEntries]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{component}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status } as Response;
}

describe("LogisticsRouteBuilderPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a mixed route in manual selection order", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: ["routes.create", "routes.read", "routes.assign", "logistics.center.read", "pickup.read"].map((key) => ({ key, scopes: ["ALL"] })) }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/couriers/options")) {
        return Promise.resolve(createJsonResponse([{ displayName: "Curier Test", id: "courier_1" }]));
      }
      if (url.includes("/logistics/center?")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            actions: {},
            billing: { documentId: null, documentNumber: null, documentStatus: null, label: "Nefacturat", paymentStatus: null },
            clinic: { id: "clinic_1", name: "Clinica Test" },
            createdAt: "2026-08-20T08:00:00.000Z",
            doctor: { id: "doctor_1", name: "Dr. Ana" },
            dueState: "ON_TRACK",
            id: "work_1",
            logistics: { status: "READY_FOR_DELIVERY", statusLabel: "Gata de livrare", version: 1 },
            patientName: "Ion Pop",
            patientReference: null,
            preparationGroup: null,
            priority: "NORMAL",
            requestedDeliveryDate: "2026-08-21T00:00:00.000Z",
            workCode: "WO-26-0001",
            workflow: { assignedUserName: "Tech", completedAt: null, currentStageName: null, progressCompleted: 1, progressTotal: 1, status: "COMPLETED" },
            workTypeName: "Zirconia",
          }],
          page: 1,
          pageCount: 1,
          pageSize: 100,
          total: 1,
        }));
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
      if (url.includes("/routes?")) {
        return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 20, total: 0 }));
      }
      if (url.endsWith("/routes") && init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        return Promise.resolve(createJsonResponse({ id: "route_1", stops: [], version: 1 }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<LogisticsRouteBuilderPage />);

    expect(await screen.findByRole("heading", { name: "Traseu" })).toBeDefined();
    fireEvent.click(await screen.findByRole("button", { name: "WO-26-0001 · Ion Pop" }));
    fireEvent.click(await screen.findByRole("button", { name: "Clinica Test · 09:30" }));
    fireEvent.change(screen.getByLabelText("Curier"), { target: { value: "courier_1" } });
    fireEvent.click(screen.getByRole("button", { name: "Expediază lista" }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({
      courierUserId: "courier_1",
      stops: [
        { type: "DELIVERY", workOrderId: "work_1" },
        { pickupRequestId: "pickup_1", type: "PICKUP" },
      ],
    });
  });

  it("loads a list from listId into the selected stops panel", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: ["routes.create", "routes.read", "logistics.center.read"].map((key) => ({ key, scopes: ["ALL"] })) }));
      }
      if (url.includes("/logistics/center?")) {
        return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 100, total: 0 }));
      }
      if (url.includes("/routes?")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            completedAt: null,
            courier: null,
            createdAt: "2026-08-21T08:00:00.000Z",
            id: "list_1",
            name: "Lista livrări și ridicări",
            notes: null,
            routeDate: "2026-08-21",
            routeNumber: "TR-260821-01",
            startedAt: null,
            status: "DRAFT",
            stops: [{ addressOverride: "Str. Test 1", failureReason: null, id: "stop_1", outcomeAt: null, outcomeByUserName: null, outcomeNotes: null, outcomeStatus: "PENDING", phoneOverride: null, pickupRequestId: null, stopNotes: null, stopOrder: 1, targetLabel: "WO-26-0001 · Ion Pop", type: "DELIVERY", workOrderId: "work_1" }],
            updatedAt: "2026-08-21T08:00:00.000Z",
            version: 1,
          }],
          page: 1,
          pageCount: 1,
          pageSize: 100,
          total: 1,
        }));
      }
      if (url.endsWith("/couriers/options")) return Promise.resolve(createJsonResponse([]));
      if (url.endsWith("/pickup-requests")) return Promise.resolve(createJsonResponse([]));
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<LogisticsRouteBuilderPage />, ["/routes?listId=list_1"]);

    expect(await screen.findByText("WO-26-0001 · Ion Pop")).toBeDefined();
    expect(screen.getByRole("button", { name: "Salvează lista" })).toBeDefined();
  });
});
