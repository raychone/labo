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
  getLegalEntityDisplayName,
  type ClaimWorksListParams,
  type LegalEntityCode,
  type WorkDetail,
  type WorkSummary,
} from "@dental-lab/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchOrganizationContext } from "../organization-context/organization-context-api.js";
import { usePerformedTechnicianOperations, usePerformTechnicianOperation, useRemovePerformedTechnicianOperation, useTechnicianOperationOptions } from "./technician-workbench-api.js";
import { useAvailableWorksForClaim, useClaimWork, useMyClaimedWorks, useSetWorkStatus, useUpdateTechnicianWorkDetails, useWork } from "../works/works-api.js";
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
  const [detailsTarget, setDetailsTarget] = useState<WorkSummary | null>(null);
  const [operationsTarget, setOperationsTarget] = useState<WorkSummary | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isCompactMobile = useMediaQuery("(max-width: 719px)");
  const permissionsResult = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const organizationQuery = useQuery({ queryFn: fetchOrganizationContext, queryKey: ["organization-context"], retry: false });
  const canReadWorkbench = hasPermission(permissionsResult.data, "technician.workbench.read");
  const canReadAvailable = hasPermission(permissionsResult.data, "works.claim.available.read");
  const canReadOwnClaims = hasPermission(permissionsResult.data, "works.claim.own.read");
  const canReadOperations = hasPermission(permissionsResult.data, "technician.operations.read");
  const canManageOwnOperations = hasPermission(permissionsResult.data, "technician.operations.manage_own");
  const availableQuery = useAvailableWorksForClaim(claimFilters, canReadAvailable);
  const myClaimedQuery = useMyClaimedWorks(claimFilters, canReadOwnClaims);
  const detailsQuery = useWork(detailsTarget?.id ?? null, detailsTarget !== null);
  const claimMutation = useClaimWork();
  const finalizeMutation = useSetWorkStatus();
  const technicianDetailsMutation = useUpdateTechnicianWorkDetails();
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
    finalizeMutation.mutate({
      input: {
        reason: "Finalizată de tehnician din atelier.",
        status: "FINALIZATA",
      },
      workOrderId: work.id,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost finalizată", variant: "error" }),
      onSuccess: (updatedWork) => toast.showToast({ message: `${updatedWork.code} a fost finalizată.`, variant: "success" }),
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
                  mode="mine"
                  onDetails={setDetailsTarget}
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
        <TechnicianDetailsModal
          error={detailsQuery.error}
          isLoading={detailsQuery.isLoading}
          isOpen={detailsTarget !== null}
          isSaving={technicianDetailsMutation.isPending}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDetailsTarget(null);
            }
          }}
          onSubmit={(input) => {
            if (!detailsTarget) {
              return;
            }
            technicianDetailsMutation.mutate({
              input,
              workOrderId: detailsTarget.id,
            }, {
              onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Detaliile nu au fost salvate", variant: "error" }),
              onSuccess: (work) => {
                setDetailsTarget(null);
                toast.showToast({ message: `${work.code} a fost actualizată.`, variant: "success" });
              },
            });
          }}
          onOpenFullDetails={(workId) => navigate(`/works?workId=${workId}`)}
          work={detailsQuery.data ?? null}
          workSummary={detailsTarget}
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
    <Button className="technician-workbench__metric" onClick={onClick} variant="secondary">
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
  onOperations,
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
  readonly onOperations?: (work: WorkSummary) => void;
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
            <span>Revizie responsabilitate: {work.claim.revision}</span>
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
                <Button disabled={work.status === "FINALIZATA"} isLoading={finalizeWorkId === work.id} onClick={() => onFinalize?.(work)}>Finalizata</Button>
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
  const [selectedCode, setSelectedCode] = useState<LegalEntityCode>("CDT");
  const fixedCode = work?.executionSnapshot.summary.legalEntity?.code ?? null;

  useEffect(() => {
    if (isOpen) {
      setSelectedCode(fixedCode ?? legalEntityCodes[0] ?? "CDT");
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
          if (value === "CDT" || value === "NG") {
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

function TechnicianDetailsModal({
  error,
  isLoading,
  isOpen,
  isSaving,
  onOpenChange,
  onOpenFullDetails,
  onSubmit,
  work,
  workSummary,
}: {
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onOpenFullDetails: (workId: string) => void;
  readonly onSubmit: (input: { readonly clinicalNotes?: string | null; readonly internalNotes?: string | null; readonly technicalCodeNotes?: string | null }) => void;
  readonly work: WorkDetail | null;
  readonly workSummary: WorkSummary | null;
}): ReactNode {
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [technicalCodeNotes, setTechnicalCodeNotes] = useState("");

  useEffect(() => {
    if (work) {
      setClinicalNotes(work.clinicalNotes ?? "");
      setInternalNotes(work.internalNotes ?? "");
      setTechnicalCodeNotes(work.technicalCodeNotes ?? "");
    }
  }, [work]);

  return (
    <Modal
      description={workSummary ? `${workSummary.code} · ${workSummary.patientName}` : "Detalii lucrare"}
      footer={work ? (
        <>
          <Button onClick={() => onOpenFullDetails(work.id)} variant="outline">Deschide dosar</Button>
          <Button
            isLoading={isSaving}
            onClick={() => onSubmit({
              clinicalNotes: clinicalNotes.trim() || null,
              internalNotes: internalNotes.trim() || null,
              technicalCodeNotes: technicalCodeNotes.trim() || null,
            })}
          >
            Salvează
          </Button>
        </>
      ) : null}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="xl"
      title="Detalii"
    >
      {isLoading ? <LoadingState text="Se încarcă detaliile" /> : null}
      {error ? <ErrorState title="Detaliile nu au fost încărcate" description={getErrorMessage(error)} /> : null}
      {work ? (
        <div className="technician-workbench__details">
          <div className="technician-workbench__details-grid">
            <span>Pacient: {work.patientName}</span>
            <span>Clinică: {work.clinic?.name ?? "-"}</span>
            <span>Medic: {work.doctor?.displayName ?? "-"}</span>
            <span>Tip lucrare: {work.workType.name}</span>
            <span>Culoare: {work.shade ?? "-"}</span>
            <span>Elemente: {work.quantity}</span>
            <span>Termen: {formatDate(work.deadline.effectiveDueAt ?? work.requestedDeliveryDate)}</span>
            <span>Stare: {work.status}</span>
          </div>
          <Textarea label="Note clinice" onChange={(event) => setClinicalNotes(event.target.value)} rows={4} value={clinicalNotes} />
          <Textarea label="Note interne" onChange={(event) => setInternalNotes(event.target.value)} rows={4} value={internalNotes} />
          <Textarea label="Cod" onChange={(event) => setTechnicalCodeNotes(event.target.value)} rows={8} value={technicalCodeNotes} />
        </div>
      ) : null}
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
  const operationsQuery = useTechnicianOperationOptions(isOpen && canReadOperations);
  const performedQuery = usePerformedTechnicianOperations(work?.id ?? null, isOpen && canReadOperations && work !== null);
  const performMutation = usePerformTechnicianOperation();
  const removeMutation = useRemovePerformedTechnicianOperation();
  const activeByOperationId = useMemo(() => {
    const map = new Map<string, NonNullable<typeof performedQuery.data>[number]>();
    for (const performedOperation of performedQuery.data ?? []) {
      map.set(performedOperation.operation.id, performedOperation);
    }
    return map;
  }, [performedQuery.data]);
  const isMutating = performMutation.isPending || removeMutation.isPending;

  function toggleOperation(operationId: string, isChecked: boolean): void {
    if (!work) {
      return;
    }

    if (isChecked) {
      performMutation.mutate({ operationId, workOrderId: work.id }, {
        onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost adăugată", variant: "error" }),
      });
      return;
    }

    const performedOperation = activeByOperationId.get(operationId);
    if (!performedOperation) {
      return;
    }
    removeMutation.mutate({
      input: { reason: "Debifată de tehnician din modalul Manopere." },
      performedOperationId: performedOperation.id,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost eliminată", variant: "error" }),
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
      {canReadOperations && (operationsQuery.isLoading || performedQuery.isLoading) ? <LoadingState text="Se încarcă manoperele" /> : null}
      {canReadOperations && operationsQuery.error ? <ErrorState title="Catalogul nu a fost încărcat" description={getErrorMessage(operationsQuery.error)} /> : null}
      {canReadOperations && performedQuery.error ? <ErrorState title="Manoperele lucrării nu au fost încărcate" description={getErrorMessage(performedQuery.error)} /> : null}
      {canReadOperations && !operationsQuery.isLoading && !operationsQuery.error && (operationsQuery.data?.length ?? 0) === 0 ? (
        <div className="technician-workbench__operations-empty">
          <StatusBadge label="Fără manopere" variant="awaiting" />
          <p>Nu există manopere configurate.</p>
        </div>
      ) : null}
      {canReadOperations && operationsQuery.data && operationsQuery.data.length > 0 ? (
        <div className="technician-workbench__operations-list">
          {operationsQuery.data.map((operation) => {
            const performedOperation = activeByOperationId.get(operation.id);
            const isChecked = performedOperation !== undefined;
            return (
              <label className="technician-workbench__operation-row" key={operation.id}>
                <input
                  checked={isChecked}
                  disabled={!canManageOperations || isMutating}
                  onChange={(event) => toggleOperation(operation.id, event.target.checked)}
                  type="checkbox"
                />
                <span className="technician-workbench__operation-copy">
                  <strong>{operation.name}</strong>
                </span>
              </label>
            );
          })}
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
