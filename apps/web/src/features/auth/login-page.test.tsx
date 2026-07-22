import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./login-page.js";

function renderWithQueryClient(component: ReactNode): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      {component}
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

describe("LoginPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the login form when no session exists", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(createJsonResponse({ message: "Unauthorized" }, 401)));

    renderWithQueryClient(<LoginPage />);

    expect(await screen.findByRole("heading", { name: "Autentificare" })).toBeDefined();
    expect(await screen.findByLabelText("Email")).toBeDefined();
    expect(await screen.findByLabelText("Parola")).toBeDefined();
    expect(await screen.findByRole("button", { name: "Login" })).toBeDefined();
  });

  it("renders current user and permission count for an active session", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(createJsonResponse({
        user: {
          displayName: "Development Manager",
          email: "manager.dev@example.test",
          id: "user_1",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        permissions: [
          {
            key: "users.create",
            scopes: ["ALL"],
          },
        ],
      })));

    renderWithQueryClient(<LoginPage />);

    expect(await screen.findByText("Development Manager")).toBeDefined();
    expect(await screen.findByText("users.create")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText("1")).toBeDefined();
    });
  });
});
