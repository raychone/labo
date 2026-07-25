import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "./settings-page.js";

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
  addressLine1: "Strada Laboratorului 1",
  addressLine2: null,
  city: "București",
  companyRegistrationNumber: "J40/123/2026",
  countryCode: "RO",
  countyOrRegion: "București",
  createdAt: "2026-01-01T00:00:00.000Z",
  currency: "RON",
  documentFooter: "Mulțumim pentru colaborare.",
  email: "contact@example.test",
  id: "settings_1",
  laboratoryName: "Dental Lab",
  legalName: "Dental Lab SRL",
  locale: "ro-RO",
  logoFileKey: null,
  phone: "+40722111222",
  postalCode: "010101",
  primaryColor: "#0f766e",
  taxId: "RO123456",
  timezone: "Europe/Bucharest",
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedByUserId: "user_1",
  website: "https://example.test/",
};

describe("SettingsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders existing settings for a user with read and update permissions", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse(settingsResponse))
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [
          { key: "settings.read", scopes: ["ALL"] },
          { key: "settings.update", scopes: ["ALL"] },
        ],
      })));

    renderWithProviders(<SettingsPage />);

    expect(await screen.findByRole("heading", { name: "Setări laborator" })).toBeDefined();
    expect(await screen.findByDisplayValue("Dental Lab")).toBeDefined();
    expect(await screen.findByText("Europe/Bucharest")).toBeDefined();
    expect(await screen.findByRole("button", { name: "Salvează" })).toBeDefined();
  });

  it("shows read-only mode without settings.update", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse(settingsResponse))
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [
          { key: "settings.read", scopes: ["ALL"] },
        ],
      })));

    renderWithProviders(<SettingsPage />);

    expect(await screen.findByText("Ai acces de citire, dar nu poți modifica aceste setări.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Salvează" })).toBeNull();
  });

  it("renders an access error without settings.read", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse(settingsResponse))
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [],
      })));

    renderWithProviders(<SettingsPage />);

    expect(await screen.findByText("Acces refuzat")).toBeDefined();
  });
});
