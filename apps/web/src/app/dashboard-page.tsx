import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useAuthState } from "./auth-state.js";
import { useWorks } from "../features/works/works-api.js";
import { useSettings } from "../features/settings/settings-api.js";
import { useBillingOverview } from "../features/billing/billing-api.js";
import { useTechnicianWorkbench } from "../features/technician-workbench/technician-workbench-api.js";
import { getNavigationRoutes } from "./route-registry.js";
import { usePageTitle } from "./use-page-title.js";

export function DashboardPage(): ReactNode {
  const auth = useAuthState();
  const settingsQuery = useSettings(auth.permissionKeys.includes("settings.read"));
  const laboratoryName = settingsQuery.data?.laboratoryName ?? "Dental Lab Management";
  const routes = getNavigationRoutes(auth.permissionKeys).filter((route) => route.path !== "/dashboard");
  const canCreateWork = auth.permissionKeys.includes("works.create");
  const canReadWorks = auth.permissionKeys.includes("works.read_all");
  const canScanWork = auth.permissionKeys.includes("scan.use");
  const canReadBilling = auth.permissionKeys.includes("finance.read") || auth.permissionKeys.includes("invoice.read");
  const canReadTechnician = auth.permissionKeys.includes("technician.workbench.read");
  const isManagerWorkspace = canReadBilling
    || auth.permissionKeys.includes("pricing.read")
    || auth.permissionKeys.includes("settings.read")
    || auth.permissionKeys.includes("users.read");
  const isReceptionWorkspace = canCreateWork || canReadWorks;
  const isTechnicianWorkspace = canReadTechnician;
  const today = new Date();
  const monthFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const monthTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  const deadlineDashboardQuery = useWorks({
    clinicId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    deadlineFilter: undefined,
    doctorId: undefined,
    page: 1,
    pageSize: 1,
    priority: undefined,
    search: undefined,
    sortBy: "effectiveDueAt",
    sortDirection: "asc",
    status: undefined,
    workTypeId: undefined,
  }, canReadWorks);
  const billingOverviewQuery = useBillingOverview({
    dateFrom: monthFrom,
    dateTo: monthTo,
  }, canReadBilling);
  const technicianWorkbenchQuery = useTechnicianWorkbench({
    page: 1,
    pageSize: 1,
    sortBy: "requestedDeliveryDate",
    sortOrder: "asc",
  }, canReadTechnician);
  const deadlineDashboard = deadlineDashboardQuery.data?.deadlineDashboard;
  const billingOverview = billingOverviewQuery.data;
  const technicianSummary = technicianWorkbenchQuery.data?.summary;
  usePageTitle("Acasă", laboratoryName);

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <div className="dashboard-page__header">
        <div>
          <p className="dashboard-page__eyebrow">{laboratoryName}</p>
          <h1 id="dashboard-title">Acasă</h1>
          <p>{auth.user?.displayName ?? "Utilizator"} · acțiuni și indicatori pentru rolurile disponibile.</p>
        </div>
        <div className="dashboard-page__actions">
          {canCreateWork ? <Link className="dl-button dl-button--primary dl-button--medium" to="/works"><span className="dl-button__content"><span>Lucrare nouă</span></span></Link> : null}
          {canScanWork ? <Link className="dl-button dl-button--outline dl-button--medium" to="/scan"><span className="dl-button__content"><span>Scanează lucrare</span></span></Link> : null}
          {canReadTechnician ? <Link className="dl-button dl-button--outline dl-button--medium" to="/workbench"><span className="dl-button__content"><span>Lucrările mele</span></span></Link> : null}
          {canReadBilling ? <Link className="dl-button dl-button--outline dl-button--medium" to="/billing"><span className="dl-button__content"><span>Facturare</span></span></Link> : null}
        </div>
      </div>

      <div className="dashboard-page__role-grid">
        {isManagerWorkspace ? (
          <section className="dashboard-page__role-panel" aria-labelledby="manager-workspace-title">
            <div>
              <h2 id="manager-workspace-title">Manager</h2>
              <p>Imagine rapidă pentru status, facturare și configurări.</p>
            </div>
            <div className="dashboard-page__metrics dashboard-page__metrics--compact">
              <DashboardMetric label="Lucrări azi" value={deadlineDashboard?.dueToday} />
              <DashboardMetric label="Întârziate" value={deadlineDashboard?.late} />
              <DashboardMetric label="Nefacturate" value={billingOverview?.uninvoicedWorkCount} />
              <DashboardMetric label="Facturi restante" value={billingOverview?.overdueInvoiceCount} />
            </div>
            <DashboardLinks links={[
              { label: "Status operațional", to: "/status" },
              { label: "Facturare", to: "/billing" },
              { label: "Prețuri și termene", to: "/pricing" },
            ]} />
          </section>
        ) : null}

        {isReceptionWorkspace ? (
          <section className="dashboard-page__role-panel" aria-labelledby="reception-workspace-title">
            <div>
              <h2 id="reception-workspace-title">Recepție</h2>
              <p>Înregistrare, căutare și verificare lucrări înainte de producție.</p>
            </div>
            <div className="dashboard-page__metrics dashboard-page__metrics--compact">
              <DashboardMetric label="Astăzi" value={deadlineDashboard?.dueToday} />
              <DashboardMetric label="Mâine" value={deadlineDashboard?.dueTomorrow} />
              <DashboardMetric label="Fără termen" value={deadlineDashboard?.unresolved} />
            </div>
            <DashboardLinks links={[
              { label: "Registru lucrări", to: "/works" },
              { label: "Status", to: "/status" },
              ...(canScanWork ? [{ label: "Scanare QR", to: "/scan" }] : []),
            ]} />
          </section>
        ) : null}

        {isTechnicianWorkspace ? (
          <section className="dashboard-page__role-panel" aria-labelledby="technician-workspace-title">
            <div>
              <h2 id="technician-workspace-title">Tehnician</h2>
              <p>Lucrări disponibile, lucrările mele și etape de executat.</p>
            </div>
            <div className="dashboard-page__metrics dashboard-page__metrics--compact">
              <DashboardMetric label="Active" value={technicianSummary?.totalActive} />
              <DashboardMetric label="De început" value={technicianSummary?.unstarted} />
              <DashboardMetric label="În lucru" value={technicianSummary?.inProgress} />
              <DashboardMetric label="Întârziate" value={technicianSummary?.overdue} />
            </div>
            <DashboardLinks links={[
              { label: "Lucrările mele", to: "/workbench" },
              ...(canScanWork ? [{ label: "Scanare QR", to: "/scan" }] : []),
              { label: "Status", to: "/status" },
            ]} />
          </section>
        ) : null}
      </div>

      {canReadWorks ? (
        <section className="dashboard-page__deadline" aria-labelledby="deadline-dashboard-title">
          <div>
            <h2 id="deadline-dashboard-title">Termene operaționale</h2>
            <p>Agregări read-only după termenul efectiv al lucrărilor.</p>
          </div>
          <div className="dashboard-page__metrics">
            <DashboardMetric label="Astăzi" value={deadlineDashboard?.dueToday} />
            <DashboardMetric label="Mâine" value={deadlineDashboard?.dueTomorrow} />
            <DashboardMetric label="Întârziate" value={deadlineDashboard?.late} />
            <DashboardMetric label="Manual" value={deadlineDashboard?.manual} />
            <DashboardMetric label="Fără termen" value={deadlineDashboard?.unresolved} />
            <DashboardMetric label="Următoarele 7 zile" value={deadlineDashboard?.next7Days} />
            <DashboardMetric label="Ultimele 7 zile finalizate la timp" value={deadlineDashboard?.completedOnTimeLast7Days} />
          </div>
        </section>
      ) : null}

      <div className="dashboard-page__grid">
        {routes.map((route) => (
          <Card key={route.path}>
            <CardHeader>
              <CardTitle>{route.label}</CardTitle>
              <CardDescription>{route.navigationGroup ?? "Aplicație"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="dashboard-page__card-link" to={route.path}>Deschide</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function DashboardMetric({ label, value }: { readonly label: string; readonly value: number | undefined }): ReactNode {
  return (
    <div className="dashboard-page__metric">
      <span>{label}</span>
      <strong>{value ?? "..."}</strong>
    </div>
  );
}

function DashboardLinks({ links }: { readonly links: readonly { readonly label: string; readonly to: string }[] }): ReactNode {
  return (
    <div className="dashboard-page__links">
      {links.map((link) => (
        <Link key={`${link.to}-${link.label}`} to={link.to}>{link.label}</Link>
      ))}
    </div>
  );
}
