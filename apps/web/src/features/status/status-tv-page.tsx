import {
  DEADLINE_VISUAL_STATES,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUSES,
  LOGISTICS_STATUS_LABELS,
  LOGISTICS_STATUSES,
  OPERATIONAL_STATUS_SORT_FIELDS,
  type DeadlineVisualState,
  type DeliveryStatus,
  type LogisticsStatus,
  type OperationalStatusQuery,
  type OperationalStatusRow,
  type OperationalStatusSortDirection,
  type OperationalStatusSortField,
  type OperationalStatusTab,
  type WorkPriority,
  WORK_PRIORITIES,
} from "@dental-lab/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  Select,
  TextInput,
  type SelectOption,
} from "@dental-lab/ui";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { fetchPatientOptions } from "../patients/patients-api.js";
import { useTechnicianOptions } from "../technician-workbench/technician-workbench-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useOperationalStatus } from "./status-api.js";
import "./status-tv-page.css";

const defaultQuery: OperationalStatusQuery = {
  page: 1,
  pageSize: 6,
  sortBy: "effectiveDueAt",
  sortDirection: "asc",
  tab: "IN_PROGRESS",
};

const tvVisibleTabs: readonly OperationalStatusTab[] = ["IN_PROGRESS", "LATE", "RETURNED"];
const tvPageSize = 6;
const tvAutoRotateIntervalMs = 12_000;

type StatusQueryPatch = {
  readonly [K in keyof OperationalStatusQuery]?: OperationalStatusQuery[K] | null | undefined;
};

function isSortField(value: string | null): value is OperationalStatusSortField {
  return OPERATIONAL_STATUS_SORT_FIELDS.includes(value as OperationalStatusSortField);
}

function isSortDirection(value: string | null): value is OperationalStatusSortDirection {
  return value === "asc" || value === "desc";
}

function isWorkPriority(value: string | null): value is WorkPriority {
  return WORK_PRIORITIES.includes(value as WorkPriority);
}

function isDeadlineState(value: string | null): value is DeadlineVisualState {
  return DEADLINE_VISUAL_STATES.includes(value as DeadlineVisualState);
}

function isLogisticsStatus(value: string | null): value is LogisticsStatus {
  return LOGISTICS_STATUSES.includes(value as LogisticsStatus);
}

function isDeliveryStatus(value: string | null): value is DeliveryStatus {
  return DELIVERY_STATUSES.includes(value as DeliveryStatus);
}

function isOperationalTab(value: string | null): value is OperationalStatusTab {
  return tvVisibleTabs.includes(value as OperationalStatusTab);
}

function readPositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
}

function readQuery(searchParams: URLSearchParams): OperationalStatusQuery {
  const priority = searchParams.get("priority");
  const deadlineState = searchParams.get("deadlineState");
  const logisticsStatus = searchParams.get("logisticsStatus");
  const deliveryStatus = searchParams.get("deliveryStatus");
  const tab = searchParams.get("tab");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");

  return {
    page: readPositiveInt(searchParams.get("page"), defaultQuery.page),
    pageSize: tvPageSize,
    sortBy: isSortField(sortBy) ? sortBy : defaultQuery.sortBy,
    sortDirection: isSortDirection(sortDirection) ? sortDirection : defaultQuery.sortDirection,
    tab: isOperationalTab(tab) ? tab : defaultQuery.tab,
    ...(searchParams.get("clinicId") ? { clinicId: searchParams.get("clinicId") } : {}),
    ...(searchParams.get("doctorId") ? { doctorId: searchParams.get("doctorId") } : {}),
    ...(searchParams.get("executionLegalEntityCode") === "CDT" || searchParams.get("executionLegalEntityCode") === "NG"
      ? { executionLegalEntityCode: searchParams.get("executionLegalEntityCode") as "CDT" | "NG" }
      : {}),
    ...(searchParams.get("ownerUserId") ? { ownerUserId: searchParams.get("ownerUserId") } : {}),
    ...(searchParams.get("patientId") ? { patientId: searchParams.get("patientId") } : {}),
    ...(searchParams.get("search") ? { search: searchParams.get("search") } : {}),
    ...(searchParams.get("stageTechnicianUserId") ? { stageTechnicianUserId: searchParams.get("stageTechnicianUserId") } : {}),
    ...(searchParams.get("workTypeId") ? { workTypeId: searchParams.get("workTypeId") } : {}),
    ...(priority && isWorkPriority(priority) ? { priority } : {}),
    ...(deadlineState && isDeadlineState(deadlineState) ? { deadlineState } : {}),
    ...(logisticsStatus && isLogisticsStatus(logisticsStatus) ? { logisticsStatus } : {}),
    ...(deliveryStatus && isDeliveryStatus(deliveryStatus) ? { deliveryStatus } : {}),
  };
}

function updateSearchParams(current: URLSearchParams, patch: StatusQueryPatch): URLSearchParams {
  const next = new URLSearchParams(current);
  const merged = { ...readQuery(current), ...patch };
  const keys = [
    "clinicId",
    "deadlineState",
    "deliveryStatus",
    "doctorId",
    "executionLegalEntityCode",
    "logisticsStatus",
    "ownerUserId",
    "patientId",
    "priority",
    "search",
    "sortBy",
    "sortDirection",
    "stageTechnicianUserId",
    "tab",
    "workTypeId",
  ] as const;

  next.set("page", String(merged.page ?? defaultQuery.page));
  next.set("pageSize", String(merged.pageSize ?? defaultQuery.pageSize));

  for (const key of keys) {
    const value = merged[key];
    if (value === undefined || value === null || value === "" || value === defaultQuery[key as keyof OperationalStatusQuery]) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  if (next.get("page") === "1") {
    next.delete("page");
  }
  if (next.get("pageSize") === String(defaultQuery.pageSize)) {
    next.delete("pageSize");
  }

  return next;
}

function getSafeColor(value: string | null | undefined): string | null {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

function toPriorityLabel(priority: WorkPriority): string {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function getWorkTypeCompactLabel(workType: OperationalStatusRow["workType"]): string {
  return workType.symbol.trim() || workType.name;
}

function getClinicDoctorLabel(row: OperationalStatusRow): string {
  return row.clinic?.name ?? row.doctor?.name ?? "-";
}

function getPickupDeliveryLabel(row: OperationalStatusRow): string {
  if (!row.delivery.status) {
    return "-";
  }
  return row.delivery.status === "PICKED_UP" ? "Ridicare" : "Livrare";
}

function getClaimLabel(row: OperationalStatusRow): string {
  return row.claimedAt
    ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.claimedAt))
    : "Nepreluată";
}

function getAlertLabel(row: OperationalStatusRow): string {
  if (row.deadline.state === "LATE") {
    return "Termen depășit";
  }
  return row.logistics.status ? LOGISTICS_STATUS_LABELS[row.logistics.status] : "-";
}

function toOperationalLabel(row: OperationalStatusRow): string {
  return row.operationalStatus === "RECEPTIE" ? "Recepție"
    : row.operationalStatus === "IN_LUCRU" ? "În lucru"
      : row.operationalStatus === "IN_ASTEPTARE" ? "În așteptare"
        : "Finalizată";
}

function BadgePill({ label, tone = "neutral" }: { readonly label: string; readonly tone?: "neutral" | "info" | "success" | "warning" | "danger" }): ReactNode {
  return <span className={`status-tv-page__pill status-tv-page__pill--${tone}`}>{label}</span>;
}

function getCompactDeadlineLabel(row: OperationalStatusRow): string {
  const dueAtValue = row.delivery.plannedDate ?? row.deadline.effectiveDueAt;
  if (!dueAtValue) {
    return row.deadline.badge ?? "Fără termen";
  }

  const dueAt = new Date(dueAtValue);
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(dueAt);
}

function getDeadlineTone(row: OperationalStatusRow): "info" | "warning" | "danger" {
  if (row.deadline.state === "LATE") {
    return "danger";
  }
  if (row.deadline.state === "DUE_TODAY") {
    return "warning";
  }
  return "info";
}

function getTvRowScore(row: OperationalStatusRow): number {
  const priorityScore = row.priority === "URGENT" ? 0 : 100;
  const deadlineScore = row.deadline.state === "LATE" ? 0 : row.deadline.state === "DUE_TODAY" ? 1 : row.deadline.state === "DUE_TOMORROW" ? 2 : 3;
  const workflowScore = row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED" ? 0 : row.claimStatus === "UNCLAIMED" ? 1 : 2;

  return priorityScore + deadlineScore + workflowScore;
}

function sortRowsForTv(rows: readonly OperationalStatusRow[]): OperationalStatusRow[] {
  return [...rows].sort((left, right) => {
    const scoreDelta = getTvRowScore(left) - getTvRowScore(right);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const leftDueAt = left.deadline.effectiveDueAt ? new Date(left.deadline.effectiveDueAt).getTime() : Number.POSITIVE_INFINITY;
    const rightDueAt = right.deadline.effectiveDueAt ? new Date(right.deadline.effectiveDueAt).getTime() : Number.POSITIVE_INFINITY;
    if (leftDueAt !== rightDueAt) {
      return leftDueAt - rightDueAt;
    }

    return left.patient.name.localeCompare(right.patient.name, "ro");
  });
}

function useMediaQuery(query: string, fallback = true): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return fallback;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function StatusTvPage(): ReactNode {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const statusQuery = useOperationalStatus(query, true, { refetchIntervalMs: 10_000 });
  const clinicsQuery = useQuery({ queryFn: fetchClinicOptions, queryKey: ["clinics", "options", "status-tv"], retry: false });
  const doctorsQuery = useQuery({ queryFn: () => fetchDoctorOptions(query.clinicId ?? undefined), queryKey: ["doctors", "options", "status-tv", query.clinicId], retry: false });
  const patientsQuery = useQuery({ queryFn: () => fetchPatientOptions(query.search ?? ""), queryKey: ["patients", "options", "status-tv", query.search ?? ""], retry: false });
  const techniciansQuery = useTechnicianOptions(true);
  const workTypesQuery = useWorkTypeOptions(true);
  const rows = useMemo(() => sortRowsForTv(statusQuery.data?.items ?? []), [statusQuery.data?.items]);
  const visibleRows = useMemo(() => rows.slice(0, tvPageSize), [rows]);
  const isLargeScreen = useMediaQuery("(min-width: 980px)");
  const nowLabel = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "medium" }).format(clock);
  const totalPages = Math.max(1, statusQuery.data?.meta.totalPages ?? 1);
  const lastUpdatedLabel = statusQuery.dataUpdatedAt > 0
    ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(statusQuery.dataUpdatedAt))
    : "—";
  const priorityOptions: readonly SelectOption[] = [
    { label: "Toate", value: "" },
    { label: "Normal", value: "NORMAL" },
    { label: "Urgent", value: "URGENT" },
  ];
  const deadlineStateOptions: readonly SelectOption[] = [
    { label: "Toate", value: "" },
    ...DEADLINE_VISUAL_STATES.map((state) => ({ label: state === "DUE_TODAY" ? "Astăzi" : state === "DUE_TOMORROW" ? "Mâine" : state === "LATE" ? "Întârziată" : state === "MANUAL" ? "Manual" : state === "ON_TIME" ? "În termen" : state === "UNKNOWN" ? "Necunoscut" : state === "UNRESOLVED" ? "Fără termen" : "Aproape", value: state })),
  ];
  const logisticsOptions: readonly SelectOption[] = [
    { label: "Toate", value: "" },
    ...LOGISTICS_STATUSES.map((status) => ({ label: LOGISTICS_STATUS_LABELS[status], value: status })),
  ];
  const deliveryOptions: readonly SelectOption[] = [
    { label: "Toate", value: "" },
    ...DELIVERY_STATUSES.map((status) => ({ label: DELIVERY_STATUS_LABELS[status], value: status })),
  ];
  const sortOptions: readonly SelectOption[] = OPERATIONAL_STATUS_SORT_FIELDS.map((field) => ({ label: field === "effectiveDueAt" ? "Termen" : field === "priority" ? "Prioritate" : field === "createdAt" ? "Creată" : field === "updatedAt" ? "Actualizată" : field === "workCode" ? "Cod lucrare" : field === "clinicName" ? "Cabinet" : "Pacient", value: field }));
  const operationalStateOptions: readonly SelectOption[] = tvVisibleTabs.map((tab) => ({ label: tab === "IN_PROGRESS" ? "În lucru" : tab === "LATE" ? "Întârziate" : "Revenite", value: tab }));
  const rowsHaveData = visibleRows.length > 0;
  const summaryCounters = useMemo(
    () => (statusQuery.data?.counters ?? []).filter((counter) => tvVisibleTabs.includes(counter.tab)),
    [statusQuery.data?.counters],
  );
  const pageLabel = `${query.page}/${totalPages}`;
  const visibleRowsLabel = `${visibleRows.length}/${statusQuery.data?.meta.total ?? visibleRows.length}`;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (totalPages < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setSearchParams((current) => {
        const currentQuery = readQuery(current);
        const nextPage = currentQuery.page >= totalPages ? 1 : currentQuery.page + 1;
        return updateSearchParams(current, { page: nextPage });
      }, { replace: true });
    }, tvAutoRotateIntervalMs);

    return () => window.clearInterval(timer);
  }, [setSearchParams, totalPages]);

  function patchQuery(patch: StatusQueryPatch): void {
    setSearchParams((current) => updateSearchParams(current, { ...patch, page: patch.page ?? 1 }));
  }

  function renderTechnician(row: OperationalStatusRow): ReactNode {
    const color = getSafeColor(row.workOwner?.preferredColor);
    return (
      <span className="status-tv-page__technician">
        <span
          aria-label={row.workOwner ? row.workOwner.displayName : "Fără tehnician"}
          className={`status-tv-page__technician-swatch${color ? "" : " status-tv-page__technician-swatch--empty"}`}
          style={color ? { backgroundColor: color } : undefined}
          title={row.workOwner ? row.workOwner.displayName : "Fără tehnician"}
        />
        <span className="status-tv-page__stack">
          <strong>{row.workOwner?.displayName ?? "Fără tehnician"}</strong>
        </span>
      </span>
    );
  }

  function renderRows(): ReactNode {
    if (statusQuery.isLoading) {
      return <LoadingState text="Se încarcă statusul TV" />;
    }

    if (statusQuery.isError) {
      return <ErrorState title="Statusul TV nu a putut fi încărcat" description={getErrorMessage(statusQuery.error)} />;
    }

    if (!rowsHaveData) {
      return <EmptyState title="Nu există lucrări active" description="Nu există lucrări pentru filtrele curente." />;
    }

    return isLargeScreen ? (
      <div className="status-tv-page__table-wrap">
          <table className="status-tv-page__table">
            <thead>
              <tr>
                <th>Clinica sau Medic</th>
                <th>Pacient</th>
                <th>Tip lucrare</th>
                <th>Culoare</th>
                <th>Tehnician</th>
                <th>Preluare</th>
                <th>Termen</th>
                <th>Stare</th>
                <th>Alerte</th>
                <th>Livrare/Ridicare</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="status-tv-page__stack">
                      <strong>{getClinicDoctorLabel(row)}</strong>
                    </span>
                  </td>
                  <td>
                    <span className="status-tv-page__stack">
                      <strong>{row.patient.name}</strong>
                    </span>
                  </td>
                  <td>
                    <span className="status-tv-page__stack">
                      <BadgePill label={getWorkTypeCompactLabel(row.workType)} tone="neutral" />
                    </span>
                  </td>
                  <td>
                    <BadgePill label={row.shade ?? "-"} tone="neutral" />
                  </td>
                  <td>
                    <span className="status-tv-page__stack">
                      {renderTechnician(row)}
                    </span>
                  </td>
                  <td>
                    <span className="status-tv-page__stack">
                      <span>{getClaimLabel(row)}</span>
                    </span>
                  </td>
                  <td>
                    <BadgePill
                      label={getCompactDeadlineLabel(row)}
                      tone={getDeadlineTone(row)}
                    />
                  </td>
                  <td>
                    <BadgePill label={toOperationalLabel(row)} tone={row.deadline.state === "LATE" ? "danger" : row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED" ? "info" : row.claimStatus === "UNCLAIMED" ? "warning" : row.workflow.status === "COMPLETED" ? "success" : "neutral"} />
                  </td>
                  <td>
                    <BadgePill label={getAlertLabel(row)} tone={row.deadline.state === "LATE" ? "danger" : row.logistics.status ? "warning" : "neutral"} />
                  </td>
                  <td>
                    <BadgePill label={getPickupDeliveryLabel(row)} tone={row.delivery.status ? "info" : "neutral"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    ) : (
      <div className="status-tv-page__cards">
          {visibleRows.map((row) => (
            <article className="status-tv-page__card" key={row.id}>
              <div className="status-tv-page__card-header">
                <div className="status-tv-page__stack">
                  <span className="status-tv-page__muted">Clinica sau Medic</span>
                  <strong>{getClinicDoctorLabel(row)}</strong>
                  <span className="status-tv-page__muted">Pacient</span>
                  <strong>{row.patient.name}</strong>
                </div>
                <BadgePill label={toPriorityLabel(row.priority)} tone={row.priority === "URGENT" ? "warning" : "neutral"} />
              </div>
              <div className="status-tv-page__card-grid">
                <div className="status-tv-page__card-field"><span>Culoare</span><BadgePill label={row.shade ?? "-"} tone="neutral" /></div>
                <div className="status-tv-page__card-field"><span>Tip lucrare</span><BadgePill label={getWorkTypeCompactLabel(row.workType)} tone="neutral" /></div>
                <div className="status-tv-page__card-field">
                  <span>Tehnician</span>{renderTechnician(row)}
                </div>
                <div className="status-tv-page__card-field">
                  <span>Preluare</span><span>{getClaimLabel(row)}</span>
                </div>
                <div className="status-tv-page__card-field">
                  <strong>Termen</strong>
                  <span>{getCompactDeadlineLabel(row)}</span>
                </div>
                <div className="status-tv-page__card-field">
                  <strong>Stare</strong>
                  <BadgePill
                    label={toOperationalLabel(row)}
                    tone={row.deadline.state === "LATE" ? "danger" : row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED" ? "info" : row.claimStatus === "UNCLAIMED" ? "warning" : row.workflow.status === "COMPLETED" ? "success" : "neutral"}
                  />
                </div>
                <div className="status-tv-page__card-field">
                  <strong>Alerte</strong>
                  <BadgePill label={getAlertLabel(row)} tone={row.deadline.state === "LATE" ? "danger" : row.logistics.status ? "warning" : "neutral"} />
                </div>
                <div className="status-tv-page__card-field">
                  <strong>Livrare/Ridicare</strong>
                  <span>{getPickupDeliveryLabel(row)}</span>
                </div>
              </div>
            </article>
          ))}
      </div>
    );
  }

  return (
    <main className="status-tv-page">
      <section className="status-tv-page__shell" aria-labelledby="status-tv-title">
        <header className="status-tv-page__header">
          <div className="status-tv-page__heading">
            <p className="status-tv-page__eyebrow">Status TV</p>
            <h1 id="status-tv-title">Panou operațional live</h1>
            <p>Vizualizare read-only pentru monitorizarea lucrărilor active în laborator.</p>
          </div>
          <div className="status-tv-page__meta">
            <div className="status-tv-page__meta-card">
              <span>Acum</span>
              <strong>{nowLabel}</strong>
            </div>
            <div className="status-tv-page__meta-card">
              <span>Ultima actualizare</span>
              <strong>{lastUpdatedLabel}</strong>
            </div>
            <div className="status-tv-page__meta-card">
              <span>Pagină</span>
              <strong>{pageLabel}</strong>
            </div>
            <Button onClick={() => setFiltersOpen((value) => !value)} variant="secondary">
              {filtersOpen ? "Ascunde filtrele" : "Afișează filtrele"}
            </Button>
          </div>
        </header>

        <div className="status-tv-page__summary">
          {summaryCounters.map((counter) => (
            <KpiCard
              className="dl-kpi status-tv-page__summary-card"
              key={counter.tab}
              title={counter.label}
              value={counter.count}
            />
          ))}
        </div>

        <Card className="status-tv-page__panel">
          <CardHeader className="status-tv-page__panel-header">
            <CardTitle>Registru live</CardTitle>
            <span className="status-tv-page__header-copy">{visibleRowsLabel} pe pagină</span>
          </CardHeader>
          <CardContent className="status-tv-page__panel-content">
            {filtersOpen ? (
              <div className="status-tv-page__filters">
                <TextInput
                  label="Căutare"
                  onChange={(event) => patchQuery({ search: event.target.value || null })}
                  placeholder="Cod lucrare, pacient, cabinet"
                  type="search"
                  value={query.search ?? ""}
                />
                <Select
                  label="Stare operațională"
                  onChange={(event) => patchQuery({ tab: isOperationalTab(event.target.value) ? event.target.value : defaultQuery.tab })}
                  options={operationalStateOptions}
                  value={query.tab}
                />
                <Select
                  label="CDT / NG"
                  onChange={(event) => patchQuery({ executionLegalEntityCode: event.target.value === "CDT" || event.target.value === "NG" ? event.target.value : undefined })}
                  options={[{ label: "Toate", value: "" }, { label: "CDT", value: "CDT" }, { label: "NG", value: "NG" }]}
                  value={query.executionLegalEntityCode ?? ""}
                />
                <Select
                  label="Cabinet"
                  onChange={(event) => patchQuery({ clinicId: event.target.value || null, doctorId: null })}
                  options={(clinicsQuery.data ?? []).map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
                  placeholder="Toate"
                  value={query.clinicId ?? ""}
                />
                <Select
                  label="Medic"
                  onChange={(event) => patchQuery({ doctorId: event.target.value || null })}
                  options={(doctorsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
                  placeholder="Toți"
                  value={query.doctorId ?? ""}
                />
                <Select
                  label="Tip lucrare"
                  onChange={(event) => patchQuery({ workTypeId: event.target.value || null })}
                  options={(workTypesQuery.data ?? []).map((workType) => ({ label: `${workType.symbol} · ${workType.name}`, value: workType.id }))}
                  placeholder="Toate"
                  value={query.workTypeId ?? ""}
                />
                <Select
                  label="Pacient"
                  onChange={(event) => patchQuery({ patientId: event.target.value || null })}
                  options={(patientsQuery.data ?? []).map((patient) => ({ label: patient.fullName, value: patient.id }))}
                  placeholder="Toți"
                  value={query.patientId ?? ""}
                />
                <Select
                  label="Tehnician"
                  onChange={(event) => patchQuery({ ownerUserId: event.target.value || null })}
                  options={(techniciansQuery.data ?? []).map((technician) => ({ label: technician.displayName, value: technician.id }))}
                  placeholder="Toți"
                  value={query.ownerUserId ?? ""}
                />
                <Select
                  label="Termen"
                  onChange={(event) => patchQuery({ deadlineState: isDeadlineState(event.target.value) ? event.target.value : undefined })}
                  options={deadlineStateOptions}
                  value={query.deadlineState ?? ""}
                />
                <Select
                  label="Prioritate"
                  onChange={(event) => patchQuery({ priority: isWorkPriority(event.target.value) ? event.target.value : undefined })}
                  options={priorityOptions}
                  value={query.priority ?? ""}
                />
                <Select
                  label="Stare logistică"
                  onChange={(event) => patchQuery({ logisticsStatus: isLogisticsStatus(event.target.value) ? event.target.value : undefined })}
                  options={logisticsOptions}
                  value={query.logisticsStatus ?? ""}
                />
                <Select
                  label="Stare livrare"
                  onChange={(event) => patchQuery({ deliveryStatus: isDeliveryStatus(event.target.value) ? event.target.value : undefined })}
                  options={deliveryOptions}
                  value={query.deliveryStatus ?? ""}
                />
                <Select
                  label="Sortare"
                  onChange={(event) => patchQuery({ sortBy: isSortField(event.target.value) ? event.target.value : defaultQuery.sortBy })}
                  options={sortOptions}
                  value={query.sortBy}
                />
                <Select
                  label="Direcție"
                  onChange={(event) => patchQuery({ sortDirection: event.target.value === "desc" ? "desc" : "asc" })}
                  options={[{ label: "Ascendent", value: "asc" }, { label: "Descendent", value: "desc" }]}
                  value={query.sortDirection}
                />
                <Button onClick={() => setSearchParams(new URLSearchParams())} variant="secondary">Resetează</Button>
              </div>
            ) : null}

            <div className="status-tv-page__content">
              {statusQuery.data?.meta.hasMore ? (
                <p className="status-tv-page__note">Rezultatele sunt plafonate la {statusQuery.data.meta.scannedRows} lucrări scanate. Rafinează filtrele dacă ai nevoie de o listă mai scurtă.</p>
              ) : null}
              {renderRows()}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
