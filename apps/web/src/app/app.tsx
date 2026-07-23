import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { LoginPage } from "../features/auth/login-page.js";
import { ClinicsPage } from "../features/clinics/clinics-page.js";
import { SettingsPage } from "../features/settings/settings-page.js";
import { StylePreviewPage } from "../features/style-preview/style-preview-page.js";
import { UsersPage } from "../features/users/users-page.js";
import { WorkTypesPage } from "../features/work-types/work-types-page.js";
import { WorksPage } from "../features/works/works-page.js";

const queryClient = new QueryClient();
const WorkScanPage = lazy(async () => {
  const module = await import("../features/works/work-scan-page.js");
  return { default: module.WorkScanPage };
});

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
  {
    element: <WorksPage />,
    path: "/works",
  },
  {
    element: (
      <Suspense fallback={null}>
        <WorkScanPage />
      </Suspense>
    ),
    path: "/scan",
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
