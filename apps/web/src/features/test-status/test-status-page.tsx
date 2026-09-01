import { useState, type ReactNode } from "react";

import type { OperationalStatusQuery } from "@dental-lab/shared";
import { Button } from "@dental-lab/ui";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { PickupRequestModal } from "../logistics/logistics-page.js";
import { fetchPermissions } from "../auth/auth-api.js";
import { StatusPage } from "../status/status-page.js";
import { useOperationalStatus } from "../status/status-api.js";
import { hasPermission } from "../users/users-api.js";
import { StatusProbeModal } from "./status-probe-modal.js";

import "./test-status-page.css";

/** Operational workspace now used by /status; /test remains a temporary compatibility URL. */
export function TestStatusPage(): ReactNode {
  const navigate = useNavigate();
  const [pickupOpen, setPickupOpen] = useState(false);
  const [probeOpen, setProbeOpen] = useState(false);
  const [transportFilter, setTransportFilter] = useState<1 | 2 | 3 | null | undefined>();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  // Logistics has the operational marker permission; manager is identified by audit access.
  // Reception and technicians may still see the work register, but not transport KPI data.
  const canSeeTransportKpi = hasPermission(permissionsQuery.data, "logistics.delivery_marker.update") || hasPermission(permissionsQuery.data, "audit.read");
  // Technicians keep scan access from their own workbench, but the shared
  // status header must not expose the scan action to them.
  const canScanWork = hasPermission(permissionsQuery.data, "scan.use")
    && !hasPermission(permissionsQuery.data, "technician.workbench.read");
  const canCreateWork = hasPermission(permissionsQuery.data, "works.create");
  const canCreatePickup = hasPermission(permissionsQuery.data, "pickup.create");
  const canCreateProbe = hasPermission(permissionsQuery.data, "cycles.create_next");

  return (
    <main className="test-status-page">
      <section className="dl-container test-status-page__layout" aria-labelledby="test-status-title">
        <header className="test-status-page__header">
          <div>
            <h1 id="test-status-title">Centru operațional</h1>
          </div>
        </header>
        <div className="test-status-page__actions" aria-label="Acțiuni rapide">
          {canScanWork ? <Button onClick={() => navigate("/scan")} variant="outline">Scanează lucrare</Button> : null}
          {canCreateWork ? <Button onClick={() => navigate("/works?create=1&returnTo=%2Fstatus")} variant="primary">Lucrare nouă</Button> : null}
          {canCreatePickup ? <Button onClick={() => setPickupOpen(true)} variant="primary">Ridicare nouă</Button> : null}
          {canCreateProbe ? <Button onClick={() => setProbeOpen(true)} variant="outline">Probe</Button> : null}
        </div>
        <StatusPage allowLogisticsRead experimental onTabChange={() => setTransportFilter(undefined)} showTransportKpi={canSeeTransportKpi} {...(transportFilter === undefined ? {} : { transportFilter })} transportKpi={<TestTransportKpi onOpen={(days) => setTransportFilter(days ?? null)} />} />
        <StatusProbeModal isOpen={probeOpen} onOpenChange={setProbeOpen} />
        <PickupRequestModal editingPickup={null} isOpen={pickupOpen} onOpenChange={setPickupOpen} />
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
