import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationContextSwitch } from "./organization-context-switch.js";
import { registerOrganizationContextSwitchGuard } from "./organization-context-switch-guards.js";

function renderWithProviders(canRead = true): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <OrganizationContextSwitch canRead={canRead} />
      </ToastProvider>
    </QueryClientProvider>,
  );

  return queryClient;
}

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe("OrganizationContextSwitch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders read-only active context for users without switch permission", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({
      active: {
        code: "CDT",
        displayName: "Nicolaie Cristina",
      },
      available: [
        { code: "CDT", displayName: "Nicolaie Cristina" },
        { code: "NG", displayName: "Nicolaie Gabriel" },
      ],
      canSwitch: false,
    })));

    renderWithProviders();

    expect(await screen.findByText("CDT")).toBeDefined();
    expect(screen.getAllByText("Nicolaie Cristina")).toHaveLength(1);
    expect(screen.queryByRole("radio", { name: "NG — Nicolaie Gabriel" })).toBeNull();
  });

  it("does not fetch or render when read permission is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(false);

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(screen.queryByText("Firmă activă")).toBeNull();
  });

  it("confirms dirty settings before switching and invalidates only settings", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/organization-context") && init?.method === "PUT") {
        return Promise.resolve(createJsonResponse({
          active: { code: "NG", displayName: "Nicolaie Gabriel" },
          available: [
            { code: "CDT", displayName: "Nicolaie Cristina" },
            { code: "NG", displayName: "Nicolaie Gabriel" },
          ],
          canSwitch: true,
        }));
      }

      return Promise.resolve(createJsonResponse({
        active: { code: "CDT", displayName: "Nicolaie Cristina" },
        available: [
          { code: "CDT", displayName: "Nicolaie Cristina" },
          { code: "NG", displayName: "Nicolaie Gabriel" },
        ],
        canSwitch: true,
      }));
    });
    const unregister = registerOrganizationContextSwitchGuard(() => "Ai modificări nesalvate pentru Nicolaie Cristina. Schimbi firma și pierzi modificările?");
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = renderWithProviders();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(await screen.findByRole("radio", { name: "NG — Nicolaie Gabriel" }));
    expect(await screen.findByText("Ai modificări nesalvate pentru Nicolaie Cristina. Schimbi firma și pierzi modificările?")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Renunță" }));
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringMatching(/\/organization-context$/), expect.objectContaining({ method: "PUT" }));

    fireEvent.click(await screen.findByRole("radio", { name: "NG — Nicolaie Gabriel" }));
    fireEvent.click(await screen.findByRole("button", { name: "Schimbă firma" }));

    await waitFor(() => expect(screen.getByRole("radio", { name: "NG — Nicolaie Gabriel" }).getAttribute("aria-checked")).toBe("true"));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["settings"] });
    expect(invalidateSpy).not.toHaveBeenCalledWith();
    unregister();
  });
});
