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
  Modal,
  StatusBadge,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  type BillingOverview,
  type OperationalStatusRow,
  type OperationalStatusResponse,
  type OperationalStatusTab,
  type TechnicianWorkbenchItem,
  type WorkSummary,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";

import { useAuthState } from "./auth-state.js";
import { fetchOrganizationContext } from "../features/organization-context/organization-context-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../features/clinics/clinics-api.js";
import { usePatientOptions } from "../features/patients/patients-api.js";
import { useAvailableWorksForClaim, useMyClaimedWorks, useProbeTypes, useReceiveProbe, useWork, useWorks } from "../features/works/works-api.js";
import { useSettings } from "../features/settings/settings-api.js";
import { useBillingOverview } from "../features/billing/billing-api.js";
import { useOperationalStatus } from "../features/status/status-api.js";
import { useTechnicianWorkbench } from "../features/technician-workbench/technician-workbench-api.js";
import { getErrorMessage } from "../lib/form-utils.js";
import { usePageTitle } from "./use-page-title.js";

const shortListSize = 5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthRange(now = new Date()): { readonly dateFrom: string; readonly dateTo: string } {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return { dateFrom: `${now.getFullYear()}-${month}-01`, dateTo: `${now.getFullYear()}-${month}-${lastDay}` };
}

function formatKpiMoneyMinor(value: number, currency: string, locale = "ro-RO"): string {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

function formatDate(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value)) : "Fără termen";
}

function formatDashboardDate(value = new Date()): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "full" }).format(value);
}

function probeLabel(row: OperationalStatusRow | null): string {
  return `Proba ${Math.max(1, row?.currentCycle?.number ?? 1)}`;
}

function workCompositionLabel(row: OperationalStatusRow): string {
  return row.components.length > 0
    ? row.components.map((component) => `${component.name}${component.teeth.length > 0 ? ` · ${component.teeth.join(", ")}` : ""}`).join(" | ")
    : row.workType.name;
}

function isIncompleteSheet(status: string | null | undefined): boolean {
  return status !== "COMPLETE" && status !== "FINALIZED";
}

function operationalQuery(tab: OperationalStatusTab, pageSize = shortListSize) {
  return {
    page: 1,
    pageSize,
    sortBy: "effectiveDueAt",
    sortDirection: "asc",
    tab,
  } as const;
}

const claimListParams = {
  deadlineFilter: undefined,
  page: 1,
  pageSize: shortListSize,
  priority: undefined,
  search: undefined,
  sortBy: "effectiveDueAt",
  sortDirection: "asc",
  workTypeId: undefined,
} as const;

export function DashboardPage(): ReactNode {
  const auth = useAuthState();
  const permissionKeys = auth.permissionKeys;
  const canCreateWork = permissionKeys.includes("works.create");
  const canCreateNextCycle = permissionKeys.includes("cycles.create_next");
  const canReadWorks = permissionKeys.includes("works.read_all");
  const canReadAssignedWorks = permissionKeys.includes("works.read_assigned");
  const canReadOperational = canReadWorks || canReadAssignedWorks;
  const canScanWork = permissionKeys.includes("scan.use");
  const canReadBilling = permissionKeys.includes("finance.read") || permissionKeys.includes("invoice.read");
  const isManagerWorkspace = canReadBilling || permissionKeys.includes("pricing.read") || permissionKeys.includes("settings.read") || permissionKeys.includes("users.read");
  const canReadTechnician = permissionKeys.includes("technician.workbench.read") && !isManagerWorkspace;
  const canReadAvailable = permissionKeys.includes("works.claim.available.read");
  const canReadOwnClaims = permissionKeys.includes("works.claim.own.read");
  const canReadOrganization = permissionKeys.includes("organization_context.read");
  const isReceptionWorkspace = canCreateWork || (canReadWorks && !canReadTechnician && !isManagerWorkspace);
  const isTechnicianWorkspace = !isManagerWorkspace && (canReadTechnician || canReadAvailable || canReadOwnClaims);
  const isDoctorPortal = canReadAssignedWorks && !isManagerWorkspace && !isReceptionWorkspace && !isTechnicianWorkspace;
  const showTechnicianWorkspace = isTechnicianWorkspace && !isManagerWorkspace;
  const showReceptionWorkspace = isReceptionWorkspace && !isManagerWorkspace;
  const showManagerWorkspace = isManagerWorkspace;
  const canReadDashboardWorks = showReceptionWorkspace || showManagerWorkspace;
  const canReadDashboardOperational = canReadOperational && (canReadDashboardWorks || isDoctorPortal);
  const settingsQuery = useSettings(permissionKeys.includes("settings.read"));
  const organizationQuery = useQuery({ enabled: canReadOrganization, queryFn: fetchOrganizationContext, queryKey: ["organization-context"], retry: false });
  const laboratoryName = settingsQuery.data?.laboratoryName ?? "Dental Lab Management";
  const range = currentMonthRange();
  const today = todayIso();

  const worksTodayQuery = useWorks({
    clinicId: undefined,
    dateFrom: today,
    dateTo: today,
    deadlineFilter: undefined,
    doctorId: undefined,
    page: 1,
    pageSize: shortListSize,
    priority: undefined,
    search: undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
    status: undefined,
    workTypeId: undefined,
  }, canReadDashboardWorks);
  const operationalTodayQuery = useOperationalStatus(operationalQuery("TODAY", 8), canReadDashboardOperational);
  const operationalLateQuery = useOperationalStatus(operationalQuery("LATE", 8), canReadDashboardOperational);
  const operationalReturnedQuery = useOperationalStatus(operationalQuery("RETURNED", 8), canReadDashboardOperational);
  const operationalOverviewQuery = useOperationalStatus(operationalQuery("ALL", 1), showManagerWorkspace && canReadDashboardOperational);
  const transportOverviewQuery = useOperationalStatus({ ...operationalQuery("ALL", 1), excludeDemo: true, transportOnly: true }, showManagerWorkspace && canReadDashboardOperational);
  const availableWorksQuery = useAvailableWorksForClaim(claimListParams, canReadAvailable);
  const myClaimedWorksQuery = useMyClaimedWorks(claimListParams, canReadOwnClaims);
  const technicianWorkbenchQuery = useTechnicianWorkbench({
    page: 1,
    pageSize: shortListSize,
    sortBy: "requestedDeliveryDate",
    sortOrder: "asc",
  }, canReadTechnician);
  const billingOverviewQuery = useBillingOverview(range, canReadBilling);
  const activeCompany = organizationQuery.data?.active;
  const activeCompanyLabel = activeCompany ? `${activeCompany.code} · ${activeCompany.displayName}` : "Firma activă";

  usePageTitle("Acasă", laboratoryName);

  return (
    <section className="dashboard-page dashboard-page--role" aria-labelledby="dashboard-title">
      {showManagerWorkspace ? (
        <div className="dashboard-page__manager-page-title"><h1 id="dashboard-title">Panou de control</h1></div>
      ) : (
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-page__eyebrow">{laboratoryName}</p>
            <h1 id="dashboard-title">{showManagerWorkspace ? "Panou de control" : "Acasă"}</h1>
            <p>{showManagerWorkspace ? `Bun venit, ${auth.user?.displayName ?? "Manager"}. Urmărește prioritățile laboratorului dintr-un singur loc.` : isDoctorPortal ? "Urmărește lucrările clinicii, termenele și stadiul lor curent." : `${auth.user?.displayName ?? "Utilizator"} · dashboard compus după permisiunile contului.`}</p>
          </div>
          <div className="dashboard-page__actions">
            {showTechnicianWorkspace ? <DashboardAction label="Lucrările mele" to="/workbench" /> : null}
          </div>
        </div>
      )}

      {showTechnicianWorkspace ? (
        <TechnicianDashboard
          availableWorks={availableWorksQuery.data?.items ?? []}
          canScanWork={canScanWork}
          isAvailableError={availableWorksQuery.isError}
          isAvailableLoading={availableWorksQuery.isLoading}
          isMineError={myClaimedWorksQuery.isError}
          isMineLoading={myClaimedWorksQuery.isLoading}
          isWorkbenchError={technicianWorkbenchQuery.isError}
          isWorkbenchLoading={technicianWorkbenchQuery.isLoading}
          myWorks={myClaimedWorksQuery.data?.items ?? []}
          workbenchItems={technicianWorkbenchQuery.data?.items ?? []}
        />
      ) : null}

      {showReceptionWorkspace ? (
        <ReceptionDashboard
          canCreateWork={canCreateWork}
          canCreateNextCycle={canCreateNextCycle}
          canScanWork={canScanWork}
          isRecentError={worksTodayQuery.isError}
          isRecentLoading={worksTodayQuery.isLoading}
          recentWorks={worksTodayQuery.data?.items ?? []}
          returnedRows={operationalReturnedQuery.data?.items ?? []}
          todayRows={operationalTodayQuery.data?.items ?? []}
        />
      ) : null}

      {showManagerWorkspace ? (
        <ManagerDashboard
          activeCompanyLabel={activeCompanyLabel}
          billing={billingOverviewQuery.data}
          canCreateWork={canCreateWork}
          canReadBilling={canReadBilling}
          isOperationalError={operationalOverviewQuery.isError || transportOverviewQuery.isError}
          isOperationalLoading={operationalOverviewQuery.isLoading || transportOverviewQuery.isLoading}
          lateRows={operationalLateQuery.data?.items ?? []}
          operationalOverview={operationalOverviewQuery.data}
          returnedRows={operationalReturnedQuery.data?.items ?? []}
          transportOverview={transportOverviewQuery.data}
          isBillingError={billingOverviewQuery.isError}
          isBillingLoading={billingOverviewQuery.isLoading}
        />
      ) : null}

      {isDoctorPortal ? (
        <DoctorPortalDashboard
          isLateError={operationalLateQuery.isError}
          isLateLoading={operationalLateQuery.isLoading}
          isTodayError={operationalTodayQuery.isError}
          isTodayLoading={operationalTodayQuery.isLoading}
          lateRows={operationalLateQuery.data?.items ?? []}
          todayRows={operationalTodayQuery.data?.items ?? []}
        />
      ) : null}

      {!isManagerWorkspace && !isReceptionWorkspace && !isTechnicianWorkspace && !isDoctorPortal ? (
        <DashboardEmptyState
          action={{ label: "Deschide status", to: "/status" }}
          description="Nu există widgeturi dedicate pentru permisiunile curente."
          title="Nu există dashboard dedicat"
        />
      ) : null}
    </section>
  );
}

function DoctorPortalDashboard({
  isLateError,
  isLateLoading,
  isTodayError,
  isTodayLoading,
  lateRows,
  todayRows,
}: {
  readonly isLateError: boolean;
  readonly isLateLoading: boolean;
  readonly isTodayError: boolean;
  readonly isTodayLoading: boolean;
  readonly lateRows: readonly OperationalStatusRow[];
  readonly todayRows: readonly OperationalStatusRow[];
}): ReactNode {
  return (
    <div className="dashboard-page__workspace" aria-labelledby="doctor-dashboard-title">
      <div className="dashboard-page__workspace-header">
        <div>
          <h2 id="doctor-dashboard-title">Portal medic</h2>
          <p>Vizualizezi doar lucrările asociate clinicii tale.</p>
        </div>
        <DashboardAction label="Deschide toate lucrările" to="/status" variant="primary" />
      </div>
      <div className="dashboard-page__columns">
        <DashboardSection title="În termen sau scadente azi" description="Lucrările care au nevoie de urmărire astăzi.">
          <SectionState error={isTodayError} isLoading={isTodayLoading} text="Se încarcă lucrările clinicii" />
          {!isTodayLoading && !isTodayError && todayRows.length === 0 ? <DashboardEmptyState description="Nu există lucrări cu termen astăzi." title="Nicio lucrare scadentă azi" /> : null}
          {todayRows.slice(0, shortListSize).map((row) => <OperationalPreviewCard key={row.id} actionLabel="Vezi detalii" row={row} />)}
        </DashboardSection>
        <DashboardSection title="Necesită atenție" description="Lucrări depășite față de termenul comunicat.">
          <SectionState error={isLateError} isLoading={isLateLoading} text="Se verifică termenele" />
          {!isLateLoading && !isLateError && lateRows.length === 0 ? <DashboardEmptyState description="Nu există întârzieri în lucrările pe care le poți consulta." title="Toate lucrările sunt în termen" /> : null}
          {lateRows.slice(0, shortListSize).map((row) => <OperationalPreviewCard key={row.id} actionLabel="Vezi detalii" row={row} />)}
        </DashboardSection>
      </div>
    </div>
  );
}

function DashboardSection({ action, children, description, title }: { readonly action?: ReactNode; readonly children: ReactNode; readonly description?: string; readonly title: string }): ReactNode {
  return (
    <Card>
      <CardHeader>
        <div className="dashboard-page__section-header">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="dashboard-page__section-content">{children}</CardContent>
    </Card>
  );
}

function DashboardAction({ label, onClick, to, variant = "outline" }: { readonly label: string; readonly onClick?: () => void; readonly to?: string; readonly variant?: "outline" | "primary" }): ReactNode {
  const className = variant === "primary"
    ? "dashboard-page__action-link dashboard-page__action-link--primary"
    : "dashboard-page__action-link dashboard-page__action-link--outline";
  return to ? <Link className={className} to={to}>{label}</Link> : <button className={className} onClick={onClick} type="button">{label}</button>;
}

function DashboardEmptyState({ action, description, title }: { readonly action?: { readonly label: string; readonly to: string }; readonly description: string; readonly title: string }): ReactNode {
  return (
    <div className="dashboard-page__empty">
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <DashboardAction label={action.label} to={action.to} variant="primary" /> : null}
    </div>
  );
}

function SectionState({ error, isLoading, text }: { readonly error?: boolean; readonly isLoading: boolean; readonly text: string }): ReactNode {
  if (isLoading) {
    return <LoadingState text={text} />;
  }
  if (error) {
    return <ErrorState title="Secțiunea nu a fost încărcată" description="Restul dashboardului rămâne disponibil." />;
  }
  return null;
}

function DeadlineIndicator({ label, state }: { readonly label: string; readonly state?: string }): ReactNode {
  return <span className={`dashboard-page__pill dashboard-page__pill--${(state ?? "unknown").toLowerCase()}`}>{label}</span>;
}

function SheetStatusIndicator({ label, status }: { readonly label: string; readonly status?: string }): ReactNode {
  const variant = status === "FINALIZED" ? "closed" : status === "COMPLETE" ? "production" : "awaiting";
  return <StatusBadge label={label} variant={variant} />;
}

function TechnicianDashboard({
  availableWorks,
  canScanWork,
  isAvailableError,
  isAvailableLoading,
  isMineError,
  isMineLoading,
  isWorkbenchError,
  isWorkbenchLoading,
  myWorks,
  workbenchItems,
}: {
  readonly availableWorks: readonly WorkSummary[];
  readonly canScanWork: boolean;
  readonly isAvailableError: boolean;
  readonly isAvailableLoading: boolean;
  readonly isMineError: boolean;
  readonly isMineLoading: boolean;
  readonly isWorkbenchError: boolean;
  readonly isWorkbenchLoading: boolean;
  readonly myWorks: readonly WorkSummary[];
  readonly workbenchItems: readonly TechnicianWorkbenchItem[];
}): ReactNode {
  const attentionItems = [
    ...workbenchItems.filter((item) => item.categories.includes("OVERDUE") || item.categories.includes("DUE_TODAY") || isIncompleteSheet(item.realLabSheet.status) || item.stage.status === "PENDING"),
  ].slice(0, 6);

  return (
    <div className="dashboard-page__workspace" aria-labelledby="technician-dashboard-title">
      <div className="dashboard-page__workspace-header">
        <div>
          <h2 id="technician-dashboard-title">Tehnician</h2>
          <p>Ce pot prelua, ce am preluat și care este următoarea acțiune.</p>
        </div>
        <DashboardAction label="Vezi lucrări disponibile" to="/workbench" variant="primary" />
      </div>
      <div className="dashboard-page__columns">
        <DashboardSection title="Lucrările mele" description="Primele lucrări după prioritate și termen.">
          <SectionState error={isMineError} isLoading={isMineLoading} text="Se încarcă lucrările preluate" />
          {!isMineLoading && !isMineError && myWorks.length === 0 ? (
            <DashboardEmptyState
              action={{ label: "Vezi lucrări disponibile", to: "/workbench" }}
              description={canScanWork ? "Poți prelua o lucrare disponibilă sau scana un cod QR." : "Poți prelua o lucrare disponibilă din atelier."}
              title="Nu ai lucrări preluate."
            />
          ) : null}
          {myWorks.map((work) => <WorkPreviewCard key={work.id} actionLabel="Continuă lucrarea" actionTo={`/works?workId=${work.id}`} work={work} />)}
          {canScanWork && myWorks.length === 0 ? <DashboardAction label="Scanează QR" to="/scan" /> : null}
        </DashboardSection>
        <DashboardSection title="Disponibile pentru preluare" description="Preluarea și firma NC/NG se confirmă la deschiderea lucrării.">
          <SectionState error={isAvailableError} isLoading={isAvailableLoading} text="Se încarcă lucrările disponibile" />
          {!isAvailableLoading && !isAvailableError && availableWorks.length === 0 ? (
            <DashboardEmptyState description="Nu există lucrări disponibile pentru preluare." title="Lista este goală" />
          ) : null}
          {availableWorks.map((work) => <WorkPreviewCard key={work.id} actionLabel="Preia lucrarea" actionTo="/workbench" work={work} />)}
          <DashboardAction label="Vezi toate lucrările disponibile" to="/workbench" />
        </DashboardSection>
      </div>
      <DashboardSection title="Necesită atenție" description="Întârziate, scadente azi, fișe incomplete sau etape neîncepute.">
        <SectionState error={isWorkbenchError} isLoading={isWorkbenchLoading} text="Se încarcă atenționările" />
        <AttentionList items={attentionItems} />
      </DashboardSection>
    </div>
  );
}

function ReceptionDashboard({
  canCreateWork,
  canCreateNextCycle,
  canScanWork,
  isRecentError,
  isRecentLoading,
  recentWorks,
  returnedRows,
  todayRows,
}: {
  readonly canCreateWork: boolean;
  readonly canCreateNextCycle: boolean;
  readonly canScanWork: boolean;
  readonly isRecentError: boolean;
  readonly isRecentLoading: boolean;
  readonly recentWorks: readonly WorkSummary[];
  readonly returnedRows: readonly OperationalStatusRow[];
  readonly todayRows: readonly OperationalStatusRow[];
}): ReactNode {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedReturnedWorkId, setSelectedReturnedWorkId] = useState<string | null>(null);
  const [probeTypeIds, setProbeTypeIds] = useState<readonly string[]>([]);
  const [probeDate, setProbeDate] = useState("");
  const [probeTime, setProbeTime] = useState("");
  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  useEffect(() => {
    if (searchParams.get("probe") !== "1" || !canCreateNextCycle) return;
    setReturnModalOpen(true);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("probe");
      return next;
    }, { replace: true });
  }, [canCreateNextCycle, searchParams, setSearchParams]);
  const incompleteRows = todayRows.filter((row) => isIncompleteSheet(row.realLabSheet.status)).slice(0, shortListSize);
  const returnQuery = useOperationalStatus({
    page: 1,
    pageSize: 100,
    search: null,
    sortBy: "updatedAt",
    sortDirection: "desc",
    // A probe-ready work can already have a completed courier delivery. It
    // must still remain visible to reception so the returned item can be
    // opened and registered as the next probe.
    tab: "RETURNED",
  }, isReturnModalOpen && canCreateNextCycle);
  const availableProbeQuery = useOperationalStatus({
    includeProbeReturnCandidates: true,
    page: 1,
    pageSize: 100,
    search: null,
    sortBy: "updatedAt",
    sortDirection: "desc",
    tab: "ALL",
  }, isReturnModalOpen && canCreateNextCycle);
  const clinicsQuery = useQuery({ enabled: isReturnModalOpen && canCreateNextCycle, queryFn: fetchClinicOptions, queryKey: ["clinics", "options", "reception-probe"], retry: false });
  const doctorsQuery = useQuery({ enabled: isReturnModalOpen && canCreateNextCycle && Boolean(selectedClinicId), queryFn: () => fetchDoctorOptions(selectedClinicId), queryKey: ["doctors", "options", "reception-probe", selectedClinicId], retry: false });
  const patientsQuery = usePatientOptions(patientSearch, isReturnModalOpen && canCreateNextCycle && Boolean(selectedClinicId), selectedClinicId || undefined, selectedDoctorId || undefined);
  const returnMutation = useReceiveProbe();
  const selectedReturnedWorkDetailQuery = useWork(selectedReturnedWorkId, isReturnModalOpen && selectedReturnedWorkId !== null);
  const probeTypesQuery = useProbeTypes(isReturnModalOpen && canCreateNextCycle);
  const returnedProbeRows = returnQuery.data?.items ?? [];
  const availableProbeRows = (availableProbeQuery.data?.items ?? []).filter((row) => row.technicalReadiness === "PROBE_READY");
  const visibleAvailableProbeRows = availableProbeRows.filter((row) =>
    (!selectedClinicId || row.clinic?.id === selectedClinicId) &&
    (!selectedDoctorId || row.doctor?.id === selectedDoctorId) &&
    (!selectedPatientId || row.patient.id === selectedPatientId),
  );
  // The probe form is opened from the courier-available queue. Keep that row
  // available here as well; the returned-only query intentionally excludes it
  // until reception registers the next cycle.
  const selectedReturnedWork = [...availableProbeRows, ...returnedProbeRows].find((row) => row.id === selectedReturnedWorkId) ?? null;
  const selectedPatient = (patientsQuery.data ?? []).find((patient) => patient.id === selectedPatientId) ?? null;
  const selectedReturnedWorkDetail = selectedReturnedWorkDetailQuery.data;
  const configuredProbeCodes = selectedReturnedWorkDetail?.items?.flatMap((item) => item.workType?.probeTypeCodes ?? []) ?? [];
  const allProbeTypes = probeTypesQuery.data ?? [];
  const configuredSelectableProbeTypes = configuredProbeCodes.length > 0
    ? allProbeTypes.filter((type) => typeof type.code === "string" && configuredProbeCodes.includes(type.code))
    : allProbeTypes;
  // Old work types may contain probe codes that were renamed in the technical
  // catalog. Do not leave reception with an empty selector in that case; the
  // returned work can still be registered with any active probe type.
  const selectableProbeTypes = configuredSelectableProbeTypes.length > 0 ? configuredSelectableProbeTypes : allProbeTypes;
  const selectableProbeTypeIdsKey = selectableProbeTypes.map((type) => type.id).join("|");
  const completedProbeHistory = selectedReturnedWorkDetail?.completedProbeCycles ?? [];
  useEffect(() => {
    setProbeTypeIds([]);
    setProbeDate("");
    setProbeTime("");
  }, [selectedReturnedWorkId]);
  useEffect(() => {
    if (!selectedReturnedWorkId) return;
    const selectableIds = new Set(selectableProbeTypes.map((type) => type.id));
    setProbeTypeIds((current) => {
      const retained = current.filter((id) => selectableIds.has(id));
      if (retained.length > 0) return retained;
      return selectableProbeTypes[0]?.id ? [selectableProbeTypes[0].id] : [];
    });
  }, [selectableProbeTypeIdsKey, selectedReturnedWorkId]);

  function closeReturnModal(): void {
    setReturnModalOpen(false);
    setSelectedClinicId("");
    setSelectedDoctorId("");
    setPatientSearch("");
    setSelectedPatientId("");
    setSelectedReturnedWorkId(null);
    setProbeTypeIds([]);
    setProbeDate("");
    setProbeTime("");
  }
  return (
    <div className="dashboard-page__workspace" aria-labelledby="reception-dashboard-title">
      <div className="dashboard-page__workspace-header">
        <div>
          <h2 id="reception-dashboard-title">Recepție</h2>
          <p>Înregistrare, reveniri, fișe de completat și verificări operative.</p>
        </div>
        <div className="dashboard-page__actions">
          {canCreateWork ? <DashboardAction label="Lucrare nouă" to="/works?create=1" variant="primary" /> : null}
          {canCreateNextCycle ? <DashboardAction label="Probe" onClick={() => setReturnModalOpen(true)} /> : null}
          {canScanWork ? <DashboardAction label="Scanează lucrare" to="/scan" /> : null}
        </div>
      </div>
      <div className="dashboard-page__columns">
        <DashboardSection title="Lucrări recente" description="Ultimele lucrări înregistrate.">
          <SectionState error={isRecentError} isLoading={isRecentLoading} text="Se încarcă lucrările recente" />
          {recentWorks.length === 0 && !isRecentLoading && !isRecentError ? <DashboardEmptyState description="Nu există lucrări recente pentru astăzi." title="Nicio lucrare recentă" /> : null}
          {recentWorks.map((work) => <WorkPreviewCard key={work.id} actionLabel="Deschide lucrarea" actionTo={`/works?workId=${work.id}`} work={work} />)}
        </DashboardSection>
        <DashboardSection title="Fișe care necesită completare" description="Fișe necompletate sau draft din lucrările vizibile.">
          {incompleteRows.length === 0 ? <DashboardEmptyState description="Nu există fișe incomplete în lista curentă." title="Fișe la zi" /> : null}
          {incompleteRows.map((row) => <OperationalPreviewCard key={row.id} actionLabel="Deschide lucrarea" row={row} />)}
        </DashboardSection>
      </div>
      <DashboardSection title="Lucrări care necesită verificare" description="Lucrări revenite sau care necesită atenție.">
        {returnedRows.length === 0 ? <DashboardEmptyState description="Nu există lucrări revenite în lista curentă." title="Nicio revenire recentă" /> : null}
        {returnedRows.slice(0, shortListSize).map((row) => <OperationalPreviewCard key={row.id} actionLabel="Deschide lucrarea" row={row} />)}
      </DashboardSection>
      <Modal
        description="Selectează informațiile, identifică proba revenită și înregistrează termenul."
        footer={<div className="dashboard-page__return-actions"><Button disabled={returnMutation.isPending} onClick={closeReturnModal} type="button" variant="secondary">Anulează</Button><Button disabled={!selectedReturnedWork || probeTypeIds.length === 0 || !probeDate} isLoading={returnMutation.isPending} onClick={() => {
          if (probeTypeIds.length === 0 || !probeDate || !selectedReturnedWork) return;
          const deadlineAt = new Date(`${probeDate}T${probeTime || "23:59"}:00`).toISOString();
          returnMutation.mutate({ input: { deadlineAt, probeTypeIds }, workOrderId: selectedReturnedWork.id }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Proba nu a fost înregistrată", variant: "error" }),
            onSuccess: closeReturnModal,
          });
        }} type="button">Înregistrează proba</Button></div>}
        isOpen={isReturnModalOpen}
        onOpenChange={(isOpen) => { if (!isOpen) closeReturnModal(); }}
        size="xl"
        title="Înregistrează proba revenită"
      >
        <div className="dashboard-page__unified-return-modal">
          <p className="dashboard-page__return-progress" aria-label="Etape: identifică lucrarea, apoi înregistrează revenirea"><span>1. Identifică lucrarea</span><span>2. Înregistrează revenirea</span></p>
          <section className="dashboard-page__return-panel" aria-labelledby="return-identify-title">
            <h3 id="return-identify-title">1. Identifică lucrarea</h3>
            <div className="dashboard-page__return-fields">
              <label>Clinică *<select className="dl-control" value={selectedClinicId} onChange={(event) => { setSelectedClinicId(event.target.value); setSelectedDoctorId(""); setSelectedPatientId(""); setSelectedReturnedWorkId(null); setPatientSearch(""); }}><option value="">Selectează clinica</option>{(clinicsQuery.data ?? []).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select></label>
              <label>Medic<select className="dl-control" disabled={!selectedClinicId} value={selectedDoctorId} onChange={(event) => { setSelectedDoctorId(event.target.value); setSelectedPatientId(""); setSelectedReturnedWorkId(null); setPatientSearch(""); }}><option value="">Toți medicii</option>{(doctorsQuery.data ?? []).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.displayName}</option>)}</select></label>
            </div>
            {selectedClinicId ? <TextInput label="Caută pacient" placeholder="Nume și prenume" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} /> : <p className="dashboard-page__empty-note">Selectează mai întâi clinica pentru a vedea pacienții asociați.</p>}
            {patientsQuery.isLoading ? <LoadingState text="Se încarcă pacienții" /> : null}
            <div className="dashboard-page__return-list dashboard-page__patient-list">
              {(patientsQuery.data ?? []).map((patient) => <button aria-pressed={selectedPatientId === patient.id} className={`dashboard-page__return-item${selectedPatientId === patient.id ? " dashboard-page__return-item--selected" : ""}`} key={patient.id} onClick={() => { const matches = visibleAvailableProbeRows.filter((row) => row.patient.id === patient.id); setSelectedPatientId(patient.id); setSelectedReturnedWorkId(matches.length === 1 ? matches[0]!.id : null); }} type="button"><strong className="dashboard-page__return-patient">{patient.fullName}</strong></button>)}
            </div>
            {selectedPatient ? <div className="dashboard-page__selected-patient"><strong>{selectedPatient.fullName}</strong>{selectedReturnedWork ? <span>{selectedReturnedWork.workCode}</span> : null}</div> : null}
            <div className="dashboard-page__return-matches">
              <h4>Lucrări disponibile cu probe la curier</h4>
              <p className="dashboard-page__empty-note">Selectează proba revenită pentru a introduce etapa și termenul următor.</p>
              <div className="dashboard-page__return-list">
                {visibleAvailableProbeRows.map((row) => <button aria-pressed={selectedReturnedWorkId === row.id} className={`dashboard-page__return-item${selectedReturnedWorkId === row.id ? " dashboard-page__return-item--selected" : ""}`} key={row.id} onClick={() => setSelectedReturnedWorkId(row.id)} type="button"><strong>{probeLabel(row)} · {workCompositionLabel(row)}</strong><span>{row.components.flatMap((component) => component.teeth).length > 0 ? `Dinți: ${row.components.flatMap((component) => component.teeth).join(", ")}` : "Fără dinți"}</span>{row.shade ? <span>Culoare: {row.shade}</span> : null}<span>Cod lucrare: {row.workCode}</span><span>Pacient: {row.patient.name}</span></button>)}
                {!availableProbeQuery.isLoading && visibleAvailableProbeRows.length === 0 ? <p className="dashboard-page__empty-note">Nu există probe disponibile pentru selecția curentă.</p> : null}
              </div>
            </div>
          </section>
          <section className="dashboard-page__return-panel" aria-labelledby="return-register-title">
            <h3 id="return-register-title">2. Înregistrează revenirea</h3>
            {selectedReturnedWork ? <><div className="dashboard-page__selected-probe"><span>Proba selectată</span><strong>{workCompositionLabel(selectedReturnedWork)}</strong><dl><div><dt>Dinți</dt><dd>{selectedReturnedWork.components.flatMap((component) => component.teeth).join(", ") || "—"}</dd></div><div><dt>Culoare</dt><dd>{selectedReturnedWork.shade ?? "—"}</dd></div><div><dt>Cod lucrare</dt><dd>{selectedReturnedWork.workCode}</dd></div><div><dt>Pacient</dt><dd>{selectedReturnedWork.patient.name}</dd></div></dl></div><div className="dashboard-page__probe-history"><strong>Probe efectuate anterior</strong>{completedProbeHistory.length > 0 ? completedProbeHistory.map((cycle) => <div key={cycle.id}><span>{cycle.sequence === 0 ? "Proba inițială" : `Proba ${cycle.sequence}`}</span><strong>{cycle.probeTypeNameSnapshot}</strong></div>) : <span>Nu există probe efectuate anterior.</span>}</div></> : <p className="dashboard-page__return-placeholder">Selectează o lucrare din lista alăturată pentru a completa revenirea.</p>}
            {selectedReturnedWorkDetailQuery.isLoading ? <LoadingState text="Se încarcă tipurile compatibile" /> : null}
            {probeTypesQuery.isError ? <ErrorState title="Tipurile de probă nu au putut fi încărcate" description="Verifică accesul la catalogul tehnic și reîncarcă pagina." /> : null}
            {selectedReturnedWork && selectableProbeTypes.length > 0 ? <fieldset className="dashboard-page__probe-types"><legend>Tipuri probă</legend><div className="dashboard-page__probe-type-cards">{selectableProbeTypes.map((type) => { const isSelected = probeTypeIds.includes(type.id); return <button aria-pressed={isSelected} className={`dashboard-page__probe-type-card${isSelected ? " dashboard-page__probe-type-card--selected" : ""}`} key={type.id} onClick={() => setProbeTypeIds((current) => current.includes(type.id) ? current.filter((id) => id !== type.id) : [...current, type.id])} type="button"><span className="dashboard-page__probe-type-name">{type.name}</span></button>; })}</div></fieldset> : null}
            {selectedReturnedWork && !probeTypesQuery.isLoading && !probeTypesQuery.isError && selectableProbeTypes.length === 0 ? <p className="dashboard-page__empty-note">Nu există tipuri de probă active în catalogul tehnic.</p> : null}
            <div className="dashboard-page__probe-schedule"><label>Data termenului probei *<input className="dl-control dashboard-page__probe-date" disabled={!selectedReturnedWork} onChange={(event) => setProbeDate(event.target.value)} type="date" value={probeDate} required /></label><label>Ora termenului<input className="dl-control dashboard-page__probe-time" disabled={!selectedReturnedWork} onChange={(event) => setProbeTime(event.target.value)} type="time" value={probeTime} /></label></div>
          </section>
          {returnQuery.isLoading || availableProbeQuery.isLoading ? <LoadingState text="Se verifică lucrările revenite" /> : null}
          {returnQuery.isError || availableProbeQuery.isError ? <ErrorState title="Lista nu a putut fi încărcată" description="Reîncarcă pagina și încearcă din nou." /> : null}
        </div>
      </Modal>
    </div>
  );
}

function ManagerDashboard({
  activeCompanyLabel,
  billing,
  canCreateWork,
  canReadBilling,
  isOperationalError,
  isOperationalLoading,
  lateRows,
  operationalOverview,
  returnedRows,
  transportOverview,
  isBillingError,
  isBillingLoading,
}: {
  readonly activeCompanyLabel: string;
  readonly billing: BillingOverview | undefined;
  readonly canCreateWork: boolean;
  readonly canReadBilling: boolean;
  readonly isOperationalError: boolean;
  readonly isOperationalLoading: boolean;
  readonly lateRows: readonly OperationalStatusRow[];
  readonly operationalOverview: OperationalStatusResponse | undefined;
  readonly returnedRows: readonly OperationalStatusRow[];
  readonly transportOverview: OperationalStatusResponse | undefined;
  readonly isBillingError: boolean;
  readonly isBillingLoading: boolean;
}): ReactNode {
  const currency = billing?.currency ?? "RON";
  const countFor = (tab: OperationalStatusTab): number => operationalOverview?.counters.find((counter) => counter.tab === tab)?.count ?? 0;
  const needsAttention = [
    ...lateRows.map((row) => ({ kind: "Întârziată", row })),
    ...returnedRows.map((row) => ({ kind: "Revenită", row })),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.row.id === item.row.id) === index).slice(0, 5);

  return (
    <div className="dashboard-page__workspace dashboard-page__manager" aria-labelledby="manager-dashboard-title">
      <div className="dashboard-page__manager-context">
        <div>
          <h2 id="manager-dashboard-title">Prioritățile zilei</h2>
          <p>Situația lucrărilor în laborator (toate firmele).</p>
        </div>
        <time dateTime={new Date().toISOString()}>{formatDashboardDate()}</time>
      </div>

      <section aria-label="Situație operațională">
        <p className="dashboard-page__manager-scope-note">Indicatorii operaționali includ toate lucrările laboratorului.</p>
        <SectionState error={isOperationalError} isLoading={isOperationalLoading} text="Se încarcă situația operațională" />
        <div className="dashboard-page__metrics dashboard-page__metrics--five dashboard-page__manager-kpis">
          <ManagerKpi icon="work" label="Total lucrări" to="/status?tab=ALL" value={operationalOverview?.meta.total} />
          <ManagerKpi icon="activity" label="În lucru" to="/status?tab=IN_PROGRESS" value={operationalOverview ? countFor("IN_PROGRESS") : undefined} />
          <ManagerKpi icon="warning" label="Întârziate" tone="danger" to="/status?tab=LATE" value={operationalOverview ? countFor("LATE") : undefined} />
          <ManagerKpi icon="truck" label="De livrat / ridicat" tone="warning" to="/status" value={transportOverview?.meta.total} />
          <ManagerKpi icon="check" label="Finalizate" tone="success" to="/status?tab=COMPLETED" value={operationalOverview ? countFor("COMPLETED") : undefined} />
        </div>
      </section>

      <div className="dashboard-page__manager-layout">
        <DashboardSection
          action={<ManagerSectionAction label="Vezi toate lucrările" to="/status" />}
          description="Lucrările care cer o decizie sau următoarea acțiune."
          title="Necesită atenție"
        >
          {needsAttention.length === 0 ? <DashboardEmptyState description="Nu există întârzieri sau reveniri în lista curentă." title="Totul este în regulă" /> : null}
          {needsAttention.length > 0 ? <ManagerAttentionList items={needsAttention} /> : null}
        </DashboardSection>

        <DashboardSection title="Acțiuni rapide" description="Accesează activitățile folosite frecvent.">
          <div className="dashboard-page__quick-actions">
            {canCreateWork ? <ManagerQuickAction icon="add" label="Lucrare nouă" to="/works?create=1" variant="primary" /> : null}
            <ManagerQuickAction icon="list" label="Lucrări" to="/status" />
            {canReadBilling ? <ManagerQuickAction icon="invoice" label="Facturare" to="/billing" /> : null}
          </div>
        </DashboardSection>
      </div>

      {canReadBilling ? (
        <DashboardSection action={<ManagerSectionAction label="Deschide facturarea" to="/billing" />} title="Situație financiară" description={`Luna curentă · ${activeCompanyLabel}.`}>
          <SectionState error={isBillingError} isLoading={isBillingLoading} text="Se încarcă situația financiară" />
          {billing ? (
            <div className="dashboard-page__finance-summary">
              <FinanceMetric icon="invoice" label="Total emis" value={formatKpiMoneyMinor(billing.totalIssuedMinor, currency, "ro-RO")} />
              <FinanceMetric icon="coins" label="Încasat" value={formatKpiMoneyMinor(billing.paidMinor, currency, "ro-RO")} />
              <FinanceMetric icon="warning" label="Sold restant" tone="danger" value={formatKpiMoneyMinor(billing.outstandingMinor, currency, "ro-RO")} />
              <FinanceMetric icon="invoice" label="De facturat" value={`${billing.uninvoicedWorkCount} ${billing.uninvoicedWorkCount === 1 ? "lucrare" : "lucrări"}`} />
            </div>
          ) : null}
        </DashboardSection>
      ) : null}
    </div>
  );
}

function ManagerKpi({ icon, label, to, tone, value }: { readonly icon: DashboardIconName; readonly label: string; readonly to: string; readonly tone?: "danger" | "warning" | "success"; readonly value: number | undefined }): ReactNode {
  return (
    <Link className={`dashboard-page__metric dashboard-page__metric--link${tone ? ` dashboard-page__metric--${tone}` : ""}`} to={to}>
      <span className="dashboard-page__metric-label"><span aria-hidden="true" className="dashboard-page__metric-icon"><DashboardIcon name={icon} /></span>{label}</span>
      <strong>{value === undefined ? "—" : value}</strong>
    </Link>
  );
}

function ManagerAttentionList({ items }: { readonly items: readonly { readonly kind: string; readonly row: OperationalStatusRow }[] }): ReactNode {
  return (
    <div className="dashboard-page__manager-attention-list">
      {items.map(({ kind, row }) => (
        <Link className="dashboard-page__manager-attention" key={row.id} to={`/works?workId=${row.id}`}>
          <div>
            <span className={`dashboard-page__attention-kind dashboard-page__attention-kind--${kind === "Întârziată" ? "late" : "returned"}`}>{kind}</span>
            <strong>{row.workCode}</strong>
            <small>{row.patient.name} · {row.clinic?.name ?? "Fără clinică"}</small>
          </div>
          <span aria-hidden="true" className="dashboard-page__manager-attention-chevron">›</span>
        </Link>
      ))}
    </div>
  );
}

function ManagerQuickAction({ icon, label, to, variant = "outline" }: { readonly icon: DashboardIconName; readonly label: string; readonly to: string; readonly variant?: "outline" | "primary" }): ReactNode {
  return <Link className={`dashboard-page__quick-action dashboard-page__quick-action--${variant}`} to={to}><span aria-hidden="true" className="dashboard-page__quick-action-icon"><DashboardIcon name={icon} /></span><strong>{label}</strong></Link>;
}

function ManagerSectionAction({ label, to }: { readonly label: string; readonly to: string }): ReactNode {
  return <Link className="dashboard-page__action-link dashboard-page__action-link--outline" to={to}>{label}<span aria-hidden="true"><DashboardIcon name="arrow" /></span></Link>;
}

type DashboardIconName = "activity" | "add" | "arrow" | "check" | "coins" | "invoice" | "list" | "truck" | "warning" | "work";

function DashboardIcon({ name }: { readonly name: DashboardIconName }): ReactNode {
  const paths: Record<DashboardIconName, string> = {
    activity: "M4 14h3l2-6 4 10 2-5h5", add: "M12 8v8M8 12h8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", arrow: "M5 12h13m-5-5 5 5-5 5", check: "M9 12l2 2 4-5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", coins: "M5 7c0 1.1 3.1 2 7 2s7-.9 7-2-3.1-2-7-2-7 .9-7 2Zm0 0v5c0 1.1 3.1 2 7 2s7-.9 7-2V7m-14 5v5c0 1.1 3.1 2 7 2s7-.9 7-2v-5", invoice: "M6 3h9l3 3v15H6V3Zm3 8h6m-6 4h6m-6 4h4", list: "M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01", truck: "M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6Zm-7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", warning: "M12 4 3 20h18L12 4Zm0 6v4m0 3h.01", work: "M4 7h16v13H4V7Zm6 0V4h4v3m-4 6h4",
  };
  return <svg className="dashboard-page__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d={paths[name]} /></svg>;
}

function FinanceMetric({ icon, label, tone, value }: { readonly icon: DashboardIconName; readonly label: string; readonly tone?: "danger"; readonly value: string }): ReactNode {
  return (
    <div className={`dashboard-page__finance-metric${tone ? ` dashboard-page__finance-metric--${tone}` : ""}`}>
      <span><i aria-hidden="true"><DashboardIcon name={icon} /></i>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkPreviewCard({ actionLabel, actionTo, work }: { readonly actionLabel: string; readonly actionTo: string; readonly work: WorkSummary }): ReactNode {
  return (
    <article className="dashboard-page__work-card">
      <div className="dashboard-page__work-main">
        <div>
          <strong>{work.code}</strong>
          <span>{work.patientName}</span>
        </div>
        <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />
      </div>
      <div className="dashboard-page__work-grid">
        <MetricCell label="Clinică" value={work.clinic?.name ?? "-"} />
        <MetricCell label="Medic" value={work.doctor?.displayName ?? "-"} />
        <MetricCell label="Tip" value={work.workType.name} />
        <MetricCell label="Stare" value={work.status} />
        <MetricCell label="Termen" value={formatDate(work.deadline.effectiveDueAt ?? work.requestedDeliveryDate)} />
        <MetricCell label="Companie" value={work.executionSnapshot.summary.legalEntity?.code ?? work.claim.executionLegalEntity?.code ?? "Nefixată"} />
        <MetricCell label="Responsabil" value={work.claim.technician?.displayName ?? "Nerevendicată"} />
      </div>
      <div className="dashboard-page__work-actions">
        <DeadlineIndicator label={work.deadline.badge} state={work.deadline.status} />
        <DashboardAction label={actionLabel} to={actionTo} variant="primary" />
      </div>
    </article>
  );
}

function OperationalPreviewCard({ actionLabel, row }: { readonly actionLabel: string; readonly row: OperationalStatusRow }): ReactNode {
  return (
    <article className="dashboard-page__work-card">
      <div className="dashboard-page__work-main">
        <div>
          <strong>{row.workCode}</strong>
          <span>{row.patient.name}</span>
        </div>
        <PriorityBadge label={row.priority === "URGENT" ? "Urgent" : "Normal"} variant={row.priority === "URGENT" ? "urgent" : "normal"} />
      </div>
      <div className="dashboard-page__work-grid">
        <MetricCell label="Clinică" value={row.clinic?.name ?? "-"} />
        <MetricCell label="Medic" value={row.doctor?.name ?? "-"} />
        <MetricCell label="Tip" value={row.workType.name} />
        <MetricCell label="Stare logistică" value={row.logistics.status ?? "-"} />
        <MetricCell label="Tehnician" value={row.currentStageTechnician?.displayName ?? row.workOwner?.displayName ?? "Neasignat"} />
        <MetricCell label="CDT/NG" value={row.executionCompany?.code ?? "Nefixată"} />
      </div>
      <div className="dashboard-page__work-actions">
        <DeadlineIndicator label={row.deadline.badge} state={row.deadline.state} />
        <SheetStatusIndicator label={row.realLabSheet.label} status={row.realLabSheet.status} />
        <DashboardAction label={actionLabel} to={`/works?workId=${row.id}`} variant="primary" />
      </div>
    </article>
  );
}

function AttentionList({ items }: { readonly items: readonly (OperationalStatusRow | TechnicianWorkbenchItem)[] }): ReactNode {
  if (items.length === 0) {
    return <DashboardEmptyState description="Nu există atenționări pentru lista curentă." title="Totul este în regulă" />;
  }

  const uniqueItems = items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);

  return (
    <div className="dashboard-page__attention-list">
      {uniqueItems.map((item) => "workCode" in item && "workId" in item ? (
        <article className="dashboard-page__attention-item" key={item.id}>
          <div>
            <strong>{item.workCode}</strong>
            <span>{item.patientName} · {item.clinic?.name ?? "-"}</span>
          </div>
          <div className="dashboard-page__work-actions">
            <DeadlineIndicator label={formatDate(item.dueDate)} state={item.categories.includes("OVERDUE") ? "late" : item.categories.includes("DUE_TODAY") ? "due_today" : "on_time"} />
            <SheetStatusIndicator label={item.realLabSheet.label} status={item.realLabSheet.status} />
            <DashboardAction label="Continuă lucrarea" to={`/works?workId=${item.workId}`} variant="primary" />
          </div>
        </article>
      ) : (
        <article className="dashboard-page__attention-item" key={item.id}>
          <div>
            <strong>{item.workCode}</strong>
            <span>{item.patient.name} · {item.clinic?.name ?? "-"} · {item.logistics.status ?? "-"}</span>
          </div>
          <div className="dashboard-page__work-actions">
            <DeadlineIndicator label={item.deadline.badge} state={item.deadline.state} />
            <SheetStatusIndicator label={item.realLabSheet.label} status={item.realLabSheet.status} />
            <DashboardAction label="Deschide lucrarea" to={`/works?workId=${item.id}`} variant="primary" />
          </div>
        </article>
      ))}
    </div>
  );
}

function MetricCell({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return (
    <div className="dashboard-page__field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
