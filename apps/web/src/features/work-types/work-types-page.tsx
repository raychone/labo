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
  LoadingState,
  Modal,
  Select,
  StatusBadge,
  TextInput,
  useToast,
  type DataTableColumn,
  type DataTableSort,
} from "@dental-lab/ui";
import {
  decimalStringToMinor,
  formatMoneyMinor,
  type CreateWorkTypeInput,
  type UpdateWorkTypeInput,
  type WorkTypeSortField,
  type WorkTypeSummary,
  type WorkTypesListParams,
} from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import {
  useArchiveWorkType,
  useCreateWorkType,
  useRestoreWorkType,
  useUpdateWorkType,
  useWorkType,
  useWorkTypeOptions,
  useWorkTypes,
} from "./work-types-api.js";
import {
  WorkTypeForm,
  WorkTypeFormActions,
  defaultWorkTypeFormValues,
  toWorkTypeFormValues,
} from "./work-type-form.js";
import { workTypeFormSchema, type WorkTypeFormValues } from "./work-types-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard } from "../../lib/form-utils.js";
import "./work-types-page.css";

const statusOptions = [
  { label: "Toate", value: "all" },
  { label: "Active", value: "active" },
  { label: "Arhivate", value: "archived" },
] as const;

function toStatusValue(isActive: boolean | undefined): string {
  return isActive === undefined ? "all" : isActive ? "active" : "archived";
}

function fromStatusValue(value: string): boolean | undefined {
  return value === "active" ? true : value === "archived" ? false : undefined;
}

function toApiSort(direction: DataTableSort["direction"]) {
  return direction === "ascending" ? "asc" : "desc";
}

function fromApiSort(field: string, direction: "asc" | "desc"): DataTableSort {
  return {
    columnId: field,
    direction: direction === "asc" ? "ascending" : "descending",
  };
}

function toMutationInput(values: WorkTypeFormValues): CreateWorkTypeInput {
  const conversion = decimalStringToMinor(values.basePriceDecimal);
  if (!conversion.ok) {
    throw new Error(conversion.error);
  }

  return {
    basePriceMinor: conversion.value,
    description: values.description,
    name: values.name,
    unit: values.unit,
  };
}

export function WorkTypesPage(): ReactNode {
  const toast = useToast();
  const [params, setParams] = useState<WorkTypesListParams>({
    isActive: true,
    page: 1,
    pageSize: 20,
    search: undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState("");

  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "pricing.read");
  const canCreate = hasPermission(permissionsQuery.data, "pricing.create");
  const canUpdate = hasPermission(permissionsQuery.data, "pricing.update");
  const settingsQuery = useSettings();
  const workTypesQuery = useWorkTypes(params, canRead);
  const optionsQuery = useWorkTypeOptions(canRead);
  const selectedWorkTypeQuery = useWorkType(selectedWorkTypeId, canRead);
  const createMutation = useCreateWorkType();
  const updateMutation = useUpdateWorkType();
  const archiveMutation = useArchiveWorkType();
  const restoreMutation = useRestoreWorkType();
  const currency = settingsQuery.data?.currency ?? "RON";
  const locale = settingsQuery.data?.locale ?? "ro-RO";
  const columns = useMemo<readonly DataTableColumn<WorkTypeSummary>[]>(() => [
    { header: "Cod", id: "code", isSortable: true, renderCell: (workType) => workType.code },
    { header: "Denumire", id: "name", isSortable: true, renderCell: (workType) => workType.name },
    {
      align: "right",
      header: "Pret baza",
      id: "basePriceMinor",
      isSortable: true,
      renderCell: (workType) => formatMoneyMinor(workType.basePriceMinor, currency, locale),
    },
    { header: "Unitate", id: "unit", renderCell: (workType) => workType.unit },
    { header: "Status", id: "status", renderCell: (workType) => <ActiveBadge isActive={workType.isActive} /> },
  ], [currency, locale]);

  if (permissionsQuery.isLoading || settingsQuery.isLoading) {
    return <PageState><LoadingState text="Incarc catalogul" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea pricing.read." /></PageState>;
  }

  return (
    <main className="work-types-page">
      <section className="dl-container work-types-page__layout" aria-labelledby="work-types-title">
        <header className="work-types-page__header">
          <div>
            <h1 id="work-types-title">Tipuri de lucrari</h1>
            <p>Catalogul intern de lucrari dentare si pretul standard de baza al laboratorului.</p>
          </div>
          <Button disabled={!canCreate} onClick={() => setIsCreateOpen(true)}>Adauga tip de lucrare</Button>
        </header>
        {!canUpdate ? <p className="work-types-page__readonly">Ai acces de citire, dar nu poti modifica preturi sau tipuri de lucrari.</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Selector pentru lucrari viitoare</CardTitle>
            <CardDescription>Optiunile includ doar tipuri active.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              label="Tip lucrare"
              onChange={(event) => setSelectedOptionId(event.target.value)}
              options={(optionsQuery.data ?? []).map((option) => ({
                label: `${option.code} · ${option.name} · ${formatMoneyMinor(option.basePriceMinor, currency, locale)}`,
                value: option.id,
              }))}
              placeholder="Alege tipul de lucrare"
              value={selectedOptionId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
            <CardDescription>Total: {workTypesQuery.data?.total ?? 0}</CardDescription>
          </CardHeader>
          <CardContent className="work-types-page__table-card">
            <div className="work-types-page__filters">
              <TextInput
                label="Cautare"
                onChange={(event) => setParams((current) => ({ ...current, page: 1, search: event.target.value || undefined }))}
                placeholder="Cod, denumire, descriere"
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
              emptyMessage="Nu exista tipuri de lucrari pentru filtrele curente."
              error={workTypesQuery.isError ? getErrorMessage(workTypesQuery.error) : undefined}
              getRowKey={(workType) => workType.id}
              isLoading={workTypesQuery.isLoading}
              onRowAction={(workType) => setSelectedWorkTypeId(workType.id)}
              onSortChange={(sort) => setParams((current) => ({
                ...current,
                page: 1,
                sortBy: sort.columnId as WorkTypeSortField,
                sortDirection: toApiSort(sort.direction),
              }))}
              pagination={{
                onPageChange: (page) => setParams((current) => ({ ...current, page })),
                page: workTypesQuery.data?.page ?? params.page,
                pageCount: workTypesQuery.data?.pageCount ?? 1,
              }}
              rowActionLabel="Deschide"
              rows={workTypesQuery.data?.items ?? []}
              sort={fromApiSort(params.sortBy, params.sortDirection)}
            />
          </CardContent>
        </Card>
      </section>

      <WorkTypeCreateModal
        currency={currency}
        isOpen={isCreateOpen}
        isSaving={createMutation.isPending}
        onOpenChange={setIsCreateOpen}
        onSubmit={(values) => createMutation.mutate(toMutationInput(values), {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Tipul nu a fost creat", variant: "error" }),
          onSuccess: () => {
            setIsCreateOpen(false);
            toast.showToast({ message: "Tipul de lucrare a fost creat.", variant: "success" });
          },
        })}
        submitError={createMutation.error}
      />
      <WorkTypeDetailDrawer
        canUpdate={canUpdate}
        currency={currency}
        error={selectedWorkTypeQuery.isError ? getErrorMessage(selectedWorkTypeQuery.error) : undefined}
        isLoading={selectedWorkTypeQuery.isLoading}
        isOpen={selectedWorkTypeId !== null}
        isSaving={updateMutation.isPending || archiveMutation.isPending || restoreMutation.isPending}
        onArchive={(workTypeId) => archiveMutation.mutate(workTypeId, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Tipul nu a fost arhivat", variant: "error" }),
          onSuccess: () => toast.showToast({ message: "Tipul de lucrare a fost arhivat.", variant: "success" }),
        })}
        onOpenChange={(isOpen) => setSelectedWorkTypeId(isOpen ? selectedWorkTypeId : null)}
        onRestore={(workTypeId) => restoreMutation.mutate(workTypeId, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Tipul nu a fost reactivat", variant: "error" }),
          onSuccess: () => toast.showToast({ message: "Tipul de lucrare a fost reactivat.", variant: "success" }),
        })}
        onSubmit={(workTypeId, values) => updateMutation.mutate({ input: toMutationInput(values) as UpdateWorkTypeInput, workTypeId }, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Tipul nu a fost salvat", variant: "error" }),
          onSuccess: () => toast.showToast({ message: "Tipul de lucrare a fost salvat.", variant: "success" }),
        })}
        submitError={updateMutation.error}
        workType={selectedWorkTypeQuery.data}
      />
    </main>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="work-types-page"><section className="dl-container work-types-page__layout">{children}</section></main>;
}

function ActiveBadge({ isActive }: { readonly isActive: boolean }): ReactNode {
  return <StatusBadge label={isActive ? "Activ" : "Arhivat"} variant={isActive ? "registered" : "cancelled"} />;
}

function WorkTypeCreateModal({
  currency,
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  submitError,
}: {
  readonly currency: string;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: WorkTypeFormValues) => void;
  readonly submitError: unknown;
}): ReactNode {
  const form = useForm<WorkTypeFormValues>({ defaultValues: defaultWorkTypeFormValues, resolver: zodResolver(workTypeFormSchema) });
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultWorkTypeFormValues);
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
        footer={<WorkTypeFormActions canReset={form.formState.isDirty} formId="work-type-create-form" isSaving={isSaving} onReset={() => form.reset(defaultWorkTypeFormValues)} submitLabel="Creeaza" />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        title="Tip de lucrare nou"
      >
        <WorkTypeForm
          currency={currency}
          form={form}
          formId="work-type-create-form"
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

function WorkTypeDetailDrawer({
  canUpdate,
  currency,
  error,
  isLoading,
  isOpen,
  isSaving,
  onArchive,
  onOpenChange,
  onRestore,
  onSubmit,
  submitError,
  workType,
}: {
  readonly canUpdate: boolean;
  readonly currency: string;
  readonly error: string | undefined;
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onArchive: (workTypeId: string) => void;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onRestore: (workTypeId: string) => void;
  readonly onSubmit: (workTypeId: string, values: WorkTypeFormValues) => void;
  readonly submitError: unknown;
  readonly workType: import("@dental-lab/shared").WorkTypeDetail | undefined;
}): ReactNode {
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | null>(null);
  const form = useForm<WorkTypeFormValues>({ disabled: !canUpdate || workType?.isActive === false, resolver: zodResolver(workTypeFormSchema) });
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);

  useEffect(() => {
    form.reset(toWorkTypeFormValues(workType));
  }, [form, workType]);

  useEffect(() => {
    if (submitError) {
      applyApiErrorsToForm(form, submitError);
    }
  }, [form, submitError]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSaving);

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSaving} />
      <Drawer isOpen={isOpen} onOpenChange={closeGuard.handleOpenChange} title={workType ? `${workType.code} · ${workType.name}` : "Detalii tip lucrare"}>
        {isLoading ? <LoadingState text="Incarc tipul de lucrare" /> : null}
        {error ? <ErrorState title="Tipul nu poate fi incarcat" description={error} /> : null}
        {workType ? (
          <div className="work-types-page__drawer">
            <div className="work-types-page__drawer-toolbar">
              <ActiveBadge isActive={workType.isActive} />
              {canUpdate && workType.isActive ? <Button disabled={isSaving} onClick={() => setConfirmAction("archive")} variant="outline">Arhiveaza</Button> : null}
              {canUpdate && !workType.isActive ? <Button disabled={isSaving} onClick={() => setConfirmAction("restore")} variant="outline">Reactiveaza</Button> : null}
            </div>
            {!workType.isActive ? <p className="work-types-page__readonly">Tipul arhivat este read-only pana la reactivare.</p> : null}
            <WorkTypeForm
              currency={currency}
              form={form}
              formId="work-type-detail-form"
              isDisabled={!canUpdate || !workType.isActive || isSaving}
              onSubmit={(values) => {
                form.clearErrors("root");
                onSubmit(workType.id, values);
              }}
            />
            {canUpdate && workType.isActive ? (
              <WorkTypeFormActions
                canReset={form.formState.isDirty}
                formId="work-type-detail-form"
                isSaving={isSaving}
                onReset={() => form.reset(toWorkTypeFormValues(workType))}
                submitLabel="Salveaza"
              />
            ) : null}
          </div>
        ) : null}
      </Drawer>
      {workType ? (
        <ConfirmActionModal
          confirmLabel={confirmAction === "archive" ? "Arhiveaza" : "Reactiveaza"}
          description={confirmAction === "archive" ? "Tipul arhivat nu va mai aparea in selectoarele pentru lucrari noi." : "Tipul va redeveni disponibil pentru lucrari noi."}
          isLoading={isSaving}
          isOpen={confirmAction !== null}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "archive") {
              onArchive(workType.id);
            } else {
              onRestore(workType.id);
            }
            setConfirmAction(null);
          }}
          title={confirmAction === "archive" ? "Arhiveaza tipul de lucrare" : "Reactiveaza tipul de lucrare"}
          variant={confirmAction === "archive" ? "danger" : "primary"}
        />
      ) : null}
      {closeGuard.confirmModal}
    </>
  );
}
