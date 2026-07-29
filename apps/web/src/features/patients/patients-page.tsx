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
  FormLayout,
  LoadingState,
  Modal,
  Select,
  StatusBadge,
  TextInput,
  Textarea,
  useToast,
  type DataTableColumn,
  type DataTableSort,
} from "@dental-lab/ui";
import { formatPatientSex, type PatientDetail, type PatientSortField, type PatientSummary, type PatientsListParams, type SortDirection } from "@dental-lab/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { hasPermission } from "../users/users-api.js";
import { archivePatient, createPatient, fetchPatient, fetchPatients, patientsQueryKeys, restorePatient, updatePatient } from "./patients-api.js";
import { patientFormSchema, type PatientFormValues } from "./patients-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, getFormErrorSummaryItems, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard, useErrorSummaryFocus } from "../../lib/form-utils.js";
import "./patients-page.css";

const pageSize = 20;

const defaultParams: PatientsListParams = {
  activeOnly: true,
  clinicId: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  doctorId: undefined,
  hasActiveWorks: undefined,
  page: 1,
  pageSize,
  search: undefined,
  sortBy: "createdAt",
  sortDirection: "desc",
};

const defaultPatientValues: PatientFormValues = {
  birthDate: null,
  firstName: "",
  lastName: "",
  notes: null,
  sex: "UNSPECIFIED",
};

const patientFieldLabels: Record<keyof PatientFormValues, string> = {
  birthDate: "Data nașterii",
  firstName: "Prenume",
  lastName: "Nume",
  notes: "Note limitate",
  sex: "Sex",
};

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value)) : "-";
}

function toApiSort(direction: DataTableSort["direction"]): SortDirection {
  return direction === "ascending" ? "asc" : "desc";
}

function fromApiSort(field: string, direction: SortDirection): DataTableSort {
  return {
    columnId: field,
    direction: direction === "asc" ? "ascending" : "descending",
  };
}

function toPatientFormValues(patient: PatientDetail | undefined): PatientFormValues {
  if (!patient) {
    return defaultPatientValues;
  }

  return {
    birthDate: patient.overview.birthDate,
    firstName: patient.overview.firstName,
    lastName: patient.overview.lastName,
    notes: patient.overview.notes,
    sex: patient.overview.sex,
  };
}

export function PatientsPage(): ReactNode {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<PatientsListParams>(defaultParams);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const permissions = permissionsQuery.data;
  const canRead = hasPermission(permissions, "patients.read");
  const canCreate = hasPermission(permissions, "patients.create");
  const canUpdate = hasPermission(permissions, "patients.update");
  const canArchive = hasPermission(permissions, "patients.archive");
  const patientsQuery = useQuery({
    enabled: canRead,
    queryFn: () => fetchPatients(params),
    queryKey: patientsQueryKeys.list(params),
    retry: false,
  });
  const selectedPatientQuery = useQuery({
    enabled: canRead && selectedPatientId !== null,
    queryFn: () => fetchPatient(selectedPatientId ?? ""),
    queryKey: patientsQueryKeys.detail(selectedPatientId),
    retry: false,
  });
  const clinicOptionsQuery = useQuery({ enabled: canRead, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorOptionsQuery = useQuery({
    enabled: canRead && params.clinicId !== undefined,
    queryFn: () => fetchDoctorOptions(params.clinicId),
    queryKey: ["doctors", "options", "patients", params.clinicId],
    retry: false,
  });

  async function refreshPatients(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: patientsQueryKeys.all });
  }

  const createMutation = useMutation({
    mutationFn: createPatient,
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Pacientul nu a fost creat", variant: "error" }),
    onSuccess: async (patient) => {
      setCreateOpen(false);
      setSelectedPatientId(patient.overview.id);
      toast.showToast({ message: "Pacient creat.", variant: "success" });
      await refreshPatients();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (input: PatientFormValues) => updatePatient(selectedPatientId ?? "", input),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Pacientul nu a fost salvat", variant: "error" }),
    onSuccess: async () => {
      toast.showToast({ message: "Pacient actualizat.", variant: "success" });
      await refreshPatients();
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => archivePatient(selectedPatientId ?? ""),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Pacientul nu a fost arhivat", variant: "error" }),
    onSuccess: refreshPatients,
  });
  const restoreMutation = useMutation({
    mutationFn: () => restorePatient(selectedPatientId ?? ""),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Pacientul nu a fost restaurat", variant: "error" }),
    onSuccess: refreshPatients,
  });

  const columns = useMemo<readonly DataTableColumn<PatientSummary>[]>(() => [
    {
      header: "Pacient",
      id: "lastName",
      isSortable: true,
      renderCell: (patient) => (
        <div>
          <strong>{patient.fullName}</strong>
          <div className="patients-page__muted">{formatPatientSex(patient.sex)} · {patient.birthDate ? formatDate(patient.birthDate) : "Fără data nașterii"}</div>
        </div>
      ),
    },
    { header: "Lucrări", id: "totalWorks", isSortable: true, renderCell: (patient) => `${patient.totalWorks} total / ${patient.activeWorks} active` },
    { header: "Ultima lucrare", id: "lastWorkDate", isSortable: true, renderCell: (patient) => formatDate(patient.lastWorkDate) },
    { header: "Ultimul cabinet", id: "clinic", renderCell: (patient) => patient.lastClinic?.name ?? "-" },
    { header: "Ultimul medic", id: "doctor", renderCell: (patient) => patient.lastDoctor?.displayName ?? "-" },
    { header: "Status", id: "isArchived", renderCell: (patient) => <StatusBadge label={patient.isArchived ? "Arhivat" : "Activ"} variant={patient.isArchived ? "rejected" : "approved"} /> },
  ], []);

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Se încarcă pacienții" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea patients.read." /></PageState>;
  }

  return (
    <main className="patients-page">
      <section className="dl-container patients-page__layout" aria-labelledby="patients-title">
        <header className="patients-page__header">
          <div>
            <h1 id="patients-title">Pacienți</h1>
            <p>Registru operațional fără cod pacient și fără date personale inutile.</p>
          </div>
          {canCreate ? <Button onClick={() => setCreateOpen(true)}>Adaugă pacient</Button> : null}
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Registru pacienți</CardTitle>
            <CardDescription>Total: {patientsQuery.data?.total ?? 0}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="patients-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                placeholder="Nume, prenume sau cod lucrare"
                type="search"
                value={params.search ?? ""}
              />
              <Select
                label="Status"
                onChange={(event) => setParams((current) => ({ ...current, activeOnly: event.target.value === "active" ? true : event.target.value === "all" ? false : true, page: 1 }))}
                options={[{ label: "Activi", value: "active" }, { label: "Toți", value: "all" }]}
                value={params.activeOnly === false ? "all" : "active"}
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
            </div>
            <DataTable
              columns={columns}
              emptyMessage="Nu există pacienți pentru filtrele curente."
              error={patientsQuery.isError ? getErrorMessage(patientsQuery.error) : undefined}
              getRowKey={(patient) => patient.id}
              isLoading={patientsQuery.isLoading}
              onRowAction={(patient) => setSelectedPatientId(patient.id)}
              onSortChange={(sort) => setParams((current) => ({
                ...current,
                page: 1,
                sortBy: sort.columnId as PatientSortField,
                sortDirection: toApiSort(sort.direction),
              }))}
              pagination={{
                onPageChange: (page) => setParams((current) => ({ ...current, page })),
                page: patientsQuery.data?.page ?? params.page,
                pageCount: patientsQuery.data?.pageCount ?? 1,
              }}
              rowActionLabel="Deschide dosar"
              rows={patientsQuery.data?.items ?? []}
              sort={fromApiSort(params.sortBy, params.sortDirection)}
            />
          </CardContent>
        </Card>
      </section>

      <PatientFormModal
        isOpen={isCreateOpen}
        isSaving={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => createMutation.mutate(values)}
        submitError={createMutation.error}
        title="Pacient nou"
      />
      <PatientDrawer
        canArchive={canArchive}
        canUpdate={canUpdate}
        isOpen={selectedPatientId !== null}
        isSaving={updateMutation.isPending || archiveMutation.isPending || restoreMutation.isPending}
        onArchive={() => archiveMutation.mutate()}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedPatientId(null);
          }
        }}
        onRestore={() => restoreMutation.mutate()}
        onSubmit={(values) => updateMutation.mutate(values)}
        patient={selectedPatientQuery.data}
        patientError={selectedPatientQuery.error}
        submitError={updateMutation.error}
      />
    </main>
  );
}

function PatientFormModal({
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  patient,
  submitError,
  title,
}: {
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: PatientFormValues) => void;
  readonly patient?: PatientDetail;
  readonly submitError: unknown;
  readonly title: string;
}): ReactNode {
  const form = useForm<PatientFormValues>({
    defaultValues: toPatientFormValues(patient),
    resolver: zodResolver(patientFormSchema),
  });
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0 ? getFormErrorSummaryItems(form.formState.errors, patientFieldLabels) : [];

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSaving);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSaving} />
      <Modal
        footer={<FormActions formId="patient-form" isSubmitting={isSaving} submitLabel="Salvează" />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title={title}
      >
        <FormLayout id="patient-form" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
          <FormErrorSummary errors={summaryItems} ref={summaryRef} />
          <div className="patients-page__form-grid">
            <TextInput error={form.formState.errors.firstName?.message} id="firstName" label="Prenume" required {...form.register("firstName")} />
            <TextInput error={form.formState.errors.lastName?.message} id="lastName" label="Nume" required {...form.register("lastName")} />
            <DateInput error={form.formState.errors.birthDate?.message} id="birthDate" label="Data nașterii" {...form.register("birthDate")} />
            <Select
              error={form.formState.errors.sex?.message}
              id="sex"
              label="Sex"
              options={[
                { label: "Nespecificat", value: "UNSPECIFIED" },
                { label: "Feminin", value: "FEMALE" },
                { label: "Masculin", value: "MALE" },
              ]}
              {...form.register("sex")}
            />
          </div>
          <Textarea error={form.formState.errors.notes?.message} id="notes" label="Note limitate" rows={4} {...form.register("notes")} />
        </FormLayout>
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}

function PatientDrawer({
  canArchive,
  canUpdate,
  isOpen,
  isSaving,
  onArchive,
  onOpenChange,
  onRestore,
  onSubmit,
  patient,
  patientError,
  submitError,
}: {
  readonly canArchive: boolean;
  readonly canUpdate: boolean;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onArchive: () => void;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onRestore: () => void;
  readonly onSubmit: (values: PatientFormValues) => void;
  readonly patient: PatientDetail | undefined;
  readonly patientError: unknown;
  readonly submitError: unknown;
}): ReactNode {
  const [tab, setTab] = useState<"documents" | "overview" | "relationships" | "timeline" | "works">("overview");

  return (
    <Drawer description={patient?.overview.fullName ?? "Dosar pacient"} isOpen={isOpen} onOpenChange={onOpenChange} title="Dosar pacient">
      {patientError ? <ErrorState title="Pacientul nu a fost încărcat" description={getErrorMessage(patientError)} /> : null}
      {patient ? (
        <div className="patients-page__tab-panel">
          <div className="patients-page__drawer-header">
            <div>
              <h2>{patient.overview.fullName}</h2>
              <p className="patients-page__muted">{formatPatientSex(patient.overview.sex)} · creat {formatDate(patient.overview.createdAt)}</p>
            </div>
            {canArchive ? (
              patient.overview.isArchived
                ? <Button disabled={isSaving} onClick={onRestore} variant="secondary">Restaurează</Button>
                : <Button disabled={isSaving} onClick={onArchive} variant="danger">Arhivează</Button>
            ) : null}
          </div>
          <div className="patients-page__tabs" role="tablist">
            {[
              ["overview", "Prezentare"],
              ["works", "Lucrări"],
              ["relationships", "Medici și clinici"],
              ["documents", "Documente"],
              ["timeline", "Istoric"],
            ].map(([value, label]) => (
              <Button aria-selected={tab === value} key={value} onClick={() => setTab(value as typeof tab)} type="button" variant="secondary">{label}</Button>
            ))}
          </div>
          {tab === "overview" ? (
            <div className="patients-page__tab-panel">
              <div className="patients-page__stats">
                <Stat label="Lucrări totale" value={patient.overview.totalWorks} />
                <Stat label="Lucrări active" value={patient.overview.activeWorks} />
                <Stat label="Ultima lucrare" value={formatDate(patient.overview.lastWorkDate)} />
              </div>
              {canUpdate ? (
                <PatientInlineForm
                  isSaving={isSaving}
                  onSubmit={onSubmit}
                  patient={patient}
                  submitError={submitError}
                />
              ) : null}
            </div>
          ) : null}
          {tab === "works" ? (
            <ListPanel items={patient.works.map((work) => `${work.code} · ${work.workType.name} · ${work.clinic.name} · ${formatDate(work.createdAt)}`)} empty="Nu există lucrări." />
          ) : null}
          {tab === "relationships" ? (
            <ListPanel items={patient.relationships.map((entry) => `${entry.clinic.name}: ${entry.totalWorks} lucrări, ${entry.doctors.map((doctor) => doctor.displayName).join(", ")}`)} empty="Nu există relații derivate." />
          ) : null}
          {tab === "documents" ? (
            <ListPanel
              items={patient.documents.map((document) => document.route ? `${document.label} ${document.documentNumber ?? ""} · ${document.workCode ?? ""}` : `${document.label} · indisponibil`)}
              empty="Nu există documente generate pentru acest pacient."
              renderItem={(text, index) => {
                const document = patient.documents[index];
                return document?.route ? <Link to={document.route}>{text}</Link> : text;
              }}
            />
          ) : null}
          {tab === "timeline" ? (
            <ListPanel items={patient.timeline.map((event) => `${formatDate(event.createdAt)} · ${event.title} · ${event.description}`)} empty="Nu există evenimente." />
          ) : null}
        </div>
      ) : <LoadingState text="Se încarcă dosarul" />}
    </Drawer>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number | string }): ReactNode {
  return (
    <div className="patients-page__stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PatientInlineForm({
  isSaving,
  onSubmit,
  patient,
  submitError,
}: {
  readonly isSaving: boolean;
  readonly onSubmit: (values: PatientFormValues) => void;
  readonly patient: PatientDetail;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<PatientFormValues>({
    defaultValues: toPatientFormValues(patient),
    resolver: zodResolver(patientFormSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0 ? getFormErrorSummaryItems(form.formState.errors, patientFieldLabels) : [];

  useEffect(() => {
    form.reset(toPatientFormValues(patient));
  }, [form, patient]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  return (
    <FormLayout id="patient-inline-form" onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormErrorSummary errors={summaryItems} ref={summaryRef} />
      <div className="patients-page__form-grid">
        <TextInput error={form.formState.errors.firstName?.message} id="inlineFirstName" label="Prenume" required {...form.register("firstName")} />
        <TextInput error={form.formState.errors.lastName?.message} id="inlineLastName" label="Nume" required {...form.register("lastName")} />
        <DateInput error={form.formState.errors.birthDate?.message} id="inlineBirthDate" label="Data nașterii" {...form.register("birthDate")} />
        <Select
          error={form.formState.errors.sex?.message}
          id="inlineSex"
          label="Sex"
          options={[
            { label: "Nespecificat", value: "UNSPECIFIED" },
            { label: "Feminin", value: "FEMALE" },
            { label: "Masculin", value: "MALE" },
          ]}
          {...form.register("sex")}
        />
      </div>
      <Textarea error={form.formState.errors.notes?.message} id="inlineNotes" label="Note limitate" rows={4} {...form.register("notes")} />
      <FormActions formId="patient-inline-form" isSubmitting={isSaving} submitLabel="Salvează pacient" />
    </FormLayout>
  );
}

function ListPanel({
  empty,
  items,
  renderItem,
}: {
  readonly empty: string;
  readonly items: readonly string[];
  readonly renderItem?: (item: string, index: number) => ReactNode;
}): ReactNode {
  return items.length === 0 ? <p className="patients-page__muted">{empty}</p> : (
    <ul className="patients-page__timeline">
      {items.map((item, index) => <li key={`${item}-${index}`}>{renderItem ? renderItem(item, index) : item}</li>)}
    </ul>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="patients-page"><section className="dl-container patients-page__layout">{children}</section></main>;
}
