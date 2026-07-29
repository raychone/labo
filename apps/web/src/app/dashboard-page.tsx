import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useAuthState } from "./auth-state.js";
import { useWorks } from "../features/works/works-api.js";
import { useSettings } from "../features/settings/settings-api.js";
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
  const deadlineDashboard = deadlineDashboardQuery.data?.deadlineDashboard;
  usePageTitle("Panou principal", laboratoryName);

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <div className="dashboard-page__header">
        <div>
          <p className="dashboard-page__eyebrow">{laboratoryName}</p>
          <h1 id="dashboard-title">Bun venit, {auth.user?.displayName ?? "utilizator"}</h1>
          <p>Indicatorii operaționali vor fi disponibili într-un task dedicat. Până atunci, folosește acțiunile rapide și modulele disponibile.</p>
        </div>
        <div className="dashboard-page__actions">
          {canCreateWork ? <Link className="dl-button dl-button--primary dl-button--medium" to="/works"><span className="dl-button__content"><span>Lucrare nouă</span></span></Link> : null}
          {canScanWork ? <Link className="dl-button dl-button--outline dl-button--medium" to="/scan"><span className="dl-button__content"><span>Scanează lucrare</span></span></Link> : null}
        </div>
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
