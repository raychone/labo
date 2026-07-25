import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
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
    expect(await screen.findByRole("button", { name: "Autentificare" })).toBeDefined();
  });

  it("clears the password and keeps the email after failed login", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(createJsonResponse({ message: "Unauthorized" }, 401)));

    renderWithQueryClient(<LoginPage />);

    const email = await screen.findByLabelText("Email");
    const password = await screen.findByLabelText("Parola");
    fireEvent.change(email, { target: { value: "manager.dev@example.test" } });
    fireEvent.change(password, { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Autentificare" }));

    expect(await screen.findByText("Autentificare eșuată")).toBeDefined();
    expect(email).toHaveProperty("value", "manager.dev@example.test");
    expect(password).toHaveProperty("value", "");
  });

  it("does not render the login form for an active session", async () => {
    vi.stubGlobal("fetch", vi.fn()
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

    await waitFor(() => expect(screen.queryByLabelText("Email")).toBeNull());
  });
});
