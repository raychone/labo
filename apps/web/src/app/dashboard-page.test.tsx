import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "./dashboard-page.js";

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

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return Promise.resolve(createJsonResponse({
        user: {
          displayName: "Manager Test",
          email: "manager@example.test",
          id: "user_1",
        },
      }));
    }
    if (url.endsWith("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({
        permissions: [
          { key: "finance.read", scopes: ["ALL"] },
          { key: "invoice.read", scopes: ["ALL"] },
          { key: "pricing.read", scopes: ["ALL"] },
          { key: "scan.use", scopes: ["ALL"] },
          { key: "settings.read", scopes: ["ALL"] },
          { key: "technician.workbench.read", scopes: ["ALL"] },
          { key: "works.create", scopes: ["ALL"] },
          { key: "works.read_all", scopes: ["ALL"] },
        ],
      }));
    }
    if (url.endsWith("/settings")) {
      return Promise.resolve(createJsonResponse({ laboratoryName: "Laborator Test" }));
    }
    if (url.includes("/works?")) {
      return Promise.resolve(createJsonResponse({
        deadlineDashboard: {
          completedOnTimeLast7Days: 3,
          dueToday: 2,
          dueTomorrow: 1,
          late: 4,
          manual: 0,
          next7Days: 7,
          unresolved: 1,
        },
        items: [],
        page: 1,
        pageCount: 1,
        pageSize: 1,
        total: 0,
      }));
    }
    if (url.includes("/billing/overview")) {
      return Promise.resolve(createJsonResponse({
        currency: "RON",
        documentCount: 2,
        from: "2026-08-01",
        groups: [],
        invoiceCount: 1,
        openProformaCount: 0,
        overdueInvoiceCount: 1,
        outstandingMinor: 10000,
        paidMinor: 0,
        paidInvoiceCount: 0,
        partialInvoiceCount: 0,
        proformaMinor: 0,
        to: "2026-08-31",
        totalIssuedMinor: 10000,
        unpaidInvoiceCount: 1,
        uninvoicedMinor: 20000,
        uninvoicedWorkCount: 5,
        workValueMinor: 30000,
      }));
    }
    if (url.includes("/technician/workbench")) {
      return Promise.resolve(createJsonResponse({
        items: [],
        page: 1,
        pageCount: 1,
        pageSize: 1,
        summary: {
          dueToday: 1,
          inProgress: 2,
          overdue: 3,
          totalActive: 6,
          unstarted: 1,
          urgent: 1,
        },
        total: 0,
      }));
    }

    return Promise.resolve(createJsonResponse({}, 404));
  });
}

describe("DashboardPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders permission-aware manager, reception and technician workspaces", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "Acasă" })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Manager" })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Recepție" })).toBeDefined();
    expect(await screen.findByRole("heading", { name: "Tehnician" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Lucrare nouă" })).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Facturare" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Întârziate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nefacturate").length).toBeGreaterThan(0);
  });
});
