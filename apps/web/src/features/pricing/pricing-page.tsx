import { zodResolver } from "@hookform/resolvers/zod";
import {
  Accordion,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  DateInput,
  Drawer,
  ErrorState,
  FormActions,
  FormGrid,
  FormGridFull,
  FormLayout,
  LoadingState,
  Modal,
  NumberInput,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  TextInput,
  useToast,
  type DataTableColumn,
} from "@dental-lab/ui";
import {
  decimalStringToMinor,
  formatExecutionRule,
  formatMoneyMinor,
  formatWorkTypeUnit,
  minorToDecimalString,
  WORK_TYPE_UNITS,
  type ExecutionTimeRuleInput,
  type PriceCatalogItemInput,
  type PriceCatalogItemSummary,
  type PricingAgreementInput,
  type PricingAgreementListParams,
  type PricingAgreementRuleInput,
  type PricingAgreementSummary,
  type PricingCatalogListParams,
  type PricingResolvePreviewInput,
  type WorkTypeOption,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { registerOrganizationContextSwitchGuard } from "../organization-context/organization-context-switch-guards.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import { useWorkTypeOptions } from "../work-types/work-types-api.js";
import {
  useArchivePricingAgreement,
  useArchivePricingCatalogItem,
  useCreatePricingAgreement,
  useCreatePricingCatalogItem,
  usePricingAgreements,
  usePricingCatalog,
  usePricingCatalogItem,
  useReplacePricingAgreementRules,
  useReplaceExecutionRules,
  useResolvePricingPreview,
  useRestorePricingCatalogItem,
  useUpdatePricingCatalogItem,
} from "./pricing-api.js";
import {
  agreementFormSchema,
  catalogFormSchema,
  executionRulesFormSchema,
  previewFormSchema,
  pricingCategoryOptions,
  type AgreementFormValues,
  type CatalogFormValues,
  type ExecutionRulesFormValues,
  type PreviewFormValues,
} from "./pricing-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard } from "../../lib/form-utils.js";
import "./pricing-page.css";

const activeOptions = [
  { label: "Active", value: "active" },
  { label: "Arhivate", value: "archived" },
  { label: "Toate", value: "all" },
] as const;

const subjectTypeOptions = [
  { label: "Clinică", value: "CLINIC" },
  { label: "Medic", value: "DOCTOR" },
] as const;

const scopeOptions = [
  { label: "Tot catalogul", value: "ALL" },
  { label: "Categorie", value: "CATEGORY" },
  { label: "Produs", value: "ITEM" },
] as const;

const adjustmentTypeOptions = [
  { label: "Sumă fixă", value: "FIXED_AMOUNT" },
  { label: "Procent", value: "PERCENTAGE" },
  { label: "Preț final", value: "OVERRIDE_PRICE" },
] as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toApiActive(value: string): boolean | undefined {
  return value === "active" ? true : value === "archived" ? false : undefined;
}

function fromApiActive(value: boolean | undefined): string {
  return value === undefined ? "all" : value ? "active" : "archived";
}

function getCatalogDefaults(item?: PriceCatalogItemSummary | null): CatalogFormValues {
  return {
    category: item?.category ?? "Ceramică",
    displayName: item?.displayName ?? "",
    isActive: item?.isActive ?? true,
    notes: item?.notes ?? "",
    sortOrder: item?.sortOrder ?? 0,
    standardPriceDecimal: item ? minorToDecimalString(item.standardPriceMinor) : "",
    unit: item?.unit ?? "ELEMENT",
    workTypeId: item?.workType.id ?? "",
  };
}

function toCatalogInput(values: CatalogFormValues): PriceCatalogItemInput {
  const price = decimalStringToMinor(values.standardPriceDecimal);
  if (!price.ok) {
    throw new Error(price.error);
  }

  return {
    category: values.category,
    displayName: values.displayName,
    isActive: values.isActive,
    notes: values.notes || null,
    sortOrder: values.sortOrder,
    standardPriceMinor: price.value,
    unit: values.unit,
    workTypeId: values.workTypeId,
  };
}

function toAgreementInput(values: AgreementFormValues): PricingAgreementInput {
  return {
    clinicId: values.subjectType === "CLINIC" ? values.clinicId || null : null,
    doctorId: values.subjectType === "DOCTOR" ? values.doctorId || null : null,
    isActive: true,
    name: values.name,
    notes: values.notes || null,
    subjectType: values.subjectType,
    validFrom: values.validFrom,
    validUntil: values.validUntil || null,
  };
}

function toAgreementRuleInput(values: AgreementFormValues): PricingAgreementRuleInput {
  const fixedAmount = values.adjustmentDecimal ? decimalStringToMinor(values.adjustmentDecimal) : { ok: true, value: 0 } as const;
  const overridePrice = values.overridePriceDecimal ? decimalStringToMinor(values.overridePriceDecimal) : { ok: true, value: 0 } as const;
  if (!fixedAmount.ok) {
    throw new Error(fixedAmount.error);
  }
  if (!overridePrice.ok) {
    throw new Error(overridePrice.error);
  }

  return {
    adjustmentPercentageBasisPoints: values.adjustmentType === "PERCENTAGE" ? Math.round(Number(values.adjustmentPercentage?.replace(",", ".") ?? "0") * 100) : null,
    adjustmentType: values.adjustmentType,
    adjustmentValueMinor: values.adjustmentType === "FIXED_AMOUNT" ? fixedAmount.value : null,
    category: values.scope === "CATEGORY" ? values.category || null : null,
    overridePriceMinor: values.adjustmentType === "OVERRIDE_PRICE" ? overridePrice.value : null,
    priceCatalogItemId: values.scope === "ITEM" ? values.priceCatalogItemId || null : null,
    scope: values.scope,
  };
}

function parseExecutionRulesJson(value: string): readonly ExecutionTimeRuleInput[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("Regulile trebuie să fie un array JSON.");
  }

  return parsed.map((rule): ExecutionTimeRuleInput => {
    if (typeof rule !== "object" || rule === null) {
      throw new Error("Fiecare regulă trebuie să fie obiect JSON.");
    }
    const item = rule as Partial<Record<keyof ExecutionTimeRuleInput, unknown>>;
    if (typeof item.minQuantity !== "number" || typeof item.requiresManualDueDate !== "boolean") {
      throw new Error("Fiecare regulă cere minQuantity și requiresManualDueDate.");
    }

    return {
      executionDays: typeof item.executionDays === "number" ? item.executionDays : null,
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
      maxQuantity: typeof item.maxQuantity === "number" ? item.maxQuantity : null,
      minQuantity: item.minQuantity,
      priority: typeof item.priority === "number" ? item.priority : 0,
      requiresManualDueDate: item.requiresManualDueDate,
    };
  });
}

export function PricingPage(): ReactNode {
  const toast = useToast();
  const [catalogParams, setCatalogParams] = useState<PricingCatalogListParams>({
    active: true,
    page: 1,
    pageSize: 20,
    sortBy: "sortOrder",
    sortDirection: "asc",
  });
  const [agreementParams, setAgreementParams] = useState<PricingAgreementListParams>({
    active: true,
    page: 1,
    pageSize: 20,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "pricing.read");
  const canCreate = hasPermission(permissionsQuery.data, "pricing.create");
  const canUpdate = hasPermission(permissionsQuery.data, "pricing.update");
  const canArchive = hasPermission(permissionsQuery.data, "pricing.archive");
  const canReadAgreements = hasPermission(permissionsQuery.data, "pricing.agreements.read");
  const canManageAgreements = hasPermission(permissionsQuery.data, "pricing.agreements.manage");
  const canPreview = hasPermission(permissionsQuery.data, "pricing.resolve_preview");
  const settingsQuery = useSettings(canRead);
  const catalogQuery = usePricingCatalog(catalogParams, canRead);
  const agreementsQuery = usePricingAgreements(agreementParams, canRead && canReadAgreements);
  const selectedCatalogQuery = usePricingCatalogItem(selectedCatalogId, canRead);
  const workTypesQuery = useWorkTypeOptions(canRead);
  const clinicsQuery = useQuery({ enabled: canRead, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorsQuery = useQuery({ enabled: canRead, queryFn: () => fetchDoctorOptions(), queryKey: ["doctors", "options"], retry: false });
  const createCatalogMutation = useCreatePricingCatalogItem();
  const updateCatalogMutation = useUpdatePricingCatalogItem();
  const archiveCatalogMutation = useArchivePricingCatalogItem();
  const restoreCatalogMutation = useRestorePricingCatalogItem();
  const replaceExecutionRulesMutation = useReplaceExecutionRules();
  const createAgreementMutation = useCreatePricingAgreement();
  const replaceAgreementRulesMutation = useReplacePricingAgreementRules();
  const archiveAgreementMutation = useArchivePricingAgreement();
  const previewMutation = useResolvePricingPreview();
  const currency = settingsQuery.data?.currency ?? "RON";
  const locale = settingsQuery.data?.locale ?? "ro-RO";

  const catalogColumns = useMemo<readonly DataTableColumn<PriceCatalogItemSummary>[]>(() => [
    { header: "Categorie", id: "category", isSortable: true, renderCell: (item) => item.category },
    { header: "Produs", id: "displayName", isSortable: true, renderCell: (item) => item.displayName },
    { header: "Tip lucrare", id: "workType", renderCell: (item) => `${item.workType.code} · ${item.workType.name}` },
    { align: "right", header: "Preț standard", id: "standardPriceMinor", isSortable: true, renderCell: (item) => formatMoneyMinor(item.standardPriceMinor, currency, locale) },
    { header: "Unitate", id: "unit", renderCell: (item) => formatWorkTypeUnit(item.unit) },
    { header: "Status", id: "status", renderCell: (item) => <StatusBadge label={item.isActive ? "Activ" : "Arhivat"} variant={item.isActive ? "approved" : "closed"} /> },
  ], [currency, locale]);
  const agreementColumns = useMemo<readonly DataTableColumn<PricingAgreementSummary>[]>(() => [
    { header: "Acord", id: "name", renderCell: (item) => item.name },
    { header: "Subiect", id: "subject", renderCell: (item) => item.clinic?.name ?? item.doctor?.displayName ?? "-" },
    { header: "Tip", id: "subjectType", renderCell: (item) => item.subjectType === "CLINIC" ? "Clinică" : "Medic" },
    { header: "Valabil", id: "validFrom", renderCell: (item) => `${item.validFrom.slice(0, 10)} - ${item.validUntil?.slice(0, 10) ?? "fără limită"}` },
    { header: "Reguli", id: "rules", renderCell: (item) => item.ruleCount },
    { header: "Status", id: "status", renderCell: (item) => <StatusBadge label={item.isActive ? "Activ" : "Arhivat"} variant={item.isActive ? "approved" : "closed"} /> },
  ], []);

  if (permissionsQuery.isLoading || settingsQuery.isLoading) {
    return <PageFrame><LoadingState text="Se încarcă prețurile" /></PageFrame>;
  }

  if (!canRead) {
    return <PageFrame><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea pricing.read." /></PageFrame>;
  }

  return (
    <main className="pricing-page">
      <section className="dl-container pricing-page__layout" aria-labelledby="pricing-title">
        <header className="pricing-page__header">
          <div>
            <h1 id="pricing-title">Prețuri și termene</h1>
            <p>Catalog comercial separat pe firma activă, acorduri pe clinici sau medici și previzualizare calcul.</p>
            <p>Firmă activă: <strong>{settingsQuery.data?.legalEntityDisplayName ?? "-"}</strong></p>
          </div>
          <div className="pricing-page__actions">
            <Button disabled={!canCreate} onClick={() => setIsCatalogModalOpen(true)}>Adaugă preț</Button>
            <Button disabled={!canManageAgreements} onClick={() => setIsAgreementModalOpen(true)} variant="outline">Adaugă acord</Button>
          </div>
        </header>
        {!canUpdate ? <p className="pricing-page__readonly">Ai acces de citire. Modificările de preț cer permisiuni financiare explicite.</p> : null}

        <Tabs
          tabs={[
            {
              content: (
                <CatalogTab
                  active={catalogParams.active}
                  catalogQuery={catalogQuery}
                  columns={catalogColumns}
                  onActiveChange={(active) => setCatalogParams((current) => ({ ...current, active, page: 1 }))}
                  onRowAction={(item) => setSelectedCatalogId(item.id)}
                  onSearchChange={(search) => setCatalogParams((current) => ({ ...current, page: 1, search: search || undefined }))}
                  search={catalogParams.search ?? ""}
                />
              ),
              id: "catalog",
              label: "Catalog",
            },
            {
              content: (
                <AgreementsTab
                  active={agreementParams.active}
                  agreementsQuery={agreementsQuery}
                  canManage={canManageAgreements}
                  columns={agreementColumns}
                  onActiveChange={(active) => setAgreementParams((current) => ({ ...current, active, page: 1 }))}
                  onArchive={(id) => archiveAgreementMutation.mutate(id, {
                    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Acordul nu a fost arhivat", variant: "error" }),
                    onSuccess: () => toast.showToast({ message: "Acordul a fost arhivat.", variant: "success" }),
                  })}
                  onSearchChange={(search) => setAgreementParams((current) => ({ ...current, page: 1, search: search || undefined }))}
                  search={agreementParams.search ?? ""}
                />
              ),
              id: "agreements",
              label: "Acorduri",
            },
            {
              content: (
                <PreviewTab
                  canPreview={canPreview}
                  clinics={clinicsQuery.data ?? []}
                  currency={currency}
                  doctors={doctorsQuery.data ?? []}
                  locale={locale}
                  mutation={previewMutation}
                  workTypes={workTypesQuery.data ?? []}
                />
              ),
              id: "preview",
              label: "Preview calcul",
            },
            {
              content: (
                <TermsTab items={catalogQuery.data?.items ?? []} />
              ),
              id: "terms",
              label: "Termene",
            },
            {
              content: <AuditSourceTab />,
              id: "history",
              label: "Istoric",
            },
          ]}
        />
      </section>

      <CatalogModal
        currency={currency}
        isOpen={isCatalogModalOpen}
        isSaving={createCatalogMutation.isPending}
        mode="create"
        onOpenChange={setIsCatalogModalOpen}
        onSubmit={(values, form) => createCatalogMutation.mutate(toCatalogInput(values), {
          onError: (error) => {
            applyApiErrorsToForm(form, error);
            toast.showToast({ message: getErrorMessage(error), title: "Prețul nu a fost creat", variant: "error" });
          },
          onSuccess: () => {
            form.reset(getCatalogDefaults());
            setIsCatalogModalOpen(false);
            toast.showToast({ message: "Prețul a fost adăugat în catalog.", variant: "success" });
          },
        })}
        workTypes={workTypesQuery.data ?? []}
      />
      <AgreementModal
        catalogItems={catalogQuery.data?.items ?? []}
        clinics={clinicsQuery.data ?? []}
        currency={currency}
        doctors={doctorsQuery.data ?? []}
        isOpen={isAgreementModalOpen}
        isSaving={createAgreementMutation.isPending || replaceAgreementRulesMutation.isPending}
        onOpenChange={setIsAgreementModalOpen}
        onSubmit={(values, form) => createAgreementMutation.mutate(toAgreementInput(values), {
          onError: (error) => {
            applyApiErrorsToForm(form, error);
            toast.showToast({ message: getErrorMessage(error), title: "Acordul nu a fost creat", variant: "error" });
          },
          onSuccess: (agreement) => {
            replaceAgreementRulesMutation.mutate({ id: agreement.id, rules: [toAgreementRuleInput(values)] }, {
              onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Regulile acordului nu au fost salvate", variant: "error" }),
              onSuccess: () => {
                form.reset(getAgreementDefaults());
                setIsAgreementModalOpen(false);
                toast.showToast({ message: "Acordul comercial a fost creat.", variant: "success" });
              },
            });
          },
        })}
      />
      <CatalogDrawer
        canArchive={canArchive}
        canUpdate={canUpdate}
        currency={currency}
        item={selectedCatalogQuery.data ?? null}
        isLoading={selectedCatalogQuery.isLoading}
        isOpen={selectedCatalogId !== null}
        isSaving={updateCatalogMutation.isPending || archiveCatalogMutation.isPending || restoreCatalogMutation.isPending || replaceExecutionRulesMutation.isPending}
        locale={locale}
        onArchive={(id) => archiveCatalogMutation.mutate(id, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Prețul nu a fost arhivat", variant: "error" }),
          onSuccess: () => toast.showToast({ message: "Prețul a fost arhivat.", variant: "success" }),
        })}
        onOpenChange={(isOpen) => setSelectedCatalogId(isOpen ? selectedCatalogId : null)}
        onRestore={(id) => restoreCatalogMutation.mutate(id, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Prețul nu a fost reactivat", variant: "error" }),
          onSuccess: () => toast.showToast({ message: "Prețul a fost reactivat.", variant: "success" }),
        })}
        onRulesSubmit={(id, rules) => replaceExecutionRulesMutation.mutate({ id, rules }, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Termenele nu au fost salvate", variant: "error" }),
          onSuccess: () => toast.showToast({ message: "Termenele au fost salvate.", variant: "success" }),
        })}
        onSubmit={(id, values, form) => updateCatalogMutation.mutate({ id, input: toCatalogInput(values) }, {
          onError: (error) => {
            applyApiErrorsToForm(form, error);
            toast.showToast({ message: getErrorMessage(error), title: "Prețul nu a fost salvat", variant: "error" });
          },
          onSuccess: (item) => {
            form.reset(getCatalogDefaults(item));
            toast.showToast({ message: "Prețul a fost salvat.", variant: "success" });
          },
        })}
        workTypes={workTypesQuery.data ?? []}
      />
    </main>
  );
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="pricing-page"><section className="dl-container">{children}</section></main>;
}

function CatalogTab({
  active,
  catalogQuery,
  columns,
  onActiveChange,
  onRowAction,
  onSearchChange,
  search,
}: {
  readonly active: boolean | undefined;
  readonly catalogQuery: ReturnType<typeof usePricingCatalog>;
  readonly columns: readonly DataTableColumn<PriceCatalogItemSummary>[];
  readonly onActiveChange: (active: boolean | undefined) => void;
  readonly onRowAction: (item: PriceCatalogItemSummary) => void;
  readonly onSearchChange: (search: string) => void;
  readonly search: string;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog de prețuri</CardTitle>
        <CardDescription>Total: {catalogQuery.data?.total ?? 0}</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        <div className="pricing-page__filters">
          <TextInput label="Căutare" onChange={(event) => onSearchChange(event.target.value)} placeholder="Produs, categorie, cod lucrare" type="search" value={search} />
          <Select label="Status" onChange={(event) => onActiveChange(toApiActive(event.target.value))} options={activeOptions} value={fromApiActive(active)} />
        </div>
        <DataTable
          columns={columns}
          emptyMessage="Nu există prețuri pentru filtrele curente."
          error={catalogQuery.isError ? getErrorMessage(catalogQuery.error) : undefined}
          getRowKey={(item) => item.id}
          isLoading={catalogQuery.isLoading}
          onRowAction={onRowAction}
          rowActionLabel="Deschide"
          rows={catalogQuery.data?.items ?? []}
        />
      </CardContent>
    </Card>
  );
}

function AgreementsTab({
  active,
  agreementsQuery,
  canManage,
  columns,
  onActiveChange,
  onArchive,
  onSearchChange,
  search,
}: {
  readonly active: boolean | undefined;
  readonly agreementsQuery: ReturnType<typeof usePricingAgreements>;
  readonly canManage: boolean;
  readonly columns: readonly DataTableColumn<PricingAgreementSummary>[];
  readonly onActiveChange: (active: boolean | undefined) => void;
  readonly onArchive: (id: string) => void;
  readonly onSearchChange: (search: string) => void;
  readonly search: string;
}): ReactNode {
  const rows = agreementsQuery.data?.items ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acorduri comerciale</CardTitle>
        <CardDescription>Regulile de medic au prioritate doar când există o regulă aplicabilă.</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        <div className="pricing-page__filters">
          <TextInput label="Căutare" onChange={(event) => onSearchChange(event.target.value)} placeholder="Acord, clinică, medic" type="search" value={search} />
          <Select label="Status" onChange={(event) => onActiveChange(toApiActive(event.target.value))} options={activeOptions} value={fromApiActive(active)} />
        </div>
        <DataTable
          columns={[...columns, {
            header: "Acțiuni",
            id: "actions",
            renderCell: (item) => (
              <Button disabled={!canManage || !item.isActive} onClick={() => onArchive(item.id)} size="small" variant="outline">
                Arhivează
              </Button>
            ),
          }]}
          emptyMessage="Nu există acorduri comerciale pentru filtrele curente."
          error={agreementsQuery.isError ? getErrorMessage(agreementsQuery.error) : undefined}
          getRowKey={(item) => item.id}
          isLoading={agreementsQuery.isLoading}
          rows={rows}
        />
      </CardContent>
    </Card>
  );
}

function PreviewTab({
  canPreview,
  clinics,
  currency,
  doctors,
  locale,
  mutation,
  workTypes,
}: {
  readonly canPreview: boolean;
  readonly clinics: readonly { readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly doctors: readonly { readonly clinicId: string; readonly displayName: string; readonly id: string }[];
  readonly locale: string;
  readonly mutation: ReturnType<typeof useResolvePricingPreview>;
  readonly workTypes: readonly WorkTypeOption[];
}): ReactNode {
  const form = useForm<PreviewFormValues>({
    defaultValues: { clinicId: "", doctorId: "", evaluationDate: todayIsoDate(), quantity: 1, workTypeId: "" },
    resolver: zodResolver(previewFormSchema),
  });
  const selectedClinicId = form.watch("clinicId");
  const doctorOptions = doctors.filter((doctor) => !selectedClinicId || doctor.clinicId === selectedClinicId);

  function submit(values: PreviewFormValues): void {
    const input: PricingResolvePreviewInput = {
      clinicId: values.clinicId,
      doctorId: values.doctorId,
      ...(values.evaluationDate ? { evaluationDate: values.evaluationDate } : {}),
      quantity: values.quantity,
      workTypeId: values.workTypeId,
    };
    mutation.mutate(input);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview calcul preț</CardTitle>
        <CardDescription>Simulează regula aplicată fără să modifice lucrarea.</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        {!canPreview ? <ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea pricing.resolve_preview." /> : null}
        <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <FormGrid>
            <Select label="Clinică" options={clinics.map((clinic) => ({ label: clinic.name, value: clinic.id }))} placeholder="Alege clinica" {...form.register("clinicId")} />
            <Select label="Medic" options={doctorOptions.map((doctor) => ({ label: doctor.displayName, value: doctor.id }))} placeholder="Alege medicul" {...form.register("doctorId")} />
            <Select label="Tip lucrare" options={workTypes.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))} placeholder="Alege lucrarea" {...form.register("workTypeId")} />
            <NumberInput label="Cantitate" {...form.register("quantity", { valueAsNumber: true })} />
            <DateInput label="Data evaluării" {...form.register("evaluationDate")} />
          </FormGrid>
          <FormActions submitLabel="Calculează preview" isSubmitting={mutation.isPending} />
        </FormLayout>
        {mutation.data ? (
          <div className="pricing-page__summary-grid">
            <Metric label="Preț standard" value={formatMoneyMinor(mutation.data.standardUnitPriceMinor, currency, locale)} />
            <Metric label="Preț final" value={formatMoneyMinor(mutation.data.finalUnitPriceMinor, currency, locale)} />
            <Metric label="Total" value={formatMoneyMinor(mutation.data.totalPriceMinor, currency, locale)} />
            <Metric label="Sursă" value={mutation.data.source} />
            <p className="pricing-page__muted">{mutation.data.explanation}</p>
          </div>
        ) : null}
        {mutation.isError ? <ErrorState title="Preview indisponibil" description={getErrorMessage(mutation.error)} /> : null}
      </CardContent>
    </Card>
  );
}

function TermsTab({ items }: { readonly items: readonly PriceCatalogItemSummary[] }): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reguli de termen</CardTitle>
        <CardDescription>Regulile sunt pe produs și pe firma activă.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          allowMultiple
          items={items.map((item) => ({
            content: (
              <div className="pricing-page__chip-list">
                {item.executionTimeRules.length > 0 ? item.executionTimeRules.map((rule) => (
                  <span className="pricing-page__chip" key={rule.id}>{formatExecutionRule(rule)}</span>
                )) : <p className="pricing-page__muted">Nu există reguli de termen.</p>}
              </div>
            ),
            id: item.id,
            title: item.displayName,
          }))}
        />
      </CardContent>
    </Card>
  );
}

function AuditSourceTab(): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Istoric și sursă</CardTitle>
        <CardDescription>Istoricul operațional complet se păstrează server-side prin audit log.</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        <p className="pricing-page__muted">Catalogul demo a fost transcris manual numai din imaginea clară de prețuri Creative Dental. Materialele de facturare, formularele pacientului și documentele fiscale din `assets/` nu au fost procesate.</p>
        <p className="pricing-page__muted">Valorile ambigue sunt marcate în notele produsului și trebuie validate cu clienta înainte de folosire reală.</p>
      </CardContent>
    </Card>
  );
}

function CatalogModal({
  currency,
  initialItem,
  isOpen,
  isSaving,
  mode,
  onOpenChange,
  onSubmit,
  workTypes,
}: {
  readonly currency: string;
  readonly initialItem?: PriceCatalogItemSummary | null;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly mode: "create" | "update";
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: CatalogFormValues, form: ReturnType<typeof useForm<CatalogFormValues>>) => void;
  readonly workTypes: readonly WorkTypeOption[];
}): ReactNode {
  const form = useForm<CatalogFormValues>({
    defaultValues: getCatalogDefaults(initialItem),
    resolver: zodResolver(catalogFormSchema),
  });
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  useEffect(() => {
    form.reset(getCatalogDefaults(initialItem));
  }, [form, initialItem, isOpen]);
  useBeforeUnloadPrompt(isOpen && form.formState.isDirty);
  useEffect(() => {
    if (!isOpen || !form.formState.isDirty) {
      return undefined;
    }
    return registerOrganizationContextSwitchGuard(() => "Ai modificări nesalvate în catalogul de prețuri. Schimbi firma și pierzi modificările?");
  }, [form.formState.isDirty, isOpen]);

  return (
    <Modal
      closeOnBackdrop={!form.formState.isDirty}
      description={`Prețurile sunt în ${currency} și sunt salvate doar pentru firma activă.`}
      isOpen={isOpen}
      onOpenChange={closeGuard.handleOpenChange}
      size="lg"
      title={mode === "create" ? "Adaugă preț în catalog" : "Editează preț"}
    >
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form))(event)}>
        <FormGrid>
          <Select label="Tip lucrare" options={workTypes.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))} placeholder="Alege tipul" {...form.register("workTypeId")} />
          <TextInput label="Denumire comercială" {...form.register("displayName")} />
          <Select label="Categorie" options={pricingCategoryOptions} {...form.register("category")} />
          <Select label="Unitate" options={WORK_TYPE_UNITS.map((unit) => ({ label: formatWorkTypeUnit(unit), value: unit }))} {...form.register("unit")} />
          <NumberInput label="Preț standard" {...form.register("standardPriceDecimal")} />
          <NumberInput label="Ordine" {...form.register("sortOrder", { valueAsNumber: true })} />
          <FormGridFull>
            <Textarea label="Note" rows={3} {...form.register("notes")} />
          </FormGridFull>
          <FormGridFull>
            <Checkbox label="Activ" {...form.register("isActive")} />
          </FormGridFull>
        </FormGrid>
        <UnsavedChangesPrompt when={form.formState.isDirty} />
        <FormActions isSubmitting={isSaving} onReset={() => form.reset(getCatalogDefaults(initialItem))} submitLabel="Salvează" />
      </FormLayout>
      {closeGuard.confirmModal}
    </Modal>
  );
}

function CatalogInlineForm({
  currency,
  initialItem,
  isSaving,
  onSubmit,
  workTypes,
}: {
  readonly currency: string;
  readonly initialItem: PriceCatalogItemSummary;
  readonly isSaving: boolean;
  readonly onSubmit: (values: CatalogFormValues, form: ReturnType<typeof useForm<CatalogFormValues>>) => void;
  readonly workTypes: readonly WorkTypeOption[];
}): ReactNode {
  const form = useForm<CatalogFormValues>({
    defaultValues: getCatalogDefaults(initialItem),
    resolver: zodResolver(catalogFormSchema),
  });

  useEffect(() => {
    form.reset(getCatalogDefaults(initialItem));
  }, [form, initialItem]);
  useBeforeUnloadPrompt(form.formState.isDirty);
  useEffect(() => {
    if (!form.formState.isDirty) {
      return undefined;
    }
    return registerOrganizationContextSwitchGuard(() => "Ai modificări nesalvate în catalogul de prețuri. Schimbi firma și pierzi modificările?");
  }, [form.formState.isDirty]);

  return (
    <section className="pricing-page__drawer-section">
      <h3>Editor catalog</h3>
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form))(event)}>
        <FormGrid>
          <Select label="Tip lucrare" options={workTypes.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))} placeholder="Alege tipul" {...form.register("workTypeId")} />
          <TextInput label="Denumire comercială" {...form.register("displayName")} />
          <Select label="Categorie" options={pricingCategoryOptions} {...form.register("category")} />
          <Select label="Unitate" options={WORK_TYPE_UNITS.map((unit) => ({ label: formatWorkTypeUnit(unit), value: unit }))} {...form.register("unit")} />
          <NumberInput label={`Preț standard ${currency}`} {...form.register("standardPriceDecimal")} />
          <NumberInput label="Ordine" {...form.register("sortOrder", { valueAsNumber: true })} />
          <FormGridFull>
            <Textarea label="Note" rows={3} {...form.register("notes")} />
          </FormGridFull>
          <FormGridFull>
            <Checkbox label="Activ" {...form.register("isActive")} />
          </FormGridFull>
        </FormGrid>
        <UnsavedChangesPrompt when={form.formState.isDirty} />
        <FormActions isSubmitting={isSaving} onReset={() => form.reset(getCatalogDefaults(initialItem))} submitLabel="Salvează" />
      </FormLayout>
    </section>
  );
}

function CatalogDrawer(props: {
  readonly canArchive: boolean;
  readonly canUpdate: boolean;
  readonly currency: string;
  readonly item: PriceCatalogItemSummary | null;
  readonly isLoading: boolean;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly locale: string;
  readonly onArchive: (id: string) => void;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onRestore: (id: string) => void;
  readonly onRulesSubmit: (id: string, rules: readonly ExecutionTimeRuleInput[]) => void;
  readonly onSubmit: (id: string, values: CatalogFormValues, form: ReturnType<typeof useForm<CatalogFormValues>>) => void;
  readonly workTypes: readonly WorkTypeOption[];
}): ReactNode {
  const rulesForm = useForm<ExecutionRulesFormValues>({ resolver: zodResolver(executionRulesFormSchema) });
  useEffect(() => {
    if (props.item) {
      rulesForm.reset({ rulesJson: JSON.stringify(props.item.executionTimeRules.map(({ id, ...rule }) => rule), null, 2) });
    }
  }, [props.item, rulesForm]);

  if (!props.item && !props.isLoading) {
    return null;
  }

  return (
    <Drawer isOpen={props.isOpen} onOpenChange={props.onOpenChange} title="Detaliu preț">
      {props.isLoading ? <LoadingState text="Se încarcă prețul" /> : null}
      {props.item ? (
        <div className="pricing-page__stack">
          <div className="pricing-page__summary-grid">
            <Metric label="Preț standard" value={formatMoneyMinor(props.item.standardPriceMinor, props.currency, props.locale)} />
            <Metric label="Unitate" value={formatWorkTypeUnit(props.item.unit)} />
            <Metric label="Categorie" value={props.item.category} />
            <Metric label="Status" value={props.item.isActive ? "Activ" : "Arhivat"} />
          </div>
          <CatalogInlineForm
            currency={props.currency}
            initialItem={props.item}
            isSaving={props.isSaving}
            onSubmit={(values, form) => props.onSubmit(props.item?.id ?? "", values, form)}
            workTypes={props.workTypes}
          />
          <section className="pricing-page__drawer-section">
            <h3>Termene de execuție</h3>
            <Textarea className="pricing-page__json" label="Reguli JSON" {...rulesForm.register("rulesJson")} />
            <FormActions
              isSubmitting={props.isSaving}
              onReset={() => rulesForm.reset()}
              submitLabel="Salvează termene"
            />
            <Button
              disabled={!props.canUpdate}
              onClick={() => {
                try {
                  props.onRulesSubmit(props.item?.id ?? "", parseExecutionRulesJson(rulesForm.getValues("rulesJson")));
                } catch (error) {
                  rulesForm.setError("rulesJson", { message: getErrorMessage(error) });
                }
              }}
              variant="outline"
            >
              Aplică regulile
            </Button>
          </section>
          <section className="pricing-page__drawer-section">
            {props.item.isActive ? (
              <Button disabled={!props.canArchive || props.isSaving} onClick={() => props.onArchive(props.item?.id ?? "")} variant="danger">Arhivează prețul</Button>
            ) : (
              <Button disabled={!props.canArchive || props.isSaving} onClick={() => props.onRestore(props.item?.id ?? "")} variant="outline">Reactivează prețul</Button>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

function AgreementModal({
  catalogItems,
  clinics,
  currency,
  doctors,
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  readonly catalogItems: readonly PriceCatalogItemSummary[];
  readonly clinics: readonly { readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly doctors: readonly { readonly clinicId: string; readonly displayName: string; readonly id: string }[];
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: AgreementFormValues, form: ReturnType<typeof useForm<AgreementFormValues>>) => void;
}): ReactNode {
  const form = useForm<AgreementFormValues>({
    defaultValues: getAgreementDefaults(),
    resolver: zodResolver(agreementFormSchema),
  });
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const subjectType = form.watch("subjectType");
  const scope = form.watch("scope");
  const adjustmentType = form.watch("adjustmentType");
  useBeforeUnloadPrompt(isOpen && form.formState.isDirty);
  useEffect(() => {
    if (!isOpen || !form.formState.isDirty) {
      return undefined;
    }
    return registerOrganizationContextSwitchGuard(() => "Ai modificări nesalvate în acordul comercial. Schimbi firma și pierzi modificările?");
  }, [form.formState.isDirty, isOpen]);

  return (
    <Modal closeOnBackdrop={!form.formState.isDirty} description="Primul set de reguli se poate introduce la creare; reguli suplimentare se adaugă ulterior în administrare." isOpen={isOpen} onOpenChange={closeGuard.handleOpenChange} size="lg" title="Adaugă acord comercial">
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form))(event)}>
        <FormGrid>
          <TextInput label="Nume acord" {...form.register("name")} />
          <Select label="Subiect" options={subjectTypeOptions} {...form.register("subjectType")} />
          {subjectType === "CLINIC" ? <Select label="Clinică" options={clinics.map((clinic) => ({ label: clinic.name, value: clinic.id }))} placeholder="Alege clinica" {...form.register("clinicId")} /> : null}
          {subjectType === "DOCTOR" ? <Select label="Medic" options={doctors.map((doctor) => ({ label: doctor.displayName, value: doctor.id }))} placeholder="Alege medicul" {...form.register("doctorId")} /> : null}
          <DateInput label="Valabil de la" {...form.register("validFrom")} />
          <DateInput label="Valabil până la" {...form.register("validUntil")} />
          <Select label="Scope regulă" options={scopeOptions} {...form.register("scope")} />
          {scope === "CATEGORY" ? <Select label="Categorie" options={pricingCategoryOptions} placeholder="Alege categoria" {...form.register("category")} /> : null}
          {scope === "ITEM" ? <Select label="Produs catalog" options={catalogItems.map((item) => ({ label: item.displayName, value: item.id }))} placeholder="Alege produsul" {...form.register("priceCatalogItemId")} /> : null}
          <Select label="Tip ajustare" options={adjustmentTypeOptions} {...form.register("adjustmentType")} />
          {adjustmentType === "FIXED_AMOUNT" ? <NumberInput label={`Ajustare ${currency}`} {...form.register("adjustmentDecimal")} /> : null}
          {adjustmentType === "PERCENTAGE" ? <NumberInput label="Ajustare procentuală" {...form.register("adjustmentPercentage")} /> : null}
          {adjustmentType === "OVERRIDE_PRICE" ? <NumberInput label={`Preț final ${currency}`} {...form.register("overridePriceDecimal")} /> : null}
          <FormGridFull>
            <Textarea label="Note" rows={3} {...form.register("notes")} />
          </FormGridFull>
        </FormGrid>
        <UnsavedChangesPrompt when={form.formState.isDirty} />
        <FormActions isSubmitting={isSaving} onReset={() => form.reset(getAgreementDefaults())} submitLabel="Salvează acord" />
      </FormLayout>
      {closeGuard.confirmModal}
    </Modal>
  );
}

function getAgreementDefaults(): AgreementFormValues {
  return {
    adjustmentDecimal: "",
    adjustmentPercentage: "10",
    adjustmentType: "PERCENTAGE",
    category: "",
    clinicId: "",
    doctorId: "",
    name: "",
    notes: "",
    overridePriceDecimal: "",
    priceCatalogItemId: "",
    scope: "ALL",
    subjectType: "CLINIC",
    validFrom: todayIsoDate(),
    validUntil: "",
  };
}

function Metric({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  return <div className="pricing-page__metric"><span>{label}</span><strong>{value}</strong></div>;
}
