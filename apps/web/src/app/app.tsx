import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@dental-lab/ui";
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { AuthenticatedAppShell } from "./authenticated-app-shell.js";
import { useAuthState } from "./auth-state.js";
import { DashboardPage } from "./dashboard-page.js";
import { ForbiddenPage, NotFoundPage } from "./error-pages.js";
import { PublicOnlyRoute, AuthenticatedRoute, PermissionRoute } from "./route-guards.js";
import { RouteLoading } from "./route-loading.js";
import { deliveryReadPermissions, operationalStatusReadPermissions, scanPermissions, workReadPermissions } from "./route-registry.js";
import { LoginPage } from "../features/auth/login-page.js";
import { StylePreviewPage } from "../features/style-preview/style-preview-page.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep recently visited screens responsive without refetching every time
      // the browser regains focus or the user navigates back to them.
      staleTime: 45_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
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
const TestStatusPage = lazy(async () => {
  const module = await import("../features/test-status/test-status-page.js");
  return { default: module.TestStatusPage };
});
const StatusTvPage = lazy(async () => {
  const module = await import("../features/status/status-tv-page.js");
  return { default: module.StatusTvPage };
});
const WorkScanPage = lazy(async () => {
  const module = await import("../features/works/work-scan-page.js");
  return { default: module.WorkScanPage };
});
const TechnicianWorkbenchPage = lazy(async () => {
  const module = await import("../features/technician-workbench/technician-workbench-page.js");
  return { default: module.TechnicianWorkbenchPage };
});
const TechnicianEarningsPage = lazy(async () => {
  const module = await import("../features/technician-earnings/technician-earnings-page.js");
  return { default: module.TechnicianEarningsPage };
});
const ManagerTechniciansPage = lazy(async () => {
  const module = await import("../features/manager-technicians/manager-technicians-page.js");
  return { default: module.ManagerTechniciansPage };
});
const LogisticsPage = lazy(async () => {
  const module = await import("../features/logistics/logistics-page.js");
  return { default: module.LogisticsPage };
});
const LogisticsRouteBuilderPage = lazy(async () => {
  const module = await import("../features/logistics/logistics-route-builder-page.js");
  return { default: module.LogisticsRouteBuilderPage };
});
const CourierRoutePage = lazy(async () => {
  const module = await import("../features/courier/courier-route-page.js");
  return { default: module.CourierRoutePage };
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
const PatientsPage = lazy(async () => {
  const module = await import("../features/patients/patients-page.js");
  return { default: module.PatientsPage };
});
const BillingPrintPage = lazy(async () => {
  const module = await import("../features/billing/billing-print-page.js");
  return { default: module.BillingPrintPage };
});
const BillingStatementPrintPage = lazy(async () => {
  const module = await import("../features/billing/billing-statement-print-page.js");
  return { default: module.BillingStatementPrintPage };
});
const BillingMonthRegistryPrintPage = lazy(async () => {
  const module = await import("../features/billing/billing-month-registry-print-page.js");
  return { default: module.BillingMonthRegistryPrintPage };
});
const BillingArchivePage = lazy(async () => {
  const module = await import("../features/billing/billing-archive-page.js");
  return { default: module.BillingArchivePage };
});
const WorkSettingsPage = lazy(async () => {
  const module = await import("../features/pricing/pricing-page.js");
  return { default: module.WorkSettingsPage };
});
const AuditPage = lazy(async () => {
  const module = await import("../features/audit/audit-page.js");
  return { default: module.AuditPage };
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
    element: <AuthenticatedRoute><PermissionRoute requiredPermissions={["invoice.download"]}><LazyRoute><BillingPrintPage /></LazyRoute></PermissionRoute></AuthenticatedRoute>,
    path: "/billing/documents/:id/print",
  },
  {
    element: <AuthenticatedRoute><PermissionRoute requiredPermissions={["finance.read_reports"]}><LazyRoute><BillingStatementPrintPage /></LazyRoute></PermissionRoute></AuthenticatedRoute>,
    path: "/billing/statements/:scope/print",
  },
  {
    element: <AuthenticatedRoute><PermissionRoute requiredPermissions={["finance.read_reports"]}><LazyRoute><BillingMonthRegistryPrintPage /></LazyRoute></PermissionRoute></AuthenticatedRoute>,
    path: "/billing/month-registry/print",
  },
  {
    element: <AuthenticatedRoute><NonCourierRoute><PermissionRoute requiredPermissions={operationalStatusReadPermissions}><LazyRoute><StatusTvPage /></LazyRoute></PermissionRoute></NonCourierRoute></AuthenticatedRoute>,
    path: "/status/tv",
  },
  {
    children: [
      { element: <RoleLandingRedirect />, index: true },
      { element: <RoleAwareDashboard />, path: "dashboard" },
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
        element: <NonCourierRoute><PermissionRoute requiredPermissions={operationalStatusReadPermissions}><LazyRoute><TestStatusPage /></LazyRoute></PermissionRoute></NonCourierRoute>,
        path: "status",
      },
      {
        // Temporary compatibility URL during migration. The new operational workspace lives at /status.
        element: <Navigate replace to="/status" />,
        path: "test",
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
        element: <PermissionRoute requiredPermissions={["technician.earnings.read_own"]}><LazyRoute><TechnicianEarningsPage /></LazyRoute></PermissionRoute>,
        path: "earnings",
      },
      {
        element: <PermissionRoute requiredPermissions={["technician.earnings.read_all"]}><LazyRoute><ManagerTechniciansPage /></LazyRoute></PermissionRoute>,
        path: "technicians",
      },
      {
        element: <NonTechnicianRoute><PermissionRoute requiredPermissions={["logistics.center.read"]}><LazyRoute><LogisticsPage showHeaderActions={false} /></LazyRoute></PermissionRoute></NonTechnicianRoute>,
        path: "logistics",
      },
      {
        element: <PermissionRoute requiredPermissions={["routes.create", "routes.read", "logistics.center.read"]}><LazyRoute><LogisticsRouteBuilderPage /></LazyRoute></PermissionRoute>,
        path: "routes",
      },
      {
        element: <PermissionRoute requiredPermissions={["routes.read"]}><LazyRoute><CourierRoutePage /></LazyRoute></PermissionRoute>,
        path: "my-route",
      },
      {
        element: <PermissionRoute requiredPermissions={["finance.read", "invoice.read", "invoice.create"]}><LazyRoute><BillingPage /></LazyRoute></PermissionRoute>,
        path: "billing",
      },
      {
        element: <PermissionRoute requiredPermissions={["finance.read_reports"]}><LazyRoute><BillingArchivePage /></LazyRoute></PermissionRoute>,
        path: "billing/archive",
      },
      {
        element: <PermissionRoute requiredPermissions={["finance.read_reports"]}><LazyRoute><BillingArchivePage /></LazyRoute></PermissionRoute>,
        path: "billing/archive/:year/:month",
      },
      {
        element: <PermissionRoute requiredPermissions={["clinics.read"]}><LazyRoute><ClinicsPage /></LazyRoute></PermissionRoute>,
        path: "clinics",
      },
      {
        element: <PermissionRoute requiredPermissions={["patients.read"]}><LazyRoute><PatientsPage /></LazyRoute></PermissionRoute>,
        path: "patients",
      },
      {
        element: <PermissionRoute requiredPermissions={["pricing.read"]}><LazyRoute><WorkSettingsPage /></LazyRoute></PermissionRoute>,
        path: "work-settings",
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
      {
        element: <PermissionRoute requiredPermissions={["audit.read"]}><LazyRoute><AuditPage /></LazyRoute></PermissionRoute>,
        path: "audit",
      },
      { element: <ForbiddenPage />, path: "forbidden" },
      { element: <NotFoundPage />, path: "*" },
    ],
    element: <AuthenticatedRoute><AuthenticatedAppShell /></AuthenticatedRoute>,
    path: "/",
  },
]);

function isCourier(permissionKeys: readonly string[]): boolean {
  return permissionKeys.includes("routes.read") && !permissionKeys.includes("routes.create");
}

function NonCourierRoute({ children }: { readonly children: ReactNode }): ReactNode {
  const auth = useAuthState();
  return isCourier(auth.permissionKeys) ? <Navigate replace to="/my-route" /> : children;
}

function NonTechnicianRoute({ children }: { readonly children: ReactNode }): ReactNode {
  const auth = useAuthState();
  return auth.permissionKeys.includes("technician.workbench.read") ? <Navigate replace to="/workbench" /> : children;
}

function RoleLandingRedirect(): ReactNode {
  const auth = useAuthState();
  return <Navigate replace to={isCourier(auth.permissionKeys) ? "/my-route" : "/dashboard"} />;
}

function RoleAwareDashboard(): ReactNode {
  const auth = useAuthState();
  return isCourier(auth.permissionKeys) ? <Navigate replace to="/my-route" /> : <DashboardPage />;
}

export function App(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
