import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Drawer,
  ErrorState,
  LoadingState,
  Modal,
  PriorityBadge,
  Select,
  StatusBadge,
  TextInput,
  useToast,
  type DataTableColumn,
  type DataTableSort,
} from "@dental-lab/ui";
import { formatMoneyMinor, type CreateWorkInput, type UpdateWorkInput, type WorkSortField, type WorkSummary, type WorksListParams } from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import { WorkForm, WorkFormActions, defaultWorkFormValues, toWorkFormValues } from "./work-form.js";
import { useCreateWork, useUpdateWork, useWork, useWorkFormWorkTypeOptions, useWorks } from "./works-api.js";
import { workFormSchema, type WorkFormValues } from "./works-page.schema.js";
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Actiunea a esuat.";
}

function toApiSort(direction: DataTableSort["direction"]): "asc" | "desc" {
  return direction === "ascending" ? "asc" : "desc";
}

function fromApiSort(field: string, direction: "asc" | "desc"): DataTableSort {
  return {
    columnId: field,
    direction: direction === "asc" ? "ascending" : "descending",
  };
}

function toMutationInput(values: WorkFormValues): CreateWorkInput {
  return {
    clinicId: values.clinicId,
    clinicalNotes: values.clinicalNotes,
    doctorId: values.doctorId,
    externalReference: values.externalReference,
    internalNotes: values.internalNotes,
    patientName: values.patientName,
    patientReference: values.patientReference,
    priority: values.priority,
    quantity: values.quantity,
    requestedDeliveryDate: values.requestedDeliveryDate,
    workTypeId: values.workTypeId,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function formatPrice(value: number | null, currency: string, locale: string): string {
  return value === null ? "Restrictionat" : formatMoneyMinor(value, currency, locale);
}

export function WorksPage(): ReactNode {
  const toast = useToast();
  const [params, setParams] = useState<WorksListParams>(defaultListParams);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "works.read_all");
  const canCreate = hasPermission(permissionsQuery.data, "works.create");
  const canUpdate = hasPermission(permissionsQuery.data, "works.update");
  const canReadPricing = hasPermission(permissionsQuery.data, "pricing.read");
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

  const columns = useMemo<readonly DataTableColumn<WorkSummary>[]>(() => [
    { header: "Cod", id: "code", isSortable: true, renderCell: (work) => <strong>{work.code}</strong> },
    {
      header: "Pacient",
      id: "patientName",
      renderCell: (work) => (
        <div>
          <strong>{work.patientName}</strong>
          <div className="works-page__muted">{work.patientReference ?? "Fara identificator"}</div>
        </div>
      ),
    },
    { header: "Cabinet", id: "clinic", renderCell: (work) => work.clinic.name },
    { header: "Medic", id: "doctor", renderCell: (work) => work.doctor.displayName },
    { header: "Tip", id: "workType", renderCell: (work) => work.workType.name },
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
      renderCell: () => <StatusBadge label="Inregistrata" variant="registered" />,
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
  ], [currency, locale]);

  function handleCreate(input: WorkFormValues): void {
    createMutation.mutate(toMutationInput(input), {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost creata", variant: "error" }),
      onSuccess: (work) => {
        setIsCreateOpen(false);
        setSelectedWorkId(work.id);
        toast.showToast({ durationMs: 3500, message: `Lucrare ${work.code} creata.`, variant: "success" });
      },
    });
  }

  function handleUpdate(input: WorkFormValues): void {
    const updateInput: UpdateWorkInput = toMutationInput(input);
    updateMutation.mutate({ input: updateInput, workOrderId: selectedWorkId ?? "" }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost salvata", variant: "error" }),
      onSuccess: (work) => {
        toast.showToast({ durationMs: 3500, message: `Lucrare ${work.code} actualizata.`, variant: "success" });
      },
    });
  }

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Incarc lucrarile" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea works.read_all." /></PageState>;
  }

  return (
    <main className="works-page">
      <section className="dl-container works-page__layout" aria-labelledby="works-title">
        <header className="works-page__header">
          <div>
            <h1 id="works-title">Lucrari</h1>
            <p>Receptia si urmarirea lucrarilor inregistrate in laborator.</p>
          </div>
          {canCreate ? <Button onClick={() => setIsCreateOpen(true)}>Adauga lucrare</Button> : null}
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Registru lucrari</CardTitle>
            <CardDescription>Total: {worksQuery.data?.total ?? 0}</CardDescription>
          </CardHeader>
          <CardContent className="works-page__table-card">
            <div className="works-page__filters">
              <TextInput
                label="Cautare"
                onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                placeholder="Cod, pacient, referinta"
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
                placeholder="Toti medicii"
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
              emptyMessage="Nu exista lucrari pentru filtrele curente."
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
        isSaving={createMutation.isPending}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
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
        pricingWorkTypeOptions={pricingWorkTypeOptionsQuery.data ?? []}
        work={selectedWork}
        workError={selectedWorkQuery.error}
        workTypeOptionsError={formWorkTypeOptionsQuery.error}
      />
    </main>
  );
}

function CreateWorkModal({
  clinicOptions,
  formWorkTypeOptions,
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  readonly clinicOptions: readonly { readonly code: string; readonly id: string; readonly name: string }[];
  readonly formWorkTypeOptions: readonly { readonly code: string; readonly id: string; readonly name: string; readonly unit: string }[];
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: WorkFormValues) => void;
}): ReactNode {
  const form = useForm<WorkFormValues>({
    defaultValues: defaultWorkFormValues,
    resolver: zodResolver(workFormSchema),
  });
  const selectedClinicId = form.watch("clinicId");
  const doctorsQuery = useQuery({
    enabled: isOpen && selectedClinicId !== "",
    queryFn: () => fetchDoctorOptions(selectedClinicId),
    queryKey: ["doctors", "options", "create-work", selectedClinicId],
    retry: false,
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultWorkFormValues);
    }
  }, [form, isOpen]);

  return (
    <Modal
      description="Completeaza datele minime pentru statusul REGISTERED."
      footer={<WorkFormActions canReset={form.formState.isDirty} formId="create-work-form" isSaving={isSaving} onReset={() => form.reset(defaultWorkFormValues)} submitLabel="Creeaza lucrare" />}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Lucrare noua"
    >
      <WorkForm
        clinicOptions={clinicOptions}
        doctorOptions={doctorsQuery.data ?? []}
        form={form}
        formId="create-work-form"
        isDisabled={isSaving}
        onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
        onSubmit={onSubmit}
        workTypeOptions={formWorkTypeOptions}
      />
    </Modal>
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
  onSubmit,
  pricingWorkTypeOptions,
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
  readonly onSubmit: (values: WorkFormValues) => void;
  readonly pricingWorkTypeOptions: readonly { readonly basePriceMinor: number; readonly id: string }[];
  readonly work: import("@dental-lab/shared").WorkDetail | undefined;
  readonly workError: unknown;
  readonly workTypeOptionsError: unknown;
}): ReactNode {
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
  const selectedPriceOption = pricingWorkTypeOptions.find((option) => option.id === selectedWorkTypeId);
  const totalPreview = selectedPriceOption && Number.isFinite(quantity)
    ? formatMoneyMinor(selectedPriceOption.basePriceMinor * quantity, currency, locale)
    : null;

  useEffect(() => {
    form.reset(toWorkFormValues(work));
  }, [form, work]);

  return (
    <Drawer
      description={work ? `${work.code} · ${work.status}` : "Detalii lucrare"}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Detalii lucrare"
    >
      {workError ? <ErrorState title="Lucrarea nu a fost incarcata" description={getErrorMessage(workError)} /> : null}
      {work ? (
        <div className="works-page__drawer">
          <div className="works-page__meta">
            <StatusBadge label="Inregistrata" variant="registered" />
            <PriorityBadge label={work.priority === "URGENT" ? "Urgent" : "Normal"} variant={work.priority === "URGENT" ? "urgent" : "normal"} />
            <span>Termen: {formatDate(work.requestedDeliveryDate)}</span>
            {canReadPricing ? <span>Total: {formatPrice(work.totalPriceMinor, work.currency ?? currency, locale)}</span> : null}
            {canReadPricing && totalPreview !== null ? <span>Preview: {totalPreview}</span> : null}
          </div>
          {workTypeOptionsError ? <ErrorState title="Optiunile nu au fost incarcate" description={getErrorMessage(workTypeOptionsError)} /> : null}
          <WorkForm
            clinicOptions={clinicOptions}
            doctorOptions={doctorsQuery.data ?? []}
            form={form}
            formId="update-work-form"
            isDisabled={!canUpdate || isSaving}
            onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
            onSubmit={onSubmit}
            workTypeOptions={formWorkTypeOptions}
          />
          <WorkFormActions
            canReset={form.formState.isDirty}
            formId="update-work-form"
            isSaving={isSaving}
            onReset={() => form.reset(toWorkFormValues(work))}
            submitLabel="Salveaza lucrarea"
          />
          {!canUpdate ? <p className="works-page__muted">Ai acces de citire, dar nu poti modifica lucrarea.</p> : null}
        </div>
      ) : !workError ? <LoadingState text="Incarc detaliile" /> : null}
    </Drawer>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="works-page">
      <section className="dl-container works-page__layout">{children}</section>
    </main>
  );
}
