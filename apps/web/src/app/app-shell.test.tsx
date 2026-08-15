import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthenticatedAppShell } from "./authenticated-app-shell.js";
import { PermissionRoute } from "./route-guards.js";
import { BillingArchivePage } from "../features/billing/billing-archive-page.js";

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
  let activeCode = "NC";

  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
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
    if (url.endsWith("/auth/csrf")) {
      return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
    }
    if (url.endsWith("/organization-context") && init?.method === "PUT") {
      const body = JSON.parse(String(init.body)) as { readonly code: string };
      activeCode = body.code;

      return Promise.resolve(createJsonResponse({
        active: {
          code: activeCode,
          displayName: activeCode === "NG" ? "Nicolaie Gabriel" : "Nicolaie Cristina",
        },
        available: [
          { code: "NC", displayName: "Nicolaie Cristina" },
          { code: "NG", displayName: "Nicolaie Gabriel" },
        ],
        canSwitch: true,
      }));
    }
    if (url.endsWith("/organization-context")) {
      return Promise.resolve(createJsonResponse({
        active: {
          code: activeCode,
          displayName: activeCode === "NG" ? "Nicolaie Gabriel" : "Nicolaie Cristina",
        },
        available: [
          { code: "NC", displayName: "Nicolaie Cristina" },
          { code: "NG", displayName: "Nicolaie Gabriel" },
        ],
        canSwitch: true,
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
          <Route element={<div>Dashboard content</div>} path="dashboard" />
        </Route>
      </Routes>,
      ["/dashboard"],
    );

    await waitFor(() => expect(screen.getAllByText("Laborator Test").length).toBeGreaterThan(0), { timeout: 5_000 });
    await waitFor(() => expect(screen.getAllByText("Status").length).toBeGreaterThan(0), { timeout: 5_000 });
    expect(screen.getByRole("link", { name: /Status/ })).toBeDefined();
    expect(screen.queryByText("Lucrări")).toBeNull();
    expect(screen.queryByText("Scanare")).toBeNull();
    expect(screen.queryByText("Centru operațional")).toBeNull();
  });

  it("renders technician navigation when permissions are scoped rather than ALL", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return Promise.resolve(createJsonResponse({
          user: {
            displayName: "Development Technician",
            email: "tehnician.dev@example.test",
            id: "user_2",
          },
        }));
      }
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "scan.use", scopes: ["ASSIGNED"] },
            { key: "technician.workbench.read", scopes: ["ASSIGNED"] },
            { key: "works.read_assigned", scopes: ["OWN_STAGE"] },
          ],
        }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Dashboard content</div>} path="dashboard" />
        </Route>
      </Routes>,
      ["/dashboard"],
    );

    await waitFor(() => expect(screen.getByRole("link", { name: /Status/ })).toBeDefined());
    expect(screen.getByRole("link", { name: /Scanare/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Lucrările mele/ })).toBeDefined();
    expect(screen.queryByText("Utilizatori")).toBeNull();
  });

  it("prefers the reception role label when reception and logistics permissions overlap", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return Promise.resolve(createJsonResponse({
          user: {
            displayName: "Demo Receptie",
            email: "receptie@demo.local",
            id: "user_reception",
          },
        }));
      }
      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({
          permissions: [
            { key: "scan.use", scopes: ["ALL"] },
            { key: "works.create", scopes: ["ALL"] },
            { key: "logistics.center.read", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({
          laboratoryName: "Laborator Test",
          primaryColor: "#14532d",
        }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Dashboard content</div>} path="dashboard" />
        </Route>
      </Routes>,
      ["/dashboard"],
    );

    await waitFor(() => expect(screen.getByText("Recepție")).toBeDefined());
    expect(screen.queryByText("Logistică")).toBeNull();
    expect(screen.getByRole("button", { name: "Deconectare" })).toBeDefined();
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

  it("renders and switches the organization context for managers", async () => {
    const fetchMock = createFetchMock(["works.read_all", "settings.read", "organization_context.read", "organization_context.switch"]);
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Works content</div>} path="works" />
        </Route>
      </Routes>,
    );

    expect(await screen.findByRole("radio", { name: "NC" })).toBeDefined();
    expect((await screen.findByRole("radio", { name: "NC" })).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "NG" }));

    await waitFor(() => expect(screen.getByRole("radio", { name: "NG" }).getAttribute("aria-checked")).toBe("true"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/organization-context$/), expect.objectContaining({
      method: "PUT",
    }));
    expect(screen.getByText("Works content")).toBeDefined();
  });

  it("does not render organization context without read permission", async () => {
    vi.stubGlobal("fetch", createFetchMock(["works.read_all"]));

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Works content</div>} path="works" />
        </Route>
      </Routes>,
    );

    await screen.findByText("Works content");
    expect(screen.queryByText("Firmă activă")).toBeNull();
  });

  it("renders the billing archive workspace inside the authenticated shell", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
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
          permissions: [
            { key: "finance.read_reports", scopes: ["ALL"] },
            { key: "settings.read", scopes: ["ALL"] },
          ],
        }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({
          laboratoryName: "Laborator Test",
          legalEntityCode: "NC",
          legalEntityDisplayName: "Nicolaie Cristina",
          locale: "ro-RO",
          primaryColor: "#14532d",
        }));
      }
      if (url.endsWith("/billing/month-registry/archives")) {
        return Promise.resolve(createJsonResponse({ items: [] }));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<BillingArchivePage />} path="billing/archive" />
        </Route>
      </Routes>,
      ["/billing/archive?year=2026"],
    );

    await waitFor(() => expect(screen.getByRole("navigation", { name: "Navigație principală" })).toBeDefined());
    expect(screen.getByRole("button", { name: "Deconectare" })).toBeDefined();
    expect(screen.getAllByText("Arhivă facturare").length).toBeGreaterThan(0);
  });

  it("asks for confirmation before logging out", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
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
          permissions: [{ key: "works.read_all", scopes: ["ALL"] }],
        }));
      }
      if (url.endsWith("/settings")) {
        return Promise.resolve(createJsonResponse({
          laboratoryName: "Laborator Test",
          primaryColor: "#14532d",
        }));
      }
      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createJsonResponse({ csrfToken: "csrf-token" }));
      }
      if (url.endsWith("/auth/logout")) {
        return Promise.resolve(createJsonResponse({}, 204));
      }
      return Promise.resolve(createJsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedAppShell />} path="/">
          <Route element={<div>Works content</div>} path="works" />
        </Route>
      </Routes>,
      ["/works"],
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Deconectare" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Deconectare" }));
    expect(await screen.findByRole("dialog", { name: "Confirmă deconectarea" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Renunță" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Confirmă deconectarea" })).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Deconectare" }));
    fireEvent.click(await screen.findByRole("button", { name: "Deconectează-te" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/logout$/), expect.objectContaining({
      method: "POST",
    })));
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
