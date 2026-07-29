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
import { formatMoneyMinor, getWorkflowExecutionStatusLabel, type CreateWorkInput, type PatientOption, type UpdateWorkInput, type WorkFormTemplateDetail, type WorkSortField, type WorkSummary, type WorksListParams } from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { useCreatePatient, usePatientOptions } from "../patients/patients-api.js";
import { patientFormSchema, type PatientFormValues } from "../patients/patients-page.schema.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { useActiveWorkFormTemplate } from "../work-forms/work-form-templates-api.js";
import { WorkForm, WorkFormActions, defaultWorkFormValues, toWorkFormValues } from "./work-form.js";
import { WorkFormReadOnlyView } from "./work-dynamic-form.js";
import { WorkWorkflowSection } from "./work-workflow-section.js";
import { useCreateWork, useUpdateWork, useWork, useWorkFormWorkTypeOptions, useWorks } from "./works-api.js";
import { workFormSchema, type WorkFormValues } from "./works-page.schema.js";
import { WorkQrModal } from "./work-qr-modal.js";
import { applyApiErrorsToForm, getErrorMessage, getFormErrorSummaryItems, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard, useErrorSummaryFocus } from "../../lib/form-utils.js";
import "./works-page.css";

const pageSize = 20;

const defaultListParams: WorksListParams = {
  clinicId: undefined,
  dateFrom: undefined,
  dateTo: undefined,
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

function formatPrice(value: number | null, currency: string, locale: string): string {
  return value === null ? "Restricționat" : formatMoneyMinor(value, currency, locale);
}

function hasMeaningfulDynamicValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
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
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrWorkId, setQrWorkId] = useState<string | null>(null);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "works.read_all");
  const canCreate = hasPermission(permissionsQuery.data, "works.create");
  const canUpdate = hasPermission(permissionsQuery.data, "works.update");
  const canReadPricing = hasPermission(permissionsQuery.data, "pricing.read");
  const canDownloadInvoices = hasPermission(permissionsQuery.data, "invoice.download");
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
  const settingsQuery = useSettings(canReadPricing);
  const createMutation = useCreateWork();
  const updateMutation = useUpdateWork();
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
    { header: "Cod", id: "code", isSortable: true, renderCell: (work) => <strong>{work.code}</strong> },
    {
      header: "Pacient",
      id: "patientName",
      renderCell: (work) => (
        <div>
          <strong>{work.patientName}</strong>
          <div className="works-page__muted">{work.patientReference ?? "Fără identificator"}</div>
        </div>
      ),
    },
    { header: "Cabinet", id: "clinic", renderCell: (work) => work.clinic.name },
    { header: "Medic", id: "doctor", renderCell: (work) => work.doctor.displayName },
    { header: "Tip", id: "workType", renderCell: (work) => work.workType.name },
    {
      header: "Flux",
      id: "workflow",
      renderCell: (work) => work.workflow
        ? (
            <div>
              <strong>{work.workflow.currentStageName ?? getWorkflowExecutionStatusLabel(work.workflow.status ?? "COMPLETED")}</strong>
              <div className="works-page__muted">{work.workflow.progressCompleted}/{work.workflow.progressTotal} etape</div>
            </div>
          )
        : "Fără flux",
    },
    {
      header: "Prioritate",
      id: "priority",
      isSortable: true,
      renderCell: (work) => <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />,
    },
    {
      header: "Status",
      id: "status",
      isSortable: true,
      renderCell: () => <StatusBadge label="Înregistrată" variant="registered" />,
    },
    {
      header: "Facturare",
      id: "billing",
      renderCell: (work) => work.invoicedDocumentId
        ? canDownloadInvoices
          ? <Link to={`/billing/documents/${work.invoicedDocumentId}/print`}>Vezi factura</Link>
          : "Facturat"
        : "Nefacturat",
    },
    {
      align: "right",
      header: "Total",
      id: "totalPriceMinor",
      isSortable: true,
      renderCell: (work) => formatPrice(work.totalPriceMinor, work.currency ?? currency, locale),
    },
    {
      header: "Termen",
      id: "requestedDeliveryDate",
      isSortable: true,
      renderCell: (work) => formatDate(work.requestedDeliveryDate),
    },
  ], [canDownloadInvoices, currency, locale]);

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
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea works.read_all." /></PageState>;
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

        <Card>
          <CardHeader>
            <CardTitle>Registru lucrări</CardTitle>
            <CardDescription>Total: {worksQuery.data?.total ?? 0}</CardDescription>
          </CardHeader>
          <CardContent className="works-page__table-card">
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
            </div>
            <DataTable
              columns={columns}
              emptyMessage="Nu există lucrări pentru filtrele curente."
              error={worksQuery.isError ? getErrorMessage(worksQuery.error) : undefined}
              getRowKey={(work) => work.id}
              isLoading={worksQuery.isLoading}
              onRowAction={(work) => setSelectedWorkId(work.id)}
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
              rowActionLabel="Deschide"
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
        pricingWorkTypeOptions={pricingWorkTypeOptionsQuery.data ?? []}
        isSaving={createMutation.isPending}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        submitError={createMutation.error}
        currency={currency}
        locale={locale}
      />

      <WorkDetailsDrawer
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

function CreateWorkModal({
  clinicOptions,
  formWorkTypeOptions,
  currency,
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
  const selectedWorkTypeId = form.watch("workTypeId");
  const quantity = form.watch("quantity");
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

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultWorkFormValues);
    }
  }, [form, isOpen]);

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
          workTypeOptions={formWorkTypeOptions}
          patientOptions={patientOptionsQuery.data ?? []}
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
  const [isPatientCreateOpen, setPatientCreateOpen] = useState(false);
  const form = useForm<WorkFormValues>({
    defaultValues: toWorkFormValues(work),
    resolver: zodResolver(workFormSchema),
  });
  const selectedClinicId = form.watch("clinicId");
  const selectedWorkTypeId = form.watch("workTypeId");
  const quantity = form.watch("quantity");
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
              <span>Termen: {formatDate(work.requestedDeliveryDate)}</span>
              {canReadPricing ? <span>Total: {formatPrice(work.totalPriceMinor, work.currency ?? currency, locale)}</span> : null}
            </div>
            <div className="works-page__actions">
              <Button onClick={() => onShowQr(work.id)} variant="outline">Vezi QR</Button>
            </div>
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
                name: work.workForm.templateName,
                status: "ACTIVE",
                updatedAt: work.workForm.updatedAt,
                updatedByUserId: null,
                version: work.workForm.templateVersion,
                workType: { code: work.workType.code, id: work.workType.id, isActive: true, name: work.workType.name },
                workTypeId: work.workType.id,
              } : null}
              totalPreview={canReadPricing ? totalPreview : null}
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
      {closeGuard.confirmModal}
    </>
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
  firstName: "",
  lastName: "",
  notes: null,
  sex: "UNSPECIFIED",
};

const quickPatientLabels: Record<keyof PatientFormValues, string> = {
  birthDate: "Data nașterii",
  firstName: "Prenume",
  lastName: "Nume",
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

function mergePatientOptions(options: readonly PatientOption[], selected: WorkSummary["patient"]): readonly PatientOption[] {
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
