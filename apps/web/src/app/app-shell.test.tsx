import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthenticatedAppShell } from "./authenticated-app-shell.js";
import { PermissionRoute } from "./route-guards.js";

function renderWithProviders(component: ReactNode, initialEntries = ["/works"]): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <MemoryRouter initialEntries={initialEntries}>
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

function createFetchMock(permissions: readonly string[]) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return Promise.resolve(createJsonResponse({
        user: {
          displayName: "Development Manager",
          email: "manager.dev@example.test",
          id: "user_1",
        },
      }));
    }
    if (url.endsWith("/auth/permissions")) {
      return Promise.resolve(createJsonResponse({
        permissions: permissions.map((key) => ({ key, scopes: ["ALL"] })),
      }));
    }
    if (url.endsWith("/settings")) {
      return Promise.resolve(createJsonResponse({
        laboratoryName: "Laborator Test",
        primaryColor: "#14532d",
      }));
    }

    return Promise.resolve(createJsonResponse({}, 404));
  });
}

describe("AuthenticatedAppShell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders permission-aware navigation and active route", async () => {
    vi.stubGlobal("fetch", createFetchMock(["works.read_all", "settings.read"]));

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Works content</div>} path="works" />
        </Route>
      </Routes>,
    );

    await waitFor(() => expect(screen.getAllByText("Laborator Test").length).toBeGreaterThan(0), { timeout: 5_000 });
    await waitFor(() => expect(screen.getAllByText("Lucrări").length).toBeGreaterThan(0), { timeout: 5_000 });
    expect(screen.queryByText("Utilizatori")).toBeNull();
    expect(screen.getByRole("link", { name: /Lucrări/ }).getAttribute("aria-current")).toBe("page");
  });

  it("opens and closes the mobile drawer with Escape", async () => {
    vi.stubGlobal("fetch", createFetchMock(["works.read_all"]));

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Works content</div>} path="works" />
        </Route>
      </Routes>,
    );

    const menuButton = await screen.findByRole("button", { name: "Deschide navigația" });
    fireEvent.click(menuButton);
    expect(await screen.findByRole("dialog", { name: "Navigație" })).toBeDefined();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Navigație" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigație" })).toBeNull());
  });
});

describe("PermissionRoute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders 403 redirect without logging out for missing permissions", async () => {
    vi.stubGlobal("fetch", createFetchMock(["works.read_all"]));

    renderWithProviders(
      <Routes>
        <Route
          element={(
            <PermissionRoute requiredPermissions={["users.read"]}>
              <div>Users page</div>
            </PermissionRoute>
          )}
          path="/users"
        />
        <Route element={<div>Forbidden page</div>} path="/forbidden" />
      </Routes>,
      ["/users"],
    );

    expect(await screen.findByText("Forbidden page")).toBeDefined();
    expect(screen.queryByText("Users page")).toBeNull();
  });
});
