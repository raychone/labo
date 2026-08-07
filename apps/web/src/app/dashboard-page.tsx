import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  PriorityBadge,
  StatusBadge,
} from "@dental-lab/ui";
import {
  formatMoneyMinor,
  type OperationalStatusRow,
  type OperationalStatusTab,
  type TechnicianWorkbenchItem,
  type WorkSummary,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useAuthState } from "./auth-state.js";
import { fetchOrganizationContext } from "../features/organization-context/organization-context-api.js";
import { useAvailableWorksForClaim, useMyClaimedWorks, useWorks } from "../features/works/works-api.js";
import { useSettings } from "../features/settings/settings-api.js";
import { useBillingOverview } from "../features/billing/billing-api.js";
import { useOperationalStatus } from "../features/status/status-api.js";
import { useTechnicianWorkbench } from "../features/technician-workbench/technician-workbench-api.js";
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

function formatDate(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value)) : "Fără termen";
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
  const canReadWorks = permissionKeys.includes("works.read_all");
  const canReadAssignedWorks = permissionKeys.includes("works.read_assigned");
  const canReadOperational = canReadWorks || canReadAssignedWorks;
  const canScanWork = permissionKeys.includes("scan.use");
  const canReadBilling = permissionKeys.includes("finance.read") || permissionKeys.includes("invoice.read");
  const canRecordPayment = permissionKeys.includes("finance.record_payment");
  const canReadTechnician = permissionKeys.includes("technician.workbench.read");
  const canReadAvailable = permissionKeys.includes("works.claim.available.read");
  const canReadOwnClaims = permissionKeys.includes("works.claim.own.read");
  const canReadOrganization = permissionKeys.includes("organization_context.read");
  const isManagerWorkspace = canReadBilling || permissionKeys.includes("pricing.read") || permissionKeys.includes("settings.read") || permissionKeys.includes("users.read");
  const isReceptionWorkspace = canCreateWork || (canReadWorks && !canReadTechnician && !isManagerWorkspace);
  const isTechnicianWorkspace = canReadTechnician || canReadAvailable || canReadOwnClaims;
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
  }, canReadWorks);
  const operationalTodayQuery = useOperationalStatus(operationalQuery("TODAY", 8), canReadOperational);
  const operationalLateQuery = useOperationalStatus(operationalQuery("LATE", 8), canReadOperational);
  const operationalReturnedQuery = useOperationalStatus(operationalQuery("RETURNED", 8), canReadOperational);
  const operationalInProgressQuery = useOperationalStatus(operationalQuery("IN_PROGRESS", 8), canReadOperational);
  const availableWorksQuery = useAvailableWorksForClaim(claimListParams, canReadAvailable);
  const myClaimedWorksQuery = useMyClaimedWorks(claimListParams, canReadOwnClaims);
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
          {canReadTechnician ? <DashboardAction label="Lucrările mele" to="/workbench" /> : null}
        </div>
      </div>

      {isTechnicianWorkspace ? (
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

      {isReceptionWorkspace ? (
        <ReceptionDashboard
          canCreateWork={canCreateWork}
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

      {isManagerWorkspace ? (
        <ManagerDashboard
          activeCompanyLabel={activeCompanyLabel}
          billing={billingOverviewQuery.data}
          canReadBilling={canReadBilling}
          canRecordPayment={canRecordPayment}
          counters={{
            inProgress: getCounter(operationalCounters, "IN_PROGRESS"),
            late: getCounter(operationalCounters, "LATE"),
            readyForDelivery: operationalTodayQuery.data?.items.filter((row) => row.logistics.status === "READY_FOR_DELIVERY").length,
            registeredToday: worksTodayQuery.data?.total,
            returned: getCounter(operationalCounters, "RETURNED"),
            sheets: countIncompleteRows([
              ...(operationalTodayQuery.data?.items ?? []),
              ...(operationalLateQuery.data?.items ?? []),
            ]),
            unassigned: getCounter(operationalCounters, "AVAILABLE"),
          }}
          inProgressRows={operationalInProgressQuery.data?.items ?? []}
          isBillingError={billingOverviewQuery.isError}
          isBillingLoading={billingOverviewQuery.isLoading}
          lateRows={operationalLateQuery.data?.items ?? []}
          returnedRows={operationalReturnedQuery.data?.items ?? []}
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
    <Link className="dashboard-page__metric dashboard-page__metric--link" to={to}>
      <span>{label}</span>
      <strong>{value ?? "..."}</strong>
    </Link>
  );
}

function DashboardAction({ label, to, variant = "outline" }: { readonly label: string; readonly to: string; readonly variant?: "outline" | "primary" }): ReactNode {
  const className = variant === "primary" ? "dl-button dl-button--primary dl-button--medium" : "dl-button dl-button--outline dl-button--medium";
  return <Link className={className} to={to}><span className="dl-button__content"><span>{label}</span></span></Link>;
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
        <DashboardSection title="Disponibile pentru preluare" description="Preluarea și firma NC/NG se confirmă în fluxul existent.">
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
  canScanWork,
  counters,
  isRecentError,
  isRecentLoading,
  recentWorks,
  returnedRows,
  todayRows,
}: {
  readonly canCreateWork: boolean;
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
  const incompleteRows = todayRows.filter((row) => isIncompleteSheet(row.realLabSheet.status)).slice(0, shortListSize);
  return (
    <div className="dashboard-page__workspace" aria-labelledby="reception-dashboard-title">
      <div className="dashboard-page__workspace-header">
        <div>
          <h2 id="reception-dashboard-title">Recepție</h2>
          <p>Înregistrare, reveniri, fișe de completat și verificări operative.</p>
        </div>
        <div className="dashboard-page__actions">
          {canCreateWork ? <DashboardAction label="Lucrare nouă" to="/works" variant="primary" /> : null}
          {canCreateWork ? <DashboardAction label="Înregistrează revenirea" to="/works" /> : null}
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
          {incompleteRows.map((row) => <OperationalPreviewCard key={row.id} actionLabel="Completează fișa" row={row} />)}
        </DashboardSection>
      </div>
      <DashboardSection title="Lucrări revenite" description="Cicluri curente deschise după revenire.">
        {returnedRows.length === 0 ? <DashboardEmptyState description="Nu există lucrări revenite în lista curentă." title="Nicio revenire recentă" /> : null}
        {returnedRows.slice(0, shortListSize).map((row) => <OperationalPreviewCard key={row.id} actionLabel="Deschide ciclul curent" row={row} />)}
      </DashboardSection>
    </div>
  );
}

function ManagerDashboard({
  activeCompanyLabel,
  billing,
  canReadBilling,
  canRecordPayment,
  counters,
  inProgressRows,
  isBillingError,
  isBillingLoading,
  lateRows,
  returnedRows,
}: {
  readonly activeCompanyLabel: string;
  readonly billing: { readonly currency: string; readonly outstandingMinor: number; readonly overdueInvoiceCount: number; readonly partialInvoiceCount: number; readonly totalIssuedMinor: number; readonly paidMinor: number; readonly uninvoicedWorkCount: number; readonly unpaidInvoiceCount: number } | undefined;
  readonly canReadBilling: boolean;
  readonly canRecordPayment: boolean;
  readonly counters: {
    readonly inProgress: number | undefined;
    readonly late: number | undefined;
    readonly readyForDelivery: number | undefined;
    readonly registeredToday: number | undefined;
    readonly returned: number | undefined;
    readonly sheets: number | undefined;
    readonly unassigned: number | undefined;
  };
  readonly inProgressRows: readonly OperationalStatusRow[];
  readonly isBillingError: boolean;
  readonly isBillingLoading: boolean;
  readonly lateRows: readonly OperationalStatusRow[];
  readonly returnedRows: readonly OperationalStatusRow[];
}): ReactNode {
  const currency = billing?.currency ?? "RON";
  const attentionItems = [...lateRows.slice(0, 4), ...returnedRows.slice(0, 4)].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
  return (
    <div className="dashboard-page__workspace" aria-labelledby="manager-dashboard-title">
      <div className="dashboard-page__workspace-header">
        <div>
          <h2 id="manager-dashboard-title">Manager</h2>
          <p>{activeCompanyLabel} · activitate operațională și financiară după permisiuni.</p>
        </div>
        <div className="dashboard-page__actions">
          <DashboardAction label="Vezi statusul" to="/status" variant="primary" />
          <DashboardAction label="Lucrări" to="/works" />
          {canReadBilling ? <DashboardAction label="Facturare" to="/billing" /> : null}
          {canReadBilling ? <DashboardAction label="Lucrări nefacturate" to="/billing" /> : null}
          {canRecordPayment ? <DashboardAction label="Înregistrează încasare" to="/billing" /> : null}
          {canReadBilling ? <DashboardAction label="Vezi restanțele" to="/billing" /> : null}
        </div>
      </div>
      <div className="dashboard-page__metrics dashboard-page__metrics--seven">
        <SummaryMetricCard label="Lucrări înregistrate astăzi" to="/works" value={counters.registeredToday} />
        <SummaryMetricCard label="În producție" to="/status?tab=IN_PROGRESS" value={counters.inProgress} />
        <SummaryMetricCard label="Neasignate" to="/status?tab=AVAILABLE" value={counters.unassigned} />
        <SummaryMetricCard label="Întârziate" to="/status?tab=LATE" value={counters.late} />
        <SummaryMetricCard label="Revenite" to="/status?tab=RETURNED" value={counters.returned} />
        <SummaryMetricCard label="Fișe incomplete" to="/status?sheetStatus=IN_PROGRESS" value={counters.sheets} />
        <SummaryMetricCard label="Gata de livrare" to="/logistics" value={counters.readyForDelivery} />
      </div>
      {canReadBilling ? (
        <div className="dashboard-page__metrics dashboard-page__metrics--five">
          <SummaryMetricCard label="Lucrări nefacturate" to="/billing" value={billing?.uninvoicedWorkCount} />
          <SummaryMetricCard label="Facturi neachitate" to="/billing" value={billing?.unpaidInvoiceCount} />
          <SummaryMetricCard label="Facturi parțial achitate" to="/billing" value={billing?.partialInvoiceCount} />
          <SummaryMetricCard label="Facturi restante" to="/billing" value={billing?.overdueInvoiceCount} />
          <SummaryMetricCard label="Sold restant" to="/billing" value={billing ? formatMoneyMinor(billing.outstandingMinor, currency, "ro-RO") : undefined} />
        </div>
      ) : null}
      <div className="dashboard-page__columns">
        <DashboardSection title="Necesită atenție" description="Operațional separat de financiar.">
          <AttentionList items={attentionItems} />
          {canReadBilling ? <p className="dashboard-page__note">Financiar: {billing?.uninvoicedWorkCount ?? "..."} lucrări nefacturate și {billing?.overdueInvoiceCount ?? "..."} facturi restante.</p> : null}
        </DashboardSection>
        <DashboardSection title="Activitate operațională" description="Stage, progres, tehnician, termen, NC/NG și ciclu.">
          {inProgressRows.length === 0 ? <DashboardEmptyState description="Nu există activitate în producție în lista curentă." title="Fără lucrări în producție" /> : null}
          {inProgressRows.slice(0, shortListSize).map((row) => <OperationalPreviewCard key={row.id} actionLabel="Deschide lucrarea" row={row} />)}
        </DashboardSection>
      </div>
      {canReadBilling ? (
        <DashboardSection title="Situație financiară" description="Date filtrate de firma activă NC/NG.">
          <SectionState error={isBillingError} isLoading={isBillingLoading} text="Se încarcă situația financiară" />
          {billing ? (
            <div className="dashboard-page__finance-row">
              <span>Emis: <strong>{formatMoneyMinor(billing.totalIssuedMinor, currency, "ro-RO")}</strong></span>
              <span>Încasat: <strong>{formatMoneyMinor(billing.paidMinor, currency, "ro-RO")}</strong></span>
              <span>Restant: <strong>{formatMoneyMinor(billing.outstandingMinor, currency, "ro-RO")}</strong></span>
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
        <MetricCell label="Clinică" value={work.clinic.name} />
        <MetricCell label="Medic" value={work.doctor.displayName} />
        <MetricCell label="Tip" value={work.workType.name} />
        <MetricCell label="Etapă" value={work.workflow?.currentStageName ?? "Fără etapă"} />
        <MetricCell label="Progres" value={work.workflow ? `${work.workflow.progressCompleted}/${work.workflow.progressTotal}` : "-"} />
        <MetricCell label="Termen" value={formatDate(work.deadline.effectiveDueAt ?? work.requestedDeliveryDate)} />
        <MetricCell label="Companie" value={work.executionSnapshot.summary.legalEntity?.code ?? work.claim.executionLegalEntity?.code ?? "Nefixată"} />
        <MetricCell label="Responsabil" value={work.claim.technician?.displayName ?? "Nerevendicată"} />
      </div>
      <div className="dashboard-page__work-actions">
        <DeadlineIndicator label={work.deadline.badge} state={work.deadline.status} />
        <DashboardAction label={actionLabel} to={actionTo} variant="primary" />
        <DashboardAction label="Deschide lucrarea" to={`/works?workId=${work.id}`} />
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
        <MetricCell label="Clinică" value={row.clinic.name} />
        <MetricCell label="Medic" value={row.doctor.name} />
        <MetricCell label="Tip" value={row.workType.name} />
        <MetricCell label="Ciclu" value={row.currentCycle?.label ?? "-"} />
        <MetricCell label="Etapă" value={row.workflow.currentStage?.name ?? "Fără etapă"} />
        <MetricCell label="Progres" value={row.workflow.progress ?? `${row.workflow.progressCompleted}/${row.workflow.progressTotal}`} />
        <MetricCell label="Tehnician" value={row.currentStageTechnician?.displayName ?? row.workOwner?.displayName ?? "Neasignat"} />
        <MetricCell label="NC/NG" value={row.executionCompany?.code ?? "Nefixată"} />
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
            <span>{item.patientName} · {item.clinic.name} · {item.stage.name}</span>
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
            <span>{item.patient.name} · {item.clinic.name} · {item.workflow.currentStage?.name ?? "Fără etapă"}</span>
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
