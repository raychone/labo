import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmActionModal,
  DataTable,
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
import type {
  ClinicDetail,
  ClinicOption,
  ClinicSummary,
  ClinicSortField,
  ClinicsListParams,
  CreateClinicInput,
  CreateDoctorInput,
  DoctorDetail,
  DoctorOption,
  DoctorSummary,
  DoctorSortField,
  DoctorsListParams,
  SortDirection,
  UpdateClinicInput,
  UpdateDoctorInput,
} from "@dental-lab/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import {
  archiveClinic,
  archiveDoctor,
  createClinic,
  createDoctor,
  fetchClinic,
  fetchClinicOptions,
  fetchClinics,
  fetchDoctor,
  fetchDoctorOptions,
  fetchDoctors,
  restoreClinic,
  restoreDoctor,
  updateClinic,
  updateDoctor,
} from "./clinics-api.js";
import { clinicFormSchema, doctorFormSchema, type ClinicFormValues, type DoctorFormValues } from "./clinics-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, getFormErrorSummaryItems, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard, useErrorSummaryFocus } from "../../lib/form-utils.js";
import "./clinics-page.css";

const statusOptions = [
  { label: "Toate", value: "all" },
  { label: "Active", value: "active" },
  { label: "Arhivate", value: "archived" },
] as const;

const defaultClinicValues: ClinicFormValues = {
  addressLine1: null,
  addressLine2: null,
  billingAddressLine1: null,
  billingAddressLine2: null,
  billingCity: null,
  billingCountryCode: "RO",
  billingCountyOrRegion: null,
  billingName: null,
  billingPostalCode: null,
  billingRegistrationNumber: null,
  billingTaxId: null,
  city: null,
  contactPersonEmail: null,
  contactPersonName: null,
  contactPersonPhone: null,
  contactPersonRole: null,
  countryCode: "RO",
  countyOrRegion: null,
  email: null,
  internalNotes: null,
  legalName: null,
  name: "",
  phone: null,
  postalCode: null,
  registrationNumber: null,
  taxId: null,
  website: null,
};

function toClinicFormValues(clinic: ClinicDetail | undefined): ClinicFormValues {
  if (!clinic) {
    return defaultClinicValues;
  }

  return {
    addressLine1: clinic.addressLine1,
    addressLine2: clinic.addressLine2,
    billingAddressLine1: clinic.billingAddressLine1,
    billingAddressLine2: clinic.billingAddressLine2,
    billingCity: clinic.billingCity,
    billingCountryCode: clinic.billingCountryCode,
    billingCountyOrRegion: clinic.billingCountyOrRegion,
    billingName: clinic.billingName,
    billingPostalCode: clinic.billingPostalCode,
    billingRegistrationNumber: clinic.billingRegistrationNumber,
    billingTaxId: clinic.billingTaxId,
    city: clinic.city,
    contactPersonEmail: clinic.contactPersonEmail,
    contactPersonName: clinic.contactPersonName,
    contactPersonPhone: clinic.contactPersonPhone,
    contactPersonRole: clinic.contactPersonRole,
    countryCode: clinic.countryCode,
    countyOrRegion: clinic.countyOrRegion,
    email: clinic.email,
    internalNotes: clinic.internalNotes,
    legalName: clinic.legalName,
    name: clinic.name,
    phone: clinic.phone,
    postalCode: clinic.postalCode,
    registrationNumber: clinic.registrationNumber,
    taxId: clinic.taxId,
    website: clinic.website,
  };
}

function toDoctorFormValues(doctor: DoctorDetail | undefined, clinicId: string): DoctorFormValues {
  return {
    clinicId: doctor?.clinicId ?? clinicId,
    email: doctor?.email ?? null,
    firstName: doctor?.firstName ?? "",
    internalNotes: doctor?.internalNotes ?? null,
    lastName: doctor?.lastName ?? "",
    phone: doctor?.phone ?? null,
    professionalCode: doctor?.professionalCode ?? null,
  };
}

const clinicFieldLabels: Partial<Record<keyof ClinicFormValues, string>> = {
  billingCountryCode: "Țară facturare",
  contactPersonEmail: "Email contact",
  countryCode: "Țară",
  email: "Email clinică",
  name: "Nume clinică",
  phone: "Telefon clinică",
  website: "Website",
};

const doctorFieldLabels: Partial<Record<keyof DoctorFormValues, string>> = {
  clinicId: "Clinică",
  email: "Email",
  firstName: "Prenume",
  lastName: "Nume",
  phone: "Telefon",
};

function toPermissionError(permissionKey: string): ReactNode {
  return `Contul curent nu are permisiunea ${permissionKey}.`;
}

function toStatusValue(isActive: boolean | undefined): string {
  if (isActive === undefined) {
    return "all";
  }

  return isActive ? "active" : "archived";
}

function fromStatusValue(value: string): boolean | undefined {
  if (value === "active") {
    return true;
  }

  if (value === "archived") {
    return false;
  }

  return undefined;
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

export function ClinicsPage(): ReactNode {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<ClinicsListParams>({
    city: undefined,
    isActive: true,
    page: 1,
    pageSize: 20,
    search: undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [doctorModal, setDoctorModal] = useState<{ readonly doctorId: string | null; readonly mode: "create" | "edit" } | null>(null);
  const [selectorClinicId, setSelectorClinicId] = useState("");
  const [selectorDoctorId, setSelectorDoctorId] = useState("");

  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadClinics = hasPermission(permissionsQuery.data, "clinics.read");
  const canCreateClinics = hasPermission(permissionsQuery.data, "clinics.create");
  const canUpdateClinics = hasPermission(permissionsQuery.data, "clinics.update");
  const canArchiveClinics = hasPermission(permissionsQuery.data, "clinics.archive");
  const canReadDoctors = hasPermission(permissionsQuery.data, "doctors.read");
  const canCreateDoctors = hasPermission(permissionsQuery.data, "doctors.create");
  const canUpdateDoctors = hasPermission(permissionsQuery.data, "doctors.update");
  const canArchiveDoctors = hasPermission(permissionsQuery.data, "doctors.archive");

  const clinicsQuery = useQuery({
    enabled: canReadClinics,
    queryFn: () => fetchClinics(params),
    queryKey: ["clinics", params],
  });
  const selectedClinicQuery = useQuery({
    enabled: canReadClinics && selectedClinicId !== null,
    queryFn: () => fetchClinic(selectedClinicId ?? ""),
    queryKey: ["clinics", "detail", selectedClinicId],
  });
  const clinicOptionsQuery = useQuery({
    enabled: canReadClinics,
    queryFn: fetchClinicOptions,
    queryKey: ["clinics", "options"],
  });
  const selectorDoctorOptionsQuery = useQuery({
    enabled: canReadDoctors && selectorClinicId.length > 0,
    queryFn: () => fetchDoctorOptions(selectorClinicId),
    queryKey: ["doctors", "options", selectorClinicId],
  });

  const invalidateClinics = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["clinics"] }),
      queryClient.invalidateQueries({ queryKey: ["doctors"] }),
    ]);
  };

  const createClinicMutation = useMutation({
    mutationFn: (input: CreateClinicInput) => createClinic(input),
    onSuccess: async (clinic) => {
      await invalidateClinics();
      setIsCreateOpen(false);
      setSelectedClinicId(clinic.id);
      toast.showToast({ message: "Clinica a fost creată.", variant: "success" });
    },
  });
  const updateClinicMutation = useMutation({
    mutationFn: ({ clinicId, input }: { readonly clinicId: string; readonly input: UpdateClinicInput }) => updateClinic(clinicId, input),
    onSuccess: async () => {
      await invalidateClinics();
      toast.showToast({ message: "Clinica a fost salvată.", variant: "success" });
    },
  });
  const archiveClinicMutation = useMutation({
    mutationFn: archiveClinic,
    onSuccess: async () => {
      await invalidateClinics();
      toast.showToast({ message: "Clinica a fost arhivată.", variant: "success" });
    },
  });
  const restoreClinicMutation = useMutation({
    mutationFn: restoreClinic,
    onSuccess: async () => {
      await invalidateClinics();
      toast.showToast({ message: "Clinica a fost reactivată.", variant: "success" });
    },
  });
  const createDoctorMutation = useMutation({
    mutationFn: (input: CreateDoctorInput) => createDoctor(input),
    onSuccess: async () => {
      await invalidateClinics();
      setDoctorModal(null);
      toast.showToast({ message: "Medicul a fost adăugat.", variant: "success" });
    },
  });
  const updateDoctorMutation = useMutation({
    mutationFn: ({ doctorId, input }: { readonly doctorId: string; readonly input: UpdateDoctorInput }) => updateDoctor(doctorId, input),
    onSuccess: async () => {
      await invalidateClinics();
      setDoctorModal(null);
      toast.showToast({ message: "Medicul a fost salvat.", variant: "success" });
    },
  });
  const archiveDoctorMutation = useMutation({
    mutationFn: archiveDoctor,
    onSuccess: async () => {
      await invalidateClinics();
      toast.showToast({ message: "Medicul a fost arhivat.", variant: "success" });
    },
  });
  const restoreDoctorMutation = useMutation({
    mutationFn: restoreDoctor,
    onSuccess: async () => {
      await invalidateClinics();
      toast.showToast({ message: "Medicul a fost reactivat.", variant: "success" });
    },
  });

  const clinicColumns = useMemo<readonly DataTableColumn<ClinicSummary>[]>(() => [
    { header: "Cod", id: "code", isSortable: true, renderCell: (clinic) => clinic.code },
    { header: "Clinică", id: "name", isSortable: true, renderCell: (clinic) => clinic.name },
    { header: "Oraș", id: "city", isSortable: true, renderCell: (clinic) => clinic.city ?? "-" },
    { header: "Contact", id: "contact", renderCell: (clinic) => clinic.contactPersonName ?? clinic.email ?? clinic.phone ?? "-" },
    { header: "Status", id: "status", renderCell: (clinic) => <ActiveBadge isActive={clinic.isActive} /> },
  ], []);

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Se verifică permisiunile" /></PageState>;
  }

  if (!canReadClinics) {
    return <PageState><ErrorState title="Acces refuzat" description={toPermissionError("clinics.read")} /></PageState>;
  }

  return (
    <main className="clinics-page">
      <section className="dl-container clinics-page__layout" aria-labelledby="clinics-title">
        <header className="clinics-page__header">
          <div>
            <h1 id="clinics-title">Clinici și medici</h1>
            <p>Cabinete partenere, contacte, date de facturare și medici externi pentru selecție operațională.</p>
          </div>
          <Button disabled={!canCreateClinics} onClick={() => setIsCreateOpen(true)}>
            Adaugă clinică
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Selector clinică-medic</CardTitle>
            <CardDescription>Opțiunile includ doar clinici active și medici activi.</CardDescription>
          </CardHeader>
          <CardContent className="clinics-page__selector">
            <Select
              label="Clinică"
              onChange={(event) => {
                setSelectorClinicId(event.target.value);
                setSelectorDoctorId("");
              }}
              options={toClinicSelectOptions(clinicOptionsQuery.data ?? [])}
              placeholder="Alege clinica"
              value={selectorClinicId}
            />
            <Select
              disabled={selectorClinicId.length === 0 || selectorDoctorOptionsQuery.isLoading}
              label="Medic"
              onChange={(event) => setSelectorDoctorId(event.target.value)}
              options={toDoctorSelectOptions(selectorDoctorOptionsQuery.data ?? [])}
              placeholder={selectorClinicId ? "Alege medicul" : "Alege întâi clinica"}
              value={selectorDoctorId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listă clinici</CardTitle>
            <CardDescription>Caută după cod, nume, date fiscale, contact sau oraș.</CardDescription>
          </CardHeader>
          <CardContent className="clinics-page__table-card">
            <div className="clinics-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                placeholder="Cod, nume, email"
                type="search"
                value={params.search ?? ""}
              />
              <TextInput
                label="Oraș"
                onChange={(event) => setParams((current) => ({ ...current, city: event.target.value || undefined, page: 1 }))}
                value={params.city ?? ""}
              />
              <Select
                label="Status"
                onChange={(event) => setParams((current) => ({ ...current, isActive: fromStatusValue(event.target.value), page: 1 }))}
                options={statusOptions}
                value={toStatusValue(params.isActive)}
              />
            </div>
            <DataTable
              columns={clinicColumns}
              emptyMessage="Nu există clinici pentru filtrele curente."
              error={clinicsQuery.isError ? getErrorMessage(clinicsQuery.error) : undefined}
              getRowKey={(clinic) => clinic.id}
              isLoading={clinicsQuery.isLoading}
              onRowAction={(clinic) => setSelectedClinicId(clinic.id)}
              onSortChange={(sort) => setParams((current) => ({
                ...current,
                page: 1,
                sortBy: sort.columnId as ClinicSortField,
                sortDirection: toApiSort(sort.direction),
              }))}
              pagination={{
                onPageChange: (page) => setParams((current) => ({ ...current, page })),
                page: clinicsQuery.data?.page ?? params.page,
                pageCount: clinicsQuery.data?.pageCount ?? 1,
              }}
              rowActionLabel="Deschide"
              rows={clinicsQuery.data?.items ?? []}
              sort={fromApiSort(params.sortBy, params.sortDirection)}
            />
          </CardContent>
        </Card>
      </section>

      <ClinicCreateModal
        isOpen={isCreateOpen}
        isSaving={createClinicMutation.isPending}
        onOpenChange={setIsCreateOpen}
        onSubmit={(values) => createClinicMutation.mutate(values, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Clinica nu a fost creată", variant: "error" }) })}
        submitError={createClinicMutation.error}
      />

      <ClinicDetailDrawer
        archiveMutationPending={archiveClinicMutation.isPending}
        canArchive={canArchiveClinics}
        canArchiveDoctors={canArchiveDoctors}
        canCreateDoctors={canCreateDoctors}
        canReadDoctors={canReadDoctors}
        canUpdate={canUpdateClinics}
        canUpdateDoctors={canUpdateDoctors}
        clinic={selectedClinicQuery.data}
        error={selectedClinicQuery.isError ? getErrorMessage(selectedClinicQuery.error) : undefined}
        isLoading={selectedClinicQuery.isLoading}
        isOpen={selectedClinicId !== null}
        onArchive={(clinicId) => archiveClinicMutation.mutate(clinicId, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Clinica nu a fost arhivată", variant: "error" }) })}
        onDoctorArchive={(doctorId) => archiveDoctorMutation.mutate(doctorId, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Medicul nu a fost arhivat", variant: "error" }) })}
        onDoctorEdit={(doctorId) => setDoctorModal({ doctorId, mode: "edit" })}
        onDoctorRestore={(doctorId) => restoreDoctorMutation.mutate(doctorId, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Medicul nu a fost reactivat", variant: "error" }) })}
        onOpenChange={(isOpen) => setSelectedClinicId(isOpen ? selectedClinicId : null)}
        onRestore={(clinicId) => restoreClinicMutation.mutate(clinicId, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Clinica nu a fost reactivată", variant: "error" }) })}
        onSubmit={(clinicId, values) => updateClinicMutation.mutate({ clinicId, input: values }, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Clinica nu a fost salvată", variant: "error" }) })}
        onCreateDoctor={() => setDoctorModal({ doctorId: null, mode: "create" })}
        restoreMutationPending={restoreClinicMutation.isPending}
        submitError={updateClinicMutation.error}
        updateMutationPending={updateClinicMutation.isPending}
      />

      <DoctorModal
        clinicId={selectedClinicId ?? ""}
        doctorId={doctorModal?.doctorId ?? null}
        isOpen={doctorModal !== null}
        isSaving={createDoctorMutation.isPending || updateDoctorMutation.isPending}
        mode={doctorModal?.mode ?? "create"}
        onOpenChange={(isOpen) => setDoctorModal(isOpen ? doctorModal : null)}
        onSubmit={(values) => {
          if (doctorModal?.mode === "edit" && doctorModal.doctorId) {
            updateDoctorMutation.mutate({ doctorId: doctorModal.doctorId, input: values }, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Medicul nu a fost salvat", variant: "error" }) });
            return;
          }
          createDoctorMutation.mutate(values, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Medicul nu a fost creat", variant: "error" }) });
        }}
        submitError={doctorModal?.mode === "edit" ? updateDoctorMutation.error : createDoctorMutation.error}
      />
    </main>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="clinics-page">
      <section className="dl-container clinics-page__layout">{children}</section>
    </main>
  );
}

function ActiveBadge({ isActive }: { readonly isActive: boolean }): ReactNode {
  return <StatusBadge label={isActive ? "Activă" : "Arhivată"} variant={isActive ? "registered" : "cancelled"} />;
}

function toClinicSelectOptions(clinics: readonly ClinicOption[]) {
  return clinics.map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }));
}

function toDoctorSelectOptions(doctors: readonly DoctorOption[]) {
  return doctors.map((doctor) => ({ label: doctor.displayName, value: doctor.id }));
}

function ClinicCreateModal({
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: ClinicFormValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<ClinicFormValues>({
    defaultValues: defaultClinicValues,
    resolver: zodResolver(clinicFormSchema),
  });
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultClinicValues);
    }
  }, [form, isOpen]);

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
        footer={<FormActions canReset={form.formState.isDirty} formId="clinic-create-form" isSubmitting={isSaving} onReset={() => form.reset(defaultClinicValues)} submitLabel="Creează clinică" />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title="Clinică nouă"
      >
        <ClinicForm
          formId="clinic-create-form"
          form={form}
          isDisabled={isSaving}
          onSubmit={(values) => {
            form.clearErrors("root");
            onSubmit(values);
          }}
        />
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}

function ClinicDetailDrawer({
  archiveMutationPending,
  canArchive,
  canArchiveDoctors,
  canCreateDoctors,
  canReadDoctors,
  canUpdate,
  canUpdateDoctors,
  clinic,
  error,
  isLoading,
  isOpen,
  onArchive,
  onCreateDoctor,
  onDoctorArchive,
  onDoctorEdit,
  onDoctorRestore,
  onOpenChange,
  onRestore,
  onSubmit,
  restoreMutationPending,
  submitError,
  updateMutationPending,
}: {
  readonly archiveMutationPending: boolean;
  readonly canArchive: boolean;
  readonly canArchiveDoctors: boolean;
  readonly canCreateDoctors: boolean;
  readonly canReadDoctors: boolean;
  readonly canUpdate: boolean;
  readonly canUpdateDoctors: boolean;
  readonly clinic: ClinicDetail | undefined;
  readonly error: string | undefined;
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly onArchive: (clinicId: string) => void;
  readonly onCreateDoctor: () => void;
  readonly onDoctorArchive: (doctorId: string) => void;
  readonly onDoctorEdit: (doctorId: string) => void;
  readonly onDoctorRestore: (doctorId: string) => void;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onRestore: (clinicId: string) => void;
  readonly onSubmit: (clinicId: string, values: ClinicFormValues) => void;
  readonly restoreMutationPending: boolean;
  readonly submitError: unknown;
  readonly updateMutationPending: boolean;
}): ReactNode {
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | null>(null);
  const form = useForm<ClinicFormValues>({
    disabled: !canUpdate || clinic?.isActive === false,
    resolver: zodResolver(clinicFormSchema),
  });
  const closeGuard = useCloseGuard(form.formState.isDirty, updateMutationPending, onOpenChange);

  useEffect(() => {
    form.reset(toClinicFormValues(clinic));
  }, [clinic, form]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !updateMutationPending);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !updateMutationPending} />
      <Drawer isOpen={isOpen} onOpenChange={closeGuard.handleOpenChange} title={clinic ? `${clinic.code} · ${clinic.name}` : "Detalii clinică"}>
        {isLoading ? <LoadingState text="Se încarcă clinica" /> : null}
        {error ? <ErrorState title="Clinica nu poate fi încărcată" description={error} /> : null}
        {clinic ? (
          <div className="clinics-page__drawer">
            <div className="clinics-page__drawer-toolbar">
              <ActiveBadge isActive={clinic.isActive} />
              {canArchive && clinic.isActive ? <Button disabled={archiveMutationPending} onClick={() => setConfirmAction("archive")} variant="outline">Arhivează</Button> : null}
              {canArchive && !clinic.isActive ? <Button disabled={restoreMutationPending} onClick={() => setConfirmAction("restore")} variant="outline">Reactivează</Button> : null}
            </div>
            {!clinic.isActive ? <p className="clinics-page__readonly">Clinica arhivată este read-only până la reactivare.</p> : null}
            <ClinicForm
              formId="clinic-detail-form"
              form={form}
              isDisabled={!canUpdate || !clinic.isActive || updateMutationPending}
              onSubmit={(values) => {
                form.clearErrors("root");
                onSubmit(clinic.id, values);
              }}
            />
            {canUpdate && clinic.isActive ? (
              <FormActions
                canReset={form.formState.isDirty}
                className="clinics-page__actions"
                formId="clinic-detail-form"
                isSubmitting={updateMutationPending}
                onReset={() => form.reset(toClinicFormValues(clinic))}
                submitLabel="Salvează clinica"
              />
            ) : null}
            <DoctorsSection
              canArchive={canArchiveDoctors}
              canCreate={canCreateDoctors && clinic.isActive}
              canRead={canReadDoctors}
              canUpdate={canUpdateDoctors}
              clinicId={clinic.id}
              onArchive={onDoctorArchive}
              onCreate={onCreateDoctor}
              onEdit={onDoctorEdit}
              onRestore={onDoctorRestore}
            />
          </div>
        ) : null}
      </Drawer>
      {clinic ? (
        <ConfirmActionModal
          confirmLabel={confirmAction === "archive" ? "Arhivează" : "Reactivează"}
          description={confirmAction === "archive" ? "Clinica arhivată nu va mai apărea în selectoarele pentru lucrări noi." : "Clinica va redeveni disponibilă pentru selecție."}
          isLoading={archiveMutationPending || restoreMutationPending}
          isOpen={confirmAction !== null}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "archive") {
              onArchive(clinic.id);
            } else {
              onRestore(clinic.id);
            }
            setConfirmAction(null);
          }}
          title={confirmAction === "archive" ? "Arhivează clinica" : "Reactivează clinica"}
          variant={confirmAction === "archive" ? "danger" : "primary"}
        />
      ) : null}
      {closeGuard.confirmModal}
    </>
  );
}

function ClinicForm({
  form,
  formId,
  isDisabled,
  onSubmit,
}: {
  readonly form: ReturnType<typeof useForm<ClinicFormValues>>;
  readonly formId: string;
  readonly isDisabled: boolean;
  readonly onSubmit: (values: ClinicFormValues) => void;
}): ReactNode {
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, clinicFieldLabels)
    : [];

  return (
    <FormLayout className="clinics-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormErrorSummary errors={summaryItems} ref={summaryRef} />
      <FormSection title="Profil">
        <TextInput disabled={isDisabled} error={form.formState.errors.name?.message} id="name" label="Nume clinică" required {...form.register("name")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.legalName?.message} id="legalName" label="Denumire legală" {...form.register("legalName")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.taxId?.message} id="taxId" label="Cod fiscal" {...form.register("taxId")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.registrationNumber?.message} id="registrationNumber" label="Număr registru" {...form.register("registrationNumber")} />
      </FormSection>
      <FormSection title="Contact">
        <TextInput disabled={isDisabled} error={form.formState.errors.email?.message} id="email" label="Email clinică" type="email" {...form.register("email")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.phone?.message} id="phone" label="Telefon clinică" type="tel" {...form.register("phone")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.website?.message} id="website" label="Website" type="url" {...form.register("website")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.contactPersonName?.message} id="contactPersonName" label="Persoana contact" {...form.register("contactPersonName")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.contactPersonRole?.message} id="contactPersonRole" label="Rol contact" {...form.register("contactPersonRole")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.contactPersonEmail?.message} id="contactPersonEmail" label="Email contact" type="email" {...form.register("contactPersonEmail")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.contactPersonPhone?.message} id="contactPersonPhone" label="Telefon contact" type="tel" {...form.register("contactPersonPhone")} />
      </FormSection>
      <FormSection title="Adresa">
        <TextInput disabled={isDisabled} error={form.formState.errors.addressLine1?.message} id="addressLine1" label="Adresa" {...form.register("addressLine1")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.addressLine2?.message} id="addressLine2" label="Adresă secundară" {...form.register("addressLine2")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.city?.message} id="city" label="Oraș" {...form.register("city")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.countyOrRegion?.message} id="countyOrRegion" label="Județ / regiune" {...form.register("countyOrRegion")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.postalCode?.message} id="postalCode" label="Cod poștal" {...form.register("postalCode")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.countryCode?.message} id="countryCode" label="Țară" maxLength={2} required {...form.register("countryCode")} />
      </FormSection>
      <FormSection title="Facturare">
        <TextInput disabled={isDisabled} error={form.formState.errors.billingName?.message} label="Denumire facturare" {...form.register("billingName")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingTaxId?.message} label="Cod fiscal facturare" {...form.register("billingTaxId")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingRegistrationNumber?.message} label="Număr registru facturare" {...form.register("billingRegistrationNumber")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingAddressLine1?.message} label="Adresă facturare" {...form.register("billingAddressLine1")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingAddressLine2?.message} label="Adresă secundară facturare" {...form.register("billingAddressLine2")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingCity?.message} label="Oraș facturare" {...form.register("billingCity")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingCountyOrRegion?.message} label="Județ / regiune facturare" {...form.register("billingCountyOrRegion")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingPostalCode?.message} label="Cod poștal facturare" {...form.register("billingPostalCode")} />
        <TextInput disabled={isDisabled} error={form.formState.errors.billingCountryCode?.message} id="billingCountryCode" label="Țară facturare" maxLength={2} required {...form.register("billingCountryCode")} />
      </FormSection>
      <Textarea disabled={isDisabled} error={form.formState.errors.internalNotes?.message} id="internalNotes" label="Note interne" rows={4} {...form.register("internalNotes")} />
    </FormLayout>
  );
}

function FormSection({ children, title }: { readonly children: ReactNode; readonly title: string }): ReactNode {
  return (
    <fieldset className="clinics-page__fieldset">
      <legend>{title}</legend>
      <div className="clinics-page__form-grid">{children}</div>
    </fieldset>
  );
}

function DoctorsSection({
  canArchive,
  canCreate,
  canRead,
  canUpdate,
  clinicId,
  onArchive,
  onCreate,
  onEdit,
  onRestore,
}: {
  readonly canArchive: boolean;
  readonly canCreate: boolean;
  readonly canRead: boolean;
  readonly canUpdate: boolean;
  readonly clinicId: string;
  readonly onArchive: (doctorId: string) => void;
  readonly onCreate: () => void;
  readonly onEdit: (doctorId: string) => void;
  readonly onRestore: (doctorId: string) => void;
}): ReactNode {
  const [params, setParams] = useState<DoctorsListParams>({
    clinicId,
    isActive: undefined,
    page: 1,
    pageSize: 10,
    search: undefined,
    sortBy: "lastName",
    sortDirection: "asc",
  });

  useEffect(() => {
    setParams((current) => ({ ...current, clinicId, page: 1 }));
  }, [clinicId]);

  const doctorsQuery = useQuery({
    enabled: canRead,
    queryFn: () => fetchDoctors(params),
    queryKey: ["doctors", params],
  });
  const columns = useMemo<readonly DataTableColumn<DoctorSummary>[]>(() => [
    { header: "Medic", id: "displayName", isSortable: true, renderCell: (doctor) => doctor.displayName },
    { header: "Contact", id: "contact", renderCell: (doctor) => doctor.email ?? doctor.phone ?? "-" },
    { header: "Cod", id: "professionalCode", renderCell: (doctor) => doctor.professionalCode ?? "-" },
    { header: "Status", id: "status", renderCell: (doctor) => <ActiveBadge isActive={doctor.isActive} /> },
  ], []);

  if (!canRead) {
    return <ErrorState title="Medici indisponibili" description={toPermissionError("doctors.read")} />;
  }

  return (
    <section className="clinics-page__doctors" aria-label="Medici clinică">
      <div className="clinics-page__subheader">
        <div>
          <h3>Medici</h3>
          <p>Medici externi asociați clinicii curente.</p>
        </div>
        <Button disabled={!canCreate} onClick={onCreate} size="small">Adaugă medic</Button>
      </div>
      <div className="clinics-page__filters">
        <TextInput
          label="Căutare medici"
          onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
          type="search"
          value={params.search ?? ""}
        />
        <Select
          label="Status"
          onChange={(event) => setParams((current) => ({ ...current, isActive: fromStatusValue(event.target.value), page: 1 }))}
          options={statusOptions}
          value={toStatusValue(params.isActive)}
        />
      </div>
      <DataTable
        columns={columns}
        emptyMessage="Clinica nu are medici în filtrul curent."
        error={doctorsQuery.isError ? getErrorMessage(doctorsQuery.error) : undefined}
        getRowKey={(doctor) => doctor.id}
        isLoading={doctorsQuery.isLoading}
        {...(canUpdate ? { onRowAction: (doctor: DoctorSummary) => onEdit(doctor.id) } : {})}
        onSortChange={(sort) => setParams((current) => ({
          ...current,
          page: 1,
          sortBy: sort.columnId as DoctorSortField,
          sortDirection: toApiSort(sort.direction),
        }))}
        pagination={{
          onPageChange: (page) => setParams((current) => ({ ...current, page })),
          page: doctorsQuery.data?.page ?? params.page,
          pageCount: doctorsQuery.data?.pageCount ?? 1,
        }}
        rowActionLabel="Editează"
        rows={doctorsQuery.data?.items ?? []}
        sort={fromApiSort(params.sortBy, params.sortDirection)}
      />
      <div className="clinics-page__doctor-actions">
        {(doctorsQuery.data?.items ?? []).map((doctor) => (
          <Button
            disabled={!canArchive}
            key={doctor.id}
            onClick={() => doctor.isActive ? onArchive(doctor.id) : onRestore(doctor.id)}
            size="small"
            variant="ghost"
          >
            {doctor.isActive ? `Arhivează ${doctor.displayName}` : `Reactivează ${doctor.displayName}`}
          </Button>
        ))}
      </div>
    </section>
  );
}

function DoctorModal({
  clinicId,
  doctorId,
  isOpen,
  isSaving,
  mode,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly clinicId: string;
  readonly doctorId: string | null;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly mode: "create" | "edit";
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: DoctorFormValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const doctorQuery = useQuery({
    enabled: isOpen && mode === "edit" && doctorId !== null,
    queryFn: () => fetchDoctor(doctorId ?? ""),
    queryKey: ["doctors", "detail", doctorId],
  });
  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, doctorFieldLabels)
    : [];
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);

  useEffect(() => {
    form.reset(toDoctorFormValues(doctorQuery.data, clinicId));
  }, [clinicId, doctorQuery.data, form, isOpen]);

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
        footer={<FormActions canReset={form.formState.isDirty} formId="doctor-form" isSubmitting={isSaving || doctorQuery.isLoading} onReset={() => form.reset(toDoctorFormValues(doctorQuery.data, clinicId))} submitLabel={mode === "edit" ? "Salvează medic" : "Adaugă medic"} />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title={mode === "edit" ? "Editare medic" : "Medic nou"}
      >
        {doctorQuery.isLoading ? <LoadingState text="Se încarcă medicul" /> : null}
        <FormLayout
          className="clinics-page__form"
          id="doctor-form"
          onSubmit={(event) => void form.handleSubmit((values) => {
            form.clearErrors("root");
            onSubmit(values);
          })(event)}
        >
          <FormErrorSummary errors={summaryItems} ref={summaryRef} />
          <input type="hidden" {...form.register("clinicId")} />
          <div className="clinics-page__form-grid">
            <TextInput disabled={isSaving} error={form.formState.errors.firstName?.message} id="firstName" label="Prenume" required {...form.register("firstName")} />
            <TextInput disabled={isSaving} error={form.formState.errors.lastName?.message} id="lastName" label="Nume" required {...form.register("lastName")} />
            <TextInput disabled={isSaving} error={form.formState.errors.email?.message} id="email" label="Email" type="email" {...form.register("email")} />
            <TextInput disabled={isSaving} error={form.formState.errors.phone?.message} id="phone" label="Telefon" type="tel" {...form.register("phone")} />
            <TextInput disabled={isSaving} error={form.formState.errors.professionalCode?.message} id="professionalCode" label="Cod profesional" {...form.register("professionalCode")} />
          </div>
          <Textarea disabled={isSaving} error={form.formState.errors.internalNotes?.message} id="internalNotes" label="Note interne" rows={4} {...form.register("internalNotes")} />
        </FormLayout>
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}
