import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { LoginPage } from "../features/auth/login-page.js";
import { ClinicsPage } from "../features/clinics/clinics-page.js";
import { SettingsPage } from "../features/settings/settings-page.js";
import { StylePreviewPage } from "../features/style-preview/style-preview-page.js";
import { UsersPage } from "../features/users/users-page.js";
import { WorkTypesPage } from "../features/work-types/work-types-page.js";

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
  {
    element: <ClinicsPage />,
    path: "/clinics",
  },
  {
    element: <SettingsPage />,
    path: "/settings",
  },
  {
    element: <WorkTypesPage />,
    path: "/work-types",
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
