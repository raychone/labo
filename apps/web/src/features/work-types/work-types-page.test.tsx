import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkTypesPage } from "./work-types-page.js";

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

const settingsResponse = {
  addressLine1: null,
  addressLine2: null,
  city: null,
  companyRegistrationNumber: null,
  countryCode: "RO",
  countyOrRegion: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  currency: "RON",
  documentFooter: null,
  email: null,
  id: "settings_1",
  laboratoryName: "Dental Lab",
  legalName: null,
  locale: "ro-RO",
  logoFileKey: null,
  phone: null,
  postalCode: null,
  primaryColor: "#0f766e",
  taxId: null,
  timezone: "Europe/Bucharest",
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedByUserId: "user_1",
  website: null,
};

const workType = {
  basePriceMinor: 35000,
  code: "WT-0001",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: "Coroana zirconiu",
  id: "work_type_1",
  isActive: true,
  name: "Coroana zirconiu",
  symbol: "Zr",
  unit: "UNIT",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("WorkTypesPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the manager catalog and active options", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "pricing.create", scopes: ["ALL"] },
            { key: "pricing.read", scopes: ["ALL"] },
            { key: "pricing.update", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse(settingsResponse));
      }
      if (url.includes("/work-types/options")) {
        return Promise.resolve(createJsonResponse([workType]));
      }
      if (url.includes("/work-types?")) {
        return Promise.resolve(createJsonResponse({ items: [workType], page: 1, pageCount: 1, pageSize: 20, total: 1 }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorkTypesPage />);

    expect(await screen.findByRole("heading", { name: "Tipuri de lucrări" })).toBeDefined();
    expect(await screen.findByText("WT-0001")).toBeDefined();
    expect(await screen.findByText("Coroana zirconiu")).toBeDefined();
    expect(await screen.findByRole("option", { name: /Coroana zirconiu · Zr/ })).toBeDefined();
    expect(await screen.findByRole("button", { name: "Adaugă tip de lucrare" })).toBeDefined();
  });

  it("shows read-only copy without pricing.update", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: [{ key: "pricing.read", scopes: ["ALL"] }] }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse(settingsResponse));
      }
      if (url.includes("/work-types/options")) {
        return Promise.resolve(createJsonResponse([workType]));
      }
      if (url.includes("/work-types?")) {
        return Promise.resolve(createJsonResponse({ items: [workType], page: 1, pageCount: 1, pageSize: 20, total: 1 }));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorkTypesPage />);

    expect(await screen.findByText("Ai acces de citire, dar nu poți modifica prețuri sau tipuri de lucrări.")).toBeDefined();
  });

  it("shows an access error without pricing.read", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: [] }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse(settingsResponse));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorkTypesPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });
});
