import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { LoginPage } from "../features/auth/login-page.js";
import { StylePreviewPage } from "../features/style-preview/style-preview-page.js";

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
]);

export function App(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
