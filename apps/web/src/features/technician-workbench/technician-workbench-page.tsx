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
import { useAvailableWorksForClaim, useClaimWork, useFinalizeTechnicalWork, useMarkProbeReady, useMyClaimedWorks, useReleaseWork, useWork } from "../works/works-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useMediaQuery } from "../../lib/use-media-query.js";
import { hasPermission } from "../users/users-api.js";
import "./technician-workbench-page.css";

type WorkbenchTab = "AVAILABLE" | "MINE";
type CompletionTarget = { readonly action: "FINALIZE" | "PROBE_READY"; readonly work: WorkSummary };

function currentCompletionCompany(work: WorkSummary): "" | "CDT" | "NG" {
  const code = work.executionSnapshot.summary.legalEntity?.code ?? work.claim.executionLegalEntity?.code;
  return code === "CDT" || code === "NG" ? code : "";
}

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
  const [tab, setTab] = useState<WorkbenchTab>(() => new URLSearchParams(window.location.search).get("tab") === "mine" ? "MINE" : "AVAILABLE");
  const [claimFilters, setClaimFilters] = useState<ClaimWorksListParams>(defaultClaimFilters);
  const [operationsTarget, setOperationsTarget] = useState<WorkSummary | null>(null);
  const [completionTarget, setCompletionTarget] = useState<CompletionTarget | null>(null);
  const [completionCompany, setCompletionCompany] = useState<"" | "CDT" | "NG">("");
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
  const releaseMutation = useReleaseWork();
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
    const next = new URLSearchParams(window.location.search);
    next.set("tab", tabTarget === "MINE" ? "mine" : "available");
    window.history.replaceState(null, "", `${window.location.pathname}?${next.toString()}`);
    focusWorkList();
  }

  function selectTab(tabTarget: WorkbenchTab): void {
    setTab(tabTarget);
    const next = new URLSearchParams(window.location.search);
    next.set("tab", tabTarget === "MINE" ? "mine" : "available");
    window.history.replaceState(null, "", `${window.location.pathname}?${next.toString()}`);
  }

  function finalizeWork(work: WorkSummary): void {
    setCompletionCompany(currentCompletionCompany(work));
    setCompletionTarget({ action: "FINALIZE", work });
  }

  function claimWork(work: WorkSummary): void {
    claimMutation.mutate({
      input: { expectedClaimRevision: work.claim.revision },
      workOrderId: work.id,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost revendicată", variant: "error" }),
      onSuccess: () => {
        selectTab("MINE");
        toast.showToast({ message: "Lucrarea a fost preluată, iar contextul de execuție a fost fixat.", variant: "success" });
      },
    });
  }

  function markProbeReady(work: WorkSummary): void {
    setCompletionCompany(currentCompletionCompany(work));
    setCompletionTarget({ action: "PROBE_READY", work });
  }

  function confirmCompletion(): void {
    if (!completionTarget || !completionCompany) return;
    const { action, work } = completionTarget;
    const mutation = action === "PROBE_READY" ? probeReadyMutation : finalizeMutation;
    mutation.mutate({ executionLegalEntityCode: completionCompany, workOrderId: work.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Proba nu a fost marcată gata", variant: "error" }),
      onSuccess: () => setCompletionTarget(null),
    });
  }

  function releaseTechnicianWork(work: WorkSummary): void {
    if (!window.confirm(`Eliberezi lucrarea ${work.code} pentru un alt tehnician?`)) return;
    releaseMutation.mutate({ input: { expectedClaimRevision: work.claim.revision, reason: "Eliberată de tehnician." }, workOrderId: work.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost eliberată", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Lucrarea a fost eliberată și poate fi preluată de alt tehnician.", variant: "success" }),
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
              <button aria-pressed={tab === "AVAILABLE"} onClick={() => selectTab("AVAILABLE")} type="button">Lucrări de preluat</button>
              <button aria-pressed={tab === "MINE"} onClick={() => selectTab("MINE")} type="button">Lucrările mele</button>
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
                  onClaim={claimWork}
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
                  onRelease={releaseTechnicianWork}
                  onOperations={setOperationsTarget}
                />
              )}
            </div>
          </CardContent>
        </Card>
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
        <Modal
          footer={<div className="dl-form-confirm-actions"><Button disabled={probeReadyMutation.isPending || finalizeMutation.isPending} onClick={() => setCompletionTarget(null)} type="button" variant="secondary">Renunță</Button><Button disabled={!completionCompany} isLoading={probeReadyMutation.isPending || finalizeMutation.isPending} onClick={confirmCompletion} type="button" variant={completionTarget?.action === "FINALIZE" ? "danger" : "primary"}>{completionTarget?.action === "FINALIZE" ? "Finalizează" : "Marchează gata"}</Button></div>}
          isOpen={completionTarget !== null}
          onOpenChange={(open) => { if (!open && !probeReadyMutation.isPending && !finalizeMutation.isPending) setCompletionTarget(null); }}
          size="sm"
          title={completionTarget?.action === "FINALIZE" ? "Finalizezi definitiv lucrarea?" : "Marchezi proba gata?"}
        >
          {completionCompany ? <p>Firma <strong>{completionCompany}</strong> este deja fixată pentru această lucrare și va fi folosită pentru plata tehnicianului și facturare.</p> : <><p>Selectează firma care va fi folosită pentru plata tehnicianului și facturare.</p><Select label="Firmă" onChange={(event) => setCompletionCompany(event.target.value as "" | "CDT" | "NG")} options={[{ label: "CDT", value: "CDT" }, { label: "NG", value: "NG" }]} placeholder="Alege firma" value={completionCompany} /></>}
        </Modal>
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
  onRelease,
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
  readonly onRelease?: (work: WorkSummary) => void;
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
            <span>
              {work.probeTypeNames?.length
                ? `Proba ${work.cycleNumber ?? 1}: ${work.probeTypeNames.join(" + ")}`
                : `Proba ${work.cycleNumber ?? 1}`}
            </span>
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
                <Button onClick={() => onRelease?.(work)} variant="outline">Eliberează</Button>
                <Button disabled={work.status === "FINALIZATA" || work.technicalReadiness === "PROBE_READY" || work.technicalReadiness === "FINAL_READY"} isLoading={probeReadyWorkId === work.id} onClick={() => onProbeReady?.(work)}>Probă gata</Button>
                <Button aria-label="Finalizata" disabled={work.status === "FINALIZATA" || work.technicalReadiness === "PROBE_READY" || work.technicalReadiness === "FINAL_READY"} isLoading={finalizeWorkId === work.id} onClick={() => onFinalize?.(work)}>Finalizată</Button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
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
        color = item.workType.colorHex ?? palette[colorByWorkType.size % palette.length]!;
        colorByWorkType.set(key, color);
        legend.push({ color, label: item.workType.name, code: item.workType.symbol });
      }
      for (const tooth of item.teeth.map((value) => value.fdiTooth)) {
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
    const activePerformed = (performedQuery.data ?? []).filter((performed) => performed.removedAt === null && performed.operation.id === operationId);
    if (isCaseLevel) {
      const caseOperation = activePerformed.find((performed) => (performed.selectedTeeth ?? []).length === 0);
      if (caseOperation) {
        removeMutation.mutate({ input: { reason: "Corecție tehnică" }, performedOperationId: caseOperation.id });
        toast.showToast({ message: "Manopera a fost dezactivată.", variant: "success" });
        return;
      }
    }

    const selectedSet = new Set(selectedTeeth);
    const coveredTeeth = new Set(activePerformed.flatMap((performed) => performed.selectedTeeth ?? []).filter((tooth) => selectedSet.has(tooth as AdultFdiTooth)));
    const teethToRemove = selectedTeeth.filter((tooth) => coveredTeeth.has(tooth));
    if (!isCaseLevel && teethToRemove.length === selectedTeeth.length) {
      const affectedOperations = activePerformed.filter((performed) => (performed.selectedTeeth ?? []).some((tooth) => coveredTeeth.has(tooth as AdultFdiTooth)));
      for (const performed of affectedOperations) {
        const remainingTeeth = (performed.selectedTeeth ?? []).filter((tooth) => !coveredTeeth.has(tooth as AdultFdiTooth)) as AdultFdiTooth[];
        removeMutation.mutate({ input: { reason: "Corecție tehnică" }, performedOperationId: performed.id, }, {
          onSuccess: () => {
            if (remainingTeeth.length > 0) performMutation.mutate({ operationId, selectedTeeth: remainingTeeth, workOrderId: work.id });
          },
        });
      }
      toast.showToast({ message: `Manopera a fost eliminată de pe ${teethToRemove.length === 1 ? "dinte" : "dinții"} selectat${teethToRemove.length === 1 ? "" : "i"}.`, variant: "success" });
      return;
    }

    const teeth = isCaseLevel ? [] as readonly AdultFdiTooth[] : selectedTeeth.filter((tooth) => !coveredTeeth.has(tooth));
    if (!isCaseLevel && teeth.length === 0) return;
    performMutation.mutate({ operationId, selectedTeeth: teeth, workOrderId: work.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost adăugată", variant: "error" }),
      onSuccess: () => toast.showToast({ message: `Manopera a fost activată${teeth.length > 1 ? ` pentru ${teeth.length} dinți` : ""}.`, variant: "success" }),
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
      {detailQuery.data?.activeProbeCycle ? (
        <section className="technician-workbench__probe-context" aria-label="Proba activă pentru manopere">
          <div>
            <span>Etapa curentă</span>
            <strong>
              {detailQuery.data.activeProbeCycle.sequence === 0 ? "Proba inițială" : `Proba ${detailQuery.data.activeProbeCycle.sequence}`}
              {detailQuery.data.activeProbeCycle.probeTypeNameSnapshot ? ` · ${detailQuery.data.activeProbeCycle.probeTypeNameSnapshot}` : ""}
            </strong>
          </div>
          <span>Manoperele adăugate aici se înregistrează pentru această probă.</span>
        </section>
      ) : null}
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
            <div aria-live="polite" className="technician-workbench__selected-teeth-preview">
              <strong>Dinți selectați:</strong>
              <span>{selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "niciun dinte"}</span>
            </div>
            <ToothDiagram
              availableTeeth={allowedTeeth}
              configuredTeeth={allowedTeeth}
              connections={detailQuery.data.toothConnections}
              mode="technician-operation-selection"
              selectedTeeth={selectedTeeth as never}
              toothColors={workTypeVisualization.toothColors}
              onToothToggle={toggleTooth}
              onShortcut={(teeth) => setSelectedTeeth(teeth.filter((tooth) => allowedTeeth.includes(tooth)))}
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
                    const active = (isCaseLevel || selectedTeeth.length > 0) && (performedQuery.data ?? []).filter((performed) => performed.removedAt === null && performed.operation.id === operation.id).some((performed) => {
                      if (isCaseLevel) return (performed.selectedTeeth ?? []).length === 0;
                      const performedTeeth = new Set(performed.selectedTeeth ?? []);
                      return selectedTeeth.every((tooth) => performedTeeth.has(tooth));
                    });
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
          <p className="technician-workbench__modal-note">Selectează unul sau mai mulți dinți, apoi apasă manopera. Se va salva o singură manoperă cu cantitatea egală cu numărul dinților selectați. Click din nou pe cardul verde o dezactivează pentru aceeași selecție.</p>
        </div>
      ) : null}
      {canReadOperations && (performedQuery.data?.length ?? 0) > 0 ? (
        <div className="technician-workbench__performed-list">
          <h3>Manopere înregistrate</h3>
          {(performedQuery.data ?? []).map((performed) => (
            <article className={`technician-workbench__performed-row${performed.removedAt === null ? " technician-workbench__performed-row--active" : ""}`} key={performed.id}>
              <strong>{performed.operationNameSnapshot ?? performed.operation.name}</strong>
              <span>
                Proba {performed.probeCycle?.sequence ?? detailQuery.data?.activeProbeCycle?.sequence ?? work?.cycleNumber ?? 1} · {(performed.selectedTeeth ?? []).length > 0 ? `Dinți: ${(performed.selectedTeeth ?? []).join(", ")}` : "Manoperă de caz"} · {performed.quantity ?? "-"} × {performed.rateMinorSnapshot === null || performed.rateMinorSnapshot === undefined ? "-" : formatMoneyMinor(performed.rateMinorSnapshot, performed.currency, "ro-RO")} = {formatMoneyMinor(performed.earningMinor, performed.currency, "ro-RO")}
              </span>
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
