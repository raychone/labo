import {
  DEADLINE_VISUAL_STATES,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUSES,
  LOGISTICS_STATUS_LABELS,
  LOGISTICS_STATUSES,
  OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE,
  OPERATIONAL_STATUS_MAX_PAGE_SIZE,
  OPERATIONAL_STATUS_MAX_SCANNED_ROWS,
  OPERATIONAL_STATUS_SORT_FIELDS,
  OPERATIONAL_STATUS_TABS,
  REAL_LAB_SHEET_OPERATIONAL_STATUSES,
  WORK_PRIORITIES,
  type DeadlineVisualState,
  type DeliveryStatus,
  type LogisticsStatus,
  type OperationalStatusQuery,
  type OperationalStatusRow,
  type OperationalStatusSortDirection,
  type OperationalStatusSortField,
  type OperationalStatusTab,
  type RealLabSheetOperationalStatus,
  type WorkPriority,
} from "@dental-lab/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  Drawer,
  LoadingState,
  PriorityBadge,
  Select,
  TextInput,
  type DataTableColumn,
  type DataTableSort,
  type SelectOption,
} from "@dental-lab/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { fetchPatientOptions } from "../patients/patients-api.js";
import { useTechnicianOptions } from "../technician-workbench/technician-workbench-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useMediaQuery } from "../../lib/use-media-query.js";
import { useOperationalStatus } from "./status-api.js";
import "./status-page.css";

const tabLabels = {
  AT_CLINIC: "Plecate la medic",
  AVAILABLE: "Disponibile",
  COMPLETED: "Finalizate",
  IN_PROGRESS: "În lucru",
  LATE: "Întârziate",
  RETURNED: "Revenite",
  TODAY: "Astăzi",
} as const satisfies Record<OperationalStatusTab, string>;

const deadlineStateLabels = {
  DUE_TODAY: "Astăzi",
  DUE_TOMORROW: "Mâine",
  LATE: "Întârziată",
  MANUAL: "Manual",
  ON_TIME: "În termen",
  UNKNOWN: "Necunoscut",
  UNRESOLVED: "Fără termen",
  WARNING: "Aproape",
} as const satisfies Record<DeadlineVisualState, string>;

const sortLabels = {
  clinicName: "Cabinet",
  createdAt: "Creată",
  effectiveDueAt: "Termen",
  patientName: "Pacient",
  priority: "Prioritate",
  updatedAt: "Actualizată",
  workCode: "Cod lucrare",
} as const satisfies Record<OperationalStatusSortField, string>;

const defaultQuery: OperationalStatusQuery = {
  page: 1,
  pageSize: OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE,
  sortBy: "effectiveDueAt",
  sortDirection: "asc",
  tab: "TODAY",
};

type StatusQueryPatch = {
  readonly [K in keyof OperationalStatusQuery]?: OperationalStatusQuery[K] | null | undefined;
} & {
  readonly currentStageName?: string;
};

function isOperationalTab(value: string | null): value is OperationalStatusTab {
  return OPERATIONAL_STATUS_TABS.includes(value as OperationalStatusTab);
}

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

function isRealLabSheetStatus(value: string | null): value is RealLabSheetOperationalStatus {
  return REAL_LAB_SHEET_OPERATIONAL_STATUSES.includes(value as RealLabSheetOperationalStatus);
}

function readPositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return max ? Math.min(parsed, max) : parsed;
}

function readQuery(searchParams: URLSearchParams): OperationalStatusQuery {
  const tab = searchParams.get("tab");
  const sortBy = searchParams.get("sortBy");
  const sortDirection = searchParams.get("sortDirection");
  const priority = searchParams.get("priority");
  const deadlineState = searchParams.get("deadlineState");
  const logisticsStatus = searchParams.get("logisticsStatus");
  const deliveryStatus = searchParams.get("deliveryStatus");
  const sheetStatus = searchParams.get("sheetStatus");

  return {
    page: readPositiveInt(searchParams.get("page"), defaultQuery.page),
    pageSize: readPositiveInt(searchParams.get("pageSize"), defaultQuery.pageSize, OPERATIONAL_STATUS_MAX_PAGE_SIZE),
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
    ...(sheetStatus && isRealLabSheetStatus(sheetStatus) ? { sheetStatus } : {}),
  };
}

function getSafeColor(value: string | null | undefined): string | null {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

function BadgePill({ label, tone = "neutral" }: { readonly label: string; readonly tone?: "neutral" | "info" | "success" | "warning" | "danger" }): ReactNode {
  return <span className={`status-page__pill status-page__pill--${tone}`}>{label}</span>;
}

function formatDateTime(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Fără termen";
}

function getWorkTypeCompactLabel(workType: OperationalStatusRow["workType"]): string {
  return workType.symbol.trim() || workType.name;
}

function getClinicDoctorDisplay(row: OperationalStatusRow): string {
  return row.clinic?.name ?? row.doctor?.name ?? "-";
}

function getRouteMarker(row: OperationalStatusRow): string {
  if (!row.delivery.status) {
    return "-";
  }
  return row.delivery.status === "PICKED_UP" ? "Ridicare" : "Livrare";
}

function getDeadlineDisplay(row: OperationalStatusRow): ReactNode {
  return (
    <span className="status-page__metric-inline">
      <span>{row.deadline.effectiveDueAt ? formatDateTime(row.deadline.effectiveDueAt) : "-"}</span>
    </span>
  );
}

function toDataSort(query: OperationalStatusQuery): DataTableSort {
  return {
    columnId: query.sortBy,
    direction: query.sortDirection === "asc" ? "ascending" : "descending",
  };
}

function toApiSort(sort: DataTableSort): Pick<OperationalStatusQuery, "sortBy" | "sortDirection"> {
  return {
    sortBy: isSortField(sort.columnId) ? sort.columnId : defaultQuery.sortBy,
    sortDirection: sort.direction === "ascending" ? "asc" : "desc",
  };
}

function toPriorityLabel(priority: WorkPriority): string {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toStatusVariant(row: OperationalStatusRow): "awaiting" | "closed" | "delivered" | "production" | "rejected" | "registered" {
  if (row.deadline.state === "LATE") {
    return "rejected";
  }
  if (row.operationalStatus === "FINALIZATA") return "closed";
  if (row.operationalStatus === "IN_LUCRU") return "production";
  if (row.operationalStatus === "IN_ASTEPTARE") return "awaiting";
  return "registered";
}

function toOperationalLabel(row: OperationalStatusRow): string {
  return row.operationalStatus === "RECEPTIE" ? "Recepție"
    : row.operationalStatus === "IN_LUCRU" ? "În lucru"
      : row.operationalStatus === "IN_ASTEPTARE" ? "În așteptare"
        : "Finalizată";
}

function toStageFilterOptions(rows: readonly OperationalStatusRow[]): readonly SelectOption[] {
  const stages = new Map<string, string>();
  for (const row of rows) {
    if (row.workflow.currentStage) {
      stages.set(row.workflow.currentStage.name, row.workflow.currentStage.name);
    }
  }
  return Array.from(stages.entries()).sort(([left], [right]) => left.localeCompare(right, "ro-RO")).map(([value, label]) => ({ label, value }));
}

function getFilteredRows(rows: readonly OperationalStatusRow[], currentStageName: string): readonly OperationalStatusRow[] {
  if (!currentStageName) {
    return rows;
  }
  return rows.filter((row) => row.workflow.currentStage?.name === currentStageName);
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
    "sheetStatus",
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

  if (patch.currentStageName !== undefined) {
    if (patch.currentStageName === "") {
      next.delete("currentStageName");
    } else {
      next.set("currentStageName", patch.currentStageName);
    }
  }

  if (next.get("page") === "1") {
    next.delete("page");
  }
  if (next.get("pageSize") === String(OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE)) {
    next.delete("pageSize");
  }
  return next;
}

const priorityOptions: readonly SelectOption[] = [
  { label: "Toate", value: "" },
  { label: "Normal", value: "NORMAL" },
  { label: "Urgent", value: "URGENT" },
];

const legalEntityOptions: readonly SelectOption[] = [
  { label: "Toate", value: "" },
  { label: "CDT", value: "CDT" },
  { label: "NG", value: "NG" },
];

const deadlineStateOptions: readonly SelectOption[] = [
  { label: "Toate", value: "" },
  ...DEADLINE_VISUAL_STATES.map((state) => ({ label: deadlineStateLabels[state], value: state })),
];

const logisticsOptions: readonly SelectOption[] = [
  { label: "Toate", value: "" },
  ...LOGISTICS_STATUSES.map((status) => ({ label: LOGISTICS_STATUS_LABELS[status], value: status })),
];

const deliveryOptions: readonly SelectOption[] = [
  { label: "Toate", value: "" },
  ...DELIVERY_STATUSES.map((status) => ({ label: DELIVERY_STATUS_LABELS[status], value: status })),
];

const realLabSheetStatusLabels = {
  COMPLETE: "Completă",
  FINALIZED: "Finalizată",
  IN_PROGRESS: "În lucru",
  NOT_STARTED: "Necompletată",
} as const satisfies Record<RealLabSheetOperationalStatus, string>;

const realLabSheetStatusOptions: readonly SelectOption[] = [
  { label: "Toate", value: "" },
  ...REAL_LAB_SHEET_OPERATIONAL_STATUSES.map((status) => ({ label: realLabSheetStatusLabels[status], value: status })),
];

const sortOptions: readonly SelectOption[] = OPERATIONAL_STATUS_SORT_FIELDS.map((field) => ({ label: sortLabels[field], value: field }));
const operationalStateOptions: readonly SelectOption[] = OPERATIONAL_STATUS_TABS.map((tab) => ({ label: tabLabels[tab], value: tab }));

export function StatusPage(): ReactNode {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);
  const currentStageName = searchParams.get("currentStageName") ?? "";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OperationalStatusRow | null>(null);
  const isCompactMobile = useMediaQuery("(max-width: 719px)");
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadStatus = hasPermission(permissionsQuery.data, "works.read_all") || hasPermission(permissionsQuery.data, "works.read_assigned");
  const canReadPricingOptions = hasPermission(permissionsQuery.data, "pricing.read");
  const canReadOptions = canReadStatus;
  const statusQuery = useOperationalStatus(query, canReadStatus);
  const clinicsQuery = useQuery({ enabled: canReadOptions, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorsQuery = useQuery({ enabled: canReadOptions, queryFn: () => fetchDoctorOptions(query.clinicId ?? undefined), queryKey: ["doctors", "options", "status", query.clinicId], retry: false });
  const patientsQuery = useQuery({ enabled: canReadOptions, queryFn: () => fetchPatientOptions(query.search ?? ""), queryKey: ["patients", "options", "status", query.search ?? ""], retry: false });
  const techniciansQuery = useTechnicianOptions(canReadOptions);
  const workTypesQuery = useWorkTypeOptions(canReadOptions && canReadPricingOptions);
  const rows = statusQuery.data?.items ?? [];
  const stageOptions = useMemo(() => toStageFilterOptions(rows), [rows]);
  const currentRowWorkTypeOptions = useMemo(() => {
    const workTypes = new Map<string, string>();
    for (const row of rows) {
      workTypes.set(row.workType.id, `${row.workType.symbol} · ${row.workType.name}`);
    }
    return Array.from(workTypes.entries()).map(([value, label]) => ({ label, value }));
  }, [rows]);
  const workTypeOptions = canReadPricingOptions
    ? (workTypesQuery.data ?? []).map((workType) => ({ label: `${workType.symbol} · ${workType.name}`, value: workType.id }))
    : currentRowWorkTypeOptions;
  const visibleRows = useMemo(() => getFilteredRows(rows, currentStageName), [currentStageName, rows]);

  function patchQuery(patch: StatusQueryPatch): void {
    setSearchParams((current) => updateSearchParams(current, { ...patch, page: patch.page ?? 1 }));
  }

  const columns = useMemo<readonly DataTableColumn<OperationalStatusRow>[]>(() => [
    {
      header: "Clinica sau Medic",
      id: "clinicDoctor",
      renderCell: (row) => getClinicDoctorDisplay(row),
    },
    {
      header: "Pacient",
      id: "patientName",
      isSortable: true,
      renderCell: (row) => <strong>{row.patient.name}</strong>,
    },
    {
      header: "Tip lucrare",
      id: "workType",
      renderCell: (row) => <BadgePill label={getWorkTypeCompactLabel(row.workType)} tone="neutral" />,
    },
    {
      header: "Culoare",
      id: "shade",
      renderCell: (row) => row.shade ?? "-",
    },
    {
      header: "Tehnician",
      id: "technician",
      renderCell: (row) => (
        <span className="status-page__metric-inline">
          {row.workOwner?.preferredColor ? <span className="status-page__color-dot" style={{ backgroundColor: getSafeColor(row.workOwner.preferredColor) ?? "transparent" }} /> : null}
          <span>{row.workOwner?.displayName ?? "-"}</span>
        </span>
      ),
    },
    {
      header: "Preluare",
      id: "claimedAt",
      renderCell: (row) => row.claimedAt ? formatDateTime(row.claimedAt) : "-",
    },
    {
      header: "Termen",
      id: "effectiveDueAt",
      isSortable: true,
      renderCell: getDeadlineDisplay,
    },
    {
      header: "Stare",
      id: "state",
      renderCell: (row) => (
        <BadgePill
          label={toOperationalLabel(row)}
          tone={toStatusVariant(row) === "closed" ? "success" : toStatusVariant(row) === "production" ? "info" : toStatusVariant(row) === "rejected" ? "danger" : toStatusVariant(row) === "awaiting" ? "warning" : "neutral"}
        />
      ),
    },
    {
      header: "Alerte",
      id: "alerts",
      renderCell: () => "-",
    },
    {
      header: "Livrare/Ridicare",
      id: "deliveryPickup",
      renderCell: getRouteMarker,
    },
  ], []);

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Se încarcă statusul operațional" /></PageState>;
  }

  if (!canReadStatus) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiune de citire status operațional." /></PageState>;
  }

  return (
    <main className="status-page">
      <section className="dl-container status-page__layout" aria-labelledby="status-title">
        <header className="status-page__header">
          <div>
            <h1 id="status-title">Status</h1>
            <p>Workspace operațional pentru lucrări active, termene, responsabilitate și fișa laborator.</p>
          </div>
          <Link className="status-page__open-link" to="/works">Registru lucrări</Link>
        </header>

        <div className="status-page__tabs" role="list" aria-label="Status lucrări">
          {OPERATIONAL_STATUS_TABS.map((tab) => {
            const count = statusQuery.data?.counters.find((counter) => counter.tab === tab)?.count ?? 0;
            return (
              <button
                aria-pressed={query.tab === tab}
                key={tab}
                onClick={() => patchQuery({ tab })}
                type="button"
              >
                <span>{tabLabels[tab]}</span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="status-page__card-header-row">
              <div>
                <CardTitle>Registru status</CardTitle>
                <CardDescription>
                  Total: {statusQuery.data?.meta.total ?? 0}
                  {statusQuery.data?.meta.hasMore ? ` · rezultate limitate la ${OPERATIONAL_STATUS_MAX_SCANNED_ROWS}` : ""}
                  {" · filtrele nu expun date financiare"}
                </CardDescription>
              </div>
              <Button onClick={() => setFiltersOpen((current) => !current)} variant="secondary">
                {filtersOpen ? "Ascunde filtrele" : "Afișează filtrele"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="status-page__content">
            {filtersOpen ? (
              <div className="status-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => patchQuery({ search: event.target.value || null })}
                placeholder="Cod lucrare, pacient, cabinet"
                type="search"
                value={query.search ?? ""}
              />
              <Select
                  label="CDT / NG"
                  onChange={(event) => patchQuery({ executionLegalEntityCode: event.target.value === "CDT" || event.target.value === "NG" ? event.target.value : undefined })}
                options={legalEntityOptions}
                value={query.executionLegalEntityCode ?? ""}
              />
              <Select
                label="Tehnician owner"
                onChange={(event) => patchQuery({ ownerUserId: event.target.value || null })}
                options={(techniciansQuery.data ?? []).map((technician) => ({ label: technician.displayName, value: technician.id }))}
                placeholder="Toți"
                value={query.ownerUserId ?? ""}
              />
              <Select
                label="Tehnician etapă"
                onChange={(event) => patchQuery({ stageTechnicianUserId: event.target.value || null })}
                options={(techniciansQuery.data ?? []).map((technician) => ({ label: technician.displayName, value: technician.id }))}
                placeholder="Toți"
                value={query.stageTechnicianUserId ?? ""}
              />
              <Select
                label="Etapă curentă"
                onChange={(event) => patchQuery({ currentStageName: event.target.value })}
                options={stageOptions}
                placeholder="Toate de pe pagina curentă"
                value={currentStageName}
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
                options={workTypeOptions}
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
                label="Stare operațională"
                onChange={(event) => patchQuery({ tab: isOperationalTab(event.target.value) ? event.target.value : defaultQuery.tab })}
                options={operationalStateOptions}
                value={query.tab}
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
                label="Fișă laborator"
                onChange={(event) => patchQuery({ sheetStatus: isRealLabSheetStatus(event.target.value) ? event.target.value : undefined })}
                options={realLabSheetStatusOptions}
                value={query.sheetStatus ?? ""}
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
            ) : (
              <p className="status-page__filters-collapsed">Filtrele sunt ascunse. Deschide-le când ai nevoie de rafinare.</p>
            )}

            {statusQuery.data?.meta.hasMore ? (
              <p className="status-page__bounded-note">
                Rezultatele sunt plafonate la {OPERATIONAL_STATUS_MAX_SCANNED_ROWS} de lucrări scanate. Rafinează filtrele pentru o listă mai precisă.
              </p>
            ) : null}

            {!isCompactMobile ? (
              <div className="status-page__desktop-table">
                <DataTable
                  columns={columns}
                  emptyMessage="Nu există lucrări pentru filtrele curente."
                  error={statusQuery.isError ? getErrorMessage(statusQuery.error) : undefined}
                  getRowKey={(row) => row.id}
                  isLoading={statusQuery.isLoading}
                  onSortChange={(sort) => patchQuery(toApiSort(sort))}
                  pagination={{
                    onPageChange: (page) => patchQuery({ page }),
                    page: statusQuery.data?.meta.page ?? query.page,
                    pageCount: Math.max(statusQuery.data?.meta.totalPages ?? 1, 1),
                  }}
                  rows={visibleRows}
                  sort={toDataSort(query)}
                />
              </div>
            ) : null}

            <StatusCards
              onOpenDetails={(row) => setSelectedRow(row)}
              error={statusQuery.isError ? getErrorMessage(statusQuery.error) : undefined}
              isLoading={statusQuery.isLoading}
              rows={visibleRows}
            />
          </CardContent>
        </Card>
        <StatusDetailDrawer onOpenChange={(open) => { if (!open) setSelectedRow(null); }} row={selectedRow} />
      </section>
    </main>
  );
}

function StatusCards({ error, isLoading, onOpenDetails, rows }: { readonly error: string | undefined; readonly isLoading: boolean; readonly onOpenDetails: (row: OperationalStatusRow) => void; readonly rows: readonly OperationalStatusRow[] }): ReactNode {
  if (isLoading) {
    return <div className="status-page__mobile-cards"><LoadingState text="Se încarcă statusul" /></div>;
  }
  if (error) {
    return <div className="status-page__mobile-cards"><ErrorState title="Statusul nu a putut fi încărcat" description={error} /></div>;
  }
  if (rows.length === 0) {
    return <div className="status-page__mobile-cards"><EmptyState title="Nu există date" description="Nu există lucrări pentru filtrele curente." /></div>;
  }
  return (
    <div className="status-page__mobile-cards" aria-label="Lucrări status">
      {rows.map((row) => (
        <article className="status-page__card" key={row.id}>
          <div className="status-page__card-header">
            <div>
              <strong>{row.patient.name}</strong>
              <span>{getWorkTypeCompactLabel(row.workType)}</span>
            </div>
            <PriorityBadge label={toPriorityLabel(row.priority)} variant={row.priority === "URGENT" ? "urgent" : "normal"} />
          </div>
          <div className="status-page__card-grid">
            <Metric
              label="Tehnician"
              value={row.workOwner ? <span className="status-page__metric-inline">{row.workOwner.preferredColor ? <span className="status-page__color-dot" style={{ backgroundColor: getSafeColor(row.workOwner.preferredColor) ?? "transparent" }} /> : null}{row.workOwner.displayName}</span> : "-"}
            />
            <Metric label="Clinica sau Medic" value={getClinicDoctorDisplay(row)} />
            <Metric label="Culoare" value={row.shade ?? "-"} />
            <Metric label="Preluare" value={row.claimedAt ? formatDateTime(row.claimedAt) : "-"} />
            <Metric label="Termen" value={getDeadlineDisplay(row)} />
            <Metric label="Stare" value={<BadgePill label={toOperationalLabel(row)} tone={toStatusVariant(row) === "closed" ? "success" : toStatusVariant(row) === "production" ? "info" : toStatusVariant(row) === "rejected" ? "danger" : toStatusVariant(row) === "awaiting" ? "warning" : "neutral"} />} />
            <Metric label="Livrare/Ridicare" value={getRouteMarker(row)} />
          </div>
          <div className="status-page__card-actions">
            <Button onClick={() => onOpenDetails(row)} variant="outline">Detalii</Button>
            <Link className="status-page__open-link" to={`/works?workId=${encodeURIComponent(row.id)}`}>Deschide</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusDetailDrawer({ onOpenChange, row }: { readonly onOpenChange: (open: boolean) => void; readonly row: OperationalStatusRow | null }): ReactNode {
  return (
    <Drawer
      description={row ? `${row.workCode} · ${row.patient.name}` : "Detalii lucrare"}
      isOpen={row !== null}
      onOpenChange={onOpenChange}
      title="Detalii lucrare"
    >
      {row ? (
        <div className="status-page__drawer-grid">
          <Metric label="Cod" value={row.workCode} />
          <Metric label="Pacient" value={row.patient.name} />
          <Metric label="Cabinet" value={row.clinic?.name ?? "-"} />
          <Metric label="Medic" value={row.doctor?.name ?? "-"} />
          <Metric label="Tip" value={getWorkTypeCompactLabel(row.workType)} />
          <Metric
            label="Tehnician"
            value={row.workOwner
              ? (
                  <span className="status-page__metric-inline">
                    {row.workOwner.preferredColor ? <span className="status-page__color-dot" style={{ backgroundColor: getSafeColor(row.workOwner.preferredColor) ?? "transparent" }} /> : null}
                    {row.workOwner.displayName}
                  </span>
                )
              : "Fără tehnician"}
          />
          <Metric label="Flux" value={`${row.workflow.currentStage?.name ?? "Fără etapă"} · ${row.workflow.progress ?? `${row.workflow.progressCompleted}/${row.workflow.progressTotal}`}`} />
          <Metric label="Stare" value={toOperationalLabel(row)} />
          <Metric label="Prioritate" value={toPriorityLabel(row.priority)} />
          <Metric label="Companie" value={row.executionCompany?.code ?? "Nefixată"} />
          <Metric label="Termen" value={row.deadline.tooltip} />
          <Metric label="Termen efectiv" value={row.deadline.effectiveDueAt ? formatDateTime(row.deadline.effectiveDueAt) : "Fără termen"} />
          <Metric label="Logistică" value={row.logistics.status ? LOGISTICS_STATUS_LABELS[row.logistics.status] : "Fără status"} />
          <Metric label="Livrare" value={row.delivery.status ? DELIVERY_STATUS_LABELS[row.delivery.status] : "Fără livrare"} />
          <Metric label="Fișă" value={`${row.realLabSheet.label}${row.realLabSheet.cycleNumber ? ` · Ciclul ${row.realLabSheet.cycleNumber}` : ""}`} />
          <Metric label="Ciclu" value={row.currentCycle?.label ?? "Fără ciclu"} />
          <Metric label="Creată" value={new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))} />
          <Metric label="Actualizată" value={new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.updatedAt))} />
          <div className="status-page__drawer-actions">
            <Link className="status-page__open-link" to={`/works?workId=${encodeURIComponent(row.id)}`}>Deschide lucrarea</Link>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  return (
    <div className="status-page__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="status-page">
      <section className="dl-container status-page__layout">{children}</section>
    </main>
  );
}
