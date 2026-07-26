import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  PriorityBadge,
  Select,
  StatusBadge,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  TECHNICIAN_QUEUE_CATEGORIES,
  getAssignmentStatusLabel,
  getTechnicianQueueCategoryLabel,
  getWorkStageExecutionStatusLabel,
  type TechnicianWorkbenchFilter,
  type TechnicianWorkbenchItem,
} from "@dental-lab/shared";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { useStartWorkflowStage, useCompleteWorkflowStage } from "../works/works-api.js";
import { useTechnicianOptions, useTechnicianWorkbench, useTechnicianWorkload } from "./technician-workbench-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { hasPermission } from "../users/users-api.js";
import "./technician-workbench-page.css";

const defaultFilters: TechnicianWorkbenchFilter = {
  page: 1,
  pageSize: 20,
  sortBy: "requestedDeliveryDate",
  sortOrder: "asc",
};
const unassignedTechnicianFilter = "__UNASSIGNED__";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

export function TechnicianWorkbenchPage(): ReactNode {
  const toast = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TechnicianWorkbenchFilter>(defaultFilters);
  const permissionsResult = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadWorkbench = hasPermission(permissionsResult.data, "technician.workbench.read");
  const canReadWorkload = hasPermission(permissionsResult.data, "technician.workload.read");
  const canAssign = hasPermission(permissionsResult.data, "workflow.assign_stage");
  const workbenchQuery = useTechnicianWorkbench(filters, canReadWorkbench);
  const workloadQuery = useTechnicianWorkload(canReadWorkload);
  const techniciansQuery = useTechnicianOptions(canReadWorkload || canAssign);
  const startMutation = useStartWorkflowStage();
  const completeMutation = useCompleteWorkflowStage();

  function startStage(item: TechnicianWorkbenchItem): void {
    startMutation.mutate({
      input: {
        expectedStageVersion: item.stage.version,
      },
      stageExecutionId: item.stage.id,
      workOrderId: item.workId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Etapa nu a fost pornită", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Etapa a fost pornită.", variant: "success" }),
    });
  }

  function completeStage(item: TechnicianWorkbenchItem): void {
    completeMutation.mutate({
      input: {
        expectedStageVersion: item.stage.version,
      },
      stageExecutionId: item.stage.id,
      workOrderId: item.workId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Etapa nu a fost finalizată", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Etapa a fost finalizată.", variant: "success" }),
    });
  }

  if (permissionsResult.isLoading) {
    return <PageState><LoadingState text="Se încarcă atelierul" /></PageState>;
  }

  if (!canReadWorkbench) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are acces la Lucrările mele." /></PageState>;
  }

  return (
    <main className="technician-workbench">
      <section className="dl-container technician-workbench__layout" aria-labelledby="workbench-title">
        <header className="technician-workbench__header">
          <div>
            <h1 id="workbench-title">Lucrările mele</h1>
            <p>{new Intl.DateTimeFormat("ro-RO", { dateStyle: "full" }).format(new Date())}</p>
          </div>
        </header>

        {workbenchQuery.data ? (
          <div className="technician-workbench__summary" aria-label="Rezumat atelier">
            <Metric label="Total activ" value={workbenchQuery.data.summary.totalActive} />
            <Metric label="De început" value={workbenchQuery.data.summary.unstarted} />
            <Metric label="În lucru" value={workbenchQuery.data.summary.inProgress} />
            <Metric label="Urgente" value={workbenchQuery.data.summary.urgent} />
            <Metric label="Astăzi" value={workbenchQuery.data.summary.dueToday} />
            <Metric label="Întârziate" value={workbenchQuery.data.summary.overdue} />
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Coada de lucru</CardTitle>
            <CardDescription>Etape curente asignate și lucrări neasignate pentru manager.</CardDescription>
          </CardHeader>
          <CardContent className="technician-workbench__content">
            <div className="technician-workbench__tabs" role="list" aria-label="Filtre rapide">
              {TECHNICIAN_QUEUE_CATEGORIES.map((category) => (
                <button
                  aria-pressed={(filters.queue ?? "ALL") === category}
                  key={category}
                  onClick={() => setFilters((current) => ({ ...current, page: 1, queue: category === "ALL" ? undefined : category }))}
                  type="button"
                >
                  {getTechnicianQueueCategoryLabel(category)}
                </button>
              ))}
            </div>

            <div className="technician-workbench__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => setFilters((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                placeholder="Cod, pacient, clinică, medic, etapă"
                type="search"
                value={filters.search ?? ""}
              />
              <Select
                label="Status etapă"
                onChange={(event) => setFilters((current) => ({ ...current, page: 1, status: event.target.value === "PENDING" || event.target.value === "IN_PROGRESS" ? event.target.value : undefined }))}
                options={[
                  { label: "Toate", value: "" },
                  { label: "De început", value: "PENDING" },
                  { label: "În lucru", value: "IN_PROGRESS" },
                ]}
                value={filters.status ?? ""}
              />
              {canReadWorkload ? (
                <Select
                  label="Tehnician"
                  onChange={(event) => setFilters((current) => ({ ...current, page: 1, technicianId: event.target.value || undefined }))}
                  options={[
                    { label: "Toți", value: "" },
                    { label: "Neasignate", value: unassignedTechnicianFilter },
                    ...(techniciansQuery.data ?? []).map((technician) => ({ label: technician.displayName, value: technician.id })),
                  ]}
                  value={filters.technicianId ?? ""}
                />
              ) : null}
            </div>

            {workbenchQuery.isLoading ? <LoadingState text="Se încarcă lucrările" /> : null}
            {workbenchQuery.isError ? <ErrorState title="Lucrările nu au fost încărcate" description={getErrorMessage(workbenchQuery.error)} /> : null}
            {workbenchQuery.data && workbenchQuery.data.items.length === 0 ? <ErrorState title="Nu există lucrări" description="Nu există etape pentru filtrele curente." /> : null}
            <div className="technician-workbench__list">
              {(workbenchQuery.data?.items ?? []).map((item) => (
                <WorkbenchItemCard
                  isCompleting={completeMutation.isPending}
                  isStarting={startMutation.isPending}
                  item={item}
                  key={item.id}
                  onComplete={() => completeStage(item)}
                  onOpen={() => navigate(`/works?workId=${item.workId}`)}
                  onStart={() => startStage(item)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {canReadWorkload ? (
          <Card>
            <CardHeader>
              <CardTitle>Încărcare tehnicieni</CardTitle>
              <CardDescription>Număr de etape active asignate.</CardDescription>
            </CardHeader>
            <CardContent>
              {workloadQuery.isLoading ? <LoadingState text="Se încarcă încărcarea" /> : null}
              <div className="technician-workbench__workload">
                {(workloadQuery.data ?? []).map((item) => (
                  <div key={item.id}>
                    <strong>{item.displayName}</strong>
                    <span>{item.totalActive} active</span>
                    <span>{item.pending} de început</span>
                    <span>{item.inProgress} în lucru</span>
                    <span>{item.overdue} întârziate</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }): ReactNode {
  return (
    <div className="technician-workbench__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkbenchItemCard({
  isCompleting,
  isStarting,
  item,
  onComplete,
  onOpen,
  onStart,
}: {
  readonly isCompleting: boolean;
  readonly isStarting: boolean;
  readonly item: TechnicianWorkbenchItem;
  readonly onComplete: () => void;
  readonly onOpen: () => void;
  readonly onStart: () => void;
}): ReactNode {
  return (
    <article className="technician-workbench__item">
      <div className="technician-workbench__item-main">
        <div>
          <strong>{item.workCode}</strong>
          <p>{item.patientName} · {item.workType.name}</p>
        </div>
        <PriorityBadge label={item.priority === "URGENT" ? "Urgent" : "Normal"} variant={item.priority === "URGENT" ? "urgent" : "normal"} />
      </div>
      <div className="technician-workbench__item-grid">
        <span>Clinică: {item.clinic.name}</span>
        <span>Medic: {item.doctor.displayName}</span>
        <span>Etapă: {item.stage.name}</span>
        <span>Termen: {formatDate(item.dueDate)}</span>
        <span>Progres: {item.progress.completed}/{item.progress.total}</span>
        <span>{getAssignmentStatusLabel(item.assignment)}</span>
      </div>
      <div className="technician-workbench__actions">
        <StatusBadge label={getWorkStageExecutionStatusLabel(item.stage.status)} variant={item.stage.status === "IN_PROGRESS" ? "production" : "awaiting"} />
        <Button onClick={onOpen} variant="outline">Deschide</Button>
        <Button disabled={item.stage.status !== "PENDING"} isLoading={isStarting} onClick={onStart} variant="outline">Începe etapa</Button>
        <Button disabled={item.stage.status !== "IN_PROGRESS"} isLoading={isCompleting} onClick={onComplete}>Finalizează etapa</Button>
      </div>
    </article>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="technician-workbench">
      <section className="dl-container technician-workbench__layout">{children}</section>
    </main>
  );
}
