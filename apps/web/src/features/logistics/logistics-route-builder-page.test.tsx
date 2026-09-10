import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  return { json: async () => body, text: async () => JSON.stringify(body), ok: status >= 200 && status < 300, status } as Response;
}

describe("LogisticsRouteBuilderPage", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a mixed route in manual selection order", async () => {
    const posts: unknown[] = [];
    const routeQueries: string[] = [];
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
            logistics: { status: "RECEIVED", statusLabel: "Recepționată", version: 1 },
            logisticsActionReasons: ["READY_FOR_FINAL_DELIVERY"],
            requiresLogisticsAction: true,
            patientName: "Ion Pop",
            patientReference: null,
            preparationGroup: null,
            priority: "NORMAL",
            technicalReadiness: "FINAL_READY",
            requiresDelivery: true,
            requiresPickup: false,
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
        routeQueries.push(url);
        return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 20, total: 0 }));
      }
      if (url.endsWith("/routes") && init?.method === "POST") {
        posts.push(JSON.parse(String(init.body)));
        return Promise.resolve(createJsonResponse({ id: "route_1", stops: [], version: 1 }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    const { container } = renderWithProviders(<LogisticsRouteBuilderPage />);

    expect(await screen.findByRole("heading", { name: "Trasee" })).toBeDefined();
    expect(container.querySelector(".logistics-page__route-workspace")).not.toBeNull();
    const deliveryCandidate = await screen.findByRole("button", { name: "WO-26-0001 · Ion Pop" });
    expect(screen.getByText("Livrarea nu are adresă și număr de telefon.")).toBeDefined();
    fireEvent.click(deliveryCandidate);
    await waitFor(() => expect(container.querySelectorAll(".logistics-page__selected-stop")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Scoate" }));
    expect(screen.getByText("Nu ai selectat nicio oprire.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Ridicări 1" }));
    expect(screen.getByRole("button", { name: "Clinica Test · 09:30" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Toate 2" }));

    fireEvent.click(await screen.findByRole("button", { name: "WO-26-0001 · Ion Pop" }));
    fireEvent.click(await screen.findByRole("button", { name: "Clinica Test · 09:30" }));
    await waitFor(() => expect(container.querySelectorAll(".logistics-page__selected-stop")).toHaveLength(2));
    const stopLabels = () => [...container.querySelectorAll(".logistics-page__selected-stop")].map((stop) => stop.textContent);
    expect(stopLabels()[0]).toContain("WO-26-0001 · Ion Pop");
    expect(stopLabels()[1]).toContain("Clinica Test · 09:30");
    fireEvent.click(screen.getByRole("button", { name: "Mută oprirea 2 mai sus" }));
    expect(stopLabels()[0]).toContain("Clinica Test · 09:30");
    fireEvent.click(screen.getByRole("button", { name: "Mută oprirea 1 mai jos" }));
    expect(stopLabels()[0]).toContain("WO-26-0001 · Ion Pop");
    fireEvent.click(screen.getByRole("button", { name: "Creează traseu curier" }));
    expect(screen.getByText("Alege un curier pentru acest traseu.")).toBeDefined();
    expect(posts).toHaveLength(0);
    fireEvent.focus(screen.getByLabelText("Curier"));
    fireEvent.click(await screen.findByRole("option", { name: "Curier Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Creează traseu curier" }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(routeQueries.some((url) => url.includes("exactDate=") && url.includes("pageSize=100"))).toBe(true);
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
    expect(screen.getByRole("button", { name: "Salvează modificările" })).toBeDefined();
  });

  it("keeps completed and cancelled routes in a collapsed, read-only history instead of the active register", async () => {
    const route = (id: string, routeNumber: string, status: "ASSIGNED" | "COMPLETED" | "CANCELLED") => ({
      completedAt: status === "COMPLETED" ? "2026-08-21T12:00:00.000Z" : null,
      courier: { id: "courier_1", name: "Curier Test" },
      createdAt: "2026-08-21T08:00:00.000Z",
      id,
      name: status === "ASSIGNED" ? "Activ" : status === "COMPLETED" ? "Finalizat" : "Anulat",
      notes: null,
      routeDate: "2026-08-21",
      routeNumber,
      startedAt: status === "COMPLETED" ? "2026-08-21T09:00:00.000Z" : null,
      status,
      stops: [{ addressOverride: "Str. Test 1", failureReason: null, id: `stop_${id}`, outcomeAt: status === "COMPLETED" ? "2026-08-21T11:00:00.000Z" : null, outcomeByUserName: status === "COMPLETED" ? "Curier Test" : null, outcomeNotes: null, outcomeStatus: status === "COMPLETED" ? "DELIVERED" : "PENDING", phoneOverride: "0700000000", pickupRequestId: null, stopNotes: null, stopOrder: 1, targetLabel: `${routeNumber} · Pacient`, type: "DELIVERY", workOrderId: `work_${id}` }],
      updatedAt: "2026-08-21T12:00:00.000Z",
      version: 1,
    });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) return Promise.resolve(createJsonResponse({ permissions: ["routes.read", "logistics.center.read", "pickup.read"].map((key) => ({ key, scopes: ["ALL"] })) }));
      if (url.includes("/logistics/center?")) return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 100, total: 0 }));
      if (url.includes("/routes?")) return Promise.resolve(createJsonResponse({ items: [route("route_active", "TR-ACTIV", "ASSIGNED"), route("route_completed", "TR-FINALIZAT", "COMPLETED"), route("route_cancelled", "TR-ANULAT", "CANCELLED")], page: 1, pageCount: 1, pageSize: 100, total: 3 }));
      if (url.endsWith("/couriers/options") || url.endsWith("/pickup-requests")) return Promise.resolve(createJsonResponse([]));
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<LogisticsRouteBuilderPage />);

    expect(await screen.findByText("TR-ACTIV · Activ", { selector: "strong" })).toBeDefined();
    const editRouteButton = screen.getByRole("button", { name: "Editează traseul" });
    expect(screen.getAllByRole("button", { name: "Printează traseul" })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Editează lista selectată" })).toBeNull();
    const printWindow = { close: vi.fn(), document: { close: vi.fn(), write: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    const openWindow = vi.spyOn(window, "open").mockReturnValue(printWindow as never);
    fireEvent.click(screen.getAllByRole("button", { name: "Printează traseul" })[0]!);
    expect(openWindow).toHaveBeenCalled();
    expect(printWindow.document.write).toHaveBeenCalled();
    fireEvent.click(editRouteButton);
    expect(await screen.findByDisplayValue("Activ")).toBeDefined();
    const historySummary = screen.getByText("Istoric trasee · 2");
    const history = historySummary.closest("details");
    expect(history?.open).toBe(false);
    expect(history?.textContent).toContain("TR-FINALIZAT · Finalizat");
    expect(history?.textContent).toContain("TR-ANULAT · Anulat");
    fireEvent.click(historySummary);
    expect(screen.getAllByRole("button", { name: "Printează traseul" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Editează traseul" })).toHaveLength(1);
  });

  it("shows an in-progress route outside the selected date so Logistics can finish the route that blocks a new start", async () => {
    const blockingRoute = {
      completedAt: null,
      courier: null,
      createdAt: "2026-08-18T08:00:00.000Z",
      id: "route_blocking",
      name: "Traseu blocant",
      notes: null,
      routeDate: "2026-08-18",
      routeNumber: "TR-BLOCAT",
      startedAt: "2026-08-18T09:00:00.000Z",
      status: "IN_PROGRESS" as const,
      stops: [{ addressOverride: "Str. Test 1", failureReason: null, id: "stop_blocking", outcomeAt: null, outcomeByUserName: null, outcomeNotes: null, outcomeStatus: "PENDING" as const, phoneOverride: "0700000000", pickupRequestId: null, stopNotes: null, stopOrder: 1, targetLabel: "WO-26-0001 · Ion Pop", type: "DELIVERY" as const, workOrderId: "work_1" }],
      updatedAt: "2026-08-18T09:00:00.000Z",
      version: 1,
    };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) return Promise.resolve(createJsonResponse({ permissions: ["routes.read", "routes.execute_own", "logistics.center.read"].map((key) => ({ key, scopes: ["ALL"] })) }));
      if (url.includes("/logistics/center?")) return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 100, total: 0 }));
      if (url.includes("/routes?") && url.includes("status=IN_PROGRESS")) return Promise.resolve(createJsonResponse({ items: [blockingRoute], page: 1, pageCount: 1, pageSize: 100, total: 1 }));
      if (url.includes("/routes?")) return Promise.resolve(createJsonResponse({ items: [], page: 1, pageCount: 1, pageSize: 100, total: 0 }));
      if (url.endsWith("/couriers/options") || url.endsWith("/pickup-requests")) return Promise.resolve(createJsonResponse([]));
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<LogisticsRouteBuilderPage />);

    fireEvent.click(await screen.findByRole("tab", { name: "Trasee logistică 0" }));
    expect(await screen.findByRole("heading", { name: "Traseu în desfășurare" })).toBeDefined();
    expect(screen.getByText("TR-BLOCAT · Traseu blocant", { selector: "strong" })).toBeDefined();
    expect(screen.getByText("Finalizează opririle acestui traseu înainte de a porni unul nou. Este afișat chiar dacă are altă dată decât filtrul curent.")).toBeDefined();
  });
});
