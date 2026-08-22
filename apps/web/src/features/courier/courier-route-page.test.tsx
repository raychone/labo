import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CourierRoutePage } from "./courier-route-page.js";

function renderWithProviders(component: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{component}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return { json: async () => body, ok: status >= 200 && status < 300, status } as Response;
}

describe("CourierRoutePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows assigned route stops and records a delivery outcome", async () => {
    const posts: unknown[] = [];
    let started = false;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: ["routes.read", "routes.execute_own"].map((key) => ({ key, scopes: ["OWN_DELIVERY"] })) }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/routes/route_1/start") && init?.method === "POST") {
        started = true;
        posts.push({ type: "start" });
        return Promise.resolve(createJsonResponse({ id: "route_1", status: "IN_PROGRESS", version: 2 }));
      }
      if (url.includes("/routes?")) {
        return Promise.resolve(createJsonResponse({
          items: [{
            completedAt: null,
            courier: { id: "courier_1", name: "Curier Test" },
            createdAt: "2026-08-20T10:00:00.000Z",
            id: "route_1",
            name: "Traseu 1",
            notes: null,
            routeDate: "2026-08-21",
            routeNumber: "TR-260821-01",
            startedAt: null,
            status: started ? "IN_PROGRESS" : "ASSIGNED",
            stops: [
              { failureReason: null, id: "stop_1", outcomeAt: null, outcomeByUserName: null, outcomeNotes: null, outcomeStatus: "PENDING", pickupRequestId: null, stopOrder: 1, targetLabel: "WO-26-0001 · Ion Pop", type: "DELIVERY", workOrderId: "work_1" },
              { failureReason: null, id: "stop_2", outcomeAt: null, outcomeByUserName: null, outcomeNotes: null, outcomeStatus: "PENDING", pickupRequestId: "pickup_1", stopOrder: 2, targetLabel: "Clinica Test · 09:30", type: "PICKUP", workOrderId: null },
            ],
            updatedAt: "2026-08-20T10:00:00.000Z",
            version: 1,
          }],
          page: 1,
          pageCount: 1,
          pageSize: 30,
          total: 1,
        }));
      }
      if (url.endsWith("/routes/route_1/stops/stop_1/outcome") && init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        return Promise.resolve(createJsonResponse({ id: "route_1", stops: [], version: 2 }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<CourierRoutePage />);

    expect(await screen.findByRole("heading", { name: "Trasee" })).toBeDefined();
    expect(await screen.findByText("WO-26-0001 · Ion Pop")).toBeDefined();
    expect(screen.getByText("Clinica Test · 09:30")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Începe traseul" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Livrat" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Livrat" }));

    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[0]).toMatchObject({ type: "start" });
    expect(posts[1]).toMatchObject({ outcomeStatus: "DELIVERED" });
  });
});
