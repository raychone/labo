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
  LoadingState,
  PriorityBadge,
  Select,
  StatusBadge,
  TextInput,
  type DataTableColumn,
  type DataTableSort,
  type SelectOption,
} from "@dental-lab/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { fetchPatientOptions } from "../patients/patients-api.js";
import { useTechnicianOptions } from "../technician-workbench/technician-workbench-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
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
    ...(searchParams.get("executionLegalEntityCode") === "NC" || searchParams.get("executionLegalEntityCode") === "NG"
      ? { executionLegalEntityCode: searchParams.get("executionLegalEntityCode") as "NC" | "NG" }
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

function formatDateTime(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Fără termen";
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
  if (row.delivery.status === "DELIVERED" || row.logistics.status === "DELIVERED") {
    return "delivered";
  }
  if (row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED") {
    return "production";
  }
  if (row.workflow.status === "COMPLETED") {
    return "closed";
  }
  if (row.claimStatus === "UNCLAIMED") {
    return "awaiting";
  }
  return "registered";
}

function toOperationalLabel(row: OperationalStatusRow): string {
  if (row.delivery.status === "DELIVERED" || row.logistics.status === "DELIVERED") {
    return "Plecată la medic";
  }
  if (row.deadline.state === "LATE") {
    return "Întârziată";
  }
  if (row.workflow.currentStage?.status === "IN_PROGRESS" || row.claimStatus === "CLAIMED") {
    return "În lucru";
  }
  if (row.claimStatus === "UNCLAIMED") {
    return "Disponibilă";
  }
  return row.workflow.status === "COMPLETED" ? "Finalizată" : "Înregistrată";
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
  { label: "NC", value: "NC" },
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
  const navigate = useNavigate();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);
  const currentStageName = searchParams.get("currentStageName") ?? "";
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
      workTypes.set(row.workType.id, row.workType.name);
    }
    return Array.from(workTypes.entries()).map(([value, label]) => ({ label, value }));
  }, [rows]);
  const workTypeOptions = canReadPricingOptions
    ? (workTypesQuery.data ?? []).map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))
    : currentRowWorkTypeOptions;
  const visibleRows = useMemo(() => getFilteredRows(rows, currentStageName), [currentStageName, rows]);

  function patchQuery(patch: StatusQueryPatch): void {
    setSearchParams((current) => updateSearchParams(current, { ...patch, page: patch.page ?? 1 }));
  }

  const columns = useMemo<readonly DataTableColumn<OperationalStatusRow>[]>(() => [
    { header: "Cod", id: "workCode", isSortable: true, renderCell: (row) => <strong>{row.workCode}</strong> },
    {
      header: "Pacient",
      id: "patientName",
      isSortable: true,
      renderCell: (row) => (
        <div>
          <strong>{row.patient.name}</strong>
          <span className="status-page__muted">{row.patient.reference ?? "Fără identificator"}</span>
        </div>
      ),
    },
    { header: "Cabinet", id: "clinicName", isSortable: true, renderCell: (row) => row.clinic.name },
    { header: "Medic", id: "doctor", renderCell: (row) => row.doctor.name },
    { header: "Tip", id: "workType", renderCell: (row) => row.workType.name },
    {
      header: "Companie",
      id: "company",
      renderCell: (row) => row.executionCompany?.code ?? "Nefixată",
    },
    {
      header: "Flux",
      id: "workflow",
      renderCell: (row) => (
        <div>
          <strong>{row.workflow.currentStage?.name ?? (row.workflow.status === "COMPLETED" ? "Flux finalizat" : "Fără etapă")}</strong>
          <span className="status-page__muted">{row.workflow.progress ?? `${row.workflow.progressCompleted}/${row.workflow.progressTotal}`}</span>
        </div>
      ),
    },
    {
      header: "Responsabili",
      id: "owners",
      renderCell: (row) => (
        <div>
          <strong>{row.workOwner?.displayName ?? "Fără owner"}</strong>
          <span className="status-page__muted">{row.currentStageTechnician?.displayName ?? "Fără tehnician etapă"}</span>
        </div>
      ),
    },
    {
      header: "Termen",
      id: "effectiveDueAt",
      isSortable: true,
      renderCell: (row) => <DeadlineBadge row={row} />,
    },
    {
      header: "Stare",
      id: "state",
      renderCell: (row) => <StatusBadge label={toOperationalLabel(row)} variant={toStatusVariant(row)} />,
    },
    {
      header: "Logistică",
      id: "logistics",
      renderCell: (row) => row.logistics.status ? LOGISTICS_STATUS_LABELS[row.logistics.status] : "Fără status",
    },
    {
      header: "Livrare",
      id: "delivery",
      renderCell: (row) => row.delivery.status ? DELIVERY_STATUS_LABELS[row.delivery.status] : "Fără livrare",
    },
    {
      header: "Ciclu",
      id: "cycle",
      renderCell: (row) => row.currentCycle?.label ?? "-",
    },
    {
      header: "Fișă",
      id: "realLabSheet",
      renderCell: (row) => (
        <div>
          <StatusBadge
            label={row.realLabSheet.label}
            variant={row.realLabSheet.status === "FINALIZED" ? "closed" : row.realLabSheet.status === "COMPLETE" ? "production" : "awaiting"}
          />
          <span className="status-page__muted">{row.realLabSheet.cycleNumber ? `Ciclul ${row.realLabSheet.cycleNumber}` : "Fără ciclu"}</span>
        </div>
      ),
    },
    {
      header: "Prioritate",
      id: "priority",
      isSortable: true,
      renderCell: (row) => <PriorityBadge label={toPriorityLabel(row.priority)} variant={row.priority === "URGENT" ? "urgent" : "normal"} />,
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
            <p>Workspace operațional pentru lucrările active, fără date financiare.</p>
          </div>
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
            <CardTitle>Registru status</CardTitle>
            <CardDescription>
              Total: {statusQuery.data?.meta.total ?? 0}
              {statusQuery.data?.meta.hasMore ? ` · rezultate limitate la ${OPERATIONAL_STATUS_MAX_SCANNED_ROWS}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="status-page__content">
            <div className="status-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => patchQuery({ search: event.target.value || null })}
                placeholder="Cod lucrare, pacient, cabinet"
                type="search"
                value={query.search ?? ""}
              />
              <Select
                label="NC / NG"
                onChange={(event) => patchQuery({ executionLegalEntityCode: event.target.value === "NC" || event.target.value === "NG" ? event.target.value : undefined })}
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

            {statusQuery.data?.meta.hasMore ? (
              <p className="status-page__bounded-note">
                Rezultatele sunt plafonate la {OPERATIONAL_STATUS_MAX_SCANNED_ROWS} de lucrări scanate. Rafinează filtrele pentru o listă mai precisă.
              </p>
            ) : null}

            <div className="status-page__desktop-table">
              <DataTable
                columns={columns}
                emptyMessage="Nu există lucrări pentru filtrele curente."
                error={statusQuery.isError ? getErrorMessage(statusQuery.error) : undefined}
                getRowKey={(row) => row.id}
                isLoading={statusQuery.isLoading}
                onRowAction={(row) => navigate(`/works?workId=${encodeURIComponent(row.id)}`)}
                onSortChange={(sort) => patchQuery(toApiSort(sort))}
                pagination={{
                  onPageChange: (page) => patchQuery({ page }),
                  page: statusQuery.data?.meta.page ?? query.page,
                  pageCount: Math.max(statusQuery.data?.meta.totalPages ?? 1, 1),
                }}
                rowActionLabel="Deschide"
                rows={visibleRows}
                sort={toDataSort(query)}
              />
            </div>

            <StatusCards
              error={statusQuery.isError ? getErrorMessage(statusQuery.error) : undefined}
              isLoading={statusQuery.isLoading}
              rows={visibleRows}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function DeadlineBadge({ row }: { readonly row: OperationalStatusRow }): ReactNode {
  return (
    <div>
      <span className={`status-page__deadline status-page__deadline--${row.deadline.state.toLowerCase()}`} title={row.deadline.tooltip}>
        {row.deadline.badge}
      </span>
      <span className="status-page__muted">{formatDateTime(row.deadline.effectiveDueAt)}</span>
      <span className="status-page__muted">{row.deadline.tooltip}</span>
    </div>
  );
}

function StatusCards({ error, isLoading, rows }: { readonly error: string | undefined; readonly isLoading: boolean; readonly rows: readonly OperationalStatusRow[] }): ReactNode {
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
              <strong>{row.workCode}</strong>
              <span>{row.patient.name}</span>
            </div>
            <PriorityBadge label={toPriorityLabel(row.priority)} variant={row.priority === "URGENT" ? "urgent" : "normal"} />
          </div>
          <div className="status-page__card-grid">
            <Metric label="Cabinet" value={row.clinic.name} />
            <Metric label="Medic" value={row.doctor.name} />
            <Metric label="Tip" value={row.workType.name} />
            <Metric label="Companie" value={row.executionCompany?.code ?? "Nefixată"} />
            <Metric label="Etapă" value={row.workflow.currentStage?.name ?? "Fără etapă"} />
            <Metric label="Progress" value={row.workflow.progress ?? `${row.workflow.progressCompleted}/${row.workflow.progressTotal}`} />
            <Metric label="Owner" value={row.workOwner?.displayName ?? "Fără owner"} />
            <Metric label="Tehnician" value={row.currentStageTechnician?.displayName ?? "Fără tehnician"} />
            <Metric label="Logistică" value={row.logistics.status ? LOGISTICS_STATUS_LABELS[row.logistics.status] : "Fără status"} />
            <Metric label="Livrare" value={row.delivery.status ? DELIVERY_STATUS_LABELS[row.delivery.status] : "Fără livrare"} />
            <Metric label="Fișă" value={`${row.realLabSheet.label}${row.realLabSheet.cycleNumber ? ` · Ciclul ${row.realLabSheet.cycleNumber}` : ""}`} />
            {row.currentCycle ? <Metric label="Ciclu" value={row.currentCycle.label} /> : null}
          </div>
          <DeadlineBadge row={row} />
          <div className="status-page__card-actions">
            <StatusBadge label={toOperationalLabel(row)} variant={toStatusVariant(row)} />
            <Link className="status-page__open-link" to={`/works?workId=${encodeURIComponent(row.id)}`}>Deschide</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
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
