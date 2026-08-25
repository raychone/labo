import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmActionModal,
  ErrorState,
  LoadingState,
  Modal,
  PriorityBadge,
  Select,
  StatusBadge,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  formatMoneyMinor,
  getCanonicalWorkOrderCompositionTeeth,
  type ClaimWorksListParams,
  type AdultFdiTooth,
  type WorkSummary,
} from "@dental-lab/shared";
import { ToothDiagram } from "../../components/dental/tooth-diagram.js";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { usePerformedTechnicianOperations, usePerformTechnicianOperation, useRemovePerformedTechnicianOperation, useTechnicianOperationOptions } from "./technician-workbench-api.js";
import { useAvailableWorksForClaim, useClaimWork, useFinalizeTechnicalWork, useMarkProbeReady, useMyClaimedWorks, useWork } from "../works/works-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useMediaQuery } from "../../lib/use-media-query.js";
import { hasPermission } from "../users/users-api.js";
import "./technician-workbench-page.css";

type WorkbenchTab = "AVAILABLE" | "MINE";

const defaultClaimFilters: ClaimWorksListParams = {
  deadlineFilter: undefined,
  page: 1,
  pageSize: 20,
  priority: undefined,
  search: undefined,
  sortBy: "createdAt",
  sortDirection: "desc",
  workTypeId: undefined,
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

export function TechnicianWorkbenchPage(): ReactNode {
  const toast = useToast();
  const navigate = useNavigate();
  const listAnchorRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<WorkbenchTab>("AVAILABLE");
  const [claimFilters, setClaimFilters] = useState<ClaimWorksListParams>(defaultClaimFilters);
  const [claimTarget, setClaimTarget] = useState<WorkSummary | null>(null);
  const [operationsTarget, setOperationsTarget] = useState<WorkSummary | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<WorkSummary | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isCompactMobile = useMediaQuery("(max-width: 719px)");
  const permissionsResult = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadWorkbench = hasPermission(permissionsResult.data, "technician.workbench.read");
  const canReadAvailable = hasPermission(permissionsResult.data, "works.claim.available.read");
  const canReadOwnClaims = hasPermission(permissionsResult.data, "works.claim.own.read");
  const canReadOperations = hasPermission(permissionsResult.data, "technician.operations.read");
  const canManageOwnOperations = hasPermission(permissionsResult.data, "technician.operations.manage_own");
  const availableQuery = useAvailableWorksForClaim(claimFilters, canReadAvailable);
  const myClaimedQuery = useMyClaimedWorks(claimFilters, canReadOwnClaims);
  const claimMutation = useClaimWork();
  const probeReadyMutation = useMarkProbeReady();
  const finalizeMutation = useFinalizeTechnicalWork();
  const visibleAvailableWorks = useMemo(
    () => pickSingleWorkbenchMatch(availableQuery.data?.items ?? [], claimFilters.search),
    [availableQuery.data?.items, claimFilters.search],
  );
  const visibleClaimedWorks = useMemo(
    () => pickSingleWorkbenchMatch(myClaimedQuery.data?.items ?? [], claimFilters.search),
    [claimFilters.search, myClaimedQuery.data?.items],
  );

  function focusWorkList(): void {
    window.setTimeout(() => {
      listAnchorRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function activateSummary(tabTarget: WorkbenchTab): void {
    setTab(tabTarget);
    focusWorkList();
  }

  function finalizeWork(work: WorkSummary): void {
    setFinalizeTarget(work);
  }

  function markProbeReady(work: WorkSummary): void {
    probeReadyMutation.mutate({ workOrderId: work.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Proba nu a fost marcată gata", variant: "error" }),
      onSuccess: () => undefined,
    });
  }

  function confirmFinalize(): void {
    if (!finalizeTarget) return;
    const work = finalizeTarget;
    finalizeMutation.mutate({ workOrderId: work.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost finalizată", variant: "error" }),
      onSuccess: () => { setFinalizeTarget(null); },
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
            <p>Lucrări de preluat și lucrările mele · {new Intl.DateTimeFormat("ro-RO", { dateStyle: "full" }).format(new Date())}</p>
          </div>
        </header>

        <div className="technician-workbench__summary" aria-label="Rezumat atelier">
          <MetricButton label="Lucrări de preluat" onClick={() => activateSummary("AVAILABLE")} value={availableQuery.data?.total ?? 0} />
          <MetricButton label="Lucrările mele" onClick={() => activateSummary("MINE")} value={myClaimedQuery.data?.total ?? 0} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tab === "AVAILABLE" ? "Lucrări de preluat" : "Lucrările mele"}</CardTitle>
            <CardDescription>{tab === "AVAILABLE" ? "Lucrări noi și nepreluate introduse în sistem." : "Lucrări preluate de tine, cu acțiunile principale de producție."}</CardDescription>
          </CardHeader>
          <CardContent className="technician-workbench__content">
            <div className="technician-workbench__tabs" role="list" aria-label="Filtre rapide">
              <button aria-pressed={tab === "AVAILABLE"} onClick={() => setTab("AVAILABLE")} type="button">Lucrări de preluat</button>
              <button aria-pressed={tab === "MINE"} onClick={() => setTab("MINE")} type="button">Lucrările mele</button>
            </div>

            <div className="technician-workbench__mobile-toolbar">
              <Button className="technician-workbench__filters-toggle" onClick={() => setMobileFiltersOpen((current) => !current)} variant="secondary">
                {mobileFiltersOpen ? "Ascunde filtrele" : "Afișează filtrele"}
              </Button>
            </div>

            {(!isCompactMobile || mobileFiltersOpen) ? (
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
            ) : null}

            <div ref={listAnchorRef}>
              {tab === "AVAILABLE" ? (
                <ClaimList
                  emptyDescription="Nu există lucrări disponibile pentru revendicare."
                  isLoading={availableQuery.isLoading}
                  error={availableQuery.error}
                  items={visibleAvailableWorks}
                  compact={isCompactMobile}
                  mode="available"
                  onClaim={setClaimTarget}
                  onDetails={(work) => navigate(`/works?workId=${work.id}`)}
                />
              ) : (
                <ClaimList
                  emptyDescription="Nu ai lucrări revendicate."
                  isLoading={myClaimedQuery.isLoading}
                  error={myClaimedQuery.error}
                  items={visibleClaimedWorks}
                  compact={isCompactMobile}
                  finalizeWorkId={finalizeMutation.isPending ? finalizeMutation.variables?.workOrderId : null}
                  onProbeReady={markProbeReady}
                  probeReadyWorkId={probeReadyMutation.isPending ? probeReadyMutation.variables?.workOrderId : null}
                  mode="mine"
                  onDetails={(work) => navigate(`/works?workId=${work.id}`)}
                  onFinalize={finalizeWork}
                  onOperations={setOperationsTarget}
                />
              )}
            </div>
          </CardContent>
        </Card>
        <ClaimWorkModal
          isLoading={claimMutation.isPending}
          isOpen={claimTarget !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setClaimTarget(null);
            }
          }}
          onSubmit={() => {
            if (!claimTarget) {
              return;
            }
            claimMutation.mutate({
              input: {
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
        <OperationsModal
          isOpen={operationsTarget !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setOperationsTarget(null);
            }
          }}
          canManageOperations={canManageOwnOperations}
          canReadOperations={canReadOperations}
          work={operationsTarget}
        />
        <ConfirmActionModal
          confirmLabel="Finalizează"
          description="Lucrarea nu va mai reveni pentru o probă nouă."
          isLoading={finalizeMutation.isPending}
          isOpen={finalizeTarget !== null}
          onCancel={() => setFinalizeTarget(null)}
          onConfirm={confirmFinalize}
          title="Finalizezi definitiv lucrarea?"
          variant="danger"
        />
      </section>
    </main>
  );
}

function MetricButton({
  label,
  onClick,
  value,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly value: number;
}): ReactNode {
  return (
    <Button className="dl-kpi technician-workbench__metric" onClick={onClick} variant="secondary">
      <span className="technician-workbench__metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </Button>
  );
}

function pickSingleWorkbenchMatch(items: readonly WorkSummary[], search: string | undefined): readonly WorkSummary[] {
  const normalizedSearch = normalizeWorkbenchSearch(search);
  if (normalizedSearch === "") {
    return items;
  }

  const exactMatches = items.filter((work) => {
    const normalizedCode = normalizeWorkbenchSearch(work.code);
    const normalizedPatient = normalizeWorkbenchSearch(work.patientName);
    const normalizedClinic = normalizeWorkbenchSearch(work.clinic?.name ?? "");
    const normalizedDoctor = normalizeWorkbenchSearch(work.doctor?.displayName ?? "");
    const normalizedWorkType = normalizeWorkbenchSearch(work.workType.name);

    return normalizedCode === normalizedSearch
      || normalizedPatient === normalizedSearch
      || normalizedClinic === normalizedSearch
      || normalizedDoctor === normalizedSearch
      || normalizedWorkType === normalizedSearch;
  });
  if (exactMatches.length > 0) {
    const [firstExactMatch] = exactMatches;
    return firstExactMatch ? [firstExactMatch] : [];
  }

  const partialMatch = items.find((work) => {
    const haystack = normalizeWorkbenchSearch([
      work.code,
      work.patientName,
      work.clinic?.name ?? "-",
      work.doctor?.displayName ?? "-",
      work.workType.name,
    ].join(" "));
    return haystack.includes(normalizedSearch);
  });

  return partialMatch ? [partialMatch] : [];
}

function normalizeWorkbenchSearch(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function ClaimList({
  compact = false,
  emptyDescription,
  error,
  finalizeWorkId,
  isLoading,
  items,
  mode,
  onClaim,
  onDetails,
  onFinalize,
  onProbeReady,
  onOperations,
  probeReadyWorkId,
}: {
  readonly compact?: boolean;
  readonly emptyDescription: string;
  readonly error: unknown;
  readonly finalizeWorkId?: string | null;
  readonly isLoading: boolean;
  readonly items: readonly WorkSummary[];
  readonly mode: "available" | "mine";
  readonly onClaim?: (work: WorkSummary) => void;
  readonly onDetails: (work: WorkSummary) => void;
  readonly onFinalize?: (work: WorkSummary) => void;
  readonly onProbeReady?: (work: WorkSummary) => void;
  readonly onOperations?: (work: WorkSummary) => void;
  readonly probeReadyWorkId?: string | null;
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
        <article className={compact ? "technician-workbench__item technician-workbench__item--compact" : "technician-workbench__item"} key={work.id}>
          <div className="technician-workbench__item-main">
            <div>
              <strong>{work.code}</strong>
              <p>{work.patientName} · {work.workType.name}</p>
            </div>
            <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />
          </div>
          <div className="technician-workbench__item-grid">
            <span>Clinică: {work.clinic?.name ?? "-"}</span>
            <span>Medic: {work.doctor?.displayName ?? "-"}</span>
            <span>Termen: {formatDate(work.deadline.effectiveDueAt ?? work.requestedDeliveryDate)}</span>
            <span>Responsabil: {work.claim.technician?.displayName ?? "Nerevendicată"}</span>
            {!compact ? <span>Companie execuție: {work.claim.executionLegalEntity?.code ?? "Neselectată"}</span> : null}
            {!compact ? <span>Context execuție: {work.executionSnapshot.summary.exists ? "Fixat" : "Nefixat"}</span> : null}
            <span>{work.cycleNumber !== null && work.cycleNumber !== undefined && work.cycleNumber > 1 ? "Probă" : "Revenire 0"}</span>
          </div>
          <div className="technician-workbench__actions">
            {mode === "available" ? (
              <>
                <StatusBadge label="Disponibilă" variant="awaiting" />
                <Button disabled={!work.claim.canCurrentUserClaim} onClick={() => onClaim?.(work)}>Preia</Button>
              </>
            ) : (
              <>
                <Button onClick={() => onDetails(work)} variant="outline">Detalii</Button>
                <Button onClick={() => onOperations?.(work)} variant="outline">Manopere</Button>
                {(work.workType.probeTypeCodes?.length ?? 0) > 0 ? <Button disabled={work.status === "FINALIZATA" || work.technicalReadiness === "PROBE_READY" || work.technicalReadiness === "FINAL_READY"} isLoading={probeReadyWorkId === work.id} onClick={() => onProbeReady?.(work)}>Probă gata</Button> : null}
                <Button aria-label="Finalizata" disabled={work.status === "FINALIZATA" || work.technicalReadiness === "PROBE_READY" || work.technicalReadiness === "FINAL_READY"} isLoading={finalizeWorkId === work.id} onClick={() => onFinalize?.(work)}>Finalizată</Button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ClaimWorkModal({
  isLoading,
  isOpen,
  onOpenChange,
  onSubmit,
  work,
}: {
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: () => void;
  readonly work: WorkSummary | null;
}): ReactNode {
  return (
    <Modal
      description={work ? `${work.code} · ${work.patientName}` : "Colaborarea clinicii stabilește automat entitatea de execuție."}
      footer={<Button isLoading={isLoading} onClick={onSubmit}>Revendică lucrarea</Button>}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Revendică lucrare"
    >
      <p className="technician-workbench__modal-note">La revendicare, entitatea de execuție este preluată automat din colaborarea clinicii.</p>
    </Modal>
  );
}

function OperationsModal({
  canManageOperations,
  canReadOperations,
  isOpen,
  onOpenChange,
  work,
}: {
  readonly canManageOperations: boolean;
  readonly canReadOperations: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly work: WorkSummary | null;
}): ReactNode {
  const toast = useToast();
  const detailQuery = useWork(work?.id ?? null, isOpen && work !== null);
  const operationsQuery = useTechnicianOperationOptions(isOpen && canReadOperations);
  const performedQuery = usePerformedTechnicianOperations(work?.id ?? null, isOpen && canReadOperations && work !== null);
  const performMutation = usePerformTechnicianOperation();
  const removeMutation = useRemovePerformedTechnicianOperation();
  const [selectedTeeth, setSelectedTeeth] = useState<readonly AdultFdiTooth[]>([]);
  useEffect(() => {
    if (isOpen) {
      setSelectedTeeth([]);
    }
  }, [isOpen, work?.id]);
  const allowedTeeth = useMemo(() => getCanonicalWorkOrderCompositionTeeth((detailQuery.data?.items ?? []).map((item) => ({
    archivedAt: item.archivedAt,
    scope: item.scope,
    teeth: item.teeth.map((tooth) => tooth.fdiTooth),
  }))), [detailQuery.data?.items]);
  const isCaseLevel = allowedTeeth.length === 0 && (detailQuery.data?.items ?? []).some((item) => item.scope === "CASE");
  const isMutating = performMutation.isPending || removeMutation.isPending;
  const workTypeVisualization = useMemo(() => {
    const palette = ["#2563eb", "#eab308", "#dc2626", "#7c3aed", "#f97316", "#0891b2", "#db2777", "#65a30d"] as const;
    const colorByWorkType = new Map<string, string>();
    const legend: { readonly color: string; readonly label: string; readonly code: string }[] = [];
    const toothColors = new Map<number, string[]>();
    for (const item of detailQuery.data?.items ?? []) {
      if (item.scope === "CASE" || !item.workType) continue;
      const key = item.workType.id;
      let color = colorByWorkType.get(key);
      if (!color) {
        color = palette[colorByWorkType.size % palette.length]!;
        colorByWorkType.set(key, color);
        legend.push({ color, label: item.workType.name, code: item.workType.symbol });
      }
      const teeth = item.workType.unit === "UNIT" ? item.teeth.slice(0, 1) : item.teeth;
      for (const tooth of teeth.map((value) => value.fdiTooth)) {
        const current = toothColors.get(tooth) ?? [];
        if (!current.includes(color)) current.push(color);
        toothColors.set(tooth, current);
      }
    }
    const resolvedToothColors: Record<number, string> = {};
    for (const [tooth, colors] of toothColors.entries()) resolvedToothColors[tooth] = colors.length === 1 ? colors[0]! : `linear-gradient(90deg, ${colors.join(", ")})`;
    return { legend, toothColors: resolvedToothColors };
  }, [detailQuery.data?.items]);

  function toggleTooth(tooth: AdultFdiTooth): void {
    setSelectedTeeth((current) => current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth]);
  }

  function toggleOperation(operationId: string): void {
    if (!work || !canManageOperations || (!isCaseLevel && selectedTeeth.length === 0) || isMutating) return;
    const activePerformed = (performedQuery.data ?? []).filter((performed) => performed.removedAt === null && performed.operation.id === operationId && (isCaseLevel || (performed.selectedTeeth ?? []).some((tooth) => selectedTeeth.includes(tooth as AdultFdiTooth))));
    if (activePerformed.length > 0) {
      for (const performed of activePerformed) removeMutation.mutate({ input: { reason: "Corecție tehnică" }, performedOperationId: performed.id });
      toast.showToast({ message: "Manopera a fost dezactivată.", variant: "success" });
      return;
    }
    performMutation.mutate({ operationId, selectedTeeth, workOrderId: work.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost adăugată", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Manopera a fost activată.", variant: "success" }),
    });
  }

  return (
    <Modal
      description={work ? `${work.code} · ${work.patientName}` : "Lista de manopere"}
      footer={<Button onClick={() => onOpenChange(false)} variant="secondary">Închide</Button>}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="full"
      title="Manopere"
    >
      {!canReadOperations ? <ErrorState title="Acces refuzat" description="Contul curent nu poate citi catalogul de manopere." /> : null}
      {canReadOperations && (operationsQuery.isLoading || performedQuery.isLoading || detailQuery.isLoading) ? <LoadingState text="Se încarcă manoperele" /> : null}
      {canReadOperations && operationsQuery.error ? <ErrorState title="Catalogul nu a fost încărcat" description={getErrorMessage(operationsQuery.error)} /> : null}
      {canReadOperations && performedQuery.error ? <ErrorState title="Manoperele lucrării nu au fost încărcate" description={getErrorMessage(performedQuery.error)} /> : null}
      {canReadOperations && !operationsQuery.isLoading && !operationsQuery.error && (operationsQuery.data?.length ?? 0) === 0 ? (
        <div className="technician-workbench__operations-empty">
          <StatusBadge label="Fără manopere" variant="awaiting" />
          <p>Nu există manopere configurate.</p>
        </div>
      ) : null}
      {canReadOperations && detailQuery.data && allowedTeeth.length === 0 && !isCaseLevel ? <p className="technician-workbench__modal-note">Nu există dinți anatomici disponibili pentru această lucrare; lucrările de tip caz nu generează dinți implicit.</p> : null}
      {canReadOperations && detailQuery.data && (allowedTeeth.length > 0 || isCaseLevel) ? (
        <div className="technician-workbench__operations-editor">
          {allowedTeeth.length > 0 ? <>
            <h3>Selectează dinții</h3>
            <ToothDiagram
              availableTeeth={allowedTeeth}
              configuredTeeth={allowedTeeth}
              connections={detailQuery.data.toothConnections}
              mode="technician-operation-selection"
              selectedTeeth={selectedTeeth as never}
              toothColors={workTypeVisualization.toothColors}
              onToothToggle={toggleTooth}
              showShortcuts={false}
            />
            {workTypeVisualization.legend.length > 0 ? <div className="technician-workbench__operation-legend" aria-label="Legendă tipuri de lucrări">
              {workTypeVisualization.legend.map((entry) => <span key={`${entry.code}-${entry.label}`}><i aria-hidden="true" style={{ background: entry.color }} />{entry.code} · {entry.label}</span>)}
            </div> : null}
          </> : <p className="technician-workbench__modal-note">Lucrare de tip caz: manopera se înregistrează pentru o lucrare.</p>}
          <div className="technician-workbench__operation-categories" aria-label="Catalog manopere">
            {Object.entries((operationsQuery.data ?? []).reduce<Record<string, typeof operationsQuery.data>>((groups, operation) => {
              const category = operation.category || "Altele";
              groups[category] = [...(groups[category] ?? []), operation];
              return groups;
            }, {})).map(([category, operations]) => (
              <section key={category} className="technician-workbench__operation-category" aria-labelledby={`operation-category-${category}`}>
                <h3 id={`operation-category-${category}`}>{category}</h3>
                <div className="technician-workbench__operation-grid">
                  {(operations ?? []).map((operation) => {
                    const active = (isCaseLevel || selectedTeeth.length > 0) && (performedQuery.data ?? []).some((performed) => performed.removedAt === null && performed.operation.id === operation.id && (isCaseLevel || (performed.selectedTeeth ?? []).some((tooth) => selectedTeeth.includes(tooth as AdultFdiTooth))));
                    return <button
                      aria-pressed={active}
                      className={`technician-workbench__operation-card${active ? " technician-workbench__operation-card--active" : ""}`}
                      disabled={!canManageOperations || (!isCaseLevel && selectedTeeth.length === 0) || isMutating}
                      key={operation.id}
                      onClick={() => toggleOperation(operation.id)}
                      type="button"
                    >{operation.name}</button>;
                  })}
                </div>
              </section>
            ))}
          </div>
          <p className="technician-workbench__modal-note">Click pe o manoperă pentru activare. Click din nou pe cardul verde o dezactivează pentru dinții selectați.</p>
        </div>
      ) : null}
      {canReadOperations && (performedQuery.data?.length ?? 0) > 0 ? (
        <div className="technician-workbench__performed-list">
          <h3>Manopere înregistrate</h3>
          {(performedQuery.data ?? []).map((performed) => (
            <article className={`technician-workbench__performed-row${performed.removedAt === null ? " technician-workbench__performed-row--active" : ""}`} key={performed.id}>
              <strong>{performed.operationNameSnapshot ?? performed.operation.name}</strong>
              <span>{(performed.selectedTeeth ?? []).length > 0 ? `Dinți: ${(performed.selectedTeeth ?? []).join(", ")}` : "Manoperă de caz"} · {performed.quantity ?? "-"} × {performed.rateMinorSnapshot === null || performed.rateMinorSnapshot === undefined ? "-" : formatMoneyMinor(performed.rateMinorSnapshot, performed.currency, "ro-RO")} = {formatMoneyMinor(performed.earningMinor, performed.currency, "ro-RO")}</span>
              {performed.removedAt ? <span>Eliminată · {performed.removalReason ?? "fără motiv"}</span> : null}
            </article>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="technician-workbench">
      <section className="dl-container technician-workbench__layout">{children}</section>
    </main>
  );
}
