import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { LoginPage } from "../features/auth/login-page.js";
import { StylePreviewPage } from "../features/style-preview/style-preview-page.js";
import { UsersPage } from "../features/users/users-page.js";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    element: <StylePreviewPage />,
    path: "/",
  },
  {
    element: <StylePreviewPage />,
    path: "/style-preview",
  },
  {
    element: <LoginPage />,
    path: "/login",
  },
  {
    element: <UsersPage />,
    path: "/users",
  },
]);

export function App(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
