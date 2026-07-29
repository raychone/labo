import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationContextSwitch } from "./organization-context-switch.js";

function renderWithProviders(canRead = true): void {
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
        code: "NC",
        displayName: "Nicolaie Cristina",
      },
      available: [
        { code: "NC", displayName: "Nicolaie Cristina" },
        { code: "NG", displayName: "Nicolaie Gabriel" },
      ],
      canSwitch: false,
    })));

    renderWithProviders();

    expect(await screen.findByText("NC")).toBeDefined();
    expect(screen.getAllByText("Nicolaie Cristina")).toHaveLength(2);
    expect(screen.queryByRole("radio", { name: "NG" })).toBeNull();
  });

  it("does not fetch or render when read permission is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(false);

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(screen.queryByText("Firmă activă")).toBeNull();
  });
});
