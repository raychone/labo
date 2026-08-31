import { useState, type ReactNode } from "react";

import type { OperationalStatusQuery } from "@dental-lab/shared";
import { Button } from "@dental-lab/ui";
import { useQuery } from "@tanstack/react-query";

import { LogisticsPage } from "../logistics/logistics-page.js";
import { fetchPermissions } from "../auth/auth-api.js";
import { StatusPage } from "../status/status-page.js";
import { useOperationalStatus } from "../status/status-api.js";
import { hasPermission } from "../users/users-api.js";

import "./test-status-page.css";

type TestView = "status" | "logistics";

/** Experimental workspace; legacy routes remain unchanged and available. */
export function TestStatusPage(): ReactNode {
  const [view, setView] = useState<TestView>("status");
  const [transportFilter, setTransportFilter] = useState<1 | 2 | 3 | null | undefined>();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  // Logistics has the operational marker permission; manager is identified by audit access.
  // Reception and technicians may still see the work register, but not transport KPI data.
  const canSeeTransportKpi = hasPermission(permissionsQuery.data, "logistics.delivery_marker.update") || hasPermission(permissionsQuery.data, "audit.read");

  return (
    <main className="test-status-page">
      <section className="dl-container test-status-page__layout" aria-labelledby="test-status-title">
        <header className="test-status-page__header">
          <div>
            <p className="test-status-page__eyebrow">Spațiu experimental</p>
            <h1 id="test-status-title">Centru operațional</h1>
            <p>Status, termene, alerte și livrare/ridicare într-un singur spațiu. Paginile legacy rămân disponibile separat.</p>
          </div>
          <div className="test-status-page__switcher" aria-label="Zona operațională">
            <Button aria-pressed={view === "status"} onClick={() => { setTransportFilter(undefined); setView("status"); }} variant={view === "status" ? "primary" : "secondary"}>Status</Button>
            <Button aria-pressed={view === "logistics"} onClick={() => setView("logistics")} variant={view === "logistics" ? "primary" : "secondary"}>Livrare/Ridicare</Button>
          </div>
        </header>
        {view === "status" ? <StatusPage allowLogisticsRead experimental onTabChange={() => setTransportFilter(undefined)} showTransportKpi={canSeeTransportKpi} {...(transportFilter === undefined ? {} : { transportFilter })} transportKpi={<TestTransportKpi onOpen={(days) => { setTransportFilter(days ?? null); setView("status"); }} />} /> : <LogisticsPage excludeDemo />}
      </section>
    </main>
  );
}

function TestTransportKpi({ onOpen }: { readonly onOpen: (days?: 1 | 2 | 3) => void }): ReactNode {
  const query: OperationalStatusQuery = { excludeDemo: true, page: 1, pageSize: 100, sortBy: "effectiveDueAt", sortDirection: "asc", tab: "TODAY", transportOnly: true };
  const summary = useOperationalStatus(query, true);
  const total = summary.data?.meta.total ?? 0;
  return (
    <div className="test-status-page__transport-kpi">
        <button className="test-status-page__transport-main" onClick={() => onOpen()} type="button">
          <span>De livrat / de ridicat</span>
          <strong>{total}</strong>
        </button>
        <div className="test-status-page__transport-windows" aria-label="Filtru livrare sau ridicare">
          {[1, 2, 3].map((days) => <button key={days} onClick={() => onOpen(days as 1 | 2 | 3)} type="button">{days}</button>)}
        </div>
    </div>
  );
}
