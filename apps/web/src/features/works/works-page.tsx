import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  getWorkStageExecutionStatusLabel,
  type CreateWorkInput,
  type CreateNextWorkCycleInput,
  type PatientOption,
  type PatientDetail,
  type ProbeCycleView,
  type RealLabSheetOperationalStatus,
  type RealLabSheetView,
  type UpdateWorkInput,
  type WorkSortField,
  type WorkSummary,
  type WorkCycleReason,
  type WorkCyclesHistory,
  type WorksListParams,
  type CreateClinicInput,
  type CreateDoctorInput,
  URGENCY_LABELS_RO,
  URGENCY_LEVELS,
} from "@dental-lab/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { createClinic, createDoctor, fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { fetchPatient, patientsQueryKeys, useCreatePatient, usePatientOptions } from "../patients/patients-api.js";
import { patientFormSchema, type PatientFormValues } from "../patients/patients-page.schema.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { useActiveWorkFormTemplate } from "../work-forms/work-form-templates-api.js";
import { WorkForm, WorkFormActions, defaultWorkFormValues, toPersistedWorkFormValues, toWorkDeadlinePreviewInput, toWorkFormValues, toWorkMutationInput } from "./work-form.js";
import { WorkFormFieldRenderer } from "./work-dynamic-form.js";
import { WorkWorkflowSection } from "./work-workflow-section.js";
import { downloadWorkAttachment, saveOperationalWorkTypeName, useCreateNextWorkCycle, useCreateWork, useFinalizeRealLabSheet, useProbeTypes, useRealLabSheet, useReceiveProbe, useUpdateProbeTypes, useSetManualWorkDeadline, useUpdateActiveProbeDeadline, useUpdateWork, useUpdateTechnicianWorkDetails, useUploadWorkAttachments, useUpsertRealLabSheet, useWork, useWorkCycles, useWorkDeadlinePreview, useWorkFormWorkTypeOptions, useWorks } from "./works-api.js";
import { workFormSchema, type WorkFormValues } from "./works-page.schema.js";
import { WorkQrModal } from "./work-qr-modal.js";
import { filterDraftConnections, getDraftCompositionTeeth, MultiItemWorkEditor, type DraftToothConnection, type DraftWorkOrderItem } from "./multi-item-work-editor.js";
import "./multi-item-work-editor.css";
import { WorkDetailComposition } from "./work-detail-composition.js";
import { displayWorkTypeSymbolOrName } from "./work-type-symbols.js";
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
  urgency: undefined,
  search: undefined,
  sortBy: "createdAt",
  sortDirection: "desc",
  status: undefined,
  workTypeId: undefined,
};

const EMPTY_WORK_ATTACHMENTS = [] as const;

const urgencyFilterOptions = [{ label: "Toate", value: "" }, ...URGENCY_LEVELS.map((value) => ({ label: URGENCY_LABELS_RO[value], value }))] as const;

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", hourCycle: "h23", timeStyle: "short" }).format(new Date(value));
}

function formatOptionalDateTime(value: string | null): string {
  return value ? formatDateTime(value) : "Nerezolvat";
}

function toLocalDateTimeInput(value: string | null, fallbackDate: string, timeSet: boolean | undefined): string {
  if (!value) return `${fallbackDate.slice(0, 10)}T${timeSet === true ? "00:00" : "23:59"}`;
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit", timeZone: "Europe/Bucharest", year: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function toBucharestIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "23:59").split(":").map(Number);
  const utcGuess = Date.UTC(year!, month! - 1, day, hour, minute);
  const zonedParts = new Intl.DateTimeFormat("en-CA", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit", timeZone: "Europe/Bucharest", year: "numeric", hourCycle: "h23" }).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(zonedParts.find((part) => part.type === type)?.value ?? 0);
  const zonedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(utcGuess - (zonedAsUtc - utcGuess)).toISOString();
}

function urgencyLabel(value: import("@dental-lab/shared").UrgencyLevel | null | undefined): string {
  if (!value) return "Prioritate istorică";
  return URGENCY_LABELS_RO[value];
}

function getSafeColor(value: string | null | undefined): string | null {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

function BadgePill({ label, tone = "neutral" }: { readonly label: string; readonly tone?: "neutral" | "info" | "success" | "warning" | "danger" }): ReactNode {
  return <span className={`works-page__pill works-page__pill--${tone}`}>{label}</span>;
}

function toWorkOperationalLabel(work: Pick<WorkSummary, "status" | "technicalReadiness">): { readonly label: string; readonly tone: "neutral" | "info" | "success" | "warning" | "danger" } {
  // The work status is the source of truth. Claim/workflow data can lag while
  // logistics prepares the next step, so it must not turn every unclaimed work
  // into "Înregistrată".
  if (work.status === "FINALIZATA" || work.technicalReadiness === "FINAL_READY") return { label: "Finalizată", tone: "success" };
  if (work.technicalReadiness === "PROBE_READY") return { label: "Probă gata", tone: "info" };
  if (work.status === "IN_ASTEPTARE") return { label: "În așteptare", tone: "warning" };
  if (work.status === "IN_LUCRU") return { label: "În lucru", tone: "info" };
  if (work.status === "RECEPTIE") return { label: "Recepție", tone: "warning" };
  return { label: "Înregistrată", tone: "warning" };
}

export function WorksPage(): ReactNode {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [params, setParams] = useState<WorksListParams>(defaultListParams);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [returnToPreviousPage, setReturnToPreviousPage] = useState(false);
  const navigate = useNavigate();
  const initialPatientId = searchParams.get("patientId");
  const initialClinicId = searchParams.get("clinicId");
  const initialDoctorId = searchParams.get("doctorId");
  const returnTo = searchParams.get("returnTo");
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
  const canEditDeadline = hasPermission(permissionsQuery.data, "works.deadline.set_manual") || hasPermission(permissionsQuery.data, "works.deadline.current.update");
  const canReadCycles = hasPermission(permissionsQuery.data, "cycles.read") || hasPermission(permissionsQuery.data, "cycles.history.read");
  const canShowLegacyExecution = hasPermission(permissionsQuery.data, "works.read_all")
    && !hasPermission(permissionsQuery.data, "works.create")
    && !hasPermission(permissionsQuery.data, "technician.workbench.read")
    && !hasPermission(permissionsQuery.data, "logistics.center.read");
  const canShowLegacyCycles = canReadCycles && canShowLegacyExecution;
  const canCreateNextCycle = hasPermission(permissionsQuery.data, "cycles.create_next");
  const canSelectProbeType = hasPermission(permissionsQuery.data, "cycles.probe_type.select");
  const canReadPricing = hasPermission(permissionsQuery.data, "pricing.read");
  const canEditTechnicalCode = hasPermission(permissionsQuery.data, "works.technical_code.edit");
  const canUploadFiles = hasPermission(permissionsQuery.data, "files.upload");
  const canReadTechnicianOptions = hasPermission(permissionsQuery.data, "technician.workload.read");
  const canUpdateTechnicianDetails = hasPermission(permissionsQuery.data, "works.technical_details.update");
  const worksQuery = useWorks(params, canRead, true);
  const selectedWorkQuery = useWork(selectedWorkId, canRead);
  const clinicOptionsQuery = useQuery({ enabled: canRead || canCreate, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorOptionsQuery = useQuery({
    enabled: canRead || canCreate,
    queryFn: () => fetchDoctorOptions(params.clinicId),
    queryKey: ["doctors", "options", params.clinicId],
    retry: false,
  });
  const formWorkTypeOptionsQuery = useWorkFormWorkTypeOptions(canCreate || canUpdate);
  const probeTypesQuery = useProbeTypes(canCreate || canUpdate || canReadCycles);
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
      setReturnToPreviousPage(true);
    }
  }, [searchParams]);

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
      header: "Stare",
      id: "status",
      renderCell: (work) => {
        const state = toWorkOperationalLabel(work);
        return <BadgePill label={state.label} tone={state.tone} />;
      },
    },
    {
      header: "Urgență",
      id: "urgency",
      isSortable: true,
      renderCell: (work) => work.urgency ? <BadgePill label={urgencyLabel(work.urgency)} tone={work.urgency === "NORMAL" ? "neutral" : "warning"} /> : <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />,
    },
    {
      header: "Acțiuni",
      id: "actions",
      renderCell: (work) => (
        <div className="works-page__row-actions">
          <Button onClick={() => {
            setSelectedWorkId(work.id);
            setReturnToPreviousPage(true);
            setSearchParams((current) => {
              const next = new URLSearchParams(current);
              next.set("workId", work.id);
              return next;
            });
          }} size="small" variant="outline">Deschide</Button>
        </div>
      ),
    },
  ], []);

  function handleCreate(input: CreateWorkInput): void {
    createMutation.mutate(input, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost creată", variant: "error" }),
      onSuccess: (work) => {
        setIsCreateOpen(false);
        setReturnToPreviousPage(false);
        setSelectedWorkId(work.id);
        toast.showToast({ durationMs: 3500, message: `Lucrare ${work.code} creată.`, variant: "success" });
      },
    });
  }

  function handleUpdate(input: UpdateWorkInput): void {
    // Keep the technical code out of the general Reception edit payload. The
    // server remains authoritative, but the UI must not submit a field that
    // this role cannot mutate.
    const updateInput: UpdateWorkInput = canEditTechnicalCode
      ? input
      : (() => {
          const { technicalCodeNotes: _technicalCodeNotes, ...safeInput } = input;
          return safeInput;
        })();
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
                    label="Medic"
                    onChange={(event) => setParams((current) => ({ ...current, doctorId: event.target.value || undefined, page: 1 }))}
                    options={(doctorOptionsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
                    placeholder="Toți medicii"
                    value={params.doctorId ?? ""}
                  />
                  <Select
                    label="Urgență"
                    onChange={(event) => setParams((current) => ({ ...current, page: 1, urgency: URGENCY_LEVELS.includes(event.target.value as typeof URGENCY_LEVELS[number]) ? event.target.value as typeof URGENCY_LEVELS[number] : undefined }))}
                    options={urgencyFilterOptions}
                    value={params.urgency ?? ""}
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
                    onChange={(event) => setParams((current) => ({ ...current, executionLegalEntityCode: event.target.value === "CDT" || event.target.value === "NG" ? event.target.value : undefined, page: 1 }))}
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
        canEditTechnicalCode={canEditTechnicalCode}
        clinicOptions={clinicOptionsQuery.data ?? []}
        formWorkTypeOptions={formWorkTypeOptionsQuery.data ?? []}
        isOpen={isCreateOpen}
        initialClinicId={initialClinicId ?? undefined}
        initialDoctorId={initialDoctorId ?? undefined}
        initialPatient={initialPatientQuery.data}
        initialPatientId={initialPatientId ?? undefined}
        pricingWorkTypeOptions={(pricingWorkTypeOptionsQuery.data ?? []).filter((option) => option.basePriceMinor !== null) as readonly { readonly basePriceMinor: number; readonly id: string }[]}
        isSaving={createMutation.isPending}
        onOpenChange={(isOpen) => {
          setIsCreateOpen(isOpen);
          if (!isOpen && returnTo) navigate(returnTo, { replace: true });
        }}
        onSubmit={handleCreate}
        submitError={createMutation.error}
        currency={currency}
        locale={locale}
      />

        <WorkDetailsDrawer
        canEditTechnicalCode={canEditTechnicalCode}
        canUploadFiles={canUploadFiles}
        canCreateNextCycle={canCreateNextCycle}
        canSelectProbeType={canSelectProbeType}
        canReadCycles={canShowLegacyCycles}
        canShowLegacyExecution={canShowLegacyExecution}
        canReadPricing={canReadPricing}
          canUpdate={canUpdate}
          canEditDeadline={canEditDeadline}
          canUpdateTechnicianDetails={canUpdateTechnicianDetails}
        clinicOptions={clinicOptionsQuery.data ?? []}
        currency={currency}
        formWorkTypeOptions={formWorkTypeOptionsQuery.data ?? []}
        isOpen={selectedWorkId !== null}
        isSaving={updateMutation.isPending}
        locale={locale}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedWorkId(null);
            if (returnToPreviousPage) {
              setReturnToPreviousPage(false);
              navigate(-1);
            }
          }
        }}
        onSubmit={handleUpdate}
        onShowQr={(workId) => setQrWorkId(workId)}
        pricingWorkTypeOptions={(pricingWorkTypeOptionsQuery.data ?? []).filter((option) => option.basePriceMinor !== null) as readonly { readonly basePriceMinor: number; readonly id: string }[]}
        probeTypeOptions={probeTypesQuery.data ?? []}
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
  canEditTechnicalCode = false,
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
  readonly canEditTechnicalCode?: boolean;
  readonly clinicOptions: readonly { readonly code: string; readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly formWorkTypeOptions: readonly { readonly code: string; readonly id: string; readonly name: string; readonly symbol: string; readonly unit: string }[];
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
  const [isClinicCreateOpen, setClinicCreateOpen] = useState(false);
  const [isDoctorCreateOpen, setDoctorCreateOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<readonly DraftWorkOrderItem[]>([]);
  const [draftConnections, setDraftConnections] = useState<readonly DraftToothConnection[]>([]);
  const form = useForm<WorkFormValues>({
    defaultValues: defaultWorkFormValues,
    resolver: zodResolver(workFormSchema),
  });
  const createPatientMutation = useCreatePatient();
  const queryClient = useQueryClient();
  const createClinicMutation = useMutation({
    mutationFn: (input: CreateClinicInput) => createClinic(input),
    onSuccess: async (clinic) => {
      await queryClient.invalidateQueries({ queryKey: ["clinics"] });
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      form.setValue("clinicId", clinic.id, { shouldDirty: true, shouldValidate: true });
      form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true });
      setClinicCreateOpen(false);
    },
  });
  const createDoctorMutation = useMutation({
    mutationFn: (input: CreateDoctorInput) => createDoctor(input),
    onSuccess: async (doctor) => {
      await queryClient.invalidateQueries({ queryKey: ["clinics"] });
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      form.setValue("doctorId", doctor.id, { shouldDirty: true, shouldValidate: true });
      setDoctorCreateOpen(false);
    },
  });
  const selectedClinicId = form.watch("clinicId");
  const selectedDoctorId = form.watch("doctorId");
  const selectedWorkTypeId = form.watch("workTypeId");
  const patientOptionsQuery = usePatientOptions("", isOpen, selectedClinicId || undefined, selectedDoctorId || undefined);
  const quantity = form.watch("quantity");
  const requestedDeliveryDate = form.watch("requestedDeliveryDate");
  const requestedDeliveryTime = form.watch("requestedDeliveryTime");
  const deadlinePreviewInput = useMemo(() => toWorkDeadlinePreviewInput({
    clinicId: selectedClinicId,
    doctorId: selectedDoctorId,
    quantity,
    requestedDeliveryDate,
    requestedDeliveryTime,
    workTypeId: selectedWorkTypeId,
  }), [quantity, requestedDeliveryDate, requestedDeliveryTime, selectedClinicId, selectedDoctorId, selectedWorkTypeId]);
  const deadlinePreviewQuery = useWorkDeadlinePreview(deadlinePreviewInput, isOpen);
  const activeTemplateQuery = useActiveWorkFormTemplate(selectedWorkTypeId || undefined, isOpen && selectedWorkTypeId !== "");
  // A dynamic form is optional for a work type. A missing template must not
  // prevent reception from creating a work with the selected components.
  const submitDisabled = activeTemplateQuery.isLoading;
  const selectedPriceOption = pricingWorkTypeOptions.find((option) => option.id === selectedWorkTypeId);
  const totalPreview = selectedPriceOption && Number.isFinite(quantity)
    ? formatMoneyMinor(selectedPriceOption.basePriceMinor * quantity, currency, locale)
    : null;
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const doctorsQuery = useQuery({
    enabled: isOpen,
    queryFn: () => fetchDoctorOptions(selectedClinicId || undefined),
    queryKey: ["doctors", "options", "create-work", selectedClinicId],
    retry: false,
  });
  const patientOptions = useMemo(() => mergePatientOptions(patientOptionsQuery.data ?? [], initialPatient?.overview ?? null), [initialPatient, patientOptionsQuery.data]);

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultWorkFormValues);
      setDraftItems([]);
      setDraftConnections([]);
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
        size="full"
        title="Lucrare nouă"
      >
        <WorkForm
          clinicOptions={clinicOptions}
          doctorOptions={doctorsQuery.data ?? []}
          form={form}
          formId="create-work-form"
          isDisabled={isSaving}
          onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
          onCreateClinic={() => setClinicCreateOpen(true)}
          onCreateDoctor={() => setDoctorCreateOpen(true)}
          onCreatePatient={() => setPatientCreateOpen(true)}
          onSubmit={(values) => {
            form.clearErrors("root");
            if (draftItems.length === 0) {
              form.setError("root", { message: "Adaugă cel puțin o componentă lucrării." });
              return;
            }
            const input = toWorkMutationInput(values, activeTemplateQuery.data);
            const firstItem = draftItems[0];
            onSubmit({
              ...input,
              quantity: draftItems.length,
              shade: firstItem?.shade ?? null,
              implantPlatform: firstItem?.implantPlatform === "Alt tip" ? firstItem.implantPlatformCustom : firstItem?.implantPlatform ?? null,
              items: draftItems.map((item) => ({
                scope: item.scope,
                teeth: item.teeth,
                workTypeId: item.workTypeId,
                customWorkTypeSnapshot: item.workTypeId ? null : item.customWorkTypeSnapshot ?? null,
                shade: item.shade,
                implantPlatform: item.implantPlatform === "Alt tip" ? item.implantPlatformCustom : item.implantPlatform,
                restorationType: item.restorationType,
                technicalCodeNotes: item.technicalCodeNotes,
                notes: item.notes,
                ...(item.selectedAddOns ? { selectedAddOns: item.selectedAddOns } : {}),
              })),
              toothConnections: filterDraftConnections(draftConnections, getDraftCompositionTeeth(draftItems)),
            });
          }}
          multiItem
          workDetailsSlot={<MultiItemWorkEditor canEditTechnicalCode={canEditTechnicalCode} canSaveCustomWorkType onSaveCustomWorkType={saveOperationalWorkTypeName} connections={draftConnections} disabled={isSaving} items={draftItems} onChange={(items, connections) => {
            setDraftItems(items);
            setDraftConnections(connections);
            const first = items[0];
            form.setValue("workTypeId", first?.workTypeId ?? "", { shouldDirty: true, shouldValidate: true });
            form.setValue("quantity", items.length || 1, { shouldDirty: true, shouldValidate: true });
          }} workTypeOptions={formWorkTypeOptions} />}
          totalPreview={totalPreview}
          deadlinePreview={deadlinePreviewQuery.data ?? null}
          isDeadlinePreviewLoading={deadlinePreviewQuery.isFetching}
          workTypeOptions={formWorkTypeOptions}
          patientOptions={patientOptions}
        />
      </Modal>
      <QuickPatientModal
        clinicId={selectedClinicId}
        doctorId={selectedDoctorId}
        isOpen={isPatientCreateOpen}
        isSaving={createPatientMutation.isPending}
        onOpenChange={setPatientCreateOpen}
        onSubmit={(values) => createPatientMutation.mutate(values, {
          onSuccess: async (patient) => {
            await queryClient.invalidateQueries({ queryKey: patientsQueryKeys.options("", selectedClinicId || undefined, selectedDoctorId || undefined) });
            form.setValue("patientId", patient.overview.id, { shouldDirty: true, shouldValidate: true });
            setPatientCreateOpen(false);
          },
        })}
        submitError={createPatientMutation.error}
      />
      <QuickClinicModal
        isOpen={isClinicCreateOpen}
        isSaving={createClinicMutation.isPending}
        onOpenChange={setClinicCreateOpen}
        onSubmit={(values) => createClinicMutation.mutate({ ...values, legalEntityCode: values.legalEntityCode || null })}
        submitError={createClinicMutation.error}
      />
      <QuickDoctorModal
        clinicId={selectedClinicId}
        isOpen={isDoctorCreateOpen}
        isSaving={createDoctorMutation.isPending}
        onOpenChange={setDoctorCreateOpen}
        onSubmit={(values) => createDoctorMutation.mutate(values)}
        submitError={createDoctorMutation.error}
      />
      {closeGuard.confirmModal}
    </>
  );
}

function WorkCodeAndFilesFields({
  canEditCode,
  canUploadFiles,
  work,
}: {
  readonly canEditCode: boolean;
  readonly canUploadFiles: boolean;
  readonly work: import("@dental-lab/shared").WorkDetail;
}): ReactNode {
  const attachments = work.attachments ?? EMPTY_WORK_ATTACHMENTS;
  type Attachment = (typeof attachments)[number];
  const [code, setCode] = useState(work.technicalCodeNotes ?? "");
  const [preview, setPreview] = useState<{ readonly attachment: Attachment; readonly url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<readonly File[]>([]);
  const updateMutation = useUpdateTechnicianWorkDetails();
  const uploadMutation = useUploadWorkAttachments();

  useEffect(() => {
    setCode(work.technicalCodeNotes ?? "");
  }, [work.technicalCodeNotes]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];
    const imageAttachments = attachments.filter((attachment) => attachment.mimeType.startsWith("image/"));
    void Promise.all(imageAttachments.map(async (attachment) => {
      try {
        const blob = await downloadWorkAttachment(work.id, attachment.id, attachment.mimeType);
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return null;
        }
        createdUrls.push(url);
        return [attachment.id, url] as const;
      } catch {
        return null;
      }
    })).then((entries) => {
      if (!cancelled) setThumbnailUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
    });
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments, work.id]);

  function upload(files: readonly File[]): void {
    if (files.length > 0) {
      setPendingFiles(files);
      uploadMutation.mutate({ files, workOrderId: work.id });
    }
  }

  useEffect(() => {
    if (!uploadMutation.isPending && uploadMutation.isSuccess) {
      setPendingFiles([]);
    }
  }, [uploadMutation.isPending, uploadMutation.isSuccess]);

  async function download(attachment: (typeof attachments)[number]): Promise<void> {
    const blob = await downloadWorkAttachment(work.id, attachment.id, attachment.mimeType);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function openPreview(attachment: Attachment): Promise<void> {
    if (!attachment.mimeType.startsWith("image/")) {
      await download(attachment);
      return;
    }
    setPreviewLoading(true);
    try {
      const blob = await downloadWorkAttachment(work.id, attachment.id, attachment.mimeType);
      const url = URL.createObjectURL(blob);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { attachment, url };
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview(): void {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <>
        <div className="works-page__detail-field">
          <span>Cod</span>
          {canEditCode ? (
            <>
              <Textarea aria-label="Cod tehnic" label="Cod" onChange={(event) => setCode(event.target.value)} rows={5} value={code} />
              <Button disabled={updateMutation.isPending} isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ workOrderId: work.id, input: { technicalCodeNotes: code.trim() || null } })} size="small" type="button">Salvează codul</Button>
            </>
          ) : <strong>{work.technicalCodeNotes || "-"}</strong>}
        </div>
        <div className="works-page__detail-field">
          <span>Fișiere atașate</span>
          {attachments.length > 0 ? (
            <ul className="works-page__attachment-list">
              {attachments.map((attachment) => (
                <li key={attachment.id}>
                  {attachment.mimeType.startsWith("image/") ? (
                    <button aria-label={`Previzualizează ${attachment.fileName}`} className="works-page__attachment-preview-button" disabled={previewLoading} onClick={() => void openPreview(attachment)} type="button">
                      <span className="works-page__attachment-thumb">{thumbnailUrls[attachment.id] ? <img alt="" src={thumbnailUrls[attachment.id]} /> : <span aria-hidden="true">▧</span>}</span>
                      <span>{attachment.fileName}</span>
                    </button>
                  ) : <span>{attachment.fileName}</span>}
                  <span className="works-page__attachment-meta">
                    <small>{Math.ceil(attachment.sizeBytes / 1024)} KB</small>
                    <button aria-label={`Descarcă ${attachment.fileName}`} className="works-page__attachment-download" onClick={() => void download(attachment)} type="button">Descarcă</button>
                  </span>
                </li>
              ))}
            </ul>
          ) : <strong>Nu există fișiere.</strong>}
          {pendingFiles.length > 0 ? (
            <div aria-live="polite" className="works-page__pending-attachments">
              <strong>{uploadMutation.isPending ? "Se încarcă fișierele…" : "Fișiere adăugate"}</strong>
              {pendingFiles.map((file) => <span key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}</span>)}
            </div>
          ) : null}
          {canUploadFiles ? (
            <label className="works-page__attachment-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload([...event.dataTransfer.files]); }} onPaste={(event) => upload([...event.clipboardData.files])}>
              <span>Adaugă fișiere</span>
              <small>Trage, lipește sau selectează din dispozitiv.</small>
              <input accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => { upload([...(event.target.files ?? [])]); event.currentTarget.value = ""; }} type="file" />
            </label>
          ) : null}
          {uploadMutation.isError ? <p className="works-page__muted">Fișierele nu au putut fi încărcate.</p> : null}
        </div>
        <Modal
          description={preview?.attachment.fileName ?? "Previzualizare imagine"}
          footer={preview ? <Button onClick={() => void download(preview.attachment)}>Descarcă imaginea</Button> : null}
          isOpen={preview !== null}
          onOpenChange={(open) => { if (!open) closePreview(); }}
          size="full"
          title={preview?.attachment.fileName ?? "Previzualizare"}
        >
          {preview ? <div className="works-page__image-preview"><img alt={preview.attachment.fileName} src={preview.url} /></div> : null}
        </Modal>
    </>
  );
}

function WorkDetailsDrawer({
  canEditTechnicalCode,
  canUploadFiles,
  canCreateNextCycle,
  canSelectProbeType,
  canReadCycles,
  canShowLegacyExecution,
  canReadPricing,
  canUpdate,
  canEditDeadline,
  canUpdateTechnicianDetails,
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
  probeTypeOptions,
  submitError,
  work,
  workError,
  workTypeOptionsError,
}: {
  readonly canEditTechnicalCode: boolean;
  readonly canUploadFiles: boolean;
  readonly canCreateNextCycle: boolean;
  readonly canSelectProbeType: boolean;
  readonly canReadCycles: boolean;
  readonly canShowLegacyExecution: boolean;
  readonly canReadPricing: boolean;
  readonly canUpdate: boolean;
  readonly canEditDeadline: boolean;
  readonly canUpdateTechnicianDetails: boolean;
  readonly clinicOptions: readonly { readonly code: string; readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly formWorkTypeOptions: readonly { readonly code: string; readonly id: string; readonly name: string; readonly symbol: string; readonly unit: string }[];
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly locale: string;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onShowQr: (workId: string) => void;
  readonly onSubmit: (input: UpdateWorkInput) => void;
  readonly pricingWorkTypeOptions: readonly { readonly basePriceMinor: number; readonly id: string }[];
  readonly probeTypeOptions: readonly import("@dental-lab/shared").ProbeTypeView[];
  readonly submitError: unknown;
  readonly work: import("@dental-lab/shared").WorkDetail | undefined;
  readonly workError: unknown;
  readonly workTypeOptionsError: unknown;
}): ReactNode {
  const toast = useToast();
  const form = useForm<WorkFormValues>({
    defaultValues: toWorkFormValues(work),
    resolver: zodResolver(workFormSchema),
  });
  const selectedClinicId = form.watch("clinicId");
  const selectedDoctorId = form.watch("doctorId");
  const selectedWorkTypeId = form.watch("workTypeId");
  const quantity = form.watch("quantity");
  const requestedDeliveryDate = form.watch("requestedDeliveryDate");
  const requestedDeliveryTime = form.watch("requestedDeliveryTime");
  const deadlinePreviewInput = useMemo(() => toWorkDeadlinePreviewInput({
    clinicId: selectedClinicId,
    doctorId: selectedDoctorId,
    quantity,
    requestedDeliveryDate,
    requestedDeliveryTime,
    workTypeId: selectedWorkTypeId,
  }), [quantity, requestedDeliveryDate, requestedDeliveryTime, selectedClinicId, selectedDoctorId, selectedWorkTypeId]);
  const deadlinePreviewQuery = useWorkDeadlinePreview(deadlinePreviewInput, isOpen && canUpdate);
  const activeTemplateQuery = useActiveWorkFormTemplate(selectedWorkTypeId || undefined, isOpen && selectedWorkTypeId !== "");
  const doctorsQuery = useQuery({
    enabled: isOpen,
    queryFn: () => fetchDoctorOptions(selectedClinicId || undefined),
    queryKey: ["doctors", "options", "work-detail", selectedClinicId],
    retry: false,
  });
  const selectedPriceOption = pricingWorkTypeOptions.find((option) => option.id === selectedWorkTypeId);
  const totalPreview = selectedPriceOption && Number.isFinite(quantity)
    ? formatMoneyMinor(selectedPriceOption.basePriceMinor * quantity, currency, locale)
    : null;
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const [pendingWorkTypeChange, setPendingWorkTypeChange] = useState<UpdateWorkInput | null>(null);
  const [editingCaseFields, setEditingCaseFields] = useState(false);
  const editFormRef = useRef<HTMLDivElement | null>(null);
  const isWorkTypeChanging = Boolean(work && selectedWorkTypeId !== "" && selectedWorkTypeId !== work.workType.id);
  const submitDisabled = false;
  const [isReturnOpen, setReturnOpen] = useState(false);
  const createNextCycleMutation = useCreateNextWorkCycle();
  const receiveProbeMutation = useReceiveProbe();
  const updateProbeTypesMutation = useUpdateProbeTypes();
  const cyclesQuery = useWorkCycles(work?.id ?? null, isOpen && canReadCycles && work !== undefined);
  const activeCycleNumber = cyclesQuery.data?.cycles.find((cycle) => cycle.id === cyclesQuery.data?.activeCycleId)?.cycleNumber ?? null;

  useEffect(() => {
    form.reset(toWorkFormValues(work));
    setEditingCaseFields(false);
  }, [form, work]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSaving);

  function buildUpdateInput(values: WorkFormValues): UpdateWorkInput | null {
    const template = activeTemplateQuery.data ?? (work?.workForm ? { fields: work.workForm.fields } : null);
    const dynamicValues = toPersistedWorkFormValues(values, template);
    const baseInput = toWorkMutationInput(values, null, canEditDeadline, false);
    return {
      ...baseInput,
      expectedDeadlineRevision: work?.deadline.revision ?? 0,
      ...(isWorkTypeChanging
        ? {
            confirmWorkTypeChange: true,
            ...(baseInput.workFormSubmission ? { workFormSubmission: baseInput.workFormSubmission } : {}),
          }
        : {
            workFormValues: dynamicValues,
          }),
    };
  }

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSaving} />
      <Drawer
        className="works-page__work-details-drawer"
        description={work ? `${work.code} · ${work.status}` : "Detalii lucrare"}
        headerAction={work ? <Button onClick={() => onShowQr(work.id)} type="button" variant="outline">Vezi QR</Button> : null}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title="Detalii lucrare"
      >
        {workError ? <ErrorState title="Lucrarea nu a fost încărcată" description={getErrorMessage(workError)} /> : null}
        {work ? (
          <div className="works-page__drawer">
            <ExecutionNowCard activeCycleNumber={canShowLegacyExecution ? activeCycleNumber : null} canEditDeadline={canEditDeadline} showLegacyExecution={canShowLegacyExecution} work={work} />
            {canShowLegacyExecution ? <WorkWorkflowSection isOpen={isOpen} workId={work.id} /> : null}
            {canReadCycles ? (
              <RealLabSheetSection
                history={cyclesQuery.data}
                isCyclesLoading={cyclesQuery.isLoading}
                work={work}
              />
            ) : null}
            <ProbeCycleSummary canSelect={canSelectProbeType} isSaving={updateProbeTypesMutation.isPending} onSelect={(cycleId, probeTypeIds) => updateProbeTypesMutation.mutate({ cycleId, probeTypeIds, workOrderId: work.id })} probeTypes={probeTypeOptions} work={work} />
            <WorkDetailComposition canEdit={canUpdate} canEditNotes={canUpdateTechnicianDetails} canEditTechnicalCode={canEditTechnicalCode} isOpen={isOpen} work={work} workTypeOptions={formWorkTypeOptions} />
            {canReadCycles && !work.activeProbeCycle && ((work.completedProbeCycles ?? []).length === 0 || work.technicalReadiness === "PROBE_READY") ? (
              <WorkCyclesSection
                canCreateNextCycle={canCreateNextCycle}
                error={cyclesQuery.error}
                history={cyclesQuery.data}
                isLoading={cyclesQuery.isLoading}
                onRegisterReturn={() => setReturnOpen(true)}
                isCanonical={work.technicalReadiness === "PROBE_READY"}
                work={work}
              />
            ) : null}
            {workTypeOptionsError ? <ErrorState title="Opțiunile nu au fost încărcate" description={getErrorMessage(workTypeOptionsError)} /> : null}
            {editingCaseFields ? <section className="works-page__inline-edit-section" aria-labelledby="work-inline-edit-title">
              <div className="works-page__detail-section-header">
                <div>
                  <h2 id="work-inline-edit-title">Editează datele lucrării</h2>
                  <p className="works-page__muted">Modificările se salvează direct aici. Tipul, dinții și manoperele pot fi editate în secțiunile de mai jos.</p>
                </div>
                <WorkFormActions
                  canReset={form.formState.isDirty}
                  formId="update-work-form"
                  isSaving={isSaving}
                  onReset={() => form.reset(toWorkFormValues(work))}
                  submitDisabled={submitDisabled}
                  submitLabel="Salvează datele"
                />
              </div>
              <div ref={editFormRef} className="works-page__work-edit-form">
                <WorkForm
              clinicOptions={clinicOptions}
              doctorOptions={doctorsQuery.data ?? []}
              form={form}
              formId="update-work-form"
                isDisabled={!canUpdate || isSaving}
              onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
              allowPatientEdit={false}
                allowPatientNameEdit={false}
                hideWorkSelection
              onCreatePatient={() => undefined}
              onSubmit={(values) => {
                form.clearErrors("root");
                if (activeTemplateQuery.isLoading || (activeTemplateQuery.isError && !work.workForm)) {
                  return;
                }
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
              totalPreview={canReadPricing ? totalPreview : null}
              deadlinePreview={deadlinePreviewQuery.data ?? null}
              isDeadlinePreviewLoading={deadlinePreviewQuery.isFetching}
              workTypeOptions={formWorkTypeOptions}
              patientOptions={work.patient ? [{ birthDate: work.patient.birthDate ?? null, firstName: work.patient.firstName, fullName: work.patient.fullName, id: work.patient.id, lastName: work.patient.lastName, workCount: 0 }] : []}
              workDetailsSlot={<WorkCodeAndFilesFields canEditCode={canEditTechnicalCode} canUploadFiles={canUploadFiles} work={work} />}
                />
              </div>
            </section> : null}
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
      {work?.technicalReadiness === "PROBE_READY" ? <CanonicalReceiveProbeModal
        isLoading={receiveProbeMutation.isPending}
        isOpen={isReturnOpen}
        onOpenChange={setReturnOpen}
        onSubmit={(input) => {
          if (!work) return;
          receiveProbeMutation.mutate({ input, workOrderId: work.id }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Recepționarea nu a fost înregistrată", variant: "error" }),
            onSuccess: () => { setReturnOpen(false); toast.showToast({ message: `${work.code} a fost recepționată și are o probă activă nouă.`, variant: "success" }); },
          });
        }}
        probeTypes={probeTypeOptions}
        work={work}
      /> : <RegisterReturnModal
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
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Proba nu a fost înregistrată", variant: "error" }),
            onSuccess: (history) => {
              setReturnOpen(false);
              const activeCycle = history.cycles.find((cycle) => cycle.id === history.activeCycleId);
              toast.showToast({ message: `${work.code} este acum ${activeCycle ? `Ciclul ${activeCycle.cycleNumber}` : "în ciclu nou"}.`, variant: "success" });
            },
          });
        }}
        submitError={createNextCycleMutation.error}
        work={work}
      />}
      {closeGuard.confirmModal}
    </>
  );
}

function ProbeCycleSummary({ canSelect, isSaving, onSelect, probeTypes, work }: { readonly canSelect: boolean; readonly isSaving: boolean; readonly onSelect: (cycleId: string, probeTypeIds: readonly string[]) => void; readonly probeTypes: readonly import("@dental-lab/shared").ProbeTypeView[]; readonly work: import("@dental-lab/shared").WorkDetail }): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => setIsExpanded(false), [work.id]);
  const cycles = [
    ...(work.activeProbeCycle ? [work.activeProbeCycle] : []),
    ...(work.completedProbeCycles ?? []),
  ];
  return (
    <Card className="works-page__probe-accordion">
      <CardHeader>
        <button aria-controls="technical-probes-content" aria-expanded={isExpanded} aria-label={isExpanded ? "Închide Probe" : "Deschide Probe"} className="works-page__accordion-trigger" onClick={() => setIsExpanded((expanded) => !expanded)} type="button">
          <span className="works-page__accordion-copy"><span className="works-page__section-title" role="heading" aria-level={2}>Probe</span></span>
          <span aria-hidden="true" className={`works-page__accordion-chevron${isExpanded ? " is-expanded" : ""}`}>⌄</span>
        </button>
      </CardHeader>
      {isExpanded ? <CardContent id="technical-probes-content">
        {cycles.length === 0 ? <p className="works-page__muted">Nu există probe canonice pentru această lucrare.</p> : cycles.map((cycle) => {
          const options = cycle.status === "ACTIVE" && cycle.probeType.isArchived && !probeTypes.some((type) => type.id === cycle.probeType.id)
            ? [cycle.probeType, ...probeTypes]
            : probeTypes;
          const cycleLabel = cycle.sequence === 0 ? "Proba inițială" : `Proba ${cycle.sequence}`;
          return (
          <div className="works-page__cycle-item" key={cycle.id}>
            <div className="works-page__cycle-title">
              <strong>{cycle.status === "ACTIVE" ? `${cycleLabel} · ${cycle.probeTypeNameSnapshot}` : `${cycleLabel} trecută · ${cycle.probeTypeNameSnapshot}`}</strong>
              <StatusBadge label={cycle.status === "ACTIVE" ? "Activă" : "Finalizată"} variant={cycle.status === "ACTIVE" ? "production" : "closed"} />
            </div>
            <div className="works-page__cycle-grid">
              <MetricCell label="Probă" value={cycleLabel} />
              <MetricCell label="Tip probă" value={cycle.probeTypeNameSnapshot} />
              <MetricCell label="Introdusă la" value={formatDateTime(cycle.openedAt)} />
              <MetricCell label="Termen" value={formatDateTime(cycle.deadlineAt)} />
            </div>
            {cycle.status === "ACTIVE" ? <ProbeTypeMultiSelect canSelect={canSelect} cycle={cycle} disabled={isSaving} onSave={(ids) => onSelect(cycle.id, ids)} options={options} /> : <span className="works-page__muted">Tip probă istoric: {cycle.probeTypeNameSnapshot}</span>}
          </div>
          );
        })}
      </CardContent> : null}
    </Card>
  );
}

function getProbeTypeCounts(cycles: readonly ProbeCycleView[]): ReadonlyMap<string, { readonly count: number; readonly name: string }> {
  const counts = new Map<string, { count: number; name: string }>();
  for (const cycle of cycles) {
    const types = cycle.probeTypes?.length ? cycle.probeTypes : [cycle.probeType];
    for (const type of types) {
      const existing = counts.get(type.id);
      counts.set(type.id, { count: (existing?.count ?? 0) + 1, name: type.name });
    }
  }
  return counts;
}

function ProbeTypeMultiSelect({ canSelect, cycle, disabled, onSave, options }: { readonly canSelect: boolean; readonly cycle: import("@dental-lab/shared").ProbeCycleView; readonly disabled: boolean; readonly onSave: (ids: readonly string[]) => void; readonly options: readonly import("@dental-lab/shared").ProbeTypeView[] }): ReactNode {
  const currentIds = cycle.probeTypes?.map((type) => type.id) ?? [cycle.probeType.id];
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(currentIds);
  useEffect(() => setSelectedIds(currentIds), [cycle.id, cycle.probeTypeNameSnapshot]);
  return <fieldset className="works-page__probe-type-options" disabled={!canSelect || disabled}><legend>Tipuri probă</legend><div className="works-page__probe-type-grid">{options.map((type) => { const active = selectedIds.includes(type.id); return <button aria-pressed={active} className={`works-page__probe-type-card${active ? " works-page__probe-type-card--active" : ""}`} key={type.id} onClick={() => setSelectedIds((current) => current.includes(type.id) ? (current.length === 1 ? current : current.filter((id) => id !== type.id)) : [...current, type.id])} type="button">{type.name}</button>; })}</div><Button disabled={selectedIds.length === 0 || !canSelect || disabled} onClick={() => onSave(selectedIds)} size="small" type="button">Salvează tipurile probei</Button></fieldset>;
}

function WorkCyclesSection({
  canCreateNextCycle,
  error,
  history,
  isLoading,
  onRegisterReturn,
  isCanonical,
  work,
}: {
  readonly canCreateNextCycle: boolean;
  readonly error: unknown;
  readonly history: WorkCyclesHistory | undefined;
  readonly isLoading: boolean;
  readonly onRegisterReturn: () => void;
  readonly isCanonical?: boolean;
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
          {canCreateNextCycle ? <Button onClick={onRegisterReturn}>{isCanonical ? "Începe proba" : "Înregistrează proba"}</Button> : null}
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
                  <MetricCell label="Cabinet" value={cycle.clinic ? `${cycle.clinic.code} · ${cycle.clinic.name}` : "-"} />
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

function ExecutionNowCard({ activeCycleNumber, canEditDeadline, showLegacyExecution, work }: { readonly activeCycleNumber: number | null; readonly canEditDeadline: boolean; readonly showLegacyExecution: boolean; readonly work: import("@dental-lab/shared").WorkDetail }): ReactNode {
  const currentStage = work.workflow?.currentStage ?? null;
  const progress = work.workflow ? `${work.workflow.progress.completed}/${work.workflow.progress.total}` : "0/0";
  const currentTechnician = work.executionSnapshot.currentTechnician ?? work.claim.technician;
  const executionCompany = work.executionSnapshot.summary.legalEntity?.code ?? work.claim.executionLegalEntity?.code ?? "Nefixată";
  const currentCycleLabel = activeCycleNumber ? `Ciclul ${activeCycleNumber}` : "Fără ciclu activ";
  const workTypeSymbols = getWorkTypeSymbols(work);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const deadlineMutation = useSetManualWorkDeadline();
  const activeProbeDeadlineMutation = useUpdateActiveProbeDeadline();
  const initialDeadline = toLocalDateTimeInput(work.deadline.effectiveDueAt, work.requestedDeliveryDate, work.deadline.timeSet);
  const [deadlineDate, setDeadlineDate] = useState(initialDeadline.slice(0, 10));
  const [deadlineTime, setDeadlineTime] = useState(work.deadline.timeSet ? initialDeadline.slice(11, 16) : "");
  useEffect(() => {
    const next = toLocalDateTimeInput(work.deadline.effectiveDueAt, work.requestedDeliveryDate, work.deadline.timeSet);
    setDeadlineDate(next.slice(0, 10));
    setDeadlineTime(work.deadline.timeSet ? next.slice(11, 16) : "");
    setEditingDeadline(false);
  }, [work.deadline.effectiveDueAt, work.deadline.timeSet, work.requestedDeliveryDate]);

  return (
    <Card>
      <CardHeader>
        <div className="works-page__detail-section-header">
          <div><CardTitle className="works-page__section-title">Detalii</CardTitle></div>
        </div>
      </CardHeader>
      <CardContent className="works-page__execution-now">
        <div className="works-page__execution-now-grid">
          <MetricCell label="Clinică / Medic" value={`${work.clinic?.name ?? "Fără clinică"} · ${work.doctor?.displayName ?? "Fără medic"}`} />
          <MetricCell label="Pacient" value={work.patient?.fullName ?? work.patientName} />
          <MetricCell label="Tip lucrare" value={workTypeSymbols} />
          <MetricCell label="Urgență" value={work.urgency ? urgencyLabel(work.urgency) : (work.priority === "URGENT" ? "Urgent" : "Normal")} />
          <MetricCell label="Firmă" value={executionCompany} />
          <MetricCell label="Start execuție" value={formatOptionalDateTime(work.executionSnapshot.deadline?.startAt ?? work.deadline.startAt)} />
          <MetricCell label="Status" value={toWorkOperationalLabel(work).label} />
          <div className="works-page__detail-field"><span>Termen {canEditDeadline ? <button aria-label="Editează termenul" className="works-page__inline-icon-button" onClick={() => setEditingDeadline((value) => !value)} type="button">✎</button> : null}</span><strong>{formatOptionalDateTime(work.executionSnapshot.deadline?.effectiveDueAt ?? work.deadline.effectiveDueAt)}</strong>{!work.deadline.timeSet && work.deadline.effectiveDueAt ? <small>Ora nesetată</small> : null}{editingDeadline ? <div className="works-page__inline-deadline-editor"><input aria-label="Data termenului" className="dl-control" onChange={(event) => setDeadlineDate(event.target.value)} type="date" value={deadlineDate} /><input aria-label="Ora termenului" className="dl-control" onChange={(event) => setDeadlineTime(event.target.value)} type="time" value={deadlineTime} /><Button disabled={!deadlineDate || deadlineMutation.isPending || activeProbeDeadlineMutation.isPending} isLoading={deadlineMutation.isPending || activeProbeDeadlineMutation.isPending} onClick={() => { const dueAt = toBucharestIso(deadlineDate, deadlineTime); if (work.activeProbeCycle) { activeProbeDeadlineMutation.mutate({ cycleId: work.activeProbeCycle.id, deadlineAt: dueAt, workOrderId: work.id }, { onSuccess: () => setEditingDeadline(false) }); } else { deadlineMutation.mutate({ dueAt, expectedRevision: work.deadline.revision, manualDueTimeSet: deadlineTime !== "", workOrderId: work.id }, { onSuccess: () => setEditingDeadline(false) }); } }} size="small" type="button">Salvează</Button></div> : null}</div>
          {showLegacyExecution ? <MetricCell label="Tehnician" value={currentTechnician?.displayName ?? "Nerevendicată"} /> : null}
          {showLegacyExecution ? <MetricCell label="Ciclu curent" value={currentCycleLabel} /> : null}
          {showLegacyExecution ? <MetricCell label="Etapă curentă" value={currentStage?.name ?? "Fără etapă curentă"} /> : null}
          {showLegacyExecution ? <MetricCell label="Poziție etapă" value={currentStage ? `Etapa ${currentStage.sortOrder} din ${work.workflow?.progress.total ?? 0}` : "N/A"} /> : null}
          {showLegacyExecution ? <MetricCell label="Status etapă" value={currentStage ? getWorkStageExecutionStatusLabel(currentStage.status) : "Nedefinit"} /> : null}
          {showLegacyExecution ? <MetricCell label="Progres" value={progress} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function getWorkTypeSymbols(work: import("@dental-lab/shared").WorkDetail): string {
  const types = new Map<string, string>();
  for (const item of work.items ?? []) {
    const name = item.workType?.name ?? snapshotText(item.customWorkTypeSnapshot);
    if (!name) continue;
    const symbol = item.workType ? displayWorkTypeSymbolOrName(item.workType.name) : null;
    types.set(item.workTypeId ?? `custom:${name}`, symbol || name);
  }
  return [...types.values()].join(" · ") || displayWorkTypeSymbolOrName(work.workType.name) || "—";
}

function snapshotText(snapshot: Readonly<Record<string, unknown>> | null | undefined): string | null {
  if (!snapshot) return null;
  for (const key of ["value", "name", "label", "displayName", "text"]) {
    const value = snapshot[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
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

function CanonicalReceiveProbeModal({
  isLoading,
  isOpen,
  onOpenChange,
  onSubmit,
  probeTypes,
  work,
}: {
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (input: { readonly deadlineAt: string; readonly probeTypeIds: readonly string[] }) => void;
  readonly probeTypes: readonly import("@dental-lab/shared").ProbeTypeView[];
  readonly work: import("@dental-lab/shared").WorkDetail;
}): ReactNode {
  const [probeTypeIds, setProbeTypeIds] = useState<readonly string[]>([]);
  const [deadlineAt, setDeadlineAt] = useState("");
  const configuredCodes = work.items?.flatMap((item) => item.workType?.probeTypeCodes ?? []) ?? [];
  const selectableProbeTypes = configuredCodes.length > 0
    ? probeTypes.filter((type) => typeof type.code === "string" && configuredCodes.includes(type.code))
    : probeTypes;
  const completedProbeCounts = getProbeTypeCounts(work.completedProbeCycles ?? []);
  const completedProbeSummary = [...completedProbeCounts.values()]
    .map(({ count, name }) => `${name} · ${count}x`)
    .join(" · ");
  useEffect(() => {
    if (isOpen) {
      setProbeTypeIds(selectableProbeTypes[0]?.id ? [selectableProbeTypes[0].id] : []);
      setDeadlineAt("");
    }
  }, [isOpen, selectableProbeTypes]);
  const canSubmit = probeTypeIds.length > 0 && deadlineAt !== "";
  return <Modal
    description={`${work.code} · ultima probă a fost marcată gata; aceeași lucrare continuă.`}
    footer={<Button disabled={!canSubmit} isLoading={isLoading} onClick={() => onSubmit({ deadlineAt: new Date(deadlineAt).toISOString(), probeTypeIds })}>Recepționează și începe proba</Button>}
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    title="Recepționată"
  >
    <FormLayout>
      <p className="works-page__muted">Ultima probă finalizată rămâne în istoric. Alege tipul și termenul explicit pentru următoarea probă.</p>
      {completedProbeSummary ? <div className="works-page__probe-history"><strong>Probe efectuate anterior</strong><span>{completedProbeSummary}</span></div> : null}
      <fieldset className="works-page__probe-type-options"><legend>Tipuri probă nouă</legend><div className="works-page__probe-type-grid">{selectableProbeTypes.map((type) => { const active = probeTypeIds.includes(type.id); return <button aria-pressed={active} className={`works-page__probe-type-card${active ? " works-page__probe-type-card--active" : ""}`} key={type.id} onClick={() => setProbeTypeIds((current) => current.includes(type.id) ? current.filter((id) => id !== type.id) : [...current, type.id])} type="button">{type.name}</button>; })}</div></fieldset>
      <label className="works-page__detail-field"><span>Termen nou</span><input aria-label="Termen probă nouă" className="dl-control" onChange={(event) => setDeadlineAt(event.target.value)} type="datetime-local" value={deadlineAt} required /></label>
    </FormLayout>
  </Modal>;
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
    enabled: isOpen,
    queryFn: () => fetchDoctorOptions(clinicId || undefined),
    queryKey: ["doctors", "options", "return-work", clinicId],
    retry: false,
  });
  const isOther = reason === "OTHER";
  const trimmedNotes = notes.trim();
  const notesError = submitted && isOther && trimmedNotes.length < 3 ? "Notele sunt obligatorii pentru Alt motiv." : undefined;
  const canSubmit = (!isOther || trimmedNotes.length >= 3) && Boolean(history?.activeCycleId);

  useEffect(() => {
    if (isOpen && work) {
      setClinicId(activeCycle?.clinic?.id ?? work.clinic?.id ?? "");
      setDoctorId(activeCycle?.doctor?.id ?? work.doctor?.id ?? "");
      setReason("PROBA");
      setNotes("");
      setSubmitted(false);
    }
  }, [activeCycle?.clinic?.id, activeCycle?.doctor?.id, isOpen, work]);

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
      description={work ? `${work.code} · se păstrează aceeași lucrare și același cod.` : "Înregistrează o probă nouă pentru aceeași lucrare."}
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
          Înregistrează proba
        </Button>
      )}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Înregistrează proba"
    >
      <FormLayout>
        {submitError ? <ErrorState title="Proba nu a fost înregistrată" description={getErrorMessage(submitError)} /> : null}
        <div className="works-page__return-summary">
          <MetricCell label="Cod lucrare" value={work?.code ?? "-"} />
          <MetricCell label="Pacient" value={work?.patientName ?? "-"} />
          <MetricCell label="Ciclu curent" value={activeCycle ? `Ciclul ${activeCycle.cycleNumber}` : "Nedisponibil"} />
        </div>
        <FormGrid>
          <Select
            label="Cabinet"
            onChange={(event) => {
              setClinicId(event.target.value);
              setDoctorId("");
            }}
            options={clinicOptions.map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
            placeholder="Alege cabinet"
            value={clinicId}
          />
          <Select
            disabled={doctorsQuery.isLoading}
            label="Medic"
            onChange={(event) => setDoctorId(event.target.value)}
            options={(doctorsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
            placeholder="Alege medic"
            value={doctorId}
          />
          <Select
            label="Motiv probă"
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
  clinicId,
  doctorId,
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly clinicId: string;
  readonly doctorId: string;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: PatientFormValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<PatientFormValues>({
    defaultValues: { ...quickPatientDefaults, clinicId: clinicId || null, doctorId: doctorId || null },
    resolver: zodResolver(patientFormSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0 ? getFormErrorSummaryItems(form.formState.errors, quickPatientLabels) : [];

  useEffect(() => {
    if (!isOpen) {
      form.reset({ ...quickPatientDefaults, clinicId: clinicId || null, doctorId: doctorId || null });
    }
  }, [clinicId, doctorId, form, isOpen]);

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

const quickClinicSchema = z.object({
  legalEntityCode: z.union([z.enum(["CDT", "NG"]), z.literal("")]),
  name: z.string().trim().min(2, "Numele clinicii este obligatoriu."),
});
type QuickClinicValues = {
  readonly legalEntityCode: "CDT" | "NG" | "";
  readonly name: string;
};

function QuickClinicModal({
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: QuickClinicValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<QuickClinicValues>({ defaultValues: { legalEntityCode: "", name: "" }, resolver: zodResolver(quickClinicSchema) });
  useEffect(() => { if (!isOpen) form.reset({ legalEntityCode: "", name: "" }); }, [form, isOpen]);
  useEffect(() => { if (submitError) applyApiErrorsToForm(form, submitError); }, [form, submitError]);
  return <Modal description="Creează clinica și păstrează datele lucrării în formular." footer={<FormActions formId="quick-clinic-form" isSubmitting={isSaving} submitLabel="Creează clinica" />} isOpen={isOpen} onOpenChange={onOpenChange} title="Clinică nouă">
    <FormLayout id="quick-clinic-form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values))(event)}>
      <FormGrid>
        <TextInput error={form.formState.errors.name?.message} id="quickClinicName" label="Nume clinică" required {...form.register("name")} />
        <Select error={form.formState.errors.legalEntityCode?.message} id="quickClinicLegalEntity" label="Colaborare laborator (opțional)" options={[{ label: "CDT", value: "CDT" }, { label: "NG", value: "NG" }]} placeholder="Poate fi configurată ulterior de Manager" {...form.register("legalEntityCode")} />
      </FormGrid>
    </FormLayout>
  </Modal>;
}

const quickDoctorSchema = z.object({
  clinicId: z.string().min(1, "Alege clinica."),
  firstName: z.string().trim().min(2, "Prenumele este obligatoriu."),
  lastName: z.string().trim().min(2, "Numele este obligatoriu."),
});
type QuickDoctorValues = z.infer<typeof quickDoctorSchema>;

function QuickDoctorModal({
  clinicId,
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly clinicId: string;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: QuickDoctorValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<QuickDoctorValues>({ defaultValues: { clinicId, firstName: "", lastName: "" }, resolver: zodResolver(quickDoctorSchema) });
  useEffect(() => { form.setValue("clinicId", clinicId); }, [clinicId, form]);
  useEffect(() => { if (!isOpen) form.reset({ clinicId, firstName: "", lastName: "" }); }, [clinicId, form, isOpen]);
  useEffect(() => { if (submitError) applyApiErrorsToForm(form, submitError); }, [form, submitError]);
  return <Modal description="Entitatea juridică este preluată automat din clinica selectată." footer={<FormActions formId="quick-doctor-form" isSubmitting={isSaving} submitLabel="Creează medicul" />} isOpen={isOpen} onOpenChange={onOpenChange} title="Medic nou">
    <FormLayout id="quick-doctor-form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values))(event)}>
      <FormGrid>
        <TextInput error={form.formState.errors.firstName?.message} id="quickDoctorFirstName" label="Prenume" required {...form.register("firstName")} />
        <TextInput error={form.formState.errors.lastName?.message} id="quickDoctorLastName" label="Nume" required {...form.register("lastName")} />
      </FormGrid>
    </FormLayout>
  </Modal>;
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
