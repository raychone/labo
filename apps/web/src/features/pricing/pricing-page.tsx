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
  type DataTableSort,
} from "@dental-lab/ui";
import {
  decimalStringToMinor,
  formatExecutionRule,
  formatMoneyMinor,
  formatWorkTypeUnit,
  minorToDecimalString,
  type ExecutionTimeRuleInput,
  type PriceCatalogItemInput,
  type PriceCatalogItemSummary,
  type PricingAgreementDetail,
  type PricingAgreementInput,
  type PricingAgreementListParams,
  type PricingAgreementRuleInput,
  type PricingAgreementSummary,
  type PricingCatalogListParams,
  type PricingResolvePreviewInput,
  type TechnicianOperationInput,
  type TechnicianOperationSummary,
  type TechnicianOperationsListParams,
  type WorkTypeOption,
  type ProbeTypeView,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { registerOrganizationContextSwitchGuard } from "../organization-context/organization-context-switch-guards.js";
import { useSettings } from "../settings/settings-api.js";
import { hasPermission } from "../users/users-api.js";
import { useCreateWorkType, useUpdateWorkType, useWorkType, useWorkTypeOptions } from "../work-types/work-types-api.js";
import { useAllProbeTypes, useCreateProbeType, useUpdateProbeType } from "../works/works-api.js";
import {
  useArchivePricingAgreement,
  useArchivePricingCatalogItem,
  useCreatePricingAgreement,
  useRestorePricingAgreement,
  useUpdatePricingAgreement,
  usePricingAgreement,
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
  useArchiveTechnicianOperation,
  useCreateTechnicianOperation,
  useRestoreTechnicianOperation,
  useTechnicianOperations,
  useUpdateTechnicianOperation,
} from "./technician-operations-api.js";
import {
  agreementFormSchema,
  catalogFormSchema,
  previewFormSchema,
  pricingCategoryOptions,
  technicianOperationFormSchema,
  type AgreementFormValues,
  type CatalogFormValues,
  type PreviewFormValues,
  type TechnicianOperationFormValues,
} from "./pricing-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard } from "../../lib/form-utils.js";
import "./pricing-page.css";

const activeOptions = [
  { label: "Active", value: "active" },
  { label: "Arhivate", value: "archived" },
  { label: "Toate", value: "all" },
] as const;

type PricingTabId = "catalog" | "agreements" | "probe-types" | "operations" | "archive";

function isPricingTabId(value: string | null): value is PricingTabId {
  return value === "catalog" || value === "agreements" || value === "probe-types" || value === "operations" || value === "archive";
}

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

const workTypeUnitOptions = [
  { label: "Element", value: "ELEMENT" },
  { label: "Bucată", value: "UNIT" },
] as const;

const workTypeColorPalette = ["#FACC15", "#F97316", "#DC2626", "#7C3AED", "#2563EB", "#0891B2", "#16A34A", "#DB2777", "#92400E", "#64748B", "#111827", "#FFFFFF"] as const;

function WorkTypeColorPicker({ disabled, onChange, value }: { readonly disabled?: boolean; readonly onChange: (value: string) => void; readonly value: string }): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  return <>
    <Button disabled={disabled} onClick={() => setIsOpen(true)} type="button" variant="outline">
      <span className="pricing-page__color-preview" style={{ backgroundColor: value || "transparent" }} />
      Culoare
    </Button>
    <Modal isOpen={isOpen} onOpenChange={setIsOpen} size="sm" title="Alege culoarea">
      <div className="pricing-page__color-picker">
        <div className="pricing-page__color-grid" aria-label="Paletă culori tip lucrare" role="group">
          {workTypeColorPalette.map((color) => <button aria-label={`Alege ${color}`} className={value.toUpperCase() === color ? "is-selected" : undefined} key={color} onClick={() => { onChange(color); setIsOpen(false); }} style={{ backgroundColor: color }} type="button" />)}
        </div>
        <div className="pricing-page__color-custom">
          <input aria-label="Culoare personalizată" type="color" value={value || "#F97316"} onChange={(event) => onChange(event.target.value.toUpperCase())} />
          <TextInput label="Cod culoare" placeholder="#F97316" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} />
        </div>
      </div>
    </Modal>
  </>;
}

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
    colorHex: "",
    displayName: item?.displayName ?? "",
    executionDays: String(item?.executionTimeRules.find((rule) => rule.isActive && rule.minQuantity === 1)?.executionDays ?? 1) as "1" | "2" | "3" | "4" | "5" | "6",
    isActive: item?.isActive ?? true,
    notes: item?.notes ?? "",
    sortOrder: item?.sortOrder ?? 0,
    standardPriceDecimal: item ? minorToDecimalString(item.standardPriceMinor) : "",
    unit: item?.unit ?? "ELEMENT",
    workTypeId: item?.workType.id,
    workTypeName: item?.workType.name,
    workTypeSymbol: item?.workType.symbol,
    workTypeDescription: undefined,
  };
}

function toCatalogInput(values: CatalogFormValues): PriceCatalogItemInput {
  const price = decimalStringToMinor(values.standardPriceDecimal);
  if (!price.ok) {
    throw new Error(price.error);
  }

  return {
    category: values.category,
    displayName: values.displayName || values.workTypeName || "",
    isActive: values.isActive,
    notes: values.notes || null,
    sortOrder: values.sortOrder,
    standardPriceMinor: price.value,
    unit: values.unit,
    workTypeId: values.workTypeId ?? "",
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

type AgreementRuleDraft = {
  readonly adjustmentDecimal: string;
  readonly adjustmentPercentage: string;
  readonly adjustmentType: "FIXED_AMOUNT" | "PERCENTAGE" | "OVERRIDE_PRICE";
  readonly category: string;
  readonly overridePriceDecimal: string;
  readonly priceCatalogItemId: string;
  readonly scope: "ALL" | "CATEGORY" | "ITEM";
};

function agreementRuleToDraft(rule: PricingAgreementDetail["rules"][number]): AgreementRuleDraft {
  return {
    adjustmentDecimal: rule.adjustmentValueMinor == null ? "" : minorToDecimalString(rule.adjustmentValueMinor),
    adjustmentPercentage: rule.adjustmentPercentageBasisPoints == null ? "" : String(rule.adjustmentPercentageBasisPoints / 100),
    adjustmentType: rule.adjustmentType as AgreementRuleDraft["adjustmentType"],
    category: rule.category ?? "",
    overridePriceDecimal: rule.overridePriceMinor == null ? "" : minorToDecimalString(rule.overridePriceMinor),
    priceCatalogItemId: rule.priceCatalogItemId ?? "",
    scope: rule.scope as AgreementRuleDraft["scope"],
  };
}

function agreementRuleDraftToInput(draft: AgreementRuleDraft): PricingAgreementRuleInput {
  const fixed = draft.adjustmentDecimal ? decimalStringToMinor(draft.adjustmentDecimal) : { ok: true, value: 0 } as const;
  const override = draft.overridePriceDecimal ? decimalStringToMinor(draft.overridePriceDecimal) : { ok: true, value: 0 } as const;
  return {
    adjustmentPercentageBasisPoints: draft.adjustmentType === "PERCENTAGE" ? Math.round(Number(draft.adjustmentPercentage.replace(",", ".") || 0) * 100) : null,
    adjustmentType: draft.adjustmentType,
    adjustmentValueMinor: draft.adjustmentType === "FIXED_AMOUNT" && fixed.ok ? fixed.value : null,
    category: draft.scope === "CATEGORY" ? draft.category || null : null,
    overridePriceMinor: draft.adjustmentType === "OVERRIDE_PRICE" && override.ok ? override.value : null,
    priceCatalogItemId: draft.scope === "ITEM" ? draft.priceCatalogItemId || null : null,
    scope: draft.scope,
  };
}

function getEffectiveCatalogPrice(item: PriceCatalogItemSummary, agreement: PricingAgreementDetail | null): number {
  if (!agreement) return item.standardPriceMinor;
  const rule = agreement.rules.find((candidate) => candidate.scope === "ITEM" && candidate.priceCatalogItemId === item.id)
    ?? agreement.rules.find((candidate) => candidate.scope === "CATEGORY" && candidate.category === item.category)
    ?? agreement.rules.find((candidate) => candidate.scope === "ALL");
  if (!rule) return item.standardPriceMinor;
  if (rule.adjustmentType === "FIXED_AMOUNT") return item.standardPriceMinor - (rule.adjustmentValueMinor ?? 0);
  if (rule.adjustmentType === "PERCENTAGE") return Math.round((item.standardPriceMinor * (10_000 - (rule.adjustmentPercentageBasisPoints ?? 0))) / 10_000);
  return rule.overridePriceMinor ?? item.standardPriceMinor;
}

function getTechnicianOperationDefaults(operation?: TechnicianOperationSummary | null): TechnicianOperationFormValues {
  return {
    category: operation?.category ?? "Altele",
    code: operation?.code ?? "",
    description: operation?.description ?? "",
    name: operation?.name ?? "",
  };
}

function toTechnicianOperationInput(values: TechnicianOperationFormValues): TechnicianOperationInput {
  return {
    category: values.category,
    code: values.code,
    description: values.description || null,
    name: values.name,
  };
}

export function PricingPage(): ReactNode {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: PricingTabId = isPricingTabId(requestedTab) ? requestedTab : "catalog";
  const [catalogParams, setCatalogParams] = useState<PricingCatalogListParams>({
    active: true,
    page: 1,
    pageSize: 20,
    sortBy: "sortOrder",
    sortDirection: "asc",
  });
  const [archiveParams, setArchiveParams] = useState<PricingCatalogListParams>({
    active: false,
    page: 1,
    pageSize: 20,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const [agreementParams, setAgreementParams] = useState<PricingAgreementListParams>({
    active: true,
    page: 1,
    pageSize: 100,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const [operationParams, setOperationParams] = useState<TechnicianOperationsListParams>({
    isActive: true,
    page: 1,
    pageSize: 20,
    sortBy: "name",
    sortDirection: "asc",
  });
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isProbeTypeModalOpen, setIsProbeTypeModalOpen] = useState(false);
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<TechnicianOperationSummary | null>(null);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);
  const [catalogAudience, setCatalogAudience] = useState<"STANDARD" | "CLINIC" | "DOCTOR">("STANDARD");
  const [catalogAudienceId, setCatalogAudienceId] = useState("");

  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "pricing.read");
  const canCreate = hasPermission(permissionsQuery.data, "pricing.create");
  const canUpdate = hasPermission(permissionsQuery.data, "pricing.update");
  const canArchive = hasPermission(permissionsQuery.data, "pricing.archive");
  const canReadAgreements = hasPermission(permissionsQuery.data, "pricing.agreements.read");
  const canManageAgreements = hasPermission(permissionsQuery.data, "pricing.agreements.manage");
  const canPreview = hasPermission(permissionsQuery.data, "pricing.resolve_preview");
  const canManageProbeTypes = hasPermission(permissionsQuery.data, "probe_types.manage");
  const canReadOperations = hasPermission(permissionsQuery.data, "technician.operations.read");
  const canManageOperations = hasPermission(permissionsQuery.data, "technician.rates.manage");
  const settingsQuery = useSettings(canRead);
  const catalogQuery = usePricingCatalog(catalogParams, canRead);
  const archiveQuery = usePricingCatalog(archiveParams, canRead);
  const agreementsQuery = usePricingAgreements(agreementParams, canRead && canReadAgreements);
  const operationsQuery = useTechnicianOperations(operationParams, canReadOperations);
  const selectedAudienceAgreement = (agreementsQuery.data?.items ?? []).find((agreement) => {
    if (catalogAudience === "STANDARD" || agreement.subjectType !== catalogAudience) return false;
    return catalogAudience === "CLINIC" ? agreement.clinic?.id === catalogAudienceId : agreement.doctor?.id === catalogAudienceId;
  });
  const audienceAgreementQuery = usePricingAgreement(selectedAudienceAgreement?.id ?? null, canRead && canReadAgreements);
  const selectedAgreementQuery = usePricingAgreement(selectedAgreementId, canRead && canReadAgreements);
  const selectedCatalogQuery = usePricingCatalogItem(selectedCatalogId, canRead);
  const workTypesQuery = useWorkTypeOptions(canRead);
  const probeTypesQuery = useAllProbeTypes(canRead);
  const clinicsQuery = useQuery({ enabled: canRead, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorsQuery = useQuery({ enabled: canRead, queryFn: () => fetchDoctorOptions(), queryKey: ["doctors", "options"], retry: false });
  const createCatalogMutation = useCreatePricingCatalogItem();
  const createWorkTypeMutation = useCreateWorkType();
  const updateCatalogMutation = useUpdatePricingCatalogItem();
  const archiveCatalogMutation = useArchivePricingCatalogItem();
  const restoreCatalogMutation = useRestorePricingCatalogItem();
  const replaceExecutionRulesMutation = useReplaceExecutionRules();
  const createAgreementMutation = useCreatePricingAgreement();
  const replaceAgreementRulesMutation = useReplacePricingAgreementRules();
  const archiveAgreementMutation = useArchivePricingAgreement();
  const restoreAgreementMutation = useRestorePricingAgreement();
  const updateAgreementMutation = useUpdatePricingAgreement();
  const previewMutation = useResolvePricingPreview();
  const createOperationMutation = useCreateTechnicianOperation();
  const updateOperationMutation = useUpdateTechnicianOperation();
  const archiveOperationMutation = useArchiveTechnicianOperation();
  const restoreOperationMutation = useRestoreTechnicianOperation();
  const currency = settingsQuery.data?.currency ?? "RON";
  const locale = settingsQuery.data?.locale ?? "ro-RO";
  void canPreview;
  void previewMutation;
  void PreviewTab;
  void TermsTab;
  void AuditSourceTab;

  const catalogColumns = useMemo<readonly DataTableColumn<PriceCatalogItemSummary>[]>(() => [
    { header: "Categorie", id: "category", isSortable: true, renderCell: (item) => item.category },
    { header: "Tip lucrare", id: "displayName", isSortable: true, renderCell: (item) => item.workType.name },
    { header: "Simbol", id: "symbol", renderCell: (item) => item.workType.symbol },
    { align: "right", header: catalogAudience === "STANDARD" ? "Preț standard" : "Preț client", id: "standardPriceMinor", isSortable: true, renderCell: (item) => formatMoneyMinor(getEffectiveCatalogPrice(item, catalogAudience === "STANDARD" ? null : audienceAgreementQuery.data ?? null), currency, locale) },
    { header: "Unitate", id: "unit", renderCell: (item) => formatWorkTypeUnit(item.unit) },
    { header: "Status", id: "status", renderCell: (item) => <StatusBadge label={item.isActive ? "Activ" : "Arhivat"} variant={item.isActive ? "approved" : "closed"} /> },
  ], [audienceAgreementQuery.data, catalogAudience, currency, locale]);
  const archiveColumns = useMemo<readonly DataTableColumn<PriceCatalogItemSummary>[]>(() => [
    { header: "Categorie", id: "category", isSortable: true, renderCell: (item) => item.category },
    { header: "Tip lucrare", id: "displayName", isSortable: true, renderCell: (item) => item.workType.name },
    { header: "Simbol", id: "symbol", renderCell: (item) => item.workType.symbol },
    { align: "right", header: "Preț standard", id: "standardPriceMinor", isSortable: true, renderCell: (item) => formatMoneyMinor(item.standardPriceMinor, currency, locale) },
    { header: "Unitate", id: "unit", renderCell: (item) => formatWorkTypeUnit(item.unit) },
    { header: "Status", id: "status", renderCell: () => <StatusBadge label="Arhivat" variant="closed" /> },
  ], [currency, locale]);
  const agreementColumns = useMemo<readonly DataTableColumn<PricingAgreementSummary>[]>(() => [
    { header: "Acord", id: "name", renderCell: (item) => item.name },
    { header: "Subiect", id: "subject", renderCell: (item) => item.clinic?.name ?? item.doctor?.displayName ?? "-" },
    { header: "Tip", id: "subjectType", renderCell: (item) => item.subjectType === "CLINIC" ? "Clinică" : "Medic" },
    { header: "Valabil", id: "validFrom", renderCell: (item) => `${item.validFrom.slice(0, 10)} - ${item.validUntil?.slice(0, 10) ?? "fără limită"}` },
    { header: "Reguli", id: "rules", renderCell: (item) => item.ruleCount },
    { header: "Status", id: "status", renderCell: (item) => <StatusBadge label={item.isActive ? "Activ" : "Arhivat"} variant={item.isActive ? "approved" : "closed"} /> },
  ], []);
  const operationColumns = useMemo<readonly DataTableColumn<TechnicianOperationSummary>[]>(() => [
    { header: "Cod", id: "code", isSortable: true, renderCell: (item) => item.code },
    { header: "Manoperă", id: "name", isSortable: true, renderCell: (item) => item.name },
    { header: "Categorie", id: "category", renderCell: (item) => item.category },
    { header: "Descriere", id: "description", renderCell: (item) => item.description ?? "-" },
    { header: "Status", id: "status", renderCell: (item) => <StatusBadge label={item.isActive ? "Activ" : "Arhivat"} variant={item.isActive ? "approved" : "closed"} /> },
    {
      header: "Acțiuni",
      id: "actions",
      renderCell: (item) => (
        <div className="pricing-page__table-actions">
          {item.isActive ? <Button disabled={!canManageOperations} onClick={() => { setSelectedOperation(item); setIsOperationModalOpen(true); }} size="small" variant="outline">Editează</Button> : null}
          {item.isActive ? <Button disabled={!canManageOperations} onClick={() => archiveOperationMutation.mutate(item.id, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost arhivată", variant: "error" }),
            onSuccess: () => toast.showToast({ message: "Manopera a fost arhivată.", variant: "success" }),
          })} size="small" variant="outline">Arhivează</Button> : <Button disabled={!canManageOperations} onClick={() => restoreOperationMutation.mutate(item.id, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost reactivată", variant: "error" }),
            onSuccess: () => toast.showToast({ message: "Manopera a fost reactivată.", variant: "success" }),
          })} size="small" variant="outline">Reactivează</Button>}
        </div>
      ),
    },
  ], [archiveOperationMutation, canManageOperations, restoreOperationMutation, toast]);
  function updateActiveTab(tab: PricingTabId): void {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  }

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
            <nav aria-label="Navigare contextuală" className="pricing-page__breadcrumb"><Link to="/status">Status</Link><span aria-hidden="true">/</span><span>Setări lucrări</span></nav>
            <h1 id="pricing-title">Setări lucrări</h1>
            <p>Administrează catalogul de lucrări, acordurile comerciale și tipurile de probă.</p>
            <p className="pricing-page__company">Firmă activă: <strong>{settingsQuery.data?.legalEntityDisplayName ?? "-"}</strong></p>
          </div>
          <div className="pricing-page__actions">
            {activeTab === "catalog" ? <><Button onClick={() => window.print()} variant="outline">Printează catalogul</Button><Button disabled={!canCreate} onClick={() => setIsCatalogModalOpen(true)}>Adaugă tip lucrare</Button></> : null}
            {activeTab === "agreements" ? <Button disabled={!canManageAgreements} onClick={() => setIsAgreementModalOpen(true)}>Adaugă acord</Button> : null}
            {activeTab === "probe-types" && canManageProbeTypes ? <Button onClick={() => setIsProbeTypeModalOpen(true)}>Adaugă tip probă</Button> : null}
            {activeTab === "operations" && canManageOperations ? <Button onClick={() => { setSelectedOperation(null); setIsOperationModalOpen(true); }}>Adaugă manoperă</Button> : null}
          </div>
        </header>
        {!canUpdate ? <p className="pricing-page__readonly">Ai acces de citire. Modificările de preț cer permisiuni financiare explicite.</p> : null}

        <Tabs
          className="pricing-page__workspace-tabs"
          onValueChange={(value) => updateActiveTab(isPricingTabId(value) ? value : "catalog")}
          tabs={[
            {
              content: (
                <CatalogTab
                  active={catalogParams.active}
                  catalogQuery={catalogQuery}
                  columns={catalogColumns}
                  archived={false}
                  audience={catalogAudience}
                  audienceId={catalogAudienceId}
                  clinics={clinicsQuery.data ?? []}
                  doctors={doctorsQuery.data ?? []}
                  onAudienceChange={(value) => { setCatalogAudience(value); setCatalogAudienceId(""); }}
                  onAudienceIdChange={setCatalogAudienceId}
                  onActiveChange={(active) => setCatalogParams((current) => ({ ...current, active, page: 1 }))}
                  onCategoryChange={(category) => setCatalogParams((current) => ({ ...current, category: category || undefined, page: 1 }))}
                  onRowAction={(item) => setSelectedCatalogId(item.id)}
                  onSearchChange={(search) => setCatalogParams((current) => ({ ...current, page: 1, search: search || undefined }))}
                  printPrice={(item) => formatMoneyMinor(getEffectiveCatalogPrice(item, catalogAudience === "STANDARD" ? null : audienceAgreementQuery.data ?? null), currency, locale)}
                  search={catalogParams.search ?? ""}
                  category={catalogParams.category ?? ""}
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
                  onEdit={(id) => { setSelectedAgreementId(id); setIsAgreementModalOpen(true); }}
                  onRestore={(id) => restoreAgreementMutation.mutate(id, {
                    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Acordul nu a fost reactivat", variant: "error" }),
                    onSuccess: () => toast.showToast({ message: "Acordul a fost reactivat.", variant: "success" }),
                  })}
                  onSearchChange={(search) => setAgreementParams((current) => ({ ...current, page: 1, search: search || undefined }))}
                  search={agreementParams.search ?? ""}
                />
              ),
              id: "agreements",
              label: "Acorduri",
            },
            {
              content: <ProbeTypeCatalogCard canManage={canManageProbeTypes} isEditorOpen={isProbeTypeModalOpen} isLoading={probeTypesQuery.isLoading} onEditorOpenChange={setIsProbeTypeModalOpen} probeTypes={probeTypesQuery.data ?? []} showAddAction={false} />,
              id: "probe-types",
              label: "Tipuri de probă",
            },
            {
              content: (
                <TechnicianOperationsCatalog
                  active={operationParams.isActive}
                  canRead={canReadOperations}
                  columns={operationColumns}
                  onActiveChange={(isActive) => setOperationParams((current) => ({ ...current, isActive, page: 1 }))}
                  onPageChange={(page) => setOperationParams((current) => ({ ...current, page }))}
                  onSearchChange={(search) => setOperationParams((current) => ({ ...current, page: 1, search: search || undefined }))}
                  onSortChange={(sort) => setOperationParams((current) => ({ ...current, page: 1, sortBy: sort.columnId === "code" ? "code" : "name", sortDirection: sort.direction === "ascending" ? "asc" : "desc" }))}
                  operationParams={operationParams}
                  operationsQuery={operationsQuery}
                  search={operationParams.search ?? ""}
                />
              ),
              id: "operations",
              label: "Manopere",
            },
            {
              content: <CatalogTab active={archiveParams.active} archived audience="STANDARD" audienceId="" category={archiveParams.category ?? ""} clinics={[]} doctors={[]} catalogQuery={archiveQuery} columns={archiveColumns} onActiveChange={() => undefined} onAudienceChange={() => undefined} onAudienceIdChange={() => undefined} onCategoryChange={(category) => setArchiveParams((current) => ({ ...current, category: category || undefined, page: 1 }))} onRestore={(id) => restoreCatalogMutation.mutate(id, { onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Tipul nu a fost reactivat", variant: "error" }), onSuccess: () => toast.showToast({ message: "Tipul de lucrare a fost reactivat.", variant: "success" }) })} onRowAction={(item) => setSelectedCatalogId(item.id)} onSearchChange={(search) => setArchiveParams((current) => ({ ...current, page: 1, search: search || undefined }))} printPrice={(item) => formatMoneyMinor(item.standardPriceMinor, currency, locale)} search={archiveParams.search ?? ""} />,
              id: "archive",
              label: "Arhivă",
            },
          ]}
          value={activeTab}
        />
      </section>

      <TechnicianOperationModal
        initialOperation={selectedOperation}
        isOpen={isOperationModalOpen}
        isSaving={createOperationMutation.isPending || updateOperationMutation.isPending}
        onOpenChange={(isOpen) => { setIsOperationModalOpen(isOpen); if (!isOpen) setSelectedOperation(null); }}
        onSubmit={(values, form) => {
          const input = toTechnicianOperationInput(values);
          const onError = (error: unknown) => {
            applyApiErrorsToForm(form, error);
            toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost salvată", variant: "error" });
          };
          const onSuccess = () => {
            setIsOperationModalOpen(false);
            setSelectedOperation(null);
            toast.showToast({ message: selectedOperation ? "Manopera a fost modificată." : "Manopera a fost creată.", variant: "success" });
          };
          if (selectedOperation) updateOperationMutation.mutate({ id: selectedOperation.id, input }, { onError, onSuccess });
          else createOperationMutation.mutate(input, { onError, onSuccess });
        }}
      />

      <CatalogModal
        currency={currency}
        isOpen={isCatalogModalOpen}
        isSaving={createCatalogMutation.isPending || createWorkTypeMutation.isPending || replaceExecutionRulesMutation.isPending}
        mode="create"
        onOpenChange={setIsCatalogModalOpen}
        onSubmit={(values, form) => {
          const price = decimalStringToMinor(values.standardPriceDecimal);
          if (!price.ok) {
            toast.showToast({ message: price.error, title: "Preț invalid", variant: "error" });
            return;
          }
          const createCatalog = (workTypeId: string) => createCatalogMutation.mutate({ ...toCatalogInput({ ...values, workTypeId }), workTypeId }, {
            onError: (error) => {
              applyApiErrorsToForm(form, error);
              toast.showToast({ message: getErrorMessage(error), title: "Tipul nu a fost creat în catalog", variant: "error" });
            },
            onSuccess: (catalogItem) => {
              replaceExecutionRulesMutation.mutate({ id: catalogItem.id, rules: [{ executionDays: Number(values.executionDays), isActive: true, maxQuantity: null, minQuantity: 1, priority: 0, requiresManualDueDate: false }] }, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Termenul nu a fost salvat", variant: "error" }),
                onSuccess: () => {
                  form.reset(getCatalogDefaults());
                  setIsCatalogModalOpen(false);
                  toast.showToast({ message: "Tipul de lucrare a fost adăugat în catalog.", variant: "success" });
                },
              });
            },
          });
          if (values.workTypeId) {
            createCatalog(values.workTypeId);
            return;
          }
          createWorkTypeMutation.mutate({
            basePriceMinor: price.value,
            colorHex: values.colorHex || null,
            description: values.workTypeDescription || null,
            name: values.workTypeName ?? "",
            symbol: values.workTypeSymbol ?? "",
            unit: values.unit,
          }, {
            onError: (error) => {
              applyApiErrorsToForm(form, error);
              toast.showToast({ message: getErrorMessage(error), title: "Tipul de lucrare nu a fost creat", variant: "error" });
            },
            onSuccess: (workType) => createCatalog(workType.id),
          });
        }}
        workTypes={workTypesQuery.data ?? []}
      />
      <AgreementModal
        catalogItems={catalogQuery.data?.items ?? []}
        clinics={clinicsQuery.data ?? []}
        currency={currency}
        doctors={doctorsQuery.data ?? []}
        isOpen={isAgreementModalOpen}
        initialAgreement={selectedAgreementQuery.data ?? null}
        isSaving={createAgreementMutation.isPending || updateAgreementMutation.isPending || replaceAgreementRulesMutation.isPending}
        mode={selectedAgreementId ? "edit" : "create"}
        onOpenChange={(isOpen) => { setIsAgreementModalOpen(isOpen); if (!isOpen) setSelectedAgreementId(null); }}
        onSubmit={(values, form, additionalRules) => {
          const isEditing = Boolean(selectedAgreementId);
          const saveRules = (agreementId: string) => replaceAgreementRulesMutation.mutate({
            id: agreementId,
            rules: [toAgreementRuleInput(values), ...additionalRules],
          }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Regulile acordului nu au fost salvate", variant: "error" }),
            onSuccess: () => {
              form.reset(getAgreementDefaults());
              setIsAgreementModalOpen(false);
              setSelectedAgreementId(null);
              toast.showToast({ message: isEditing ? "Acordul comercial a fost salvat." : "Acordul comercial a fost creat.", variant: "success" });
            },
          });
          if (isEditing) {
            updateAgreementMutation.mutate({ id: selectedAgreementId ?? "", input: toAgreementInput(values) }, {
              onError: (error) => {
                applyApiErrorsToForm(form, error);
                toast.showToast({ message: "Acordul nu a fost salvat", title: "Acordul nu a fost salvat", variant: "error" });
              },
              onSuccess: (agreement) => saveRules(agreement.id),
            });
          } else {
            createAgreementMutation.mutate(toAgreementInput(values), {
              onError: (error) => {
                applyApiErrorsToForm(form, error);
                toast.showToast({ message: "Acordul nu a fost creat", title: "Acordul nu a fost creat", variant: "error" });
              },
              onSuccess: (agreement) => saveRules(agreement.id),
            });
          }
        }}
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

/** Consolidated manager workspace. Kept as an alias while legacy imports are removed. */
export function WorkSettingsPage(): ReactNode {
  return <PricingPage />;
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="pricing-page"><section className="dl-container">{children}</section></main>;
}

export function ProbeTypeCatalogCard({
  canManage,
  isEditorOpen: controlledEditorOpen,
  isLoading,
  onEditorOpenChange,
  probeTypes,
  showAddAction = true,
}: {
  readonly canManage: boolean;
  readonly isEditorOpen?: boolean;
  readonly isLoading: boolean;
  readonly onEditorOpenChange?: (isOpen: boolean) => void;
  readonly probeTypes: readonly ProbeTypeView[];
  readonly showAddAction?: boolean;
}): ReactNode {
  const toast = useToast();
  const createMutation = useCreateProbeType();
  const updateMutation = useUpdateProbeType();
  const [internalEditorOpen, setInternalEditorOpen] = useState(false);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const isEditorOpen = controlledEditorOpen ?? internalEditorOpen;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function setEditorOpen(isOpen: boolean): void {
    setInternalEditorOpen(isOpen);
    onEditorOpenChange?.(isOpen);
  }

  function resetForm(): void {
    setEditingId(null);
    setName("");
    setSortOrder("0");
  }

  function closeEditor(): void {
    resetForm();
    setEditorOpen(false);
  }

  function openCreateEditor(): void {
    resetForm();
    setEditorOpen(true);
  }

  function openEditEditor(type: ProbeTypeView): void {
    setEditingId(type.id);
    setName(type.name);
    setSortOrder(String(type.sortOrder));
    setEditorOpen(true);
  }

  function save(): void {
    const trimmedName = name.trim();
    const parsedSortOrder = Number.parseInt(sortOrder, 10);
    if (!trimmedName || !Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      toast.showToast({ message: "Introdu o denumire și o ordine validă.", title: "Tipul probei nu a fost salvat", variant: "error" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: { name: trimmedName, sortOrder: parsedSortOrder } }, { onError: handleSaveError, onSuccess: () => { closeEditor(); toast.showToast({ message: "Tipul probei a fost modificat.", variant: "success" }); } });
    } else {
      createMutation.mutate({ name: trimmedName, sortOrder: parsedSortOrder }, { onError: handleSaveError, onSuccess: () => { closeEditor(); toast.showToast({ message: "Tipul probei a fost creat.", variant: "success" }); } });
    }
  }

  function handleSaveError(error: unknown): void {
    toast.showToast({ message: getErrorMessage(error), title: "Tipul probei nu a fost salvat", variant: "error" });
  }

  const columns: readonly DataTableColumn<ProbeTypeView>[] = [
    { header: "Denumire", id: "name", renderCell: (type) => type.name },
    { header: "Ordine", id: "sortOrder", renderCell: (type) => type.sortOrder },
    { header: "Stare", id: "status", renderCell: (type) => <StatusBadge label={type.isArchived ? "Arhivat" : "Activ"} variant={type.isArchived ? "closed" : "approved"} /> },
    ...(canManage ? [{ header: "Acțiuni", id: "actions", renderCell: (type: ProbeTypeView) => <div className="pricing-page__table-actions"><Button onClick={() => openEditEditor(type)} size="small" variant="outline">Editează</Button><Button onClick={() => updateMutation.mutate({ id: type.id, input: { isArchived: !type.isArchived } }, { onError: handleSaveError, onSuccess: () => toast.showToast({ message: type.isArchived ? "Tipul probei a fost reactivat." : "Tipul probei a fost arhivat.", variant: "success" }) })} size="small" variant="outline">{type.isArchived ? "Reactivează" : "Arhivează"}</Button></div> }] : []),
  ] as readonly DataTableColumn<ProbeTypeView>[];
  const normalizedSearch = search.trim().toLocaleLowerCase("ro");
  const filteredProbeTypes = probeTypes.filter((type) => {
    const matchesSearch = !normalizedSearch || type.name.toLocaleLowerCase("ro").includes(normalizedSearch);
    const matchesStatus = status === "all" || (status === "archived" ? type.isArchived : !type.isArchived);
    return matchesSearch && matchesStatus;
  });

  return <>
    <Card>
      <CardHeader><CardTitle>Tipuri de probă</CardTitle><CardDescription>Catalog global comun pentru CDT și NG.</CardDescription></CardHeader>
      <CardContent className="pricing-page__stack">
        <div className="pricing-page__toolbar">
          <div className="pricing-page__filters pricing-page__filters--compact">
            <TextInput label="Căutare" onChange={(event) => setSearch(event.target.value)} placeholder="Denumire tip probă" type="search" value={search} />
            <Select label="Status" onChange={(event) => setStatus(event.target.value)} options={activeOptions} value={status} />
          </div>
          {canManage && showAddAction ? <Button onClick={openCreateEditor}>Adaugă tip probă</Button> : null}
        </div>
        {isLoading ? <LoadingState text="Se încarcă tipurile de probă" /> : null}
        <DataTable columns={columns} emptyMessage="Nu există tipuri de probă pentru filtrele curente." getRowKey={(type) => type.id} rows={filteredProbeTypes} />
        {!canManage ? <p className="pricing-page__readonly">Catalogul este disponibil doar pentru citire.</p> : null}
      </CardContent>
    </Card>
    {canManage ? <Modal description="Păstrează denumirea scurtă și ordinea folosită în fluxul lucrărilor." isOpen={isEditorOpen} onOpenChange={(isOpen) => isOpen ? setEditorOpen(true) : closeEditor()} size="sm" title={editingId ? "Editează tip probă" : "Adaugă tip probă"}>
      <FormLayout className="pricing-page__form" onSubmit={(event) => { event.preventDefault(); save(); }}>
        <FormGrid>
          <TextInput label="Denumire" onChange={(event) => setName(event.target.value)} value={name} />
          <NumberInput label="Ordine" min={0} onChange={(event) => setSortOrder(event.target.value)} value={sortOrder} />
        </FormGrid>
        <FormActions canReset={Boolean(name || sortOrder !== "0")} isSubmitting={isSaving} onCancel={closeEditor} onReset={resetForm} submitLabel={editingId ? "Salvează modificarea" : "Adaugă tip probă"} />
      </FormLayout>
    </Modal> : null}
  </>;
}

function TechnicianOperationsCatalog({
  active,
  canRead,
  columns,
  onActiveChange,
  onPageChange,
  onSearchChange,
  onSortChange,
  operationParams,
  operationsQuery,
  search,
}: {
  readonly active: boolean | undefined;
  readonly canRead: boolean;
  readonly columns: readonly DataTableColumn<TechnicianOperationSummary>[];
  readonly onActiveChange: (active: boolean | undefined) => void;
  readonly onPageChange: (page: number) => void;
  readonly onSearchChange: (search: string) => void;
  readonly onSortChange: (sort: DataTableSort) => void;
  readonly operationParams: TechnicianOperationsListParams;
  readonly operationsQuery: ReturnType<typeof useTechnicianOperations>;
  readonly search: string;
}): ReactNode {
  if (!canRead) {
    return <ErrorState description="Contul curent nu are permisiunea technician.operations.read." title="Acces refuzat" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog global de manopere</CardTitle>
        <CardDescription>Operațiile tehnice disponibile tuturor tehnicienilor. Tarifele individuale se configurează în Tehnicieni.</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        <div className="pricing-page__filters pricing-page__filters--compact">
          <TextInput label="Căutare" onChange={(event) => onSearchChange(event.target.value)} placeholder="Cod, denumire sau descriere" type="search" value={search} />
          <Select label="Status" onChange={(event) => onActiveChange(toApiActive(event.target.value))} options={activeOptions} value={fromApiActive(active)} />
        </div>
        <DataTable
          columns={columns}
          emptyMessage="Nu există manopere pentru filtrele curente."
          error={operationsQuery.isError ? getErrorMessage(operationsQuery.error) : undefined}
          getRowKey={(item) => item.id}
          isLoading={operationsQuery.isLoading}
          onSortChange={onSortChange}
          pagination={{ onPageChange, page: operationsQuery.data?.page ?? operationParams.page, pageCount: operationsQuery.data?.pageCount ?? 1 }}
          rows={operationsQuery.data?.items ?? []}
          sort={{ columnId: operationParams.sortBy === "code" ? "code" : "name", direction: operationParams.sortDirection === "asc" ? "ascending" : "descending" }}
        />
      </CardContent>
    </Card>
  );
}

function TechnicianOperationModal({
  initialOperation,
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  readonly initialOperation: TechnicianOperationSummary | null;
  readonly isOpen: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: TechnicianOperationFormValues, form: ReturnType<typeof useForm<TechnicianOperationFormValues>>) => void;
}): ReactNode {
  const form = useForm<TechnicianOperationFormValues>({
    defaultValues: getTechnicianOperationDefaults(initialOperation),
    resolver: zodResolver(technicianOperationFormSchema),
  });

  useEffect(() => {
    if (isOpen) form.reset(getTechnicianOperationDefaults(initialOperation));
  }, [form, initialOperation, isOpen]);

  return (
    <Modal description="Definește operația globală disponibilă la configurarea ratelor tehnicienilor." isOpen={isOpen} onOpenChange={onOpenChange} size="md" title={initialOperation ? "Editează manoperă" : "Adaugă manoperă"}>
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form))(event)}>
        <section className="pricing-page__editor-section">
          <h3>Date manoperă</h3>
          <FormGrid>
            <TextInput error={form.formState.errors.code?.message} label="Cod" {...form.register("code")} />
            <TextInput error={form.formState.errors.name?.message} label="Denumire" {...form.register("name")} />
            <TextInput error={form.formState.errors.category?.message} label="Categorie" {...form.register("category")} />
            <FormGridFull><Textarea error={form.formState.errors.description?.message} label="Descriere" rows={3} {...form.register("description")} /></FormGridFull>
          </FormGrid>
        </section>
        <FormActions canReset={form.formState.isDirty} className="pricing-page__modal-actions" isSubmitting={isSaving} onCancel={() => onOpenChange(false)} onReset={() => form.reset(getTechnicianOperationDefaults(initialOperation))} submitLabel={initialOperation ? "Salvează modificarea" : "Adaugă manoperă"} />
      </FormLayout>
    </Modal>
  );
}

function CatalogTab({
  active,
  audience,
  audienceId,
  archived,
  category,
  catalogQuery,
  columns,
  clinics,
  doctors,
  onActiveChange,
  onAudienceChange,
  onAudienceIdChange,
  onCategoryChange,
  onRestore,
  onRowAction,
  onSearchChange,
  printPrice,
  search,
}: {
  readonly active: boolean | undefined;
  readonly audience: "STANDARD" | "CLINIC" | "DOCTOR";
  readonly audienceId: string;
  readonly archived: boolean;
  readonly category: string;
  readonly catalogQuery: ReturnType<typeof usePricingCatalog>;
  readonly columns: readonly DataTableColumn<PriceCatalogItemSummary>[];
  readonly clinics: readonly { readonly id: string; readonly name: string }[];
  readonly doctors: readonly { readonly id: string; readonly displayName: string }[];
  readonly onActiveChange: (active: boolean | undefined) => void;
  readonly onAudienceChange: (value: "STANDARD" | "CLINIC" | "DOCTOR") => void;
  readonly onAudienceIdChange: (value: string) => void;
  readonly onCategoryChange: (category: string) => void;
  readonly onRestore?: (id: string) => void;
  readonly onRowAction: (item: PriceCatalogItemSummary) => void;
  readonly onSearchChange: (search: string) => void;
  readonly printPrice: (item: PriceCatalogItemSummary) => string;
  readonly search: string;
}): ReactNode {
  return (
    <>
    <div className="pricing-page__catalog-print">
      <Card>
      <CardHeader>
        <CardTitle>{archived ? "Arhivă catalog" : "Catalog de lucrări"}</CardTitle>
        <CardDescription>{archived ? "Tipuri de lucrări arhivate, disponibile pentru consultare sau reactivare." : `Tipuri de lucrări și prețuri standard. Total: ${catalogQuery.data?.total ?? 0}`}</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        {!archived ? <div className="pricing-page__audience-filters">
          <Select label="Catalog afișat" onChange={(event) => onAudienceChange(event.target.value as "STANDARD" | "CLINIC" | "DOCTOR")} options={[{ label: "Catalog standard", value: "STANDARD" }, { label: "Catalog clinică", value: "CLINIC" }, { label: "Catalog medic", value: "DOCTOR" }]} value={audience} />
          {audience === "CLINIC" ? <Select label="Clinică" onChange={(event) => onAudienceIdChange(event.target.value)} options={clinics.map((clinic) => ({ label: clinic.name, value: clinic.id }))} placeholder="Alege clinica" value={audienceId} /> : null}
          {audience === "DOCTOR" ? <Select label="Medic" onChange={(event) => onAudienceIdChange(event.target.value)} options={doctors.map((doctor) => ({ label: doctor.displayName, value: doctor.id }))} placeholder="Alege medicul" value={audienceId} /> : null}
        </div> : null}
        <div className="pricing-page__filters pricing-page__filters--catalog">
          <TextInput label="Căutare" onChange={(event) => onSearchChange(event.target.value)} placeholder="Produs, categorie, cod lucrare" type="search" value={search} />
          <Select label="Categorie" onChange={(event) => onCategoryChange(event.target.value)} options={[{ label: "Toate categoriile", value: "" }, ...pricingCategoryOptions]} value={category} />
          {!archived ? <Select label="Status" onChange={(event) => onActiveChange(toApiActive(event.target.value))} options={activeOptions} value={fromApiActive(active)} /> : null}
        </div>
        <DataTable
          columns={[...columns, { header: "Acțiuni", id: "actions", renderCell: (item) => <div className="pricing-page__table-actions">{archived && onRestore ? <Button onClick={() => onRestore(item.id)} size="small" variant="outline">Reactivează</Button> : null}<Button onClick={() => onRowAction(item)} size="small" variant="outline">Deschide</Button></div> }]}
          emptyMessage="Nu există prețuri pentru filtrele curente."
          error={catalogQuery.isError ? getErrorMessage(catalogQuery.error) : undefined}
          getRowKey={(item) => item.id}
          isLoading={catalogQuery.isLoading}
          rows={catalogQuery.data?.items ?? []}
        />
      </CardContent>
      </Card>
    </div>
    <div className="pricing-page__catalog-print-view" aria-hidden="true">
      <h1>Catalog</h1>
      <div className="pricing-page__catalog-print-list">
        {(catalogQuery.data?.items ?? []).map((item) => (
          <div className="pricing-page__catalog-print-row" key={item.id}>
            <strong>{item.workType.name}</strong>
            <span>{printPrice(item)}</span>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

function AgreementsTab({
  active,
  agreementsQuery,
  canManage,
  columns,
  onActiveChange,
  onArchive,
  onEdit,
  onSearchChange,
  onRestore,
  search,
}: {
  readonly active: boolean | undefined;
  readonly agreementsQuery: ReturnType<typeof usePricingAgreements>;
  readonly canManage: boolean;
  readonly columns: readonly DataTableColumn<PricingAgreementSummary>[];
  readonly onActiveChange: (active: boolean | undefined) => void;
  readonly onArchive: (id: string) => void;
  readonly onEdit: (id: string) => void;
  readonly onSearchChange: (search: string) => void;
  readonly onRestore: (id: string) => void;
  readonly search: string;
}): ReactNode {
  const rows = agreementsQuery.data?.items ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acorduri comerciale</CardTitle>
        <CardDescription>Reguli comerciale specifice clinicilor și medicilor.</CardDescription>
      </CardHeader>
      <CardContent className="pricing-page__stack">
        <div className="pricing-page__filters pricing-page__filters--compact">
          <TextInput label="Căutare" onChange={(event) => onSearchChange(event.target.value)} placeholder="Acord, clinică, medic" type="search" value={search} />
          <Select label="Status" onChange={(event) => onActiveChange(toApiActive(event.target.value))} options={activeOptions} value={fromApiActive(active)} />
        </div>
        <DataTable
          columns={[...columns, {
            header: "Acțiuni",
            id: "actions",
            renderCell: (item) => (
              <div className="pricing-page__table-actions">
                {item.isActive ? <Button disabled={!canManage} onClick={() => onEdit(item.id)} size="small" variant="outline">Editează</Button> : null}
                {item.isActive ? <Button disabled={!canManage} onClick={() => onArchive(item.id)} size="small" variant="outline">Arhivează</Button> : <Button disabled={!canManage} onClick={() => onRestore(item.id)} size="small" variant="outline">Reactivează</Button>}
              </div>
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
        <p className="pricing-page__muted">Catalogul Creative Dental a fost transcris manual din imaginea de prețuri clară și reconciliat cu catalogul real al aplicației. Materialele de facturare, formularele pacientului și documentele fiscale din `assets/` sunt folosite acum ca referințe pentru tipărire și documentație, iar valorile ambigue rămân marcate separat.</p>
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
      title={mode === "create" ? "Adaugă tip lucrare" : "Editează tip lucrare"}
    >
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form))(event)}>
        <section className="pricing-page__editor-section">
          <h3>Date tip lucrare</h3>
          <FormGrid>
            {mode === "create" ? <>
              <TextInput label="Denumire tip lucrare" {...form.register("workTypeName")} />
              <TextInput label="Simbol" {...form.register("workTypeSymbol")} />
              <FormGridFull><Textarea label="Descriere" rows={3} {...form.register("workTypeDescription")} /></FormGridFull>
            </> : <Select label="Tip lucrare" options={workTypes.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))} placeholder="Alege tipul" {...form.register("workTypeId")} />}
            <WorkTypeColorPicker value={form.watch("colorHex")} onChange={(value) => form.setValue("colorHex", value, { shouldDirty: true, shouldValidate: true })} />
          </FormGrid>
        </section>
        <section className="pricing-page__editor-section">
          <h3>Parametri comerciali</h3>
          <FormGrid>
            <TextInput label="Denumire comercială" {...form.register("displayName")} />
            <NumberInput label={`Preț standard ${currency}`} {...form.register("standardPriceDecimal")} />
            <Select label="Categorie" options={pricingCategoryOptions} {...form.register("category")} />
            <Select label="Unitate" options={workTypeUnitOptions} {...form.register("unit")} />
            <Select label="Termen implicit" options={[1, 2, 3, 4, 5, 6].map((days) => ({ label: `${days} zile`, value: String(days) }))} {...form.register("executionDays")} />
            <Checkbox label="Activ" {...form.register("isActive")} />
          </FormGrid>
        </section>
        <section className="pricing-page__editor-section">
          <h3>Metadate catalog</h3>
          <FormGrid>
            <NumberInput label="Ordine" {...form.register("sortOrder", { valueAsNumber: true })} />
            <FormGridFull><Textarea label="Note" rows={3} {...form.register("notes")} /></FormGridFull>
          </FormGrid>
        </section>
        <UnsavedChangesPrompt when={form.formState.isDirty} />
        <FormActions canReset={form.formState.isDirty} className="pricing-page__modal-actions" isSubmitting={isSaving} onCancel={() => closeGuard.handleOpenChange(false)} onReset={() => form.reset(getCatalogDefaults(initialItem))} submitLabel="Salvează" />
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
      <h3>Parametri comerciali și metadate</h3>
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form))(event)}>
        <FormGrid>
          <Select label="Tip lucrare" options={workTypes.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))} placeholder="Alege tipul" {...form.register("workTypeId")} />
          <TextInput label="Denumire comercială" {...form.register("displayName")} />
          <Select label="Categorie" options={pricingCategoryOptions} {...form.register("category")} />
          <Select label="Unitate" options={workTypeUnitOptions} {...form.register("unit")} />
          <WorkTypeColorPicker value={form.watch("colorHex")} onChange={(value) => form.setValue("colorHex", value, { shouldDirty: true, shouldValidate: true })} />
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
  const [defaultExecutionDays, setDefaultExecutionDays] = useState("1");
  const workTypeQuery = useWorkType(props.item?.workType.id ?? null, props.isOpen);
  const updateWorkTypeMutation = useUpdateWorkType();
  const [workTypeName, setWorkTypeName] = useState("");
  const [workTypeSymbol, setWorkTypeSymbol] = useState("");
  const [workTypeDescription, setWorkTypeDescription] = useState("");
  const [workTypeColor, setWorkTypeColor] = useState("");
  useEffect(() => {
    if (props.item) {
      const rule = props.item.executionTimeRules.find((candidate) => candidate.isActive && candidate.minQuantity === 1);
      setDefaultExecutionDays(String(rule?.executionDays ?? 1));
    }
  }, [props.item]);
  useEffect(() => {
    if (workTypeQuery.data) {
      setWorkTypeName(workTypeQuery.data.name);
      setWorkTypeSymbol(workTypeQuery.data.symbol);
      setWorkTypeDescription(workTypeQuery.data.description ?? "");
      setWorkTypeColor(workTypeQuery.data.colorHex ?? "");
    }
  }, [workTypeQuery.data]);

  if (!props.item && !props.isLoading) {
    return null;
  }

  return (
    <Modal isOpen={props.isOpen} onOpenChange={props.onOpenChange} size="lg" title="Editează tip lucrare">
      {props.isLoading ? <LoadingState text="Se încarcă prețul" /> : null}
      {props.item ? (
        <div className="pricing-page__stack">
          <section className="pricing-page__drawer-section">
            <h3>Date tip lucrare</h3>
            <FormGrid>
              <TextInput label="Denumire" onChange={(event) => setWorkTypeName(event.target.value)} value={workTypeName} />
              <TextInput label="Simbol" onChange={(event) => setWorkTypeSymbol(event.target.value)} value={workTypeSymbol} />
              <FormGridFull><Textarea label="Descriere" onChange={(event) => setWorkTypeDescription(event.target.value)} rows={3} value={workTypeDescription} /></FormGridFull>
              <WorkTypeColorPicker disabled={!props.canUpdate || updateWorkTypeMutation.isPending} value={workTypeColor} onChange={setWorkTypeColor} />
            </FormGrid>
            <Button disabled={!props.canUpdate || updateWorkTypeMutation.isPending || workTypeQuery.isLoading} onClick={() => updateWorkTypeMutation.mutate({ workTypeId: props.item?.workType.id ?? "", input: { colorHex: workTypeColor || null, description: workTypeDescription || null, name: workTypeName, symbol: workTypeSymbol } })} variant="outline">Salvează datele tipului</Button>
          </section>
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
            <Select label="Termen implicit" options={[1, 2, 3, 4, 5, 6].map((days) => ({ label: `${days} zile`, value: String(days) }))} onChange={(event) => setDefaultExecutionDays(event.target.value)} value={defaultExecutionDays} />
            <Button
              disabled={!props.canUpdate || props.isSaving}
              onClick={() => {
                const days = Number(defaultExecutionDays);
                const existingRules = props.item?.executionTimeRules ?? [];
                const rules = existingRules.length > 0
                  ? existingRules.map(({ id: _id, ...rule }) => ({ ...rule, executionDays: days }))
                  : [{ executionDays: days, isActive: true, maxQuantity: null, minQuantity: 1, priority: 0, requiresManualDueDate: false }];
                props.onRulesSubmit(props.item?.id ?? "", rules);
              }}
              variant="outline"
            >
              Salvează termen
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
    </Modal>
  );
}

function AgreementModal({
  catalogItems,
  clinics,
  currency,
  doctors,
  isOpen,
  initialAgreement,
  isSaving,
  mode,
  onOpenChange,
  onSubmit,
}: {
  readonly catalogItems: readonly PriceCatalogItemSummary[];
  readonly clinics: readonly { readonly id: string; readonly name: string }[];
  readonly currency: string;
  readonly doctors: readonly { readonly clinicId: string; readonly displayName: string; readonly id: string }[];
  readonly isOpen: boolean;
  readonly initialAgreement: PricingAgreementDetail | null;
  readonly isSaving: boolean;
  readonly mode: "create" | "edit";
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onSubmit: (values: AgreementFormValues, form: ReturnType<typeof useForm<AgreementFormValues>>, additionalRules: readonly PricingAgreementRuleInput[]) => void;
}): ReactNode {
  const form = useForm<AgreementFormValues>({
    defaultValues: getAgreementDefaults(initialAgreement),
    resolver: zodResolver(agreementFormSchema),
  });
  useEffect(() => {
    form.reset(getAgreementDefaults(initialAgreement));
  }, [form, initialAgreement, isOpen]);
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const subjectType = form.watch("subjectType");
  const scope = form.watch("scope");
  const adjustmentType = form.watch("adjustmentType");
  const [additionalRules, setAdditionalRules] = useState<AgreementRuleDraft[]>([]);
  useEffect(() => {
    setAdditionalRules((initialAgreement?.rules ?? []).slice(1).map(agreementRuleToDraft));
  }, [initialAgreement, isOpen]);
  useBeforeUnloadPrompt(isOpen && form.formState.isDirty);
  useEffect(() => {
    if (!isOpen || !form.formState.isDirty) {
      return undefined;
    }
    return registerOrganizationContextSwitchGuard(() => "Ai modificări nesalvate în acordul comercial. Schimbi firma și pierzi modificările?");
  }, [form.formState.isDirty, isOpen]);

  return (
    <Modal closeOnBackdrop={!form.formState.isDirty} description="Configurează perioada și regulile comerciale pentru o clinică sau un medic." isOpen={isOpen} onOpenChange={closeGuard.handleOpenChange} size="lg" title={mode === "edit" ? "Editează acord comercial" : "Adaugă acord comercial"}>
      <FormLayout className="pricing-page__form" onSubmit={(event) => void form.handleSubmit((values) => onSubmit(values, form, additionalRules.map(agreementRuleDraftToInput)))(event)}>
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
            <div className="pricing-page__drawer-section">
              <h3>Reguli suplimentare</h3>
              {additionalRules.map((rule, index) => (
                <div className="pricing-page__rule-editor" key={`${index}-${rule.scope}`}>
                  <Select label="Scope" onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as AgreementRuleDraft["scope"] } : item))} options={scopeOptions} value={rule.scope} />
                  {rule.scope === "CATEGORY" ? <Select label="Categorie" onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value } : item))} options={pricingCategoryOptions} value={rule.category} /> : null}
                  {rule.scope === "ITEM" ? <Select label="Produs catalog" onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, priceCatalogItemId: event.target.value } : item))} options={catalogItems.map((item) => ({ label: item.displayName, value: item.id }))} value={rule.priceCatalogItemId} /> : null}
                  <Select label="Tip ajustare" onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, adjustmentType: event.target.value as AgreementRuleDraft["adjustmentType"] } : item))} options={adjustmentTypeOptions} value={rule.adjustmentType} />
                  {rule.adjustmentType === "FIXED_AMOUNT" ? <NumberInput label={`Ajustare ${currency}`} onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, adjustmentDecimal: event.target.value } : item))} value={rule.adjustmentDecimal} /> : null}
                  {rule.adjustmentType === "PERCENTAGE" ? <NumberInput label="Ajustare procentuală" onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, adjustmentPercentage: event.target.value } : item))} value={rule.adjustmentPercentage} /> : null}
                  {rule.adjustmentType === "OVERRIDE_PRICE" ? <NumberInput label={`Preț final ${currency}`} onChange={(event) => setAdditionalRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, overridePriceDecimal: event.target.value } : item))} value={rule.overridePriceDecimal} /> : null}
                  <Button onClick={() => setAdditionalRules((current) => current.filter((_, itemIndex) => itemIndex !== index))} size="small" variant="outline">Șterge regula</Button>
                </div>
              ))}
              <Button onClick={() => setAdditionalRules((current) => [...current, { adjustmentDecimal: "", adjustmentPercentage: "10", adjustmentType: "PERCENTAGE", category: "", overridePriceDecimal: "", priceCatalogItemId: "", scope: "ALL" }])} size="small" variant="outline">Adaugă regulă</Button>
            </div>
          </FormGridFull>
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

function getAgreementDefaults(agreement?: PricingAgreementDetail | null): AgreementFormValues {
  const rule = agreement?.rules[0];
  return {
    adjustmentDecimal: rule?.adjustmentValueMinor == null ? "" : minorToDecimalString(rule.adjustmentValueMinor),
    adjustmentPercentage: rule?.adjustmentPercentageBasisPoints == null ? "10" : String(rule.adjustmentPercentageBasisPoints / 100),
    adjustmentType: (rule?.adjustmentType ?? "PERCENTAGE") as AgreementFormValues["adjustmentType"],
    category: rule?.category ?? "",
    clinicId: agreement?.clinic?.id ?? "",
    doctorId: agreement?.doctor?.id ?? "",
    name: agreement?.name ?? "",
    notes: agreement?.notes ?? "",
    overridePriceDecimal: rule?.overridePriceMinor == null ? "" : minorToDecimalString(rule.overridePriceMinor),
    priceCatalogItemId: rule?.priceCatalogItemId ?? "",
    scope: (rule?.scope ?? "ALL") as AgreementFormValues["scope"],
    subjectType: agreement?.subjectType ?? "CLINIC",
    validFrom: agreement?.validFrom.slice(0, 10) ?? todayIsoDate(),
    validUntil: agreement?.validUntil?.slice(0, 10) ?? "",
  };
}

function Metric({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  return <div className="pricing-page__metric"><span>{label}</span><strong>{value}</strong></div>;
}
