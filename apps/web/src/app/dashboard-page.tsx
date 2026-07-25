import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useAuthState } from "./auth-state.js";
import { useSettings } from "../features/settings/settings-api.js";
import { getNavigationRoutes } from "./route-registry.js";
import { usePageTitle } from "./use-page-title.js";

export function DashboardPage(): ReactNode {
  const auth = useAuthState();
  const settingsQuery = useSettings(auth.permissionKeys.includes("settings.read"));
  const laboratoryName = settingsQuery.data?.laboratoryName ?? "Dental Lab Management";
  const routes = getNavigationRoutes(auth.permissionKeys).filter((route) => route.path !== "/dashboard");
  const canCreateWork = auth.permissionKeys.includes("works.create");
  const canReadWork = auth.permissionKeys.includes("works.read_all") || auth.permissionKeys.includes("works.read_assigned");
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
          {canReadWork ? <Link className="dl-button dl-button--outline dl-button--medium" to="/scan"><span className="dl-button__content"><span>Scanează QR</span></span></Link> : null}
        </div>
      </div>

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
