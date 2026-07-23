import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { AuthenticatedAppShell } from "./authenticated-app-shell.js";
import { DashboardPage } from "./dashboard-page.js";
import { ForbiddenPage, NotFoundPage } from "./error-pages.js";
import { PublicOnlyRoute, AuthenticatedRoute, PermissionRoute } from "./route-guards.js";
import { RouteLoading } from "./route-loading.js";
import { workReadPermissions } from "./route-registry.js";
import { LoginPage } from "../features/auth/login-page.js";
import { StylePreviewPage } from "../features/style-preview/style-preview-page.js";

const queryClient = new QueryClient();
const ClinicsPage = lazy(async () => {
  const module = await import("../features/clinics/clinics-page.js");
  return { default: module.ClinicsPage };
});
const SettingsPage = lazy(async () => {
  const module = await import("../features/settings/settings-page.js");
  return { default: module.SettingsPage };
});
const UsersPage = lazy(async () => {
  const module = await import("../features/users/users-page.js");
  return { default: module.UsersPage };
});
const WorkTypesPage = lazy(async () => {
  const module = await import("../features/work-types/work-types-page.js");
  return { default: module.WorkTypesPage };
});
const WorksPage = lazy(async () => {
  const module = await import("../features/works/works-page.js");
  return { default: module.WorksPage };
});
const WorkScanPage = lazy(async () => {
  const module = await import("../features/works/work-scan-page.js");
  return { default: module.WorkScanPage };
});
const BillingPage = lazy(async () => {
  const module = await import("../features/billing/billing-page.js");
  return { default: module.BillingPage };
});
const BillingPrintPage = lazy(async () => {
  const module = await import("../features/billing/billing-print-page.js");
  return { default: module.BillingPrintPage };
});

function LazyRoute({ children }: { readonly children: ReactNode }): ReactNode {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <StylePreviewPage />,
    path: "/style-preview",
  },
  {
    element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>,
    path: "/login",
  },
  {
    children: [
      { element: <Navigate replace to="/dashboard" />, index: true },
      { element: <DashboardPage />, path: "dashboard" },
      {
        element: <PermissionRoute requiredPermissions={workReadPermissions}><LazyRoute><WorksPage /></LazyRoute></PermissionRoute>,
        path: "works",
      },
      {
        element: <PermissionRoute requiredPermissions={workReadPermissions}><LazyRoute><WorkScanPage /></LazyRoute></PermissionRoute>,
        path: "scan",
      },
      {
        element: <PermissionRoute requiredPermissions={["finance.read", "invoice.read", "invoice.create"]}><LazyRoute><BillingPage /></LazyRoute></PermissionRoute>,
        path: "billing",
      },
      {
        element: <PermissionRoute requiredPermissions={["invoice.download"]}><LazyRoute><BillingPrintPage /></LazyRoute></PermissionRoute>,
        path: "billing/documents/:id/print",
      },
      {
        element: <PermissionRoute requiredPermissions={["clinics.read"]}><LazyRoute><ClinicsPage /></LazyRoute></PermissionRoute>,
        path: "clinics",
      },
      {
        element: <PermissionRoute requiredPermissions={["pricing.read"]}><LazyRoute><WorkTypesPage /></LazyRoute></PermissionRoute>,
        path: "work-types",
      },
      {
        element: <PermissionRoute requiredPermissions={["users.read"]}><LazyRoute><UsersPage /></LazyRoute></PermissionRoute>,
        path: "users",
      },
      {
        element: <PermissionRoute requiredPermissions={["settings.read"]}><LazyRoute><SettingsPage /></LazyRoute></PermissionRoute>,
        path: "settings",
      },
      { element: <ForbiddenPage />, path: "forbidden" },
      { element: <NotFoundPage />, path: "*" },
    ],
    element: <AuthenticatedRoute><AuthenticatedAppShell /></AuthenticatedRoute>,
    path: "/",
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
