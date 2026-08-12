import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UsersPage } from "./users-page.js";

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

const rolesResponse = {
  roles: [
    {
      description: "Manager role.",
      isActive: true,
      isSystem: true,
      key: "MANAGER",
      name: "Manager",
    },
  ],
};

const usersResponse = {
  items: [
    {
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Development Manager",
      email: "manager.dev@example.test",
      id: "user_1",
      isActive: true,
      mustChangePassword: false,
      preferredColor: "#0f766e",
      roles: [{ key: "MANAGER", name: "Manager" }],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  page: 1,
  pageCount: 1,
  pageSize: 10,
  total: 1,
};

describe("UsersPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the user list with filters and role data", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [
          { key: "users.create", scopes: ["ALL"] },
          { key: "users.read", scopes: ["ALL"] },
          { key: "users.update", scopes: ["ALL"] },
        ],
      }))
      .mockResolvedValueOnce(createJsonResponse(rolesResponse))
      .mockResolvedValueOnce(createJsonResponse(usersResponse)));

    renderWithProviders(<UsersPage />);

    expect(await screen.findByRole("heading", { name: "Utilizatori" })).toBeDefined();
    expect(await screen.findByText("Development Manager")).toBeDefined();
    expect(await screen.findByText("manager.dev@example.test")).toBeDefined();
    expect(await screen.findByRole("button", { name: "Adaugă utilizator" })).toBeDefined();
    expect(await screen.findByLabelText("Rol")).toBeDefined();
  });

  it("hides create actions without users.create", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [
          { key: "users.read", scopes: ["ALL"] },
        ],
      }))
      .mockResolvedValueOnce(createJsonResponse(rolesResponse))
      .mockResolvedValueOnce(createJsonResponse(usersResponse)));

    renderWithProviders(<UsersPage />);

    expect(await screen.findByText("Development Manager")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Adaugă utilizator" })).toBeNull();
  });
});
