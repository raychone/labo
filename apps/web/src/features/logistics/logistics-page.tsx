import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Drawer,
  ErrorState,
  LoadingState,
  PriorityBadge,
  Select,
  StatusBadge,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  LOGISTICS_BLOCK_REASON_CODES,
  LOGISTICS_BLOCK_REASON_LABELS,
  LOGISTICS_CENTER_CATEGORIES,
  LOGISTICS_LOCATION_CODES,
  LOGISTICS_LOCATION_LABELS,
  LOGISTICS_STATUS_LABELS,
  type LogisticsCenterCategory,
  type LogisticsCenterItem,
  type LogisticsCenterQuery,
  type LogisticsTransitionInput,
  type UpdateLogisticsLocationInput,
  type BlockWorkInput,
  type WorkLogisticsView,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import {
  useCreateDeliveryPreparationGroup,
  useDeliveryPreparationGroups,
  useLogisticsCenter,
  useLogisticsSummary,
  useLogisticsTransition,
  useWorkLogistics,
} from "./logistics-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./logistics-page.css";

const defaultQuery: LogisticsCenterQuery = {
  category: "ALL",
  page: 1,
  pageSize: 30,
  sortBy: "requestedDeliveryDate",
  sortDirection: "asc",
};

const categoryLabels: Record<LogisticsCenterCategory, string> = {
  ALL: "Toate",
  BLOCARE: "Blocate",
  DE_AMBALAT: "De ambalat",
  DE_VERIFICAT: "De verificat",
  FINALIZATE_AZI: "Finalizate azi",
  GATA_DE_LIVRARE: "Gata de livrare",
  INTRARI_ASTAZI: "Intrări azi",
  INTARZIATE: "Întârziate",
  IN_AMBALARE: "În ambalare",
  IN_PRODUCTIE: "În producție",
  NEASIGNATE: "Neasignate",
  NEFACTURATE: "Nefacturate",
  URGENTE: "Urgente",
};

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value)) : "-";
}

export function LogisticsPage(): ReactNode {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState<LogisticsCenterQuery>(defaultQuery);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "logistics.center.read");
  const canCreateWork = hasPermission(permissionsQuery.data, "works.create");
  const canReadBilling = hasPermission(permissionsQuery.data, "finance.read") || hasPermission(permissionsQuery.data, "invoice.read");
  const centerQuery = useLogisticsCenter(query, canRead);
  const summaryQuery = useLogisticsSummary(query, canRead);
  const groupsQuery = useDeliveryPreparationGroups(canRead);
  const selectedQuery = useWorkLogistics(selectedWorkId, selectedWorkId !== null);
  const transition = useLogisticsTransition();
  const createGroup = useCreateDeliveryPreparationGroup();
  const visibleCategories = canReadBilling
    ? LOGISTICS_CENTER_CATEGORIES
    : LOGISTICS_CENTER_CATEGORIES.filter((category) => category !== "NEFACTURATE");

  function setCategory(category: LogisticsCenterCategory): void {
    setQuery((current) => ({ ...current, category, page: 1 }));
  }

  function runTransition(workId: string, path: string, input: BlockWorkInput | LogisticsTransitionInput | UpdateLogisticsLocationInput): void {
    transition.mutate({ input, path, workOrderId: workId }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Acțiunea logistică a eșuat", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Starea logistică a fost actualizată.", variant: "success" }),
    });
  }

  if (permissionsQuery.isLoading) {
    return <PageFrame><LoadingState text="Se încarcă permisiunile" /></PageFrame>;
  }
  if (!canRead) {
    return <PageFrame><ErrorState title="Acces refuzat" description="Contul curent nu are acces la centrul operațional." /></PageFrame>;
  }

  return (
    <main className="logistics-page">
      <section className="dl-container logistics-page__layout" aria-labelledby="logistics-title">
        <header className="logistics-page__header">
          <div>
            <h1 id="logistics-title">Centru operațional</h1>
            <p>{new Intl.DateTimeFormat("ro-RO", { dateStyle: "full" }).format(new Date())}</p>
          </div>
          <div className="logistics-page__header-actions">
            <Button onClick={() => navigate("/scan")} variant="outline">Scanează lucrare</Button>
            {canCreateWork ? <Button onClick={() => navigate("/works")}>Lucrare nouă</Button> : null}
          </div>
        </header>

        <div className="logistics-page__summary">
          <SummaryCard label="Intrări azi" onClick={() => setCategory("INTRARI_ASTAZI")} value={summaryQuery.data?.receivedToday ?? 0} />
          <SummaryCard label="În producție" onClick={() => setCategory("IN_PRODUCTIE")} value={summaryQuery.data?.inProduction ?? 0} />
          <SummaryCard label="Neasignate" onClick={() => setCategory("NEASIGNATE")} value={summaryQuery.data?.unassigned ?? 0} />
          <SummaryCard label="Blocate" onClick={() => setCategory("BLOCARE")} value={summaryQuery.data?.blocked ?? 0} />
          <SummaryCard label="De ambalat" onClick={() => setCategory("DE_AMBALAT")} value={summaryQuery.data?.readyForPacking ?? 0} />
          <SummaryCard label="Gata livrare" onClick={() => setCategory("GATA_DE_LIVRARE")} value={summaryQuery.data?.readyForDelivery ?? 0} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lucrări operaționale</CardTitle>
            <CardDescription>Workflow, blocări, locații fizice și ambalare fără date financiare detaliate.</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__content">
            <div className="logistics-page__tabs" role="list" aria-label="Filtre rapide">
              {visibleCategories.map((category) => (
                <button aria-pressed={(query.category ?? "ALL") === category} key={category} onClick={() => setCategory(category)} type="button">
                  {categoryLabels[category]}
                </button>
              ))}
            </div>
            <div className="logistics-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { search: _search, ...rest } = current;
                    return value ? { ...rest, page: 1, search: value } : { ...rest, page: 1 };
                  });
                }}
                placeholder="Cod, pacient, clinică, medic"
                type="search"
                value={query.search ?? ""}
              />
              <Select
                label="Status logistic"
                onChange={(event) => {
                  const value = event.target.value as LogisticsCenterQuery["logisticsStatus"] | "";
                  setQuery((current) => {
                    const { logisticsStatus: _status, ...rest } = current;
                    return value ? { ...rest, logisticsStatus: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                options={[{ label: "Toate", value: "" }, ...Object.entries(LOGISTICS_STATUS_LABELS).map(([value, label]) => ({ label, value }))]}
                value={query.logisticsStatus ?? ""}
              />
              <Select
                label="Prioritate"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { priority: _priority, ...rest } = current;
                    return value === "URGENT" || value === "NORMAL" ? { ...rest, page: 1, priority: value } : { ...rest, page: 1 };
                  });
                }}
                options={[{ label: "Toate", value: "" }, { label: "Urgente", value: "URGENT" }, { label: "Normal", value: "NORMAL" }]}
                value={query.priority ?? ""}
              />
            </div>

            {centerQuery.isLoading ? <LoadingState text="Se încarcă centrul operațional" /> : null}
            {centerQuery.isError ? <ErrorState title="Centrul operațional nu a fost încărcat" description={getErrorMessage(centerQuery.error)} /> : null}
            <div className="logistics-page__list">
              {(centerQuery.data?.items ?? []).map((item) => (
                <WorkRow canReadBilling={canReadBilling} item={item} key={item.id} onOpen={() => setSelectedWorkId(item.id)} onTransition={runTransition} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pregătiri pentru livrare</CardTitle>
            <CardDescription>Grupuri interne pe clinică. Nu reprezintă rută, predare curier sau livrare efectivă.</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__groups">
            <Button
              disabled={createGroup.isPending}
              onClick={() => {
                const candidate = centerQuery.data?.items.find((item) => item.logistics.status === "READY_FOR_DELIVERY");
                if (!candidate) {
                  toast.showToast({ message: "Nu există lucrare gata de livrare pentru a precompleta clinica.", title: "Grup necreat", variant: "error" });
                  return;
                }
                createGroup.mutate({ clinicId: candidate.clinic.id }, {
                  onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Grupul nu a fost creat", variant: "error" }),
                  onSuccess: () => toast.showToast({ message: "Grupul de pregătire a fost creat.", variant: "success" }),
                });
              }}
            >
              Creează grup pentru prima clinică gata
            </Button>
            {(groupsQuery.data ?? []).map((group) => (
              <div className="logistics-page__group" key={group.id}>
                <strong>{group.code}</strong>
                <span>{group.clinicName}</span>
                <span>{group.itemCount} lucrări</span>
                <StatusBadge label={group.status === "READY" ? "Gata" : group.status === "CANCELLED" ? "Anulată" : "În pregătire"} variant={group.status === "READY" ? "delivered" : group.status === "CANCELLED" ? "cancelled" : "planned"} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Drawer isOpen={selectedWorkId !== null} onOpenChange={(isOpen) => { if (!isOpen) setSelectedWorkId(null); }} title="Detaliu operațional">
        {selectedQuery.isLoading ? <LoadingState text="Se încarcă detaliul" /> : null}
        {selectedQuery.data ? <WorkDrawer work={selectedQuery.data} onTransition={runTransition} /> : null}
      </Drawer>
    </main>
  );
}

function SummaryCard({ label, onClick, value }: { readonly label: string; readonly onClick: () => void; readonly value: number }): ReactNode {
  return (
    <button className="logistics-page__summary-card" onClick={onClick} type="button">
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function WorkRow({
  canReadBilling,
  item,
  onOpen,
  onTransition,
}: {
  readonly canReadBilling: boolean;
  readonly item: LogisticsCenterItem;
  readonly onOpen: () => void;
  readonly onTransition: (workId: string, path: string, input: BlockWorkInput | LogisticsTransitionInput | UpdateLogisticsLocationInput) => void;
}): ReactNode {
  return (
    <article className="logistics-page__row">
      <button className="logistics-page__row-main" onClick={onOpen} type="button">
        <span className="logistics-page__code">{item.workCode}</span>
        <strong>{item.patientName}</strong>
        <span>{item.clinic.name} · {item.doctor.name}</span>
        <span>{item.workTypeName}</span>
      </button>
      <div className="logistics-page__row-meta">
        <div>
          <span>Prioritate</span>
          <PriorityBadge label={item.priority === "URGENT" ? "Urgent" : "Normal"} variant={item.priority === "URGENT" ? "urgent" : "normal"} />
        </div>
        <div>
          <span>Logistică</span>
          <StatusBadge label={item.logistics.statusLabel} variant={item.logistics.status === "BLOCKED" ? "rejected" : item.logistics.status === "READY_FOR_DELIVERY" ? "delivered" : "production"} />
        </div>
        <div>
          <span>Termen</span>
          <strong>{formatDate(item.requestedDeliveryDate)}</strong>
        </div>
        {canReadBilling ? (
          <div>
            <span>Facturare</span>
            <strong>{item.billing.label}</strong>
          </div>
        ) : null}
      </div>
      <div className="logistics-page__row-actions">
        {item.actions.readyForPacking ? <Button onClick={() => onTransition(item.id, "ready-for-packing", { version: item.logistics.version, workflowOverride: true })} size="small" variant="outline">De ambalat</Button> : null}
        {item.actions.startPacking ? <Button onClick={() => onTransition(item.id, "start-packing", { version: item.logistics.version })} size="small" variant="outline">Pornește ambalarea</Button> : null}
        {item.actions.completePacking ? <Button onClick={() => onTransition(item.id, "complete-packing", { version: item.logistics.version })} size="small">Gata de livrare</Button> : null}
      </div>
    </article>
  );
}

function WorkDrawer({ work, onTransition }: { readonly work: WorkLogisticsView; readonly onTransition: (workId: string, path: string, input: BlockWorkInput | LogisticsTransitionInput | UpdateLogisticsLocationInput) => void }): ReactNode {
  return (
    <div className="logistics-page__drawer">
      <section>
        <h3>{work.workCode}</h3>
        <p>{work.patientName} · {work.clinic.name} · {work.doctor.name}</p>
        <p>{work.workTypeName} · termen {formatDate(work.requestedDeliveryDate)}</p>
      </section>
      <section>
        <h3>Logistică</h3>
        <StatusBadge label={work.logistics.statusLabel} variant={work.logistics.status === "BLOCKED" ? "rejected" : "production"} />
        <Select
          label="Locație fizică"
          onChange={(event) => onTransition(work.id, "location", { locationCode: event.target.value as UpdateLogisticsLocationInput["locationCode"], version: work.logistics.version })}
          options={[{ label: "Selectează", value: "" }, ...LOGISTICS_LOCATION_CODES.map((code) => ({ label: LOGISTICS_LOCATION_LABELS[code], value: code }))]}
          value={work.logistics.locationCode ?? ""}
        />
        {work.actions.block ? (
          <Button onClick={() => onTransition(work.id, "block", { reasonCode: LOGISTICS_BLOCK_REASON_CODES[0], version: work.logistics.version })} variant="outline">
            Blochează: {LOGISTICS_BLOCK_REASON_LABELS.MISSING_INFO}
          </Button>
        ) : null}
        {work.actions.unblock ? <Button onClick={() => onTransition(work.id, "unblock", { version: work.logistics.version })}>Deblochează</Button> : null}
      </section>
      <section>
        <h3>Workflow</h3>
        <p>{work.workflow.status ?? "Fără workflow"} · {work.workflow.currentStageName ?? "Nicio etapă curentă"}</p>
        <p>{work.workflow.progressCompleted}/{work.workflow.progressTotal} etape finalizate</p>
      </section>
      <section>
        <h3>Formular lucrare</h3>
        {work.formSnapshot ? work.formSnapshot.fields.map((field) => (
          <p key={field.label}><strong>{field.label}:</strong> {field.value || "-"}</p>
        )) : <p>Nu există formular completat.</p>}
      </section>
      <section>
        <h3>Istoric logistic</h3>
        {work.events.map((event) => (
          <p key={event.id}>{formatDate(event.occurredAt)} · {event.summary} · {event.actorName ?? "Sistem"}</p>
        ))}
      </section>
    </div>
  );
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="logistics-page"><section className="dl-container logistics-page__layout">{children}</section></main>;
}
