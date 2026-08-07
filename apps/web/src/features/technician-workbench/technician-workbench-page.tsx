import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  Modal,
  PriorityBadge,
  RadioGroup,
  Select,
  StatusBadge,
  TextInput,
  Textarea,
  useToast,
} from "@dental-lab/ui";
import {
  LEGAL_ENTITY_CODES,
  TECHNICIAN_QUEUE_CATEGORIES,
  getAssignmentStatusLabel,
  getLegalEntityDisplayName,
  getTechnicianQueueCategoryLabel,
  getWorkStageExecutionStatusLabel,
  type ClaimWorksListParams,
  type LegalEntityCode,
  type TechnicianWorkbenchFilter,
  type TechnicianWorkbenchItem,
  type WorkSummary,
} from "@dental-lab/shared";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys, useAuthState } from "../../app/auth-state.js";
import { fetchPermissions } from "../auth/auth-api.js";
import { updateCurrentUserProfile } from "../auth/auth-api.js";
import { fetchOrganizationContext } from "../organization-context/organization-context-api.js";
import { useAvailableWorksForClaim, useClaimWork, useReleaseWork, useStartWorkflowStage, useCompleteWorkflowStage, useMyClaimedWorks } from "../works/works-api.js";
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
type WorkbenchTab = "AVAILABLE" | "MINE";

const defaultClaimFilters: ClaimWorksListParams = {
  deadlineFilter: undefined,
  page: 1,
  pageSize: 20,
  priority: undefined,
  search: undefined,
  sortBy: "effectiveDueAt",
  sortDirection: "asc",
  workTypeId: undefined,
};

const technicianColorSwatches = ["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#15803d", "#334155", "#b45309"] as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

export function TechnicianWorkbenchPage(): ReactNode {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authState = useAuthState();
  const [tab, setTab] = useState<WorkbenchTab>("AVAILABLE");
  const [filters, setFilters] = useState<TechnicianWorkbenchFilter>(defaultFilters);
  const [claimFilters, setClaimFilters] = useState<ClaimWorksListParams>(defaultClaimFilters);
  const [claimTarget, setClaimTarget] = useState<WorkSummary | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<WorkSummary | null>(null);
  const permissionsResult = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const organizationQuery = useQuery({ queryFn: fetchOrganizationContext, queryKey: ["organization-context"], retry: false });
  const canReadWorkbench = hasPermission(permissionsResult.data, "technician.workbench.read");
  const canReadAvailable = hasPermission(permissionsResult.data, "works.claim.available.read");
  const canReadOwnClaims = hasPermission(permissionsResult.data, "works.claim.own.read");
  const canReadWorkload = hasPermission(permissionsResult.data, "technician.workload.read");
  const canAssign = hasPermission(permissionsResult.data, "workflow.assign_stage");
  const workbenchQuery = useTechnicianWorkbench(filters, canReadWorkbench);
  const availableQuery = useAvailableWorksForClaim(claimFilters, canReadAvailable && tab === "AVAILABLE");
  const myClaimedQuery = useMyClaimedWorks(claimFilters, canReadOwnClaims && tab === "MINE");
  const workloadQuery = useTechnicianWorkload(canReadWorkload);
  const techniciansQuery = useTechnicianOptions(canReadWorkload || canAssign);
  const startMutation = useStartWorkflowStage();
  const completeMutation = useCompleteWorkflowStage();
  const claimMutation = useClaimWork();
  const releaseMutation = useReleaseWork();
  const updateProfileMutation = useMutation({
    mutationFn: updateCurrentUserProfile,
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Culoarea nu a fost salvată", variant: "error" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.permissions });
      toast.showToast({ message: "Culoarea tehnicianului a fost salvată.", variant: "success" });
    },
  });

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
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are acces la atelierul tehnicianului." /></PageState>;
  }

  return (
    <main className="technician-workbench">
      <section className="dl-container technician-workbench__layout" aria-labelledby="workbench-title">
        <header className="technician-workbench__header">
          <div>
            <h1 id="workbench-title">Atelier tehnician</h1>
            <p>Lucrări disponibile, lucrările mele și coada de etape · {new Intl.DateTimeFormat("ro-RO", { dateStyle: "full" }).format(new Date())}</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Culoare tehnician</CardTitle>
            <CardDescription>Alege o culoare care te identifică în status și în lista de lucrări.</CardDescription>
          </CardHeader>
          <CardContent className="technician-workbench__color-panel">
            <div
              className="technician-workbench__color-swatch"
              aria-label="Culoare curentă"
              style={{ backgroundColor: authState.user?.preferredColor ?? "#e5e7eb" }}
            />
            <div className="technician-workbench__color-swatches" role="list" aria-label="Culori disponibile">
              {technicianColorSwatches.map((color) => (
                <button
                  aria-pressed={(authState.user?.preferredColor ?? "") === color}
                  aria-label={`Alege culoarea ${color}`}
                  key={color}
                  onClick={() => updateProfileMutation.mutate({ preferredColor: color })}
                  type="button"
                  className="technician-workbench__color-button"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <label className="technician-workbench__custom-color">
              <span>Culoare personalizată</span>
              <input
                aria-label="Culoare personalizată"
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                    updateProfileMutation.mutate({ preferredColor: value });
                  }
                }}
                type="color"
                value={authState.user?.preferredColor ?? "#0f766e"}
              />
            </label>
          </CardContent>
        </Card>

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
            <CardTitle>Responsabilitate lucrări</CardTitle>
            <CardDescription>Preia lucrări disponibile, apoi continuă din lista proprie.</CardDescription>
          </CardHeader>
          <CardContent className="technician-workbench__content">
            <div className="technician-workbench__tabs" role="list" aria-label="Filtre rapide">
              <button aria-pressed={tab === "AVAILABLE"} onClick={() => setTab("AVAILABLE")} type="button">Lucrări disponibile</button>
              <button aria-pressed={tab === "MINE"} onClick={() => setTab("MINE")} type="button">Lucrările mele</button>
            </div>

            <div className="technician-workbench__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => setClaimFilters((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                placeholder="Cod, pacient, clinică, medic"
                type="search"
                value={claimFilters.search ?? ""}
              />
              <Select
                label="Prioritate"
                onChange={(event) => setClaimFilters((current) => ({ ...current, page: 1, priority: event.target.value === "URGENT" ? "URGENT" : event.target.value === "NORMAL" ? "NORMAL" : undefined }))}
                options={[
                  { label: "Toate", value: "" },
                  { label: "Normal", value: "NORMAL" },
                  { label: "Urgent", value: "URGENT" },
                ]}
                value={claimFilters.priority ?? ""}
              />
            </div>

            {tab === "AVAILABLE" ? (
              <ClaimList
                emptyDescription="Nu există lucrări disponibile pentru revendicare."
                isLoading={availableQuery.isLoading}
                error={availableQuery.error}
                items={availableQuery.data?.items ?? []}
                actionLabel="Preia"
                onAction={setClaimTarget}
                onOpen={(work) => navigate(`/works?workId=${work.id}`)}
                showRelease={false}
              />
            ) : (
              <ClaimList
                emptyDescription="Nu ai lucrări revendicate."
                isLoading={myClaimedQuery.isLoading}
                error={myClaimedQuery.error}
                items={myClaimedQuery.data?.items ?? []}
                actionLabel="Eliberează"
                onAction={setReleaseTarget}
                onOpen={(work) => navigate(`/works?workId=${work.id}`)}
                showRelease
              />
            )}
          </CardContent>
        </Card>

        {tab === "MINE" ? (
          <Card>
            <CardHeader>
              <CardTitle>Coada de etape</CardTitle>
              <CardDescription>Etape curente asignate în fluxul de producție, filtrate pentru lucru rapid.</CardDescription>
            </CardHeader>
            <CardContent className="technician-workbench__content">
              <div className="technician-workbench__tabs" role="list" aria-label="Filtre etape">
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
        ) : null}

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
        <ClaimWorkModal
          isLoading={claimMutation.isPending}
          isOpen={claimTarget !== null}
          legalEntityCodes={(organizationQuery.data?.available.map((entity) => entity.code) ?? [...LEGAL_ENTITY_CODES])}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setClaimTarget(null);
            }
          }}
          onSubmit={(executionLegalEntityCode) => {
            if (!claimTarget) {
              return;
            }
            claimMutation.mutate({
              input: {
                executionLegalEntityCode,
                expectedClaimRevision: claimTarget.claim.revision,
              },
              workOrderId: claimTarget.id,
            }, {
              onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost revendicată", variant: "error" }),
              onSuccess: () => {
                setClaimTarget(null);
                setTab("MINE");
                toast.showToast({ message: "Lucrarea a fost preluată, iar contextul de execuție a fost fixat.", variant: "success" });
              },
            });
          }}
          work={claimTarget}
        />
        <ReleaseWorkModal
          isLoading={releaseMutation.isPending}
          isOpen={releaseTarget !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setReleaseTarget(null);
            }
          }}
          onSubmit={(reason) => {
            if (!releaseTarget) {
              return;
            }
            releaseMutation.mutate({
              input: {
                expectedClaimRevision: releaseTarget.claim.revision,
                reason,
              },
              workOrderId: releaseTarget.id,
            }, {
              onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost eliberată", variant: "error" }),
              onSuccess: (work) => {
                setReleaseTarget(null);
                toast.showToast({ message: `${work.code} a fost eliberată.`, variant: "success" });
              },
            });
          }}
          work={releaseTarget}
        />
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

function ClaimList({
  actionLabel,
  emptyDescription,
  error,
  isLoading,
  items,
  onAction,
  onOpen,
  showRelease,
}: {
  readonly actionLabel: string;
  readonly emptyDescription: string;
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly items: readonly WorkSummary[];
  readonly onAction: (work: WorkSummary) => void;
  readonly onOpen: (work: WorkSummary) => void;
  readonly showRelease: boolean;
}): ReactNode {
  if (isLoading) {
    return <LoadingState text="Se încarcă lucrările" />;
  }
  if (error) {
    return <ErrorState title="Lucrările nu au fost încărcate" description={getErrorMessage(error)} />;
  }
  if (items.length === 0) {
    return <ErrorState title="Nu există lucrări" description={emptyDescription} />;
  }

  return (
    <div className="technician-workbench__list">
      {items.map((work) => (
        <article className="technician-workbench__item" key={work.id}>
          <div className="technician-workbench__item-main">
            <div>
              <strong>{work.code}</strong>
              <p>{work.patientName} · {work.workType.name}</p>
            </div>
            <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />
          </div>
          <div className="technician-workbench__item-grid">
            <span>Clinică: {work.clinic.name}</span>
            <span>Medic: {work.doctor.displayName}</span>
            <span>Termen: {formatDate(work.deadline.effectiveDueAt ?? work.requestedDeliveryDate)}</span>
            <span>Responsabil: {work.claim.technician?.displayName ?? "Nerevendicată"}</span>
            <span>Companie execuție: {work.claim.executionLegalEntity?.code ?? "Neselectată"}</span>
            <span>Context execuție: {work.executionSnapshot.summary.exists ? "Fixat" : "Nefixat"}</span>
            <span>Revizie responsabilitate: {work.claim.revision}</span>
          </div>
          <div className="technician-workbench__actions">
            <StatusBadge label={work.claim.status === "CLAIMED" ? "Revendicată" : "Disponibilă"} variant={work.claim.status === "CLAIMED" ? "production" : "awaiting"} />
            <Button onClick={() => onOpen(work)} variant="outline">Deschide</Button>
            <Button disabled={showRelease ? !work.claim.canCurrentUserRelease : !work.claim.canCurrentUserClaim} onClick={() => onAction(work)}>
              {actionLabel}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClaimWorkModal({
  isLoading,
  isOpen,
  legalEntityCodes,
  onOpenChange,
  onSubmit,
  work,
}: {
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly legalEntityCodes: readonly LegalEntityCode[];
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (executionLegalEntityCode: LegalEntityCode) => void;
  readonly work: WorkSummary | null;
}): ReactNode {
  const [selectedCode, setSelectedCode] = useState<LegalEntityCode>("NC");
  const fixedCode = work?.executionSnapshot.summary.legalEntity?.code ?? null;

  useEffect(() => {
    if (isOpen) {
      setSelectedCode(fixedCode ?? legalEntityCodes[0] ?? "NC");
    }
  }, [fixedCode, isOpen, legalEntityCodes]);

  return (
    <Modal
      description={work ? `${work.code} · ${work.patientName}` : "Alege compania de execuție."}
      footer={<Button isLoading={isLoading} onClick={() => onSubmit(selectedCode)}>Revendică lucrarea</Button>}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Revendică lucrare"
    >
      <p className="technician-workbench__modal-note">
        {fixedCode
          ? "Firma a fost deja stabilită la prima preluare."
          : "Prin preluare, firma și termenul de execuție vor fi fixate pentru această lucrare."}
      </p>
      <RadioGroup
        label="Companie de execuție"
        name="executionLegalEntityCode"
        onValueChange={(value) => {
          if (value === "NC" || value === "NG") {
            setSelectedCode(value);
          }
        }}
        options={legalEntityCodes.map((code) => ({
          description: getLegalEntityDisplayName(code),
          label: code,
          value: code,
        }))}
        required
        disabled={fixedCode !== null}
        value={selectedCode}
      />
    </Modal>
  );
}

function ReleaseWorkModal({
  isLoading,
  isOpen,
  onOpenChange,
  onSubmit,
  work,
}: {
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (reason: string) => void;
  readonly work: WorkSummary | null;
}): ReactNode {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason("");
    }
  }, [isOpen]);

  return (
    <Modal
      description={work ? `${work.code} · ${work.patientName}` : "Motivul rămâne în istoricul de responsabilitate."}
      footer={<Button disabled={reason.trim().length < 3} isLoading={isLoading} onClick={() => onSubmit(reason.trim())}>Eliberează lucrarea</Button>}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Eliberează responsabilitatea"
    >
      <p className="technician-workbench__modal-note">
        Eliberarea lucrării nu va modifica firma, prețul sau termenul deja fixate.
      </p>
      <Textarea label="Motiv" onChange={(event) => setReason(event.target.value)} required rows={4} value={reason} />
    </Modal>
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
        <span>Fișă: {item.realLabSheet.label}{item.realLabSheet.cycleNumber ? ` · Ciclul ${item.realLabSheet.cycleNumber}` : ""}</span>
        <span>{getAssignmentStatusLabel(item.assignment)}</span>
      </div>
      <div className="technician-workbench__actions">
        <StatusBadge label={getWorkStageExecutionStatusLabel(item.stage.status)} variant={item.stage.status === "IN_PROGRESS" ? "production" : "awaiting"} />
        <StatusBadge label={item.realLabSheet.label} variant={item.realLabSheet.status === "FINALIZED" ? "closed" : item.realLabSheet.status === "COMPLETE" ? "production" : "awaiting"} />
        <Button onClick={onOpen} variant="outline">Deschide</Button>
        <Button onClick={onOpen} variant="outline">{item.realLabSheet.status === "NOT_STARTED" ? "Completează fișa" : "Continuă fișa"}</Button>
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
