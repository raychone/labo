import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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
  bankName: "Banca NC",
  city: "București",
  companyRegistrationNumber: "J40/123/2026",
  countryCode: "RO",
  countyOrRegion: "București",
  createdAt: "2026-01-01T00:00:00.000Z",
  currency: "RON",
  documentFooter: "Mulțumim pentru colaborare.",
  email: "contact@example.test",
  iban: "RO49AAAA1B31007593840000",
  laboratoryName: "Nicolaie Cristina",
  legalEntity: {
    code: "NC",
    displayName: "Nicolaie Cristina",
  },
  legalEntityCode: "NC",
  legalEntityDisplayName: "Nicolaie Cristina",
  legalName: "NC Demo Tehnică Dentară",
  logoFileKey: null,
  phone: "+40722111222",
  postalCode: "010101",
  taxId: "RO123456",
  updatedAt: "2026-01-01T00:00:00.000Z",
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

    expect(await screen.findByRole("heading", { name: "Setări firmă" })).toBeDefined();
    expect(await screen.findByText("NC — Nicolaie Cristina")).toBeDefined();
    expect(await screen.findByDisplayValue("NC Demo Tehnică Dentară")).toBeDefined();
    expect(await screen.findByDisplayValue("RO49AAAA1B31007593840000")).toBeDefined();
    expect(await screen.findByDisplayValue("Mulțumim pentru colaborare.")).toBeDefined();
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

  it("saves company-aware settings and mentions the active company", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(settingsResponse))
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [
          { key: "settings.read", scopes: ["ALL"] },
          { key: "settings.update", scopes: ["ALL"] },
        ],
      }))
      .mockResolvedValueOnce(createJsonResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(createJsonResponse({
        ...settingsResponse,
        legalName: "NC Actualizat",
      }))
      .mockResolvedValueOnce(createJsonResponse({
        ...settingsResponse,
        legalName: "NC Actualizat",
      }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<SettingsPage />);

    const legalName = await screen.findByLabelText("Denumire juridică");
    fireEvent.change(legalName, { target: { value: "NC Actualizat" } });
    fireEvent.click(await screen.findByRole("button", { name: "Salvează" }));

    expect(await screen.findByText("Setările pentru Nicolaie Cristina au fost salvate.")).toBeDefined();
    const patchCall = fetchMock.mock.calls.find((call) => {
      const init = call[1] as RequestInit | undefined;
      return init?.method === "PATCH";
    });
    expect(patchCall).toBeDefined();
    expect((patchCall?.[1] as RequestInit).body).not.toContain("legalEntityCode");
  });
});
