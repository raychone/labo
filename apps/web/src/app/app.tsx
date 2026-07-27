import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { AuthenticatedAppShell } from "./authenticated-app-shell.js";
import { DashboardPage } from "./dashboard-page.js";
import { ForbiddenPage, NotFoundPage } from "./error-pages.js";
import { PublicOnlyRoute, AuthenticatedRoute, PermissionRoute } from "./route-guards.js";
import { RouteLoading } from "./route-loading.js";
import { deliveryReadPermissions, scanPermissions, workReadPermissions } from "./route-registry.js";
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
const WorkFormBuilderPage = lazy(async () => {
  const module = await import("../features/work-forms/work-form-builder-page.js");
  return { default: module.WorkFormBuilderPage };
});
const WorkflowBuilderPage = lazy(async () => {
  const module = await import("../features/workflow-templates/workflow-builder-page.js");
  return { default: module.WorkflowBuilderPage };
});
const WorksPage = lazy(async () => {
  const module = await import("../features/works/works-page.js");
  return { default: module.WorksPage };
});
const WorkScanPage = lazy(async () => {
  const module = await import("../features/works/work-scan-page.js");
  return { default: module.WorkScanPage };
});
const TechnicianWorkbenchPage = lazy(async () => {
  const module = await import("../features/technician-workbench/technician-workbench-page.js");
  return { default: module.TechnicianWorkbenchPage };
});
const LogisticsPage = lazy(async () => {
  const module = await import("../features/logistics/logistics-page.js");
  return { default: module.LogisticsPage };
});
const DeliveriesPage = lazy(async () => {
  const module = await import("../features/deliveries/deliveries-page.js");
  return { default: module.DeliveriesPage };
});
const DeliveryProofPrintPage = lazy(async () => {
  const module = await import("../features/deliveries/delivery-proof-print-page.js");
  return { default: module.DeliveryProofPrintPage };
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
        element: <PermissionRoute requiredPermissions={deliveryReadPermissions}><LazyRoute><DeliveriesPage /></LazyRoute></PermissionRoute>,
        path: "deliveries",
      },
      {
        element: <PermissionRoute requiredPermissions={["delivery.proof.print"]}><LazyRoute><DeliveryProofPrintPage /></LazyRoute></PermissionRoute>,
        path: "deliveries/:id/proof/print",
      },
      {
        element: <PermissionRoute requiredPermissions={workReadPermissions}><LazyRoute><WorksPage /></LazyRoute></PermissionRoute>,
        path: "works",
      },
      {
        element: <PermissionRoute requiredPermissions={scanPermissions}><LazyRoute><WorkScanPage /></LazyRoute></PermissionRoute>,
        path: "scan",
      },
      {
        element: <PermissionRoute requiredPermissions={["technician.workbench.read"]}><LazyRoute><TechnicianWorkbenchPage /></LazyRoute></PermissionRoute>,
        path: "workbench",
      },
      {
        element: <PermissionRoute requiredPermissions={["logistics.center.read"]}><LazyRoute><LogisticsPage /></LazyRoute></PermissionRoute>,
        path: "logistics",
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
        element: <PermissionRoute requiredPermissions={["forms.read"]}><LazyRoute><WorkFormBuilderPage /></LazyRoute></PermissionRoute>,
        path: "work-types/:workTypeId/form",
      },
      {
        element: <PermissionRoute requiredPermissions={["workflow.read"]}><LazyRoute><WorkflowBuilderPage /></LazyRoute></PermissionRoute>,
        path: "work-types/:workTypeId/workflow",
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
