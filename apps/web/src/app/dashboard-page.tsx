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
  type OperationalStatusRow,
  type OperationalStatusTab,
  type TechnicianWorkbenchItem,
  type WorkSummary,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

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
  const showTechnicianWorkspace = isTechnicianWorkspace && !isManagerWorkspace;
  const showReceptionWorkspace = isReceptionWorkspace && !isManagerWorkspace;
  const showManagerWorkspace = isManagerWorkspace;
  const canReadDashboardWorks = showReceptionWorkspace || showManagerWorkspace;
  const canReadDashboardOperational = canReadOperational && canReadDashboardWorks;
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
  const availableWorksQuery = useAvailableWorksForClaim(claimListParams, canReadAvailable);
  const myClaimedWorksQuery = useMyClaimedWorks(claimListParams, canReadOwnClaims);
  const allWorksQuery = useWorks({
    clinicId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    deadlineFilter: undefined,
    doctorId: undefined,
    page: 1,
    pageSize: 1,
    priority: undefined,
    search: undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
    status: undefined,
    workTypeId: undefined,
  }, showManagerWorkspace);
  const technicianWorkbenchQuery = useTechnicianWorkbench({
    page: 1,
    pageSize: shortListSize,
    sortBy: "requestedDeliveryDate",
    sortOrder: "asc",
  }, canReadTechnician);
  const billingOverviewQuery = useBillingOverview(range, canReadBilling);
  const deadlineDashboard = worksTodayQuery.data?.deadlineDashboard;
  const operationalCounters = operationalTodayQuery.data?.counters ?? [];
  const activeCompany = organizationQuery.data?.active;
  const activeCompanyLabel = activeCompany ? `${activeCompany.code} · ${activeCompany.displayName}` : "Firma activă";

  usePageTitle("Acasă", laboratoryName);

  return (
    <section className="dashboard-page dashboard-page--role" aria-labelledby="dashboard-title">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-page__eyebrow">{laboratoryName}</p>
            <h1 id="dashboard-title">Acasă</h1>
            <p>{auth.user?.displayName ?? "Utilizator"} · dashboard compus după permisiunile contului.</p>
          </div>
        <div className="dashboard-page__actions">
          {showTechnicianWorkspace ? <DashboardAction label="Lucrările mele" to="/workbench" /> : null}
        </div>
      </div>

      {showTechnicianWorkspace ? (
        <TechnicianDashboard
          availableWorks={availableWorksQuery.data?.items ?? []}
          availableTotal={availableWorksQuery.data?.total}
          canScanWork={canScanWork}
          isAvailableError={availableWorksQuery.isError}
          isAvailableLoading={availableWorksQuery.isLoading}
          isMineError={myClaimedWorksQuery.isError}
          isMineLoading={myClaimedWorksQuery.isLoading}
          isWorkbenchError={technicianWorkbenchQuery.isError}
          isWorkbenchLoading={technicianWorkbenchQuery.isLoading}
          myWorks={myClaimedWorksQuery.data?.items ?? []}
          myWorksTotal={myClaimedWorksQuery.data?.total}
          returnedCount={getCounter(operationalCounters, "RETURNED")}
          workbenchItems={technicianWorkbenchQuery.data?.items ?? []}
          workbenchSummary={technicianWorkbenchQuery.data?.summary}
        />
      ) : null}

      {showReceptionWorkspace ? (
        <ReceptionDashboard
          canCreateWork={canCreateWork}
          canCreateNextCycle={canCreateNextCycle}
          canScanWork={canScanWork}
          counters={{
            dueToday: deadlineDashboard?.dueToday,
            dueTomorrow: deadlineDashboard?.dueTomorrow,
            incompleteSheets: countIncompleteRows(operationalTodayQuery.data?.items ?? []),
            registeredToday: worksTodayQuery.data?.total,
            returned: getCounter(operationalCounters, "RETURNED"),
            unresolved: deadlineDashboard?.unresolved,
            verify: getCounter(operationalCounters, "AVAILABLE"),
          }}
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
          allWorksTotal={allWorksQuery.data?.total}
          billing={billingOverviewQuery.data}
          canReadBilling={canReadBilling}
          counters={{
            inProgress: getCounter(operationalCounters, "IN_PROGRESS"),
            late: getCounter(operationalCounters, "LATE"),
            registeredToday: worksTodayQuery.data?.total,
            returned: getCounter(operationalCounters, "RETURNED"),
            sheets: countIncompleteRows([
              ...(operationalTodayQuery.data?.items ?? []),
              ...(operationalLateQuery.data?.items ?? []),
            ]),
            unassigned: getCounter(operationalCounters, "AVAILABLE"),
          }}
          isBillingError={billingOverviewQuery.isError}
          isBillingLoading={billingOverviewQuery.isLoading}
        />
      ) : null}

      {!isManagerWorkspace && !isReceptionWorkspace && !isTechnicianWorkspace ? (
        <DashboardEmptyState
          action={{ label: "Deschide status", to: "/status" }}
          description="Nu există widgeturi dedicate pentru permisiunile curente."
          title="Nu există dashboard dedicat"
        />
      ) : null}
    </section>
  );
}

function getCounter(counters: readonly { readonly count: number; readonly tab: OperationalStatusTab }[], tab: OperationalStatusTab): number | undefined {
  return counters.find((counter) => counter.tab === tab)?.count;
}

function countIncompleteRows(rows: readonly OperationalStatusRow[]): number {
  return rows.filter((row) => isIncompleteSheet(row.realLabSheet.status)).length;
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

function SummaryMetricCard({ label, to, value }: { readonly label: string; readonly to: string; readonly value: number | string | undefined }): ReactNode {
  return (
    <Link className="dl-kpi dashboard-page__metric dashboard-page__metric--link" to={to}>
      <span>{label}</span>
      <strong>{value ?? "..."}</strong>
    </Link>
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
  availableTotal,
  availableWorks,
  canScanWork,
  isAvailableError,
  isAvailableLoading,
  isMineError,
  isMineLoading,
  isWorkbenchError,
  isWorkbenchLoading,
  myWorks,
  myWorksTotal,
  returnedCount,
  workbenchItems,
  workbenchSummary,
}: {
  readonly availableTotal: number | undefined;
  readonly availableWorks: readonly WorkSummary[];
  readonly canScanWork: boolean;
  readonly isAvailableError: boolean;
  readonly isAvailableLoading: boolean;
  readonly isMineError: boolean;
  readonly isMineLoading: boolean;
  readonly isWorkbenchError: boolean;
  readonly isWorkbenchLoading: boolean;
  readonly myWorks: readonly WorkSummary[];
  readonly myWorksTotal: number | undefined;
  readonly returnedCount: number | undefined;
  readonly workbenchItems: readonly TechnicianWorkbenchItem[];
  readonly workbenchSummary: { readonly dueToday: number; readonly inProgress: number; readonly overdue: number; readonly totalActive: number; readonly unstarted: number; readonly urgent: number } | undefined;
}): ReactNode {
  const incompleteSheets = workbenchItems.filter((item) => isIncompleteSheet(item.realLabSheet.status)).length;
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
      <div className="dashboard-page__metrics dashboard-page__metrics--six">
        <SummaryMetricCard label="Disponibile pentru preluare" to="/workbench" value={availableTotal} />
        <SummaryMetricCard label="Lucrările mele" to="/workbench" value={myWorksTotal} />
        <SummaryMetricCard label="În lucru" to="/workbench" value={workbenchSummary?.inProgress} />
        <SummaryMetricCard label="Întârziate" to="/workbench" value={workbenchSummary?.overdue} />
        <SummaryMetricCard label="Fișe incomplete" to="/workbench" value={incompleteSheets} />
        <SummaryMetricCard label="Revenite" to="/status?tab=RETURNED" value={returnedCount} />
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
  counters,
  isRecentError,
  isRecentLoading,
  recentWorks,
  returnedRows,
  todayRows,
}: {
  readonly canCreateWork: boolean;
  readonly canCreateNextCycle: boolean;
  readonly canScanWork: boolean;
  readonly counters: {
    readonly dueToday: number | undefined;
    readonly dueTomorrow: number | undefined;
    readonly incompleteSheets: number | undefined;
    readonly registeredToday: number | undefined;
    readonly returned: number | undefined;
    readonly unresolved: number | undefined;
    readonly verify: number | undefined;
  };
  readonly isRecentError: boolean;
  readonly isRecentLoading: boolean;
  readonly recentWorks: readonly WorkSummary[];
  readonly returnedRows: readonly OperationalStatusRow[];
  readonly todayRows: readonly OperationalStatusRow[];
}): ReactNode {
  const toast = useToast();
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedReturnedWorkId, setSelectedReturnedWorkId] = useState<string | null>(null);
  const [probeTypeIds, setProbeTypeIds] = useState<readonly string[]>([]);
  const [probeDate, setProbeDate] = useState("");
  const [probeTime, setProbeTime] = useState("");
  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  const [isProbeFormOpen, setProbeFormOpen] = useState(false);
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
    page: 1,
    pageSize: 100,
    search: null,
    sortBy: "updatedAt",
    sortDirection: "desc",
    tab: "COMPLETED",
  }, isReturnModalOpen && canCreateNextCycle);
  const clinicsQuery = useQuery({ enabled: isReturnModalOpen && canCreateNextCycle, queryFn: fetchClinicOptions, queryKey: ["clinics", "options", "reception-probe"], retry: false });
  const doctorsQuery = useQuery({ enabled: isReturnModalOpen && canCreateNextCycle && Boolean(selectedClinicId), queryFn: () => fetchDoctorOptions(selectedClinicId), queryKey: ["doctors", "options", "reception-probe", selectedClinicId], retry: false });
  const patientsQuery = usePatientOptions(patientSearch, isReturnModalOpen && canCreateNextCycle && Boolean(selectedClinicId), selectedClinicId || undefined, selectedDoctorId || undefined);
  const returnMutation = useReceiveProbe();
  const selectedReturnedWorkDetailQuery = useWork(selectedReturnedWorkId, (isReturnModalOpen || isProbeFormOpen) && selectedReturnedWorkId !== null);
  const probeTypesQuery = useProbeTypes((isReturnModalOpen || isProbeFormOpen) && canCreateNextCycle);
  const returnedProbeRows = returnQuery.data?.items ?? [];
  const availableProbeRows = (availableProbeQuery.data?.items ?? []).filter((row) => row.technicalReadiness === "PROBE_READY" || row.hasCompletedPickup || row.delivery.status === "PICKED_UP");
  const visibleAvailableProbeRows = availableProbeRows.filter((row) =>
    (!selectedClinicId || row.clinic?.id === selectedClinicId) &&
    (!selectedDoctorId || row.doctor?.id === selectedDoctorId) &&
    (!selectedPatientId || row.patient.id === selectedPatientId),
  );
  // The probe form is opened from the courier-available queue. Keep that row
  // available here as well; the returned-only query intentionally excludes it
  // until reception registers the next cycle.
  const selectedReturnedWork = [...availableProbeRows, ...returnedProbeRows].find((row) => row.id === selectedReturnedWorkId) ?? null;
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
  const completedProbeHistory = selectedReturnedWorkDetail?.completedProbeCycles ?? [];
  useEffect(() => {
    setProbeTypeIds(selectableProbeTypes[0]?.id ? [selectableProbeTypes[0].id] : []);
    setProbeDate("");
    setProbeTime("");
  }, [probeTypesQuery.data, selectedReturnedWorkDetail, selectedReturnedWorkId]);
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
      <div className="dashboard-page__metrics dashboard-page__metrics--seven">
        <SummaryMetricCard label="Înregistrate astăzi" to="/works" value={counters.registeredToday} />
        <SummaryMetricCard label="Cu termen astăzi" to="/status?tab=TODAY" value={counters.dueToday} />
        <SummaryMetricCard label="Cu termen mâine" to="/works" value={counters.dueTomorrow} />
        <SummaryMetricCard label="Fără termen" to="/works" value={counters.unresolved} />
        <SummaryMetricCard label="Fișe incomplete" to="/status?sheetStatus=IN_PROGRESS" value={counters.incompleteSheets} />
        <SummaryMetricCard label="Revenite" to="/status?tab=RETURNED" value={counters.returned} />
        <SummaryMetricCard label="Necesită verificare la recepție" to="/status?tab=AVAILABLE" value={counters.verify} />
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
        description="Selectează clinica, medicul și pacientul pentru a identifica automat lucrarea revenită."
        isOpen={isReturnModalOpen}
        onOpenChange={(isOpen) => {
          setReturnModalOpen(isOpen);
          if (!isOpen) {
            setSelectedReturnedWorkId(null);
            setSelectedClinicId("");
            setSelectedDoctorId("");
            setPatientSearch("");
            setSelectedPatientId("");
          }
        }}
        title="Înregistrează revenirea"
      >
        <div className="dashboard-page__return-modal">
          <div className="dashboard-page__return-fields">
            <label>
              Clinică *
              <select className="dl-control" value={selectedClinicId} onChange={(event) => { setSelectedClinicId(event.target.value); setSelectedDoctorId(""); setSelectedPatientId(""); setSelectedReturnedWorkId(null); setPatientSearch(""); }}>
                <option value="">Selectează clinica</option>
                {(clinicsQuery.data ?? []).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
              </select>
            </label>
            <label>
              Medic
              <select className="dl-control" disabled={!selectedClinicId} value={selectedDoctorId} onChange={(event) => { setSelectedDoctorId(event.target.value); setSelectedPatientId(""); setSelectedReturnedWorkId(null); setPatientSearch(""); }}>
                <option value="">Toți medicii</option>
                {(doctorsQuery.data ?? []).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.displayName}</option>)}
              </select>
            </label>
          </div>
          {selectedClinicId ? <TextInput label="Caută pacient" placeholder="Nume și prenume" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} /> : null}
          {!selectedClinicId ? <p className="dashboard-page__empty-note">Selectează mai întâi clinica pentru a vedea pacienții asociați.</p> : null}
          {patientsQuery.isLoading ? <LoadingState text="Se încarcă pacienții" /> : null}
          <div className="dashboard-page__return-list dashboard-page__patient-list">
            {(patientsQuery.data ?? []).map((patient) => (
              <button
                aria-pressed={selectedPatientId === patient.id}
                className="dashboard-page__return-item"
                key={patient.id}
                onClick={() => {
                  const matches = availableProbeRows.filter((row) => row.patient.id === patient.id && (!selectedClinicId || row.clinic?.id === selectedClinicId) && (!selectedDoctorId || row.doctor?.id === selectedDoctorId));
                  setSelectedPatientId(patient.id);
                  setSelectedReturnedWorkId(matches.length === 1 ? matches[0]!.id : null);
                }}
                type="button"
              >
                <strong className="dashboard-page__return-patient">{patient.fullName}</strong>
              </button>
            ))}
          </div>
          {selectedClinicId ? (
            <div className="dashboard-page__return-matches">
              <strong>Probe disponibile de la curier</strong>
              <p className="dashboard-page__empty-note">Selectează proba revenită pentru a introduce etapa și termenul următor.</p>
              <div className="dashboard-page__return-list">
                {visibleAvailableProbeRows.map((row) => (
                  <button className="dashboard-page__return-item" key={row.id} onClick={() => { setSelectedReturnedWorkId(row.id); setReturnModalOpen(false); setProbeFormOpen(true); }} type="button">
                    <strong>{row.patient.name} · {row.workCode}</strong>
                    <span>{probeLabel(row)} · {workCompositionLabel(row)}</span>
                    <span>{row.components.flatMap((component) => component.teeth).length > 0 ? `Dinți: ${row.components.flatMap((component) => component.teeth).join(", ")}` : "Fără dinți"}</span>
                  </button>
                ))}
                {!availableProbeQuery.isLoading && visibleAvailableProbeRows.length === 0 ? <p className="dashboard-page__empty-note">Nu există probe disponibile pentru selecția curentă.</p> : null}
              </div>
            </div>
          ) : null}
          {returnQuery.isLoading || availableProbeQuery.isLoading ? <LoadingState text="Se verifică lucrările revenite" /> : null}
          {returnQuery.isError ? <ErrorState title="Lista nu a putut fi încărcată" description="Nu am putut încărca lucrările finalizate." /> : null}
        </div>
      </Modal>
      <Modal
        footer={selectedReturnedWork ? (
          <Button
            disabled={probeTypeIds.length === 0 || !probeDate}
            isLoading={returnMutation.isPending}
            onClick={() => {
              if (probeTypeIds.length === 0 || !probeDate || !selectedReturnedWork) return;
              const deadlineAt = new Date(`${probeDate}T${probeTime || "23:59"}:00`).toISOString();
              returnMutation.mutate({ input: { deadlineAt, probeTypeIds }, workOrderId: selectedReturnedWork.id }, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Proba nu a fost înregistrată", variant: "error" }),
                onSuccess: () => {
                  setProbeFormOpen(false);
                  setSelectedReturnedWorkId(null);
                },
              });
            }}
          >
            Înregistrează proba
          </Button>
        ) : null}
        isOpen={isProbeFormOpen}
        onOpenChange={(isOpen) => {
          setProbeFormOpen(isOpen);
          if (!isOpen) setSelectedReturnedWorkId(null);
        }}
        title="Înregistrează revenirea"
      >
        <div className="dashboard-page__probe-form">
          <div className="dashboard-page__probe-heading">
            <strong>{probeLabel(selectedReturnedWork)} · {selectedReturnedWork?.workCode ?? "Lucrare selectată"}</strong>
            <span>{selectedReturnedWork?.patient.name ?? "Pacient selectat"}</span>
          </div>
          {selectedReturnedWork ? (
            <div className="dashboard-page__probe-summary">
              {selectedReturnedWork.components.map((component) => (
                <div key={`${component.symbol}-${component.name}`}>
                  <span aria-hidden="true" className="dashboard-page__probe-color" style={{ backgroundColor: component.colorHex ?? "#0f766e" }} />
                  <strong>{component.name}</strong>
                  <span>{component.teeth.length > 0 ? `Dinți: ${component.teeth.join(", ")}` : "Lucrare pe arcadă / caz"}</span>
                </div>
              ))}
            </div>
          ) : null}
          {selectedReturnedWork ? (
            <div className="dashboard-page__probe-history">
              <strong>Probe efectuate anterior</strong>
              {completedProbeHistory.length > 0 ? completedProbeHistory.map((cycle) => (
                <div key={cycle.id}>
                  <span>{cycle.sequence === 0 ? "Proba inițială" : `Proba ${cycle.sequence}`}</span>
                  <strong>{cycle.probeTypeNameSnapshot}</strong>
                </div>
              )) : <span>Nu există probe efectuate anterior.</span>}
            </div>
          ) : null}
          {selectedReturnedWorkDetailQuery.isLoading ? <LoadingState text="Se încarcă tipurile compatibile" /> : null}
          {probeTypesQuery.isError ? <ErrorState title="Tipurile de probă nu au putut fi încărcate" description="Verifică accesul la catalogul tehnic și reîncarcă pagina." /> : null}
          {!probeTypesQuery.isLoading && !probeTypesQuery.isError && selectableProbeTypes.length === 0 ? <p className="dashboard-page__empty-note">Nu există tipuri de probă active în catalogul tehnic.</p> : null}
          {selectableProbeTypes.length > 0 ? (
            <fieldset className="dashboard-page__probe-types">
              <legend>Tipuri probă</legend>
              <div className="dashboard-page__probe-type-cards">
                {selectableProbeTypes.map((type) => {
                  const previousCount = completedProbeHistory.filter((cycle) => cycle.probeTypeNameSnapshot === type.name).length;
                  const isSelected = probeTypeIds.includes(type.id);
                  return (
                    <label className={`dashboard-page__probe-type-card${isSelected ? " dashboard-page__probe-type-card--selected" : ""}`} key={type.id}>
                      <input
                        checked={isSelected}
                        onChange={() => setProbeTypeIds((current) => current.includes(type.id) ? current.filter((id) => id !== type.id) : [...current, type.id])}
                        type="checkbox"
                      />
                      <span className="dashboard-page__probe-type-name">{type.name}</span>
                      {previousCount > 0 ? <span className="dashboard-page__probe-type-history">{previousCount}x în trecut</span> : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <div className="dashboard-page__probe-schedule">
            <label>
              Data termenului probei *
              <input className="dl-control dashboard-page__probe-date" onChange={(event) => setProbeDate(event.target.value)} type="date" value={probeDate} required />
            </label>
            <label>
              Ora termenului
              <input className="dl-control dashboard-page__probe-time" onChange={(event) => setProbeTime(event.target.value)} type="time" value={probeTime} />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ManagerDashboard({
  activeCompanyLabel,
  allWorksTotal,
  billing,
  canReadBilling,
  counters,
  isBillingError,
  isBillingLoading,
}: {
  readonly activeCompanyLabel: string;
  readonly allWorksTotal: number | undefined;
  readonly billing: { readonly currency: string; readonly outstandingMinor: number; readonly overdueInvoiceCount: number; readonly partialInvoiceCount: number; readonly totalIssuedMinor: number; readonly paidMinor: number; readonly uninvoicedWorkCount: number; readonly unpaidInvoiceCount: number } | undefined;
  readonly canReadBilling: boolean;
  readonly counters: {
    readonly inProgress: number | undefined;
    readonly late: number | undefined;
    readonly registeredToday: number | undefined;
    readonly returned: number | undefined;
    readonly sheets: number | undefined;
    readonly unassigned: number | undefined;
  };
  readonly isBillingError: boolean;
  readonly isBillingLoading: boolean;
}): ReactNode {
  const currency = billing?.currency ?? "RON";
  return (
    <div className="dashboard-page__workspace" aria-labelledby="manager-dashboard-title">
      <div className="dashboard-page__workspace-header">
        <div>
          <h2 id="manager-dashboard-title">Manager</h2>
          <p>{activeCompanyLabel} · activitate operațională și financiară după permisiuni.</p>
        </div>
        <div className="dashboard-page__actions">
          <DashboardAction label="Vezi statusul" to="/status" variant="primary" />
          {canReadBilling ? <DashboardAction label="Facturare" to="/billing" /> : null}
        </div>
      </div>
      <div className="dashboard-page__metrics dashboard-page__metrics--seven">
        <SummaryMetricCard label="Lucrări" to="/status" value={allWorksTotal ?? counters.registeredToday} />
        <SummaryMetricCard label="În lucru" to="/status?tab=IN_PROGRESS" value={counters.inProgress} />
        <SummaryMetricCard label="Întârziate" to="/status?tab=LATE" value={counters.late} />
        <SummaryMetricCard label="Neasignate" to="/status?tab=AVAILABLE" value={counters.unassigned} />
        <SummaryMetricCard label="Revenite" to="/status?tab=RETURNED" value={counters.returned} />
        <SummaryMetricCard label="Fișe incomplete" to="/status?sheetStatus=IN_PROGRESS" value={counters.sheets} />
      </div>
      {canReadBilling ? (
        <div className="dashboard-page__metrics dashboard-page__metrics--five">
          <SummaryMetricCard label="Lucrări nefacturate" to="/billing?tab=uninvoiced" value={billing?.uninvoicedWorkCount} />
          <SummaryMetricCard label="Facturi neachitate" to="/billing?tab=receivables&paymentFilter=UNPAID" value={billing?.unpaidInvoiceCount} />
          <SummaryMetricCard label="Facturi parțial achitate" to="/billing?tab=receivables&paymentFilter=PARTIALLY_PAID" value={billing?.partialInvoiceCount} />
          <SummaryMetricCard label="Facturi restante" to="/billing?tab=receivables&paymentFilter=OUTSTANDING" value={billing?.overdueInvoiceCount} />
          <SummaryMetricCard label="Sold restant" to="/billing?tab=receivables&paymentFilter=OUTSTANDING" value={billing ? formatKpiMoneyMinor(billing.outstandingMinor, currency, "ro-RO") : undefined} />
        </div>
      ) : null}
      {canReadBilling ? (
        <DashboardSection title="Situație financiară" description="Date filtrate de firma activă NC/NG.">
          <SectionState error={isBillingError} isLoading={isBillingLoading} text="Se încarcă situația financiară" />
          {billing ? (
            <div className="dashboard-page__finance-row">
              <span>Emis: <strong>{formatKpiMoneyMinor(billing.totalIssuedMinor, currency, "ro-RO")}</strong></span>
              <span>Încasat: <strong>{formatKpiMoneyMinor(billing.paidMinor, currency, "ro-RO")}</strong></span>
              <span>Restant: <strong>{formatKpiMoneyMinor(billing.outstandingMinor, currency, "ro-RO")}</strong></span>
              <DashboardAction label="Deschide facturarea" to="/billing" />
            </div>
          ) : null}
        </DashboardSection>
      ) : null}
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
