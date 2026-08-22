import { Button, Card, CardContent, CardHeader, CardTitle, DataTable, DateInput, ErrorState, LoadingState, Select, TextInput, type DataTableColumn } from "@dental-lab/ui";
import type { AuditLogQuery, AuditLogSummary } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { useAuditLogs } from "./audit-api.js";
import { formatAuditRow } from "./audit-presentation.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./audit-page.css";

function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function AuditPage(): ReactNode {
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadAudit = hasPermission(permissionsQuery.data, "audit.read");
  const [filters, setFilters] = useState({ action: "", actor: "", dateFrom: "", dateTo: "", resourceType: "" });
  const [page, setPage] = useState(1);
  const params = useMemo<AuditLogQuery>(() => ({ ...filters, page, pageSize: 25 }), [filters, page]);
  const auditQuery = useAuditLogs(params, canReadAudit);
  const columns = useMemo<readonly DataTableColumn<AuditLogSummary>[]>(() => [
    { id: "createdAt", header: "Data", renderCell: (row) => formatAuditDate(row.createdAt) },
    { id: "actor", header: "Actor", renderCell: (row) => formatAuditRow(row).actor },
    { id: "action", header: "Acțiune", renderCell: (row) => formatAuditRow(row).action },
    { id: "resource", header: "Entitate", renderCell: (row) => formatAuditRow(row).entity },
    { id: "metadata", header: "Detalii", renderCell: (row) => <span>{formatAuditRow(row).details}</span> },
  ], []);

  if (permissionsQuery.isLoading) {
    return <main className="dl-container"><LoadingState text="Se încarcă auditul" /></main>;
  }
  if (!canReadAudit) {
    return <main className="dl-container"><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea audit.read." /></main>;
  }

  function updateFilter(key: keyof typeof filters, value: string): void {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="dl-container">
      <header>
        <h1>Audit</h1>
        <p>Istoricul activităților importante din laborator, prezentat clar și ușor de urmărit.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Filtre audit</CardTitle></CardHeader>
        <CardContent className="audit-page__filters">
          <TextInput label="Actor" value={filters.actor} onChange={(event) => updateFilter("actor", event.target.value)} />
          <Select label="Acțiune" options={[{ label: "Toate acțiunile", value: "" }, { label: "Autentificare", value: "auth." }, { label: "Lucrări", value: "work" }, { label: "Pacienți", value: "patient" }, { label: "Prețuri", value: "pricing." }, { label: "Facturare", value: "billing." }, { label: "Logistică", value: "logistics." }, { label: "Tehnicieni", value: "technician" }, { label: "Utilizatori", value: "user." }, { label: "Setări", value: "settings." } ]} value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} />
          <Select label="Entitate" options={[{ label: "Toate entitățile", value: "" }, { label: "Lucrare", value: "work_order" }, { label: "Pacient", value: "patient" }, { label: "Clinică", value: "clinic" }, { label: "Medic", value: "doctor" }, { label: "Factură", value: "billing_document" }, { label: "Tarif", value: "price_catalog_item" }, { label: "Acord comercial", value: "pricing_agreement" }, { label: "Livrare", value: "delivery" }, { label: "Traseu", value: "courier_route" }]} value={filters.resourceType} onChange={(event) => updateFilter("resourceType", event.target.value)} />
          <DateInput label="De la" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          <DateInput label="Până la" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <DataTable columns={columns} emptyMessage="Nu există intrări pentru filtrele curente." error={auditQuery.error ? getErrorMessage(auditQuery.error) : undefined} getRowKey={(row) => row.id} isLoading={auditQuery.isLoading} rows={auditQuery.data?.items ?? []} />
          <div className="audit-page__pagination">
            <Button disabled={page <= 1 || auditQuery.isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))} variant="outline">Înapoi</Button>
            <span>Pagina {page} din {auditQuery.data?.totalPages ?? 1} · {auditQuery.data?.total ?? 0} intrări</span>
            <Button disabled={!auditQuery.data?.hasNextPage || auditQuery.isLoading} onClick={() => setPage((current) => current + 1)} variant="outline">Înainte</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
