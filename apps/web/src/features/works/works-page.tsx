import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DateInput,
  Drawer,
  ErrorState,
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormLayout,
  LoadingState,
  Modal,
  PriorityBadge,
  Select,
  StatusBadge,
  TextInput,
  Textarea,
  ConfirmActionModal,
  useToast,
  type DataTableColumn,
  type DataTableSort,
} from "@dental-lab/ui";
import {
  LEGAL_ENTITY_CODES,
  WORK_CYCLE_REASONS,
  formatMoneyMinor,
  getLegalEntityDisplayName,
  type CreateNextWorkCycleInput,
  type CreateWorkInput,
  type LegalEntityCode,
  type PatientOption,
  type PatientDetail,
  type RealLabSheetOperationalStatus,
  type RealLabSheetView,
  type TechnicianOption,
  type UpdateWorkInput,
  type WorkDeadlinePreviewInput,
  type WorkFormTemplateDetail,
  type WorkSortField,
  type WorkSummary,
  type WorkCycleReason,
  type WorkCyclesHistory,
  type WorksListParams,
} from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { fetchPatient, useCreatePatient, usePatientOptions } from "../patients/patients-api.js";
import { patientFormSchema, type PatientFormValues } from "../patients/patients-page.schema.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { useActiveWorkFormTemplate } from "../work-forms/work-form-templates-api.js";
import { WorkForm, WorkFormActions, defaultWorkFormValues, toWorkFormValues } from "./work-form.js";
import { WorkFormFieldRenderer, WorkFormReadOnlyView } from "./work-dynamic-form.js";
import { WorkWorkflowSection } from "./work-workflow-section.js";
import { useCreateNextWorkCycle, useCreateWork, useFinalizeRealLabSheet, useRealLabSheet, useReassignWork, useUpdateWork, useUpsertRealLabSheet, useWork, useWorkCycles, useWorkDeadlinePreview, useWorkFormWorkTypeOptions, useWorks } from "./works-api.js";
import { workFormSchema, type WorkFormValues } from "./works-page.schema.js";
import { WorkQrModal } from "./work-qr-modal.js";
import { applyApiErrorsToForm, getErrorMessage, getFormErrorSummaryItems, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard, useErrorSummaryFocus } from "../../lib/form-utils.js";
import { useTechnicianOptions } from "../technician-workbench/technician-workbench-api.js";
import "./works-page.css";

const pageSize = 20;

const defaultListParams: WorksListParams = {
  clinicId: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  deadlineFilter: undefined,
  doctorId: undefined,
  page: 1,
  pageSize,
  priority: undefined,
  search: undefined,
  sortBy: "createdAt",
  sortDirection: "desc",
  status: undefined,
  workTypeId: undefined,
};

const priorityFilterOptions = [
  { label: "Toate", value: "" },
  { label: "Normal", value: "NORMAL" },
  { label: "Urgent", value: "URGENT" },
] as const;

const deadlineFilterOptions = [
  { label: "Toate", value: "" },
  { label: "Astăzi", value: "TODAY" },
  { label: "Mâine", value: "TOMORROW" },
  { label: "În întârziere", value: "LATE" },
  { label: "Manual", value: "MANUAL" },
  { label: "Fără termen", value: "WITHOUT_DEADLINE" },
  { label: "Următoarele 7 zile", value: "NEXT_7_DAYS" },
] as const;

const claimStatusFilterOptions = [
  { label: "Toate", value: "" },
  { label: "Disponibile", value: "UNCLAIMED" },
  { label: "Revendicate", value: "CLAIMED" },
] as const;

const legalEntityFilterOptions = [
  { label: "Toate", value: "" },
  ...LEGAL_ENTITY_CODES.map((code) => ({ label: `${code} · ${getLegalEntityDisplayName(code)}`, value: code })),
] as const;

const returnReasonLabels = {
  ADJUSTMENT: "Ajustare",
  CLARIFICATION: "Clarificare",
  FINISHING: "Finisare",
  OTHER: "Alt motiv",
  PROBA: "Probă",
  REMAKE: "Refacere",
  REPAIR: "Reparație",
  WARRANTY: "Garanție",
} as const satisfies Record<Exclude<WorkCycleReason, "INITIAL">, string>;

const realLabSheetStatusLabels = {
  COMPLETE: "Completă",
  FINALIZED: "Finalizată",
  IN_PROGRESS: "În lucru",
  NOT_STARTED: "Necompletată",
} as const satisfies Record<RealLabSheetOperationalStatus, string>;

function toRealLabSheetStatusVariant(status: RealLabSheetOperationalStatus): "awaiting" | "closed" | "production" {
  if (status === "FINALIZED") {
    return "closed";
  }
  if (status === "COMPLETE") {
    return "production";
  }
  return "awaiting";
}

const cycleReasonLabels = {
  ...returnReasonLabels,
  INITIAL: "Inițial",
} as const satisfies Record<WorkCycleReason, string>;

const returnReasonOptions = WORK_CYCLE_REASONS
  .filter((reason): reason is Exclude<WorkCycleReason, "INITIAL"> => reason !== "INITIAL")
  .map((reason) => ({ label: returnReasonLabels[reason], value: reason }));

function toApiSort(direction: DataTableSort["direction"]): "asc" | "desc" {
  return direction === "ascending" ? "asc" : "desc";
}

function fromApiSort(field: string, direction: "asc" | "desc"): DataTableSort {
  return {
    columnId: field,
    direction: direction === "asc" ? "ascending" : "descending",
  };
}

function toMutationInput(values: WorkFormValues, template: WorkFormTemplateDetail | null | undefined): CreateWorkInput {
  return {
    clinicId: values.clinicId,
    clinicalNotes: values.clinicalNotes,
    doctorId: values.doctorId,
    externalReference: values.externalReference,
    internalNotes: values.internalNotes,
    patientId: values.patientId,
    patientReference: values.patientReference,
    priority: values.priority,
    quantity: values.quantity,
    requestedDeliveryDate: values.requestedDeliveryDate,
    ...(template
      ? {
          workFormSubmission: {
            templateId: template.id,
            templateVersion: template.version,
            values: values.workFormValues,
          },
        }
      : {}),
    workTypeId: values.workTypeId,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(value));
}

function formatPrice(value: number | null, currency: string, locale: string): string {
  return value === null ? "Restricționat" : formatMoneyMinor(value, currency, locale);
}

function getSafeColor(value: string | null | undefined): string | null {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

function BadgePill({ label, tone = "neutral" }: { readonly label: string; readonly tone?: "neutral" | "info" | "success" | "warning" | "danger" }): ReactNode {
  return <span className={`works-page__pill works-page__pill--${tone}`}>{label}</span>;
}

function toWorkOperationalLabel(work: WorkSummary): { readonly label: string; readonly tone: "neutral" | "info" | "success" | "warning" | "danger" } {
  if (work.workflow?.status === "COMPLETED") {
    return { label: "Finalizată", tone: "success" };
  }
  if (work.claim.status === "CLAIMED" || work.workflow?.currentStageName) {
    return { label: "În lucru", tone: "info" };
  }
  return { label: "Înregistrată", tone: "warning" };
}

function toWorkFlowLabel(work: WorkSummary): { readonly label: string; readonly tone: "neutral" | "info" | "success" | "warning" } {
  if (work.workflow?.status === "COMPLETED") {
    return { label: "Flux finalizat", tone: "success" };
  }
  return {
    label: work.workflow?.currentStageName ?? "Fără etapă",
    tone: work.workflow?.currentStageName && work.workflow.currentStageName.length > 0 ? "info" : "neutral",
  };
}

function hasMeaningfulDynamicValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function toDeadlinePreviewInput(values: Pick<WorkFormValues, "clinicId" | "doctorId" | "quantity" | "workTypeId">): WorkDeadlinePreviewInput | null {
  if (values.clinicId === "" || values.doctorId === "" || values.workTypeId === "" || !Number.isFinite(values.quantity) || values.quantity < 1) {
    return null;
  }

  return {
    clinicId: values.clinicId,
    doctorId: values.doctorId,
    quantity: values.quantity,
    workTypeId: values.workTypeId,
  };
}

function DeadlineBadge({ deadline }: { readonly deadline: WorkSummary["deadline"] }): ReactNode {
  return (
    <span
      className={`works-page__deadline-badge works-page__deadline-badge--${deadline.color}`}
      title={deadline.tooltip}
    >
      {deadline.badge}
    </span>
  );
}

function DeadlineDetailCard({ work }: { readonly work: import("@dental-lab/shared").WorkDetail }): ReactNode {
  const appliedRule = work.deadline.executionDays === null
    ? "Regulă manuală sau nerezolvată"
    : `${work.deadline.executionDays} zile lucrătoare`;
  const sourceLabel = work.deadline.mode === "MANUAL" ? "Manual" : work.deadline.mode === "CALCULATED" ? "Calculat" : "Nerezolvat";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Termen</CardTitle>
        <CardDescription>{work.deadline.tooltip}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="works-page__deadline-card">
          <DeadlineBadge deadline={work.deadline} />
          <div>
            <span className="works-page__muted">Data</span>
            <strong>{work.deadline.effectiveDueAt ? formatDate(work.deadline.effectiveDueAt) : "Fără termen"}</strong>
          </div>
          <div>
            <span className="works-page__muted">Ora</span>
            <strong>{work.deadline.effectiveDueAt ? formatTime(work.deadline.effectiveDueAt) : "Nedisponibilă"}</strong>
          </div>
          <div>
            <span className="works-page__muted">Status</span>
            <strong>{work.deadline.badge}</strong>
          </div>
          <div>
            <span className="works-page__muted">Countdown</span>
            <strong>{work.deadline.countdown}</strong>
          </div>
          <div>
            <span className="works-page__muted">Regulă aplicată</span>
            <strong>{appliedRule}</strong>
          </div>
          <div>
            <span className="works-page__muted">Manual/Calculat</span>
            <strong>{sourceLabel}</strong>
          </div>
          <div>
            <span className="works-page__muted">Ultima recalculare</span>
            <strong>{work.deadline.calculatedAt ? formatDateTime(work.deadline.calculatedAt) : "Nedisponibilă"}</strong>
          </div>
          <div className="works-page__deadline-card-note">
            <span className="works-page__muted">Explicație</span>
            <p>{work.deadline.explanation ?? "Nu există explicație disponibilă."}</p>
          </div>
          <div className="works-page__deadline-card-note">
            <span className="works-page__muted">Istoric termen</span>
            <p>{getDeadlineTimelineLabel(work.deadline.source, work.deadline.status)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDeadlineTimelineLabel(source: import("@dental-lab/shared").WorkDeadlineSource | null, status: string): string {
  if (status === "UNRESOLVED") {
    return "Deadline modificat: termen nerezolvat.";
  }

  switch (source) {
    case "CREATION":
      return "Deadline calculat la înregistrarea lucrării.";
    case "WORK_UPDATE":
      return "Deadline recalculat după modificarea lucrării.";
    case "MANUAL_OVERRIDE":
      return "Deadline manual setat de utilizator autorizat.";
    case "MANUAL_RECALCULATION":
      return "Deadline recalculat manual.";
    case "LEGACY_BACKFILL":
      return "Deadline rezolvat din termenul istoric.";
    case "FUTURE_TECH_CLAIM":
      return "Deadline rezolvat prin flux tehnic viitor.";
    default:
      return "Deadline modificat.";
  }
}

function validateDynamicWorkForm(form: import("react-hook-form").UseFormReturn<WorkFormValues>, template: WorkFormTemplateDetail | null | undefined): boolean {
  if (!template) {
    return true;
  }

  let isValid = true;
  for (const field of template.fields) {
    const value = form.getValues(`workFormValues.${field.key}`);
    if (field.required && !hasMeaningfulDynamicValue(value)) {
      form.setError(`workFormValues.${field.key}`, { message: `${field.label} este obligatoriu.` });
      isValid = false;
    }
    if ((field.type === "SELECT" || field.type === "RADIO" || field.type === "SHADE") && hasMeaningfulDynamicValue(value)) {
      const allowed = new Set(field.options.map((option) => option.value));
      if (typeof value !== "string" || !allowed.has(value)) {
        form.setError(`workFormValues.${field.key}`, { message: "Alege o opțiune validă." });
        isValid = false;
      }
    }
  }

  return isValid;
}

export function WorksPage(): ReactNode {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [params, setParams] = useState<WorksListParams>(defaultListParams);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const initialPatientId = searchParams.get("patientId");
  const initialClinicId = searchParams.get("clinicId");
  const initialDoctorId = searchParams.get("doctorId");
  const initialCreateOpen = searchParams.get("create") === "1";
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen || initialPatientId !== null || initialClinicId !== null || initialDoctorId !== null);
  const [qrWorkId, setQrWorkId] = useState<string | null>(null);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "works.read_all")
    || hasPermission(permissionsQuery.data, "works.read_assigned")
    || hasPermission(permissionsQuery.data, "works.claim.available.read")
    || hasPermission(permissionsQuery.data, "works.claim.own.read");
  const canCreate = hasPermission(permissionsQuery.data, "works.create");
  const canUpdate = hasPermission(permissionsQuery.data, "works.update");
  const canReadCycles = hasPermission(permissionsQuery.data, "cycles.read") || hasPermission(permissionsQuery.data, "cycles.history.read");
  const canCreateNextCycle = hasPermission(permissionsQuery.data, "cycles.create_next");
  const canReadPricing = hasPermission(permissionsQuery.data, "pricing.read");
  const canReadTechnicianOptions = hasPermission(permissionsQuery.data, "technician.workload.read");
  const worksQuery = useWorks(params, canRead);
  const selectedWorkQuery = useWork(selectedWorkId, canRead);
  const clinicOptionsQuery = useQuery({ enabled: canRead || canCreate, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorOptionsQuery = useQuery({
    enabled: (canRead || canCreate) && params.clinicId !== undefined,
    queryFn: () => fetchDoctorOptions(params.clinicId),
    queryKey: ["doctors", "options", params.clinicId],
    retry: false,
  });
  const formWorkTypeOptionsQuery = useWorkFormWorkTypeOptions(canCreate || canUpdate);
  const pricingWorkTypeOptionsQuery = useWorkTypeOptions(canReadPricing);
  const techniciansQuery = useTechnicianOptions(canReadTechnicianOptions);
  const settingsQuery = useSettings(canReadPricing);
  const createMutation = useCreateWork();
  const updateMutation = useUpdateWork();
  const initialPatientQuery = useQuery({
    enabled: isCreateOpen && initialPatientId !== null,
    queryFn: () => fetchPatient(initialPatientId ?? ""),
    queryKey: ["patients", "detail", "works-create", initialPatientId],
    retry: false,
  });
  const currency = settingsQuery.data?.currency ?? "RON";
  const locale = settingsQuery.data?.locale ?? "ro-RO";
  const selectedWork = selectedWorkQuery.data;

  useEffect(() => {
    const workId = searchParams.get("workId");
    if (workId) {
      setSelectedWorkId(workId);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("workId");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const columns = useMemo<readonly DataTableColumn<WorkSummary>[]>(() => [
    {
      header: "Tehnician",
      id: "technician",
      renderCell: (work) => (
        work.claim.technician?.preferredColor
          ? <span className="works-page__technician-badge" aria-label={work.claim.technician.displayName} title={work.claim.technician.displayName} style={{ backgroundColor: getSafeColor(work.claim.technician.preferredColor) ?? "transparent" }} />
          : <span className="works-page__technician-badge works-page__technician-badge--empty" title="Fără tehnician" />
      ),
    },
    {
      header: "Pacient",
      id: "patientName",
      isSortable: true,
      renderCell: (work) => <strong>{work.patientName}</strong>,
    },
    {
      header: "Tip",
      id: "workType",
      renderCell: (work) => <BadgePill label={work.workType.name} tone="neutral" />,
    },
    {
      header: "Flux",
      id: "workflow",
      renderCell: (work) => (
        <div className="works-page__badge-stack">
          <BadgePill label={toWorkFlowLabel(work).label} tone={toWorkFlowLabel(work).tone} />
          <span className="works-page__muted">{work.workflow ? `${work.workflow.progressCompleted}/${work.workflow.progressTotal}` : "0/0"}</span>
        </div>
      ),
    },
    {
      header: "Stare",
      id: "status",
      renderCell: (work) => {
        const state = toWorkOperationalLabel(work);
        return <BadgePill label={state.label} tone={state.tone} />;
      },
    },
    {
      header: "Prioritate",
      id: "priority",
      isSortable: true,
      renderCell: (work) => <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />,
    },
    {
      header: "Acțiuni",
      id: "actions",
      renderCell: (work) => (
        <div className="works-page__row-actions">
          <Button onClick={() => setSelectedWorkId(work.id)} size="small" variant="outline">Detalii</Button>
          <Link className="works-page__open-link" to={`/works?workId=${encodeURIComponent(work.id)}`}>Deschide</Link>
        </div>
      ),
    },
  ], []);

  function handleCreate(input: CreateWorkInput): void {
    createMutation.mutate(input, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost creată", variant: "error" }),
      onSuccess: (work) => {
        setIsCreateOpen(false);
        setSelectedWorkId(work.id);
        toast.showToast({ durationMs: 3500, message: `Lucrare ${work.code} creată.`, variant: "success" });
      },
    });
  }

  function handleUpdate(input: UpdateWorkInput): void {
    const updateInput = input;
    updateMutation.mutate({ input: updateInput, workOrderId: selectedWorkId ?? "" }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost salvată", variant: "error" }),
      onSuccess: (work) => {
        toast.showToast({ durationMs: 3500, message: `Lucrare ${work.code} actualizată.`, variant: "success" });
      },
    });
  }

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Se încarcă lucrările" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiune de citire lucrări." /></PageState>;
  }

  return (
    <main className="works-page">
      <section className="dl-container works-page__layout" aria-labelledby="works-title">
        <header className="works-page__header">
          <div>
            <h1 id="works-title">Lucrări</h1>
            <p>Recepția și urmărirea lucrărilor înregistrate în laborator.</p>
          </div>
          {canCreate ? <Button onClick={() => setIsCreateOpen(true)}>Adaugă lucrare</Button> : null}
        </header>

        {worksQuery.data?.deadlineDashboard ? (
          <section className="works-page__summary" aria-label="Rezumat lucrări">
            <WorkMetric label="Astăzi" value={worksQuery.data.deadlineDashboard.dueToday} />
            <WorkMetric label="Mâine" value={worksQuery.data.deadlineDashboard.dueTomorrow} />
            <WorkMetric label="Întârziate" value={worksQuery.data.deadlineDashboard.late} />
            <WorkMetric label="Fără termen" value={worksQuery.data.deadlineDashboard.unresolved} />
          </section>
        ) : null}

        <Card>
          <CardHeader>
            <div className="works-page__card-header-row">
              <div>
                <CardTitle>Registru lucrări</CardTitle>
                <CardDescription>Total: {worksQuery.data?.total ?? 0} · filtre pentru recepție, responsabilitate și companie de execuție.</CardDescription>
              </div>
              <Button onClick={() => setFiltersOpen((current) => !current)} variant="secondary">
                {filtersOpen ? "Ascunde filtrele" : "Afișează filtrele"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="works-page__table-card">
            {filtersOpen ? (
              <>
                <div className="works-page__quick-filters" aria-label="Filtre rapide lucrări">
                  <Button onClick={() => setParams((current) => ({ ...current, deadlineFilter: "TODAY", page: 1 }))} variant="outline">Astăzi</Button>
                  <Button onClick={() => setParams((current) => ({ ...current, deadlineFilter: "LATE", page: 1 }))} variant="outline">Întârziate</Button>
                  <Button onClick={() => setParams((current) => ({ ...current, claimStatus: "UNCLAIMED", page: 1 }))} variant="outline">Disponibile</Button>
                  <Button onClick={() => setParams(defaultListParams)} variant="ghost">Resetează</Button>
                </div>
                <div className="works-page__filters">
                  <TextInput
                    label="Căutare"
                    onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                    placeholder="Cod, pacient, referință"
                    type="search"
                    value={params.search ?? ""}
                  />
                  <Select
                    label="Cabinet"
                    onChange={(event) => setParams((current) => ({ ...current, clinicId: event.target.value || undefined, doctorId: undefined, page: 1 }))}
                    options={(clinicOptionsQuery.data ?? []).map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
                    placeholder="Toate cabinetele"
                    value={params.clinicId ?? ""}
                  />
                  <Select
                    disabled={params.clinicId === undefined}
                    label="Medic"
                    onChange={(event) => setParams((current) => ({ ...current, doctorId: event.target.value || undefined, page: 1 }))}
                    options={(doctorOptionsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
                    placeholder="Toți medicii"
                    value={params.doctorId ?? ""}
                  />
                  <Select
                    label="Prioritate"
                    onChange={(event) => setParams((current) => ({ ...current, page: 1, priority: event.target.value === "URGENT" ? "URGENT" : event.target.value === "NORMAL" ? "NORMAL" : undefined }))}
                    options={priorityFilterOptions}
                    value={params.priority ?? ""}
                  />
                  <Select
                    label="Termen"
                    onChange={(event) => setParams((current) => ({ ...current, deadlineFilter: event.target.value === "" ? undefined : event.target.value as NonNullable<WorksListParams["deadlineFilter"]>, page: 1 }))}
                    options={deadlineFilterOptions}
                    value={params.deadlineFilter ?? ""}
                  />
                  <Select
                    label="Responsabilitate"
                    onChange={(event) => setParams((current) => ({ ...current, claimStatus: event.target.value === "CLAIMED" || event.target.value === "UNCLAIMED" ? event.target.value : undefined, page: 1 }))}
                    options={claimStatusFilterOptions}
                    value={params.claimStatus ?? ""}
                  />
                  <Select
                    label="Companie execuție"
                    onChange={(event) => setParams((current) => ({ ...current, executionLegalEntityCode: event.target.value === "NC" || event.target.value === "NG" ? event.target.value : undefined, page: 1 }))}
                    options={legalEntityFilterOptions}
                    value={params.executionLegalEntityCode ?? ""}
                  />
                  {canReadTechnicianOptions ? (
                    <Select
                      label="Tehnician"
                      onChange={(event) => setParams((current) => ({ ...current, assignedTechnicianId: event.target.value || undefined, page: 1 }))}
                      options={(techniciansQuery.data ?? []).map((technician) => ({ label: technician.displayName, value: technician.id }))}
                      placeholder="Toți tehnicienii"
                      value={params.assignedTechnicianId ?? ""}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <p className="works-page__filters-collapsed">Filtrele sunt ascunse. Deschide-le când ai nevoie de rafinare.</p>
            )}
            <DataTable
              columns={columns}
              emptyMessage="Nu există lucrări pentru filtrele curente."
              error={worksQuery.isError ? getErrorMessage(worksQuery.error) : undefined}
              getRowKey={(work) => work.id}
              isLoading={worksQuery.isLoading}
              onSortChange={(sort) => setParams((current) => ({
                ...current,
                page: 1,
                sortBy: sort.columnId as WorkSortField,
                sortDirection: toApiSort(sort.direction),
              }))}
              pagination={{
                onPageChange: (page) => setParams((current) => ({ ...current, page })),
                page: worksQuery.data?.page ?? params.page,
                pageCount: worksQuery.data?.pageCount ?? 1,
              }}
              rows={worksQuery.data?.items ?? []}
              sort={fromApiSort(params.sortBy, params.sortDirection)}
            />
          </CardContent>
        </Card>
      </section>

      <CreateWorkModal
        clinicOptions={clinicOptionsQuery.data ?? []}
        formWorkTypeOptions={formWorkTypeOptionsQuery.data ?? []}
        isOpen={isCreateOpen}
        initialClinicId={initialClinicId ?? undefined}
        initialDoctorId={initialDoctorId ?? undefined}
        initialPatient={initialPatientQuery.data}
        initialPatientId={initialPatientId ?? undefined}
        pricingWorkTypeOptions={pricingWorkTypeOptionsQuery.data ?? []}
        isSaving={createMutation.isPending}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        submitError={createMutation.error}
        currency={currency}
        locale={locale}
      />

      <WorkDetailsDrawer
        canCreateNextCycle={canCreateNextCycle}
        canReadCycles={canReadCycles}
        canReadPricing={canReadPricing}
        canUpdate={canUpdate}
        clinicOptions={clinicOptionsQuery.data ?? []}
        currency={currency}
        formWorkTypeOptions={formWorkTypeOptionsQuery.data ?? []}
        isOpen={selectedWorkId !== null}
        isSaving={updateMutation.isPending}
        locale={locale}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedWorkId(null);
          }
        }}
        onSubmit={handleUpdate}
        onShowQr={(workId) => setQrWorkId(workId)}
        pricingWorkTypeOptions={pricingWorkTypeOptionsQuery.data ?? []}
        submitError={updateMutation.error}
        work={selectedWork}
        workError={selectedWorkQuery.error}
        workTypeOptionsError={formWorkTypeOptionsQuery.error}
      />
      <WorkQrModal isOpen={qrWorkId !== null} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setQrWorkId(null);
        }
      }} workId={qrWorkId} />
    </main>
  );
}

function WorkMetric({ label, value }: { readonly label: string; readonly value: number }): ReactNode {
  return (
    <div className="works-page__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CreateWorkModal({
  clinicOptions,
  formWorkTypeOptions,
  currency,
  initialClinicId,
  initialDoctorId,
  initialPatient,
  initialPatientId,
  isOpen,
  isSaving,
  locale,
  onOpenChange,
  onSubmit,
  pricingWorkTypeOptions,
  submitError,
}: {
  readonly clinicOptions: readonly { readonly code: string; readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly formWorkTypeOptions: readonly { readonly code: string; readonly id: string; readonly name: string; readonly unit: string }[];
  readonly initialClinicId: string | undefined;
  readonly initialDoctorId: string | undefined;
  readonly initialPatient: PatientDetail | undefined;
  readonly initialPatientId: string | undefined;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly locale: string;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (input: CreateWorkInput) => void;
  readonly pricingWorkTypeOptions: readonly { readonly basePriceMinor: number; readonly id: string }[];
  readonly submitError: unknown;
}): ReactNode {
  const [isPatientCreateOpen, setPatientCreateOpen] = useState(false);
  const form = useForm<WorkFormValues>({
    defaultValues: defaultWorkFormValues,
    resolver: zodResolver(workFormSchema),
  });
  const patientOptionsQuery = usePatientOptions("", isOpen);
  const createPatientMutation = useCreatePatient();
  const selectedClinicId = form.watch("clinicId");
  const selectedDoctorId = form.watch("doctorId");
  const selectedWorkTypeId = form.watch("workTypeId");
  const quantity = form.watch("quantity");
  const deadlinePreviewInput = useMemo(() => toDeadlinePreviewInput({
    clinicId: selectedClinicId,
    doctorId: selectedDoctorId,
    quantity,
    workTypeId: selectedWorkTypeId,
  }), [quantity, selectedClinicId, selectedDoctorId, selectedWorkTypeId]);
  const deadlinePreviewQuery = useWorkDeadlinePreview(deadlinePreviewInput, isOpen);
  const selectedPriceOption = pricingWorkTypeOptions.find((option) => option.id === selectedWorkTypeId);
  const totalPreview = selectedPriceOption && Number.isFinite(quantity)
    ? formatMoneyMinor(selectedPriceOption.basePriceMinor * quantity, currency, locale)
    : null;
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const doctorsQuery = useQuery({
    enabled: isOpen && selectedClinicId !== "",
    queryFn: () => fetchDoctorOptions(selectedClinicId),
    queryKey: ["doctors", "options", "create-work", selectedClinicId],
    retry: false,
  });
  const activeTemplateQuery = useActiveWorkFormTemplate(selectedWorkTypeId || undefined, isOpen && selectedWorkTypeId !== "");
  const submitDisabled = activeTemplateQuery.isLoading || activeTemplateQuery.isError;
  const patientOptions = useMemo(() => mergePatientOptions(patientOptionsQuery.data ?? [], initialPatient?.overview ?? null), [initialPatient, patientOptionsQuery.data]);

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultWorkFormValues);
    }
  }, [form, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (initialPatientId) {
      form.setValue("patientId", initialPatientId, { shouldDirty: false, shouldValidate: true });
    }
    if (initialClinicId) {
      form.setValue("clinicId", initialClinicId, { shouldDirty: false, shouldValidate: true });
    } else if (initialPatient?.overview.clinic?.id) {
      form.setValue("clinicId", initialPatient.overview.clinic.id, { shouldDirty: false, shouldValidate: true });
    }
    if (initialDoctorId) {
      form.setValue("doctorId", initialDoctorId, { shouldDirty: false, shouldValidate: true });
    } else if (initialPatient?.overview.doctor?.id) {
      form.setValue("doctorId", initialPatient.overview.doctor.id, { shouldDirty: false, shouldValidate: true });
    }
  }, [form, initialClinicId, initialDoctorId, initialPatient, initialPatientId, isOpen]);

  useEffect(() => {
    form.setValue("workFormValues", {}, { shouldDirty: form.formState.isDirty, shouldValidate: false });
  }, [form, selectedWorkTypeId]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSaving);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSaving} />
      <Modal
        description="Completează datele minime pentru statusul Înregistrată."
        footer={<WorkFormActions canReset={form.formState.isDirty} formId="create-work-form" isSaving={isSaving} onReset={() => form.reset(defaultWorkFormValues)} submitDisabled={submitDisabled} submitLabel="Creează lucrare" />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title="Lucrare nouă"
      >
        <WorkForm
          clinicOptions={clinicOptions}
          doctorOptions={doctorsQuery.data ?? []}
          form={form}
          formId="create-work-form"
          isDisabled={isSaving}
          isTemplateError={activeTemplateQuery.isError}
          isTemplateLoading={activeTemplateQuery.isLoading}
          onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
          onCreatePatient={() => setPatientCreateOpen(true)}
          onRetryTemplate={() => void activeTemplateQuery.refetch()}
          onSubmit={(values) => {
            form.clearErrors("root");
            if (validateDynamicWorkForm(form, activeTemplateQuery.data)) {
              onSubmit(toMutationInput(values, activeTemplateQuery.data));
            }
          }}
          template={activeTemplateQuery.data}
          totalPreview={totalPreview}
          deadlinePreview={deadlinePreviewQuery.data ?? null}
          isDeadlinePreviewLoading={deadlinePreviewQuery.isFetching}
          workTypeOptions={formWorkTypeOptions}
          patientOptions={patientOptions}
        />
      </Modal>
      <QuickPatientModal
        isOpen={isPatientCreateOpen}
        isSaving={createPatientMutation.isPending}
        onOpenChange={setPatientCreateOpen}
        onSubmit={(values) => createPatientMutation.mutate(values, {
          onSuccess: (patient) => {
            form.setValue("patientId", patient.overview.id, { shouldDirty: true, shouldValidate: true });
            setPatientCreateOpen(false);
          },
        })}
        submitError={createPatientMutation.error}
      />
      {closeGuard.confirmModal}
    </>
  );
}

function WorkDetailsDrawer({
  canCreateNextCycle,
  canReadCycles,
  canReadPricing,
  canUpdate,
  clinicOptions,
  currency,
  formWorkTypeOptions,
  isOpen,
  isSaving,
  locale,
  onOpenChange,
  onShowQr,
  onSubmit,
  pricingWorkTypeOptions,
  submitError,
  work,
  workError,
  workTypeOptionsError,
}: {
  readonly canCreateNextCycle: boolean;
  readonly canReadCycles: boolean;
  readonly canReadPricing: boolean;
  readonly canUpdate: boolean;
  readonly clinicOptions: readonly { readonly code: string; readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly formWorkTypeOptions: readonly { readonly code: string; readonly id: string; readonly name: string; readonly unit: string }[];
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly locale: string;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onShowQr: (workId: string) => void;
  readonly onSubmit: (input: UpdateWorkInput) => void;
  readonly pricingWorkTypeOptions: readonly { readonly basePriceMinor: number; readonly id: string }[];
  readonly submitError: unknown;
  readonly work: import("@dental-lab/shared").WorkDetail | undefined;
  readonly workError: unknown;
  readonly workTypeOptionsError: unknown;
}): ReactNode {
  const toast = useToast();
  const [isPatientCreateOpen, setPatientCreateOpen] = useState(false);
  const form = useForm<WorkFormValues>({
    defaultValues: toWorkFormValues(work),
    resolver: zodResolver(workFormSchema),
  });
  const selectedClinicId = form.watch("clinicId");
  const selectedDoctorId = form.watch("doctorId");
  const selectedWorkTypeId = form.watch("workTypeId");
  const quantity = form.watch("quantity");
  const deadlinePreviewInput = useMemo(() => toDeadlinePreviewInput({
    clinicId: selectedClinicId,
    doctorId: selectedDoctorId,
    quantity,
    workTypeId: selectedWorkTypeId,
  }), [quantity, selectedClinicId, selectedDoctorId, selectedWorkTypeId]);
  const deadlinePreviewQuery = useWorkDeadlinePreview(deadlinePreviewInput, isOpen && canUpdate);
  const doctorsQuery = useQuery({
    enabled: isOpen && selectedClinicId !== "",
    queryFn: () => fetchDoctorOptions(selectedClinicId),
    queryKey: ["doctors", "options", "work-detail", selectedClinicId],
    retry: false,
  });
  const patientOptionsQuery = usePatientOptions("", isOpen);
  const createPatientMutation = useCreatePatient();
  const selectedPriceOption = pricingWorkTypeOptions.find((option) => option.id === selectedWorkTypeId);
  const totalPreview = selectedPriceOption && Number.isFinite(quantity)
    ? formatMoneyMinor(selectedPriceOption.basePriceMinor * quantity, currency, locale)
    : null;
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const [pendingWorkTypeChange, setPendingWorkTypeChange] = useState<UpdateWorkInput | null>(null);
  const isWorkTypeChanging = Boolean(work && selectedWorkTypeId !== "" && selectedWorkTypeId !== work.workType.id);
  const activeTemplateQuery = useActiveWorkFormTemplate(selectedWorkTypeId || undefined, isOpen && isWorkTypeChanging);
  const submitDisabled = activeTemplateQuery.isLoading || activeTemplateQuery.isError;
  const [isReassignOpen, setReassignOpen] = useState(false);
  const [isReturnOpen, setReturnOpen] = useState(false);
  const reassignMutation = useReassignWork();
  const createNextCycleMutation = useCreateNextWorkCycle();
  const cyclesQuery = useWorkCycles(work?.id ?? null, isOpen && canReadCycles && work !== undefined);
  const techniciansQuery = useTechnicianOptions(Boolean(work?.claim.canCurrentUserReassign));

  useEffect(() => {
    form.reset(toWorkFormValues(work));
  }, [form, work]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSaving);

  function buildUpdateInput(values: WorkFormValues): UpdateWorkInput | null {
    const templateForValidation = isWorkTypeChanging ? activeTemplateQuery.data : null;
    if (!validateDynamicWorkForm(form, templateForValidation)) {
      return null;
    }

    const baseInput = toMutationInput(values, isWorkTypeChanging ? activeTemplateQuery.data : null);
    return {
      ...baseInput,
      expectedDeadlineRevision: work?.deadline.revision ?? 0,
      ...(isWorkTypeChanging
        ? {
            confirmWorkTypeChange: true,
            ...(baseInput.workFormSubmission ? { workFormSubmission: baseInput.workFormSubmission } : {}),
          }
        : {
            workFormValues: values.workFormValues,
          }),
    };
  }

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSaving} />
      <Drawer
        description={work ? `${work.code} · ${work.status}` : "Detalii lucrare"}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title="Detalii lucrare"
      >
        {workError ? <ErrorState title="Lucrarea nu a fost încărcată" description={getErrorMessage(workError)} /> : null}
        {work ? (
          <div className="works-page__drawer">
            <div className="works-page__meta">
              <StatusBadge label="Înregistrată" variant="registered" />
              <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />
              <span>Termen promis: {formatDate(work.requestedDeliveryDate)}</span>
              <span>Termen efectiv: {work.deadline.effectiveDueAt ? formatDateTime(work.deadline.effectiveDueAt) : "Nerezolvat"}</span>
              <span>Deadline: {work.deadline.status} · rev. {work.deadline.revision}</span>
              {canReadPricing ? <span>Total: {formatPrice(work.totalPriceMinor, work.currency ?? currency, locale)}</span> : null}
            </div>
            <div className="works-page__actions">
              <Button onClick={() => onShowQr(work.id)} variant="outline">Vezi QR</Button>
            </div>
            <DeadlineDetailCard work={work} />
            <ExecutionSnapshotCard work={work} />
            <WorkResponsibilityCard
              onReassign={() => setReassignOpen(true)}
              work={work}
            />
            {canReadCycles ? (
              <WorkCyclesSection
                canCreateNextCycle={canCreateNextCycle}
                error={cyclesQuery.error}
                history={cyclesQuery.data}
                isLoading={cyclesQuery.isLoading}
                onRegisterReturn={() => setReturnOpen(true)}
                work={work}
              />
            ) : null}
            {canReadCycles ? (
              <RealLabSheetSection
                history={cyclesQuery.data}
                isCyclesLoading={cyclesQuery.isLoading}
                work={work}
              />
            ) : null}
            <WorkWorkflowSection isOpen={isOpen} workId={work.id} />
            {workTypeOptionsError ? <ErrorState title="Opțiunile nu au fost încărcate" description={getErrorMessage(workTypeOptionsError)} /> : null}
            <WorkForm
              clinicOptions={clinicOptions}
              doctorOptions={doctorsQuery.data ?? []}
              form={form}
              formId="update-work-form"
              isDisabled={!canUpdate || isSaving}
              isTemplateError={activeTemplateQuery.isError}
              isTemplateLoading={activeTemplateQuery.isLoading}
              onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
              onCreatePatient={() => setPatientCreateOpen(true)}
              onRetryTemplate={() => void activeTemplateQuery.refetch()}
              onSubmit={(values) => {
                form.clearErrors("root");
                const updateInput = buildUpdateInput(values);
                if (!updateInput) {
                  return;
                }
                if (isWorkTypeChanging) {
                  setPendingWorkTypeChange(updateInput);
                  return;
                }
                onSubmit(updateInput);
              }}
              template={isWorkTypeChanging ? activeTemplateQuery.data : work.workForm ? {
                activatedAt: null,
                activatedByUserId: null,
                archivedAt: null,
                archivedByUserId: null,
                createdAt: work.workForm.submittedAt,
                createdByUserId: null,
                description: null,
                fieldCount: work.workForm.fields.length,
                fields: work.workForm.fields.map((field) => ({ ...field, id: field.key, isActive: true })),
                id: work.workForm.templateId ?? "snapshot",
                kind: work.workForm.templateKind ?? "GENERIC",
                name: work.workForm.templateName,
                status: "ACTIVE",
                updatedAt: work.workForm.updatedAt,
                updatedByUserId: null,
                version: work.workForm.templateVersion,
                workType: { code: work.workType.code, id: work.workType.id, isActive: true, name: work.workType.name },
                workTypeId: work.workType.id,
              } : null}
              totalPreview={canReadPricing ? totalPreview : null}
              deadlinePreview={deadlinePreviewQuery.data ?? null}
              isDeadlinePreviewLoading={deadlinePreviewQuery.isFetching}
              workTypeOptions={formWorkTypeOptions}
              patientOptions={mergePatientOptions(patientOptionsQuery.data ?? [], work.patient)}
            />
            <WorkFormReadOnlyView submission={work.workForm} />
            <WorkFormActions
              canReset={form.formState.isDirty}
              formId="update-work-form"
              isSaving={isSaving}
              onReset={() => form.reset(toWorkFormValues(work))}
              submitDisabled={submitDisabled}
              submitLabel="Salvează lucrarea"
            />
            {!canUpdate ? <p className="works-page__muted">Ai acces de citire, dar nu poți modifica lucrarea.</p> : null}
          </div>
        ) : !workError ? <LoadingState text="Se încarcă detaliile" /> : null}
      </Drawer>
      <ConfirmActionModal
        confirmLabel="Continuă"
        description="Schimbarea tipului de lucrare va elimina detaliile specifice completate pentru tipul actual. Continui?"
        isLoading={isSaving}
        isOpen={pendingWorkTypeChange !== null}
        onCancel={() => setPendingWorkTypeChange(null)}
        onConfirm={() => {
          if (pendingWorkTypeChange) {
            onSubmit(pendingWorkTypeChange);
            setPendingWorkTypeChange(null);
          }
        }}
        title="Schimbi tipul lucrării?"
        variant="danger"
      />
      <QuickPatientModal
        isOpen={isPatientCreateOpen}
        isSaving={createPatientMutation.isPending}
        onOpenChange={setPatientCreateOpen}
        onSubmit={(values) => createPatientMutation.mutate(values, {
          onSuccess: (patient) => {
            form.setValue("patientId", patient.overview.id, { shouldDirty: true, shouldValidate: true });
            setPatientCreateOpen(false);
          },
        })}
        submitError={createPatientMutation.error}
      />
      <ReassignWorkModal
        isLoading={reassignMutation.isPending}
        isOpen={isReassignOpen}
        onOpenChange={setReassignOpen}
        onSubmit={(input) => {
          if (!work) {
            return;
          }
          reassignMutation.mutate({
            input: {
              ...input,
              expectedClaimRevision: work.claim.revision,
            },
            workOrderId: work.id,
          }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Responsabilitatea nu a fost modificată", variant: "error" }),
            onSuccess: (updatedWork) => {
              setReassignOpen(false);
              toast.showToast({ message: `${updatedWork.code} a fost reasignată.`, variant: "success" });
            },
          });
        }}
        technicians={techniciansQuery.data ?? []}
        work={work}
      />
      <RegisterReturnModal
        clinicOptions={clinicOptions}
        history={cyclesQuery.data}
        isLoading={createNextCycleMutation.isPending}
        isOpen={isReturnOpen}
        onOpenChange={setReturnOpen}
        onSubmit={(input) => {
          if (!work) {
            return;
          }
          createNextCycleMutation.mutate({ input, workOrderId: work.id }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Revenirea nu a fost înregistrată", variant: "error" }),
            onSuccess: (history) => {
              setReturnOpen(false);
              const activeCycle = history.cycles.find((cycle) => cycle.id === history.activeCycleId);
              toast.showToast({ message: `${work.code} este acum ${activeCycle ? `Ciclul ${activeCycle.cycleNumber}` : "în ciclu nou"}.`, variant: "success" });
            },
          });
        }}
        submitError={createNextCycleMutation.error}
        work={work}
      />
      {closeGuard.confirmModal}
    </>
  );
}

function WorkCyclesSection({
  canCreateNextCycle,
  error,
  history,
  isLoading,
  onRegisterReturn,
  work,
}: {
  readonly canCreateNextCycle: boolean;
  readonly error: unknown;
  readonly history: WorkCyclesHistory | undefined;
  readonly isLoading: boolean;
  readonly onRegisterReturn: () => void;
  readonly work: import("@dental-lab/shared").WorkDetail;
}): ReactNode {
  const cycles = history?.cycles ?? [];
  const activeCycle = cycles.find((cycle) => cycle.id === history?.activeCycleId) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cicluri</CardTitle>
        <CardDescription>{activeCycle ? `${work.code} · Ciclul ${activeCycle.cycleNumber}` : `${work.code} · istoric cicluri`}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="works-page__cycle-header">
          <div>
            <span className="works-page__muted">Lucrare</span>
            <strong>{work.code}</strong>
          </div>
          <div>
            <span className="works-page__muted">Pacient</span>
            <strong>{work.patientName}</strong>
          </div>
          <div>
            <span className="works-page__muted">Ciclu curent</span>
            <strong>{activeCycle ? `Ciclul ${activeCycle.cycleNumber}` : "Nedisponibil"}</strong>
          </div>
          {canCreateNextCycle ? <Button onClick={onRegisterReturn}>Înregistrează revenirea</Button> : null}
        </div>
        {isLoading ? <LoadingState text="Se încarcă ciclurile" /> : null}
        {error ? <ErrorState title="Ciclurile nu au fost încărcate" description={getErrorMessage(error)} /> : null}
        {!isLoading && !error && cycles.length === 0 ? <p className="works-page__muted">Nu există istoric de cicluri.</p> : null}
        {cycles.length > 0 ? (
          <div className="works-page__cycle-list">
            {cycles.map((cycle) => (
              <article className="works-page__cycle-item" data-active={cycle.id === history?.activeCycleId} key={cycle.id}>
                <div className="works-page__cycle-title">
                  <div>
                    <strong>Ciclul {cycle.cycleNumber}</strong>
                    <span>{cycleReasonLabels[cycle.reason]}{cycle.reasonNotes ? ` · ${cycle.reasonNotes}` : ""}</span>
                  </div>
                  <StatusBadge label={cycle.status === "ACTIVE" ? "Activ" : "Închis"} variant={cycle.status === "ACTIVE" ? "production" : "closed"} />
                </div>
                <div className="works-page__cycle-grid">
                  <MetricCell label="Cabinet" value={`${cycle.clinic.code} · ${cycle.clinic.name}`} />
                  <MetricCell label="Medic" value={cycle.doctor?.displayName ?? "Fără medic"} />
                  <MetricCell label="Deschis" value={formatDateTime(cycle.openedAt)} />
                  <MetricCell label="Închis" value={cycle.closedAt ? formatDateTime(cycle.closedAt) : "Ciclu activ"} />
                  <MetricCell label="Creat de" value={cycle.createdBy?.displayName ?? "Sistem"} />
                  <MetricCell label="Flux" value={cycle.workflow.status ?? "Fără flux"} />
                  <MetricCell label="Logistică" value={cycle.logistics.status ?? "Fără status"} />
                  <MetricCell label="Livrare" value={`${cycle.delivery.activePreparationItemCount} pregătiri active`} />
                  <MetricCell label="Termen" value={cycle.deadline.effectiveDueAt ? formatDateTime(cycle.deadline.effectiveDueAt) : "Fără termen"} />
                  <MetricCell label="Snapshot execuție" value={cycle.executionSnapshot.version ? `v${cycle.executionSnapshot.version} · ${cycle.executionSnapshot.status ?? "-"}` : "Nefixat"} />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricCell({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return (
    <div>
      <span className="works-page__muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toMutableDynamicValues(values: import("@dental-lab/shared").WorkFormValues | null | undefined): WorkFormValues["workFormValues"] {
  const next: WorkFormValues["workFormValues"] = {};
  if (!values) {
    return next;
  }
  for (const [key, value] of Object.entries(values)) {
    next[key] = Array.isArray(value) ? [...value] : value as WorkFormValues["workFormValues"][string];
  }
  return next;
}

function isMissingRequiredRealLabSheetValue(value: WorkFormValues["workFormValues"][string] | undefined): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function findFirstMissingRealLabSheetField(sheet: RealLabSheetView, values: WorkFormValues["workFormValues"]): RealLabSheetView["fields"][number] | null {
  return sheet.fields.find((field) => field.required && field.sourceKind === "USER_ENTERED" && isMissingRequiredRealLabSheetValue(values[field.key])) ?? null;
}

function focusRealLabSheetField(fieldKey: string): void {
  const selector = `[id="${CSS.escape(`workFormValues.${fieldKey}`)}"]`;
  const element = document.querySelector<HTMLElement>(selector);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  element?.focus();
}

function RealLabSheetSection({
  history,
  isCyclesLoading,
  work,
}: {
  readonly history: WorkCyclesHistory | undefined;
  readonly isCyclesLoading: boolean;
  readonly work: import("@dental-lab/shared").WorkDetail;
}): ReactNode {
  const toast = useToast();
  const cycles = history?.cycles ?? [];
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const activeCycleId = history?.activeCycleId ?? null;
  const effectiveCycleId = selectedCycleId ?? activeCycleId ?? cycles[0]?.id ?? null;
  const sheetQuery = useRealLabSheet(work.id, effectiveCycleId, effectiveCycleId !== null);
  const saveMutation = useUpsertRealLabSheet();
  const finalizeMutation = useFinalizeRealLabSheet();
  const [isFinalizeOpen, setFinalizeOpen] = useState(false);
  const form = useForm<WorkFormValues>({
    defaultValues: {
      ...defaultWorkFormValues,
      workFormValues: {},
    },
  });
  const sheet = sheetQuery.data ?? null;
  const hasUnsavedSheetChanges = form.formState.isDirty && Boolean(sheet?.canEdit);

  useBeforeUnloadPrompt(hasUnsavedSheetChanges);

  useEffect(() => {
    if (activeCycleId && selectedCycleId === null) {
      setSelectedCycleId(activeCycleId);
    }
  }, [activeCycleId, selectedCycleId]);

  useEffect(() => {
    if (sheet) {
      form.reset({
        ...defaultWorkFormValues,
        workFormValues: toMutableDynamicValues(sheet.values),
      });
    }
  }, [form, sheet]);

  function handleCycleSelect(cycleId: string): void {
    if (cycleId === effectiveCycleId) {
      return;
    }
    if (hasUnsavedSheetChanges && !window.confirm("Ai modificări nesalvate în fișa laborator. Schimbi ciclul fără salvare?")) {
      return;
    }
    setSelectedCycleId(cycleId);
  }

  function submitSheet(saveMode: "DRAFT" | "COMPLETE"): void {
    if (!sheet || !effectiveCycleId) {
      return;
    }
    const values = form.getValues("workFormValues");
    if (saveMode === "COMPLETE") {
      const missingField = findFirstMissingRealLabSheetField(sheet, values);
      if (missingField) {
        form.setError(`workFormValues.${missingField.key}`, { message: "Completează câmpul obligatoriu înainte de marcare completă." });
        focusRealLabSheetField(missingField.key);
        toast.showToast({ message: `Completează ${missingField.label}.`, title: "Fișa nu este completă", variant: "error" });
        return;
      }
    }
    saveMutation.mutate({
      cycleId: effectiveCycleId,
      input: {
        expectedRevision: sheet.revision,
        saveMode,
        templateId: sheet.templateId ?? "",
        templateVersion: sheet.templateVersion,
        values,
      },
      workOrderId: work.id,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Fișa nu a fost salvată", variant: "error" }),
      onSuccess: (nextSheet) => {
        form.reset({
          ...defaultWorkFormValues,
          workFormValues: toMutableDynamicValues(nextSheet.values),
        });
        toast.showToast({ message: saveMode === "COMPLETE" ? "Fișa laborator este marcată completă." : "Schița fișei a fost salvată.", variant: "success" });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fișă laborator</CardTitle>
        <CardDescription>{sheet ? `${work.code} · Ciclul ${sheet.cycleNumber}` : "Fișa reală pe ciclu"}</CardDescription>
      </CardHeader>
      <CardContent>
        {isCyclesLoading ? <LoadingState text="Se încarcă ciclurile" /> : null}
        {cycles.length > 0 ? (
          <div className="works-page__tabs" role="tablist" aria-label="Cicluri fișă laborator">
            {cycles.map((cycle) => (
              <button
                aria-selected={cycle.id === effectiveCycleId}
                className="works-page__tab"
                key={cycle.id}
                onClick={() => handleCycleSelect(cycle.id)}
                type="button"
              >
                Ciclul {cycle.cycleNumber}
              </button>
            ))}
          </div>
        ) : null}
        {sheetQuery.isLoading ? <LoadingState text="Se încarcă fișa laborator" /> : null}
        {sheetQuery.error ? <ErrorState title="Fișa laborator nu a fost încărcată" description={getErrorMessage(sheetQuery.error)} /> : null}
        {sheet ? (
          <form
            className="works-page__lab-sheet"
            onSubmit={(event) => {
              event.preventDefault();
              submitSheet("DRAFT");
            }}
          >
            <div className="works-page__meta">
              <StatusBadge
                label={realLabSheetStatusLabels[sheet.status]}
                variant={toRealLabSheetStatusVariant(sheet.status)}
              />
              <span>{sheet.templateName} · v{sheet.templateVersion}</span>
              <span>Revizia {sheet.revision}</span>
              {sheet.lastModifiedAt ? <span>Actualizată: {formatDateTime(sheet.lastModifiedAt)}</span> : null}
              {sheet.lastModifiedBy ? <span>De: {sheet.lastModifiedBy.displayName}</span> : null}
              {sheet.finalizedAt ? <span>Finalizată: {formatDateTime(sheet.finalizedAt)}</span> : null}
            </div>
            <FormGrid>
              {(sheet.fields ?? []).map((field) => {
                const normalizedField = {
                  ...field,
                  id: field.key,
                  isActive: true,
                };
                const isFullWidthField = field.type === "TEXTAREA" || field.type === "TOOTH" || field.type === "MULTISELECT";
                const content = (
                  <WorkFormFieldRenderer
                    field={normalizedField}
                    form={form}
                    isDisabled={!sheet.canEdit || field.sourceKind !== "USER_ENTERED"}
                  />
                );
                return isFullWidthField
                  ? <div className="works-page__form-full" key={field.key}>{content}</div>
                  : <div key={field.key}>{content}</div>;
              })}
            </FormGrid>
            <div className="works-page__actions">
              <Button disabled={!sheet.canEdit || saveMutation.isPending || sheet.templateId === null} isLoading={saveMutation.isPending} type="submit">
                Salvează schița
              </Button>
              <Button
                disabled={!sheet.canMarkComplete || saveMutation.isPending || sheet.templateId === null}
                isLoading={saveMutation.isPending}
                onClick={() => submitSheet("COMPLETE")}
                type="button"
                variant="outline"
              >
                Marchează completă
              </Button>
              <Button
                disabled={!sheet.canFinalize || finalizeMutation.isPending || hasUnsavedSheetChanges}
                isLoading={finalizeMutation.isPending}
                onClick={() => setFinalizeOpen(true)}
                type="button"
                variant="outline"
              >
              Finalizează fișa
              </Button>
            </div>
            {hasUnsavedSheetChanges ? <p className="works-page__muted">Există modificări nesalvate. Salvează schița sau marchează completă înainte de finalizare.</p> : null}
            {!sheet.canEdit ? <p className="works-page__muted">Fișa este doar pentru citire pentru acest ciclu sau pentru rolul curent.</p> : null}
            {!sheet.canFinalize && sheet.status !== "FINALIZED" && sheet.canEdit ? <p className="works-page__muted">Finalizează după ce fișa este marcată completă.</p> : null}
          </form>
        ) : !sheetQuery.isLoading && !sheetQuery.error ? (
          <p className="works-page__muted">Nu există fișă laborator disponibilă pentru acest ciclu.</p>
        ) : null}
      </CardContent>
      <ConfirmActionModal
        confirmLabel="Finalizează"
        description="După finalizare, fișa acestui ciclu nu mai poate fi modificată. Corecțiile se fac într-un ciclu nou."
        isLoading={finalizeMutation.isPending}
        isOpen={isFinalizeOpen}
        onCancel={() => setFinalizeOpen(false)}
        onConfirm={() => {
          if (!effectiveCycleId) {
            return;
          }
          if (!sheet || sheet.status !== "COMPLETE") {
            toast.showToast({ message: "Marchează fișa completă înainte de finalizare.", title: "Fișa nu poate fi finalizată", variant: "error" });
            return;
          }
          finalizeMutation.mutate({ cycleId: effectiveCycleId, input: { expectedRevision: sheet.revision }, workOrderId: work.id }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Fișa nu a fost finalizată", variant: "error" }),
            onSuccess: () => {
              setFinalizeOpen(false);
              form.reset(form.getValues());
              toast.showToast({ message: "Fișa laborator a fost finalizată.", variant: "success" });
            },
          });
        }}
        title="Finalizezi fișa?"
      />
    </Card>
  );
}

function RegisterReturnModal({
  clinicOptions,
  history,
  isLoading,
  isOpen,
  onOpenChange,
  onSubmit,
  submitError,
  work,
}: {
  readonly clinicOptions: readonly { readonly code: string; readonly id: string; readonly name: string }[];
  readonly history: WorkCyclesHistory | undefined;
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (input: CreateNextWorkCycleInput) => void;
  readonly submitError: unknown;
  readonly work: import("@dental-lab/shared").WorkDetail | undefined;
}): ReactNode {
  const activeCycle = history?.cycles.find((cycle) => cycle.id === history.activeCycleId) ?? null;
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState<Exclude<WorkCycleReason, "INITIAL">>("PROBA");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const doctorsQuery = useQuery({
    enabled: isOpen && clinicId !== "",
    queryFn: () => fetchDoctorOptions(clinicId),
    queryKey: ["doctors", "options", "return-work", clinicId],
    retry: false,
  });
  const isOther = reason === "OTHER";
  const trimmedNotes = notes.trim();
  const notesError = submitted && isOther && trimmedNotes.length < 3 ? "Notele sunt obligatorii pentru Alt motiv." : undefined;
  const clinicError = submitted && clinicId === "" ? "Alege cabinetul." : undefined;
  const doctorError = submitted && doctorId === "" ? "Alege medicul." : undefined;
  const canSubmit = clinicId !== "" && doctorId !== "" && (!isOther || trimmedNotes.length >= 3) && Boolean(history?.activeCycleId);

  useEffect(() => {
    if (isOpen && work) {
      setClinicId(activeCycle?.clinic.id ?? work.clinic.id);
      setDoctorId(activeCycle?.doctor?.id ?? work.doctor.id);
      setReason("PROBA");
      setNotes("");
      setSubmitted(false);
    }
  }, [activeCycle?.clinic.id, activeCycle?.doctor?.id, isOpen, work]);

  useEffect(() => {
    if (!doctorsQuery.data || doctorId === "") {
      return;
    }
    if (!doctorsQuery.data.some((doctor) => doctor.id === doctorId)) {
      setDoctorId("");
    }
  }, [doctorId, doctorsQuery.data]);

  return (
    <Modal
      description={work ? `${work.code} · se păstrează aceeași lucrare și același cod.` : "Înregistrează revenirea lucrării."}
      footer={(
        <Button
          disabled={!canSubmit}
          isLoading={isLoading}
          onClick={() => {
            setSubmitted(true);
            if (!canSubmit) {
              return;
            }
            onSubmit({
              clinicId,
              doctorId,
              notes: trimmedNotes.length > 0 ? trimmedNotes : null,
              reason,
              ...(history?.activeCycleId ? { expectedActiveCycleId: history.activeCycleId } : {}),
            });
          }}
        >
          Înregistrează revenirea
        </Button>
      )}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Înregistrează revenirea"
    >
      <FormLayout>
        {submitError ? <ErrorState title="Revenirea nu a fost înregistrată" description={getErrorMessage(submitError)} /> : null}
        <div className="works-page__return-summary">
          <MetricCell label="Cod lucrare" value={work?.code ?? "-"} />
          <MetricCell label="Pacient" value={work?.patientName ?? "-"} />
          <MetricCell label="Ciclu curent" value={activeCycle ? `Ciclul ${activeCycle.cycleNumber}` : "Nedisponibil"} />
        </div>
        <FormGrid>
          <Select
            error={clinicError}
            label="Cabinet"
            onChange={(event) => {
              setClinicId(event.target.value);
              setDoctorId("");
            }}
            options={clinicOptions.map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
            placeholder="Alege cabinet"
            required
            value={clinicId}
          />
          <Select
            disabled={clinicId === "" || doctorsQuery.isLoading}
            error={doctorError}
            label="Medic"
            onChange={(event) => setDoctorId(event.target.value)}
            options={(doctorsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
            placeholder={clinicId === "" ? "Alege mai întâi cabinetul" : "Alege medic"}
            required
            value={doctorId}
          />
          <Select
            label="Motiv revenire"
            onChange={(event) => {
              if (returnReasonOptions.some((option) => option.value === event.target.value)) {
                setReason(event.target.value as Exclude<WorkCycleReason, "INITIAL">);
              }
            }}
            options={returnReasonOptions}
            required
            value={reason}
          />
        </FormGrid>
        <Textarea
          error={notesError}
          label="Note"
          onChange={(event) => setNotes(event.target.value)}
          required={isOther}
          rows={4}
          value={notes}
        />
        <p className="works-page__muted">
          Nu se creează o lucrare nouă, nu se preia automat de un tehnician și nu se modifică istoricul ciclurilor închise.
        </p>
      </FormLayout>
    </Modal>
  );
}

function ExecutionSnapshotCard({ work }: { readonly work: import("@dental-lab/shared").WorkDetail }): ReactNode {
  const snapshot = work.executionSnapshot;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Context de execuție</CardTitle>
        <CardDescription>Firma, termenul și condițiile fixate la prima preluare.</CardDescription>
      </CardHeader>
      <CardContent>
        {snapshot.summary.exists ? (
          <div className="works-page__responsibility">
            <div>
              <span className="works-page__muted">Status snapshot</span>
              <strong>{snapshot.summary.status === "LOCKED" ? "Fixat" : snapshot.summary.status}</strong>
            </div>
            <div>
              <span className="works-page__muted">Versiune</span>
              <strong>{snapshot.summary.version ?? "-"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Firmă</span>
              <strong>{snapshot.summary.legalEntity ? `${snapshot.summary.legalEntity.code} · ${snapshot.summary.legalEntity.displayName}` : "-"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Tehnician inițial</span>
              <strong>{snapshot.originalTechnician?.displayName ?? "-"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Tehnician curent</span>
              <strong>{snapshot.currentTechnician?.displayName ?? "Nerevendicată"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Fixat la</span>
              <strong>{snapshot.summary.lockedAt ? formatDateTime(snapshot.summary.lockedAt) : "-"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Start execuție</span>
              <strong>{snapshot.deadline?.startAt ? formatDateTime(snapshot.deadline.startAt) : "-"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Termen final</span>
              <strong>{snapshot.deadline?.effectiveDueAt ? formatDateTime(snapshot.deadline.effectiveDueAt) : "Fără termen"}</strong>
            </div>
            <div>
              <span className="works-page__muted">Regulă termen</span>
              <strong>{snapshot.deadline ? `${snapshot.deadline.mode}${snapshot.deadline.executionDays ? ` · ${snapshot.deadline.executionDays} zile` : ""}` : "-"}</strong>
            </div>
            {snapshot.pricing ? (
              <>
                <div>
                  <span className="works-page__muted">Preț fixat</span>
                  <strong>{formatPrice(snapshot.pricing.totalMinor, snapshot.pricing.currency, "ro-RO")}</strong>
                </div>
                <div>
                  <span className="works-page__muted">Sursă preț</span>
                  <strong>{snapshot.pricing.sourceLabel ?? snapshot.pricing.sourceType ?? "-"}</strong>
                </div>
              </>
            ) : (
              <div>
                <span className="works-page__muted">Financiar</span>
                <strong>Informațiile financiare nu sunt disponibile pentru rolul curent.</strong>
              </div>
            )}
          </div>
        ) : (
          <p className="works-page__muted">Contextul de execuție va fi stabilit la prima preluare.</p>
        )}
      </CardContent>
    </Card>
  );
}

function WorkResponsibilityCard({
  onReassign,
  work,
}: {
  readonly onReassign: () => void;
  readonly work: import("@dental-lab/shared").WorkDetail;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Responsabilitate</CardTitle>
        <CardDescription>Tehnicianul responsabil și compania de execuție selectată la revendicare.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="works-page__responsibility">
          <div>
            <span className="works-page__muted">Status</span>
            <strong>{work.claim.status === "CLAIMED" ? "Revendicată" : "Disponibilă"}</strong>
          </div>
          <div>
            <span className="works-page__muted">Tehnician</span>
            <strong>{work.claim.technician?.displayName ?? "Nerevendicată"}</strong>
          </div>
          <div>
            <span className="works-page__muted">Companie execuție</span>
            <strong>{work.claim.executionLegalEntity ? `${work.claim.executionLegalEntity.code} · ${work.claim.executionLegalEntity.displayName}` : "Neselectată"}</strong>
          </div>
          <div>
            <span className="works-page__muted">Revizie</span>
            <strong>{work.claim.revision}</strong>
          </div>
          {work.claim.canCurrentUserReassign ? <Button onClick={onReassign} variant="outline">Reasignează</Button> : null}
        </div>
        {work.assignmentHistory.length > 0 ? (
          <div className="works-page__timeline">
            {work.assignmentHistory.map((event) => (
              <div key={event.id}>
                <strong>{getAssignmentEventLabel(event.eventType)}</strong>
                <span>{formatDateTime(event.createdAt)} · {event.actor.displayName}</span>
                <p>
                  {event.newTechnician?.displayName ?? "Fără responsabil"} · {event.newLegalEntity?.code ?? "Fără companie"}
                  {event.executionSnapshot.version ? ` · Snapshot v${event.executionSnapshot.version} ${event.executionSnapshot.status === "LOCKED" ? "fixat" : event.executionSnapshot.status}` : ""}
                  {event.reason ? ` · ${event.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : <p className="works-page__muted">Nu există istoric de responsabilitate.</p>}
      </CardContent>
    </Card>
  );
}

function ReassignWorkModal({
  isLoading,
  isOpen,
  onOpenChange,
  onSubmit,
  technicians,
  work,
}: {
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (input: { readonly executionLegalEntityCode: LegalEntityCode; readonly reason: string; readonly technicianId: string }) => void;
  readonly technicians: readonly TechnicianOption[];
  readonly work: import("@dental-lab/shared").WorkDetail | undefined;
}): ReactNode {
  const [technicianId, setTechnicianId] = useState("");
  const [executionLegalEntityCode, setExecutionLegalEntityCode] = useState<LegalEntityCode>("NC");
  const [reason, setReason] = useState("");
  const fixedCode = work?.executionSnapshot.summary.legalEntity?.code ?? null;

  useEffect(() => {
    if (isOpen) {
      setTechnicianId(work?.claim.technician?.publicId ?? "");
      setExecutionLegalEntityCode(fixedCode ?? work?.claim.executionLegalEntity?.code ?? "NC");
      setReason("");
    }
  }, [fixedCode, isOpen, work]);

  return (
    <Modal
      description={work ? `${work.code} · revizie responsabilitate ${work.claim.revision}` : "Alege tehnicianul și compania de execuție."}
      footer={(
        <Button
          disabled={technicianId === "" || reason.trim().length < 3}
          isLoading={isLoading}
          onClick={() => onSubmit({ executionLegalEntityCode, reason: reason.trim(), technicianId })}
        >
          Reasignează
        </Button>
      )}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Reasignează lucrarea"
    >
      <FormLayout>
        <Select
          label="Tehnician"
          onChange={(event) => setTechnicianId(event.target.value)}
          options={technicians.map((technician) => ({ label: technician.displayName, value: technician.id }))}
          placeholder="Alege tehnician"
          required
          value={technicianId}
        />
        <Select
          label="Companie execuție"
          disabled={fixedCode !== null}
          onChange={(event) => {
            if (event.target.value === "NC" || event.target.value === "NG") {
              setExecutionLegalEntityCode(event.target.value);
            }
          }}
          options={legalEntityFilterOptions.filter((option) => option.value !== "")}
          required
          value={executionLegalEntityCode}
        />
        <p className="works-page__muted">
          {fixedCode
            ? "Reasignarea schimbă tehnicianul curent, dar păstrează contextul de execuție existent."
            : "Prima asignare va fixa firma, prețul și termenul pentru această lucrare."}
        </p>
        <Textarea label="Motiv" onChange={(event) => setReason(event.target.value)} required rows={4} value={reason} />
      </FormLayout>
    </Modal>
  );
}

function getAssignmentEventLabel(eventType: import("@dental-lab/shared").WorkAssignmentEventType): string {
  switch (eventType) {
    case "ASSIGNED":
      return "Asignare";
    case "CLAIMED":
      return "Revendicare";
    case "REASSIGNED":
      return "Reasignare";
    case "RELEASED":
      return "Eliberare";
  }
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="works-page">
      <section className="dl-container works-page__layout">{children}</section>
    </main>
  );
}

const quickPatientDefaults: PatientFormValues = {
  birthDate: null,
  clinicId: "",
  firstName: "",
  lastName: "",
  doctorId: "",
  notes: null,
  sex: "UNSPECIFIED",
};

const quickPatientLabels: Record<keyof PatientFormValues, string> = {
  birthDate: "Data nașterii",
  clinicId: "Clinică",
  firstName: "Prenume",
  lastName: "Nume",
  doctorId: "Medic",
  notes: "Note limitate",
  sex: "Sex",
};

function QuickPatientModal({
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: PatientFormValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<PatientFormValues>({
    defaultValues: quickPatientDefaults,
    resolver: zodResolver(patientFormSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0 ? getFormErrorSummaryItems(form.formState.errors, quickPatientLabels) : [];

  useEffect(() => {
    if (!isOpen) {
      form.reset(quickPatientDefaults);
    }
  }, [form, isOpen]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  return (
    <Modal
      description="Creează doar identitatea minimă necesară pentru lucrare."
      footer={<FormActions formId="quick-patient-form" isSubmitting={isSaving} submitLabel="Creează pacient" />}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Pacient nou"
    >
      <FormLayout id="quick-patient-form" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
        <FormErrorSummary errors={summaryItems} ref={summaryRef} />
        <FormGrid>
          <TextInput error={form.formState.errors.firstName?.message} id="quickFirstName" label="Prenume" required {...form.register("firstName")} />
          <TextInput error={form.formState.errors.lastName?.message} id="quickLastName" label="Nume" required {...form.register("lastName")} />
          <DateInput error={form.formState.errors.birthDate?.message} id="quickBirthDate" label="Data nașterii" {...form.register("birthDate")} />
          <Select
            error={form.formState.errors.sex?.message}
            id="quickSex"
            label="Sex"
            options={[
              { label: "Nespecificat", value: "UNSPECIFIED" },
              { label: "Feminin", value: "FEMALE" },
              { label: "Masculin", value: "MALE" },
            ]}
            {...form.register("sex")}
          />
        </FormGrid>
        <Textarea error={form.formState.errors.notes?.message} id="quickNotes" label="Note limitate" rows={3} {...form.register("notes")} />
      </FormLayout>
    </Modal>
  );
}

function mergePatientOptions(options: readonly PatientOption[], selected: { readonly birthDate?: string | null; readonly firstName: string; readonly fullName: string; readonly id: string; readonly lastName: string } | null): readonly PatientOption[] {
  if (!selected || options.some((option) => option.id === selected.id)) {
    return options;
  }

  return [
    {
      birthDate: null,
      firstName: selected.firstName,
      fullName: selected.fullName,
      id: selected.id,
      lastName: selected.lastName,
      workCount: 1,
    },
    ...options,
  ];
}
