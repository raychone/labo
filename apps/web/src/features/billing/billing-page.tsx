import {
  Accordion,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DateInput,
  ErrorState,
  LoadingState,
  Modal,
  Select,
  Tabs,
  TextInput,
  useToast,
  type DataTableColumn,
} from "@dental-lab/ui";
import {
  formatMoneyMinor,
  type AmbiguousLegacyBillingRecord,
  type BillableWork,
  type BillingDocumentSummary,
  type BillingListQuery,
  type BillingOverview,
  type BillingStatementRow,
  type BillingStatementWorkRow,
  type ClinicBillingStatement,
  type DoctorBillingStatement,
  type BillingReceivableRow,
  type DocumentPaymentFilter,
  type MonthEndRegistry,
  type PaymentMethod,
  type RecordPaymentInput,
} from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { useSettings } from "../settings/settings-api.js";
import {
  downloadBillingDocumentPdf,
  downloadClinicStatementPdf,
  downloadDoctorStatementPdf,
  downloadMonthRegistryPdf,
  useBillableWorks,
  useBillingDocuments,
  useBillingOverview,
  useBillingSeries,
  useClinicStatement,
  useCreateInvoice,
  useCreateProforma,
  useConvertProforma,
  useIssueDocument,
  useMonthRegistry,
  usePayments,
  useRecordPayment,
  useReceivables,
  useDoctorStatement,
  useAmbiguousLegacyRecords,
  closeMonthRegistry,
  downloadMonthRegistryCsv,
  type BillingWorkspaceParams,
} from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

const pageSize = 20;
type BillingTabId = "overview" | "uninvoiced" | "proformas" | "invoices" | "payments" | "receivables" | "statements" | "month-close" | "series";
type StatementSource = "documents" | "works";
const paymentFilterOptions: readonly { readonly label: string; readonly value: DocumentPaymentFilter }[] = [
  { label: "Toate", value: "ALL" },
  { label: "Neachitate", value: "UNPAID" },
  { label: "Parțial încasate", value: "PARTIALLY_PAID" },
  { label: "Achitate integral", value: "PAID" },
  { label: "Restante", value: "OUTSTANDING" },
  { label: "Scadente", value: "DUE" },
  { label: "Depășite", value: "OVERDUE" },
  { label: "Anulate", value: "CANCELLED" },
];

interface BillingPeriod {
  readonly month: number;
  readonly year: number;
}

const BILLING_YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => {
  const year = 2000 + index;
  return { label: String(year), value: String(year) };
});

const BILLING_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    label: new Intl.DateTimeFormat("ro-RO", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1))).replaceAll(".", ""),
    value: String(month),
  };
});

function currentBillingPeriod(now = new Date()): BillingPeriod {
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function shiftBillingPeriod(period: BillingPeriod, deltaMonths: number): BillingPeriod {
  const date = new Date(Date.UTC(period.year, period.month - 1 + deltaMonths, 1));
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

function monthRange(period: BillingPeriod): { readonly dateFrom: string; readonly dateTo: string } {
  const from = new Date(Date.UTC(period.year, period.month - 1, 1));
  const to = new Date(Date.UTC(period.year, period.month, 0));
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
}

function currentMonthRange(now = new Date()): { readonly dateFrom: string; readonly dateTo: string } {
  return monthRange(currentBillingPeriod(now));
}

function isBillingTabId(value: string | null): value is BillingTabId {
  return value === "overview"
    || value === "uninvoiced"
    || value === "proformas"
    || value === "invoices"
    || value === "payments"
    || value === "receivables"
    || value === "statements"
    || value === "month-close"
    || value === "series";
}

function isDocumentPaymentFilter(value: string | null): value is DocumentPaymentFilter {
  return paymentFilterOptions.some((option) => option.value === value);
}

function formatKpiMoneyMinor(value: number, currency: string, locale = "ro-RO"): string {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

function formatMoneyInputMinor(value: number): string {
  return (value / 100).toFixed(2);
}

function readBillingPeriod(searchParams: URLSearchParams): BillingPeriod | null {
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 2000 || year > 2100 || month < 1 || month > 12) {
    return null;
  }
  return { month, year };
}

function formatBillingPeriod(period: BillingPeriod): string {
  return new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
}

interface ManualPaymentFormState {
  readonly amount: string;
  readonly method: PaymentMethod;
  readonly notes: string;
  readonly paymentDate: string;
  readonly receiptDate: string;
  readonly receiptNumber: string;
  readonly reference: string;
}

function createEmptyPaymentForm(paymentDate: string): ManualPaymentFormState {
  return {
    amount: "",
    method: "BANK_TRANSFER",
    notes: "",
    paymentDate,
    receiptDate: "",
    receiptNumber: "",
    reference: "",
  };
}

function toRecordPaymentInput(form: ManualPaymentFormState): RecordPaymentInput | null {
  const normalizedAmount = Number.parseFloat(form.amount.replace(",", "."));
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return null;
  }

  return {
    amountMinor: Math.round(normalizedAmount * 100),
    method: form.method,
    notes: form.notes.trim() || null,
    paymentDate: form.paymentDate,
    receiptDate: form.receiptDate || null,
    receiptNumber: form.receiptNumber.trim() || null,
    reference: form.reference.trim() || null,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function formatCsvDate(value: string | null): string {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function toggleSelectedId(values: readonly string[], id: string): readonly string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function selectAllIds(current: readonly string[], next: readonly string[]): readonly string[] {
  return current.length === next.length && current.every((value) => next.includes(value)) ? [] : next;
}

interface SerializedStatementWork {
  readonly baseUnitPriceMinor: number | null;
  readonly code: string;
  readonly createdAt: string;
  readonly doctorName: string;
  readonly id: string;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly quantity: number;
  readonly totalPriceMinor: number | null;
  readonly workCycleNumber: number | null;
  readonly workTypeName: string;
}

function serializeStatementWorks(works: readonly BillableWork[]): string {
  return JSON.stringify(works.map((work) => ({
    baseUnitPriceMinor: work.baseUnitPriceMinor,
    code: work.code,
    createdAt: work.createdAt,
    doctorName: work.doctorName,
    id: work.id,
    patientName: work.patientName,
    patientReference: work.patientReference,
    quantity: work.quantity,
    totalPriceMinor: work.totalPriceMinor,
    workCycleNumber: work.workCycleNumber,
    workTypeName: work.workTypeName,
  }) satisfies SerializedStatementWork));
}

function toCsv(rows: readonly Readonly<Record<string, string | number | null>>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: string | number | null) => {
    const text = String(value ?? "");
    const safeText = ["=", "+", "-", "@"].some((prefix) => text.trimStart().startsWith(prefix)) ? `'${text}` : text;
    return `"${safeText.replaceAll("\"", "\"\"")}"`;
  };
  return `\uFEFF${[headers.join(";"), ...rows.map((row) => headers.map((header) => escape(row[header] ?? null)).join(";"))].join("\r\n")}\r\n`;
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toDocumentTypeLabel(type: BillingDocumentSummary["type"] | "INVOICE" | "PROFORMA"): string {
  return type === "INVOICE" ? "Factură" : "Proformă";
}

function toDocumentStatusLabel(status: BillingDocumentSummary["status"]): string {
  const labels = {
    CANCELLED: "Anulat",
    DRAFT: "Draft",
    ISSUED: "Emis",
    PAID: "Achitat integral",
    PARTIALLY_PAID: "Parțial încasat",
  } as const satisfies Record<BillingDocumentSummary["status"], string>;

  return labels[status];
}

function toPaymentMethodLabel(method: PaymentMethod | string): string {
  const labels = {
    BANK_TRANSFER: "Transfer bancar",
    CARD: "Card",
    CASH: "Numerar",
    OTHER: "Altă metodă",
  } as const satisfies Record<PaymentMethod, string>;

  return method in labels ? labels[method as PaymentMethod] : "Altă metodă";
}

function toDocumentCsvRow(document: BillingDocumentSummary, currency: string): Readonly<Record<string, string | number | null>> {
  return {
    "Număr": document.formattedNumber,
    "Tip": document.type === "INVOICE" ? "Factură" : "Proformă",
    "Status": toDocumentStatusLabel(document.status),
    "Clinică": document.clinicName,
    "Data emiterii": formatCsvDate(document.issueDate),
    "Scadență": formatCsvDate(document.dueDate),
    "Lucrări": document.workCodes.join(", "),
    "Valoare totală": (document.totalMinor / 100).toFixed(2),
    "Încasat": (document.paidMinor / 100).toFixed(2),
    "Sold restant": (document.balanceMinor / 100).toFixed(2),
    "Monedă": currency,
  };
}

export function BillingPage(): ReactNode {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadFinance = hasPermission(permissionsQuery.data, "finance.read");
  const canReadInvoices = hasPermission(permissionsQuery.data, "invoice.read");
  const canReadReports = hasPermission(permissionsQuery.data, "finance.read_reports");
  const canCreateInvoice = hasPermission(permissionsQuery.data, "invoice.create");
  const canRecordPayment = hasPermission(permissionsQuery.data, "finance.record_payment");
  const canConfigureSeries = hasPermission(permissionsQuery.data, "invoice.configure_series");
  const canUseBilling = canReadFinance || canReadInvoices || canCreateInvoice;
  const settingsQuery = useSettings(canUseBilling);
  const currency = settingsQuery.data?.currency ?? "RON";
  const locale = settingsQuery.data?.locale ?? "ro-RO";
  const activeCompanyLabel = settingsQuery.data ? `${settingsQuery.data.legalEntityCode} - ${settingsQuery.data.legalEntityDisplayName}` : "Firma activă";
  const urlPeriod = useMemo(() => readBillingPeriod(searchParams), [searchParams.toString()]);
  const [range, setRange] = useState(currentMonthRange);
  const selectedPeriod = useMemo(() => urlPeriod ?? currentBillingPeriod(), [urlPeriod]);
  const [groupBy, setGroupBy] = useState("clinic");
  const [paymentFilter, setPaymentFilter] = useState<DocumentPaymentFilter>(() => {
    const urlPaymentFilter = searchParams.get("paymentFilter");
    return isDocumentPaymentFilter(urlPaymentFilter) ? urlPaymentFilter : "ALL";
  });
  const [patientFilter, setPatientFilter] = useState("");
  const [workCodeFilter, setWorkCodeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BillingTabId>(() => {
    const urlTab = searchParams.get("tab");
    return isBillingTabId(urlTab) ? urlTab : "overview";
  });
  const [paymentForm, setPaymentForm] = useState<ManualPaymentFormState>(createEmptyPaymentForm(range.dateTo));
  const [selectedWorkIds, setSelectedWorkIds] = useState<readonly string[]>([]);
  const [selectedProformaIds, setSelectedProformaIds] = useState<readonly string[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<readonly string[]>([]);
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<readonly string[]>([]);
  const [selectedStatementDocumentIds, setSelectedStatementDocumentIds] = useState<readonly string[]>([]);
  const [statementScope, setStatementScope] = useState<"clinic" | "doctor">("clinic");
  const [clinicStatementId, setClinicStatementId] = useState("");
  const [doctorStatementId, setDoctorStatementId] = useState("");
  const [statementSource, setStatementSource] = useState<StatementSource>("documents");
  const monthRegistryParams = useMemo<BillingWorkspaceParams>(() => ({ ...monthRange(selectedPeriod), month: selectedPeriod.month, year: selectedPeriod.year }), [selectedPeriod]);
  const overviewParams: BillingWorkspaceParams = { ...range, groupBy };
  const billableParams: BillingWorkspaceParams = { ...range, search, uninvoicedOnly: true, ...(patientFilter ? { patient: patientFilter } : {}), ...(workCodeFilter ? { workCode: workCodeFilter } : {}) };
  const baseDocumentParams: BillingListQuery = {
    ...range,
    page: 1,
    pageSize,
    paymentFilter,
    sortBy: "createdAt",
    sortDirection: "desc",
    ...(patientFilter ? { patient: patientFilter } : {}),
    ...(search ? { search } : {}),
    ...(workCodeFilter ? { workCode: workCodeFilter } : {}),
  };
  const proformaParams: BillingListQuery = { ...baseDocumentParams, paymentFilter: "ALL", type: "PROFORMA" };
  const invoiceParams: BillingListQuery = { ...baseDocumentParams, type: "INVOICE" };
  const receivablesParams: BillingListQuery = { ...baseDocumentParams, paymentFilter: paymentFilter === "ALL" ? "OUTSTANDING" : paymentFilter, type: "INVOICE" };
  const overviewQuery = useBillingOverview(overviewParams, canReadFinance);
  const monthCloseClinicOverviewQuery = useBillingOverview({ ...monthRegistryParams, groupBy: "clinic" }, canReadReports);
  const monthCloseDoctorOverviewQuery = useBillingOverview({ ...monthRegistryParams, groupBy: "doctor" }, canReadReports);
  const billableWorksQuery = useBillableWorks(billableParams, canCreateInvoice || canReadReports);
  const proformasQuery = useBillingDocuments(proformaParams, canReadInvoices);
  const invoicesQuery = useBillingDocuments(invoiceParams, canReadInvoices);
  const paymentsQuery = usePayments(canReadFinance);
  const receivablesQuery = useReceivables(receivablesParams, canReadReports);
  const monthRegistryQuery = useMonthRegistry(monthRegistryParams, canReadReports);
  const ambiguousLegacyQuery = useAmbiguousLegacyRecords(canReadReports);
  const seriesQuery = useBillingSeries(canConfigureSeries);
  const closeMonthRegistryMutation = useMutation({
    mutationFn: () => closeMonthRegistry(monthRegistryParams),
    onSuccess: async () => {
      await Promise.all([
        monthRegistryQuery.refetch(),
        overviewQuery.refetch(),
        monthCloseClinicOverviewQuery.refetch(),
        monthCloseDoctorOverviewQuery.refetch(),
      ]);
      toast.showToast({ message: "Luna a fost arhivată.", variant: "success" });
    },
  });
  function updateSelectedPeriod(period: BillingPeriod): void {
    const next = new URLSearchParams(searchParams);
    next.set("year", String(period.year));
    next.set("month", String(period.month));
    setSearchParams(next, { replace: true });
  }
  const yearOptions = useMemo(() => BILLING_YEAR_OPTIONS, []);
  const billableItemClinics = useMemo(() => {
    const items = billableWorksQuery.data?.items ?? [];
    const clinics = new Map<string, string>();
    for (const item of items) {
      clinics.set(item.clinicId, item.clinicName);
    }
    return Array.from(clinics.entries()).map(([value, label]) => ({ label, value }));
  }, [billableWorksQuery.data?.items]);
  const billableItemDoctors = useMemo(() => {
    const items = billableWorksQuery.data?.items ?? [];
    const doctors = new Map<string, string>();
    for (const item of items) {
      doctors.set(item.doctorId, item.doctorName);
    }
    return Array.from(doctors.entries()).map(([value, label]) => ({ label, value }));
  }, [billableWorksQuery.data?.items]);
  useEffect(() => {
    if (statementScope === "clinic") {
      if (billableItemClinics.length === 0) {
        if (clinicStatementId !== "") {
          setClinicStatementId("");
        }
        return;
      }
      const firstClinic = billableItemClinics[0];
      if (firstClinic && (clinicStatementId === "" || !billableItemClinics.some((clinic) => clinic.value === clinicStatementId))) {
        setClinicStatementId(firstClinic.value);
      }
    }
    if (statementScope === "doctor") {
      if (billableItemDoctors.length === 0) {
        if (doctorStatementId !== "") {
          setDoctorStatementId("");
        }
        return;
      }
      const firstDoctor = billableItemDoctors[0];
      if (firstDoctor && (doctorStatementId === "" || !billableItemDoctors.some((doctor) => doctor.value === doctorStatementId))) {
        setDoctorStatementId(firstDoctor.value);
      }
    }
  }, [billableItemClinics, billableItemDoctors, clinicStatementId, doctorStatementId, statementScope]);
  useEffect(() => {
    setSelectedStatementDocumentIds([]);
  }, [clinicStatementId, doctorStatementId, range.dateFrom, range.dateTo, statementScope]);
  const clinicStatementParams = clinicStatementId
    ? { clinicId: clinicStatementId, dateFrom: range.dateFrom, dateTo: range.dateTo }
    : { dateFrom: range.dateFrom, dateTo: range.dateTo };
  const doctorStatementParams = doctorStatementId
    ? { dateFrom: range.dateFrom, dateTo: range.dateTo, doctorId: doctorStatementId }
    : { dateFrom: range.dateFrom, dateTo: range.dateTo };
  const clinicStatementQuery = useClinicStatement(clinicStatementParams, canReadReports && clinicStatementId !== "");
  const doctorStatementQuery = useDoctorStatement(doctorStatementParams, canReadReports && doctorStatementId !== "");
  const createProformaMutation = useCreateProforma();
  const createInvoiceMutation = useCreateInvoice();
  const issueMutation = useIssueDocument();
  const convertMutation = useConvertProforma();
  const recordPaymentMutation = useRecordPayment();

  const selectedWorks = useMemo(
    () => (billableWorksQuery.data?.items ?? []).filter((work) => selectedWorkIds.includes(work.id)),
    [billableWorksQuery.data?.items, selectedWorkIds],
  );
  const selectedReceivables = useMemo(
    () => (receivablesQuery.data?.items ?? []).filter((item) => selectedReceivableIds.includes(item.documentId)),
    [receivablesQuery.data?.items, selectedReceivableIds],
  );
  const selectedClinicId = selectedWorks[0]?.clinicId ?? null;
  const selectedTotal = selectedWorks.reduce((total, work) => total + (work.totalPriceMinor ?? 0), 0);

  function toggleWork(work: BillableWork): void {
    if (!work.isBillable) {
      return;
    }
    if (selectedClinicId && work.clinicId !== selectedClinicId && !selectedWorkIds.includes(work.id)) {
      toast.showToast({ message: "Selecția pentru un document trebuie să fie din aceeași clinică.", variant: "error" });
      return;
    }
    setSelectedWorkIds((current) => current.includes(work.id) ? current.filter((id) => id !== work.id) : [...current, work.id]);
  }

  async function createDocument(kind: "invoice" | "proforma"): Promise<void> {
    const mutation = kind === "invoice" ? createInvoiceMutation : createProformaMutation;
    try {
      await mutation.mutateAsync({
        issueDate: range.dateTo,
        workOrderIds: selectedWorkIds,
      });
      setSelectedWorkIds([]);
      toast.showToast({ message: kind === "invoice" ? "Factura draft a fost creată." : "Proforma draft a fost creată.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function issueDocumentsById(documentsToIssue: readonly BillingDocumentSummary[]): Promise<void> {
    if (documentsToIssue.length === 0) {
      return;
    }

    try {
      for (const document of documentsToIssue) {
        if (document.status === "DRAFT") {
          await issueMutation.mutateAsync(document.id);
        }
      }
      toast.showToast({ message: "Documentele selectate au fost emise.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function recordPaymentForDocument(documentId: string): Promise<void> {
    const input = toRecordPaymentInput(paymentForm);
    if (!input) {
      toast.showToast({ message: "Introdu o sumă încasată mai mare decât 0.", variant: "error" });
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({ documentId, input });
      setPaymentForm(createEmptyPaymentForm(range.dateTo));
      toast.showToast({ message: "Încasarea a fost înregistrată manual.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function exportStatementPdf(scope: "clinic" | "doctor", source: StatementSource = "documents", works: readonly BillableWork[] = []): Promise<void> {
    const downloadParams = {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      format: "a4",
      source,
      ...(scope === "clinic" && clinicStatementId ? { clinicId: clinicStatementId } : {}),
      ...(scope === "doctor" && doctorStatementId ? { doctorId: doctorStatementId } : {}),
      ...(source === "works" && works.length > 0 ? { workPayload: serializeStatementWorks(works) } : {}),
      ...(source === "documents" && selectedStatementDocumentIds.length > 0 ? { documentIds: selectedStatementDocumentIds.join(",") } : {}),
    };

    if (scope === "clinic") {
      await downloadClinicStatementPdf(downloadParams);
      return;
    }

    await downloadDoctorStatementPdf(downloadParams);
  }

  async function exportMonthRegistryPdf(): Promise<void> {
    const periodRange = monthRange(selectedPeriod);
    await downloadMonthRegistryPdf({
      dateFrom: periodRange.dateFrom,
      dateTo: periodRange.dateTo,
      month: selectedPeriod.month,
      year: selectedPeriod.year,
    });
  }

  if (!canUseBilling && !permissionsQuery.isLoading) {
    return <main className="billing-page"><ErrorState title="Acces refuzat" description="Nu ai permisiuni pentru facturare." /></main>;
  }

  return (
    <main className="billing-page">
      <section className="billing-page__header">
        <div>
          <p className="billing-page__eyebrow">Workspace financiar</p>
          <h1>Facturare</h1>
          <p>{activeCompanyLabel} · Registru lunar pentru lucrări, proforme, facturi, încasări și solduri.</p>
        </div>
        <div className="billing-page__quick-actions">
          <Button onClick={() => updateSelectedPeriod(currentBillingPeriod())} variant="secondary">Luna curentă</Button>
          <Button onClick={() => updateSelectedPeriod(shiftBillingPeriod(selectedPeriod, -1))} variant="secondary">Luna anterioară</Button>
          <Button onClick={() => updateSelectedPeriod(shiftBillingPeriod(selectedPeriod, 1))} variant="secondary">Luna următoare</Button>
        </div>
      </section>

      <section className="billing-page__filters-shell" aria-label="Filtre facturare">
        <div className="billing-page__toolbar billing-page__toolbar--filters">
          <p>Filtrele nu sunt afișate până nu le ceri.</p>
          <Button onClick={() => setFiltersOpen((current) => !current)} variant="secondary">
            {filtersOpen ? "Ascunde filtrele" : "Vezi filtrele"}
          </Button>
        </div>
        {filtersOpen ? (
          <section className="billing-page__filters" aria-label="Filtre facturare">
            <DateInput label="De la" value={range.dateFrom} onChange={(event) => setRange((current) => ({ ...current, dateFrom: event.target.value }))} />
            <DateInput label="Până la" value={range.dateTo} onChange={(event) => setRange((current) => ({ ...current, dateTo: event.target.value }))} />
            <TextInput label="Căutare" placeholder="Caută pacient, clinică, medic, cod lucrare, factură sau chitanță" value={search} onChange={(event) => setSearch(event.target.value)} />
            <TextInput label="Pacient" placeholder="Filtru pacient" value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)} />
            <TextInput label="Cod lucrare" placeholder="WO-2026..." value={workCodeFilter} onChange={(event) => setWorkCodeFilter(event.target.value)} />
            <Select
              label="Status încasare"
              options={paymentFilterOptions}
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as DocumentPaymentFilter)}
            />
            <Select
              label="Grupare"
              options={[
                { label: "Clinică", value: "clinic" },
                { label: "Medic", value: "doctor" },
                { label: "Zi", value: "day" },
                { label: "Lună", value: "month" },
                { label: "Pacient", value: "patient" },
                { label: "Status facturare", value: "billingStatus" },
                { label: "Status încasare", value: "paymentStatus" },
              ]}
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
            />
          </section>
        ) : null}
      </section>

      {overviewQuery.isLoading ? <LoadingState text="Se încarcă situația financiară" /> : null}
      {overviewQuery.error ? <ErrorState title="Situația nu poate fi încărcată" description={getErrorMessage(overviewQuery.error)} /> : null}
      {overviewQuery.data ? <OverviewCards overview={overviewQuery.data} currency={currency} locale={locale} onNavigate={(tab, nextFilter) => {
        setActiveTab(tab);
        if (nextFilter) {
          setPaymentFilter(nextFilter);
        }
      }} /> : null}

      <Tabs
        onValueChange={(value) => setActiveTab(isBillingTabId(value) ? value : "overview")}
        value={activeTab}
        tabs={[
          {
            id: "overview",
            label: "Prezentare generală",
            content: (
              <OverviewTab
                ambiguousLegacy={ambiguousLegacyQuery.data?.items ?? []}
                currency={currency}
                locale={locale}
                onPrint={() => window.print()}
                overview={overviewQuery.data}
              />
            ),
          },
          {
            id: "guide",
            label: "Ghid facturare",
            content: <BillingGuideTab />,
          },
          {
            id: "uninvoiced",
            label: "Lucrări nefacturate",
            content: (
              <BillableWorksTab
                canCreateInvoice={canCreateInvoice}
                canCreateNote={canReadFinance || canReadReports}
                currency={currency}
                isCreating={createProformaMutation.isPending || createInvoiceMutation.isPending}
                locale={locale}
                onCreateNote={() => void exportStatementPdf("clinic", "works", selectedWorks)}
                onCreateProforma={() => void createDocument("proforma")}
                onCreateInvoice={() => void createDocument("invoice")}
                onExport={() => downloadCsv("lucrari-nefacturate.csv", toCsv((billableWorksQuery.data?.items ?? []).map((work) => ({
                  "Cod lucrare": work.code,
                  "Clinică": work.clinicName,
                  "Medic": work.doctorName,
                  "Pacient": work.patientName,
                  "Valoare": work.totalPriceMinor === null ? "" : (work.totalPriceMinor / 100).toFixed(2),
                  "Monedă": currency,
                }))))}
                onToggleWork={toggleWork}
                query={billableWorksQuery}
                selectedTotal={selectedTotal}
                selectedWorkIds={selectedWorkIds}
              />
            ),
          },
          {
            id: "proformas",
            label: "Proforme",
            content: (
              <DocumentsTab
                canConvertSelected
                canRecordPayment={false}
                currency={currency}
                documents={proformasQuery.data?.items ?? []}
                error={proformasQuery.error}
                isLoading={proformasQuery.isLoading}
                isMutating={issueMutation.isPending || convertMutation.isPending || recordPaymentMutation.isPending}
                locale={locale}
                onExport={() => downloadCsv("proforme.csv", toCsv((proformasQuery.data?.items ?? []).map((document) => toDocumentCsvRow(document, currency))))}
                onIssueSelected={issueDocumentsById}
                onConvertSelected={async (documents) => {
                  const selectedDocument = documents[0];
                  if (!selectedDocument || documents.length !== 1 || selectedDocument.type !== "PROFORMA") {
                    return;
                  }
                  try {
                    await convertMutation.mutateAsync(selectedDocument.id);
                    setSelectedProformaIds([]);
                    toast.showToast({ message: "Proforma a fost transformată în factură.", variant: "success" });
                  } catch (error) {
                    toast.showToast({ message: getErrorMessage(error), variant: "error" });
                  }
                }}
                onDownloadPdf={(documentId) => void downloadBillingDocumentPdf(documentId)}
                onOpenPreview={(documentId) => window.open(`/billing/documents/${documentId}/print`, "_blank", "noopener,noreferrer")}
                onRecordPaymentSelected={recordPaymentForDocument}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                selectedDocumentIds={selectedProformaIds}
                onSelectionChange={setSelectedProformaIds}
                selectionLabel="proforme"
              />
            ),
          },
          {
            id: "invoices",
            label: "Facturi",
            content: (
              <DocumentsTab
                canConvertSelected={false}
                canRecordPayment={canRecordPayment}
                currency={currency}
                documents={invoicesQuery.data?.items ?? []}
                error={invoicesQuery.error}
                isLoading={invoicesQuery.isLoading}
                isMutating={issueMutation.isPending || convertMutation.isPending || recordPaymentMutation.isPending}
                locale={locale}
                onExport={() => downloadCsv("facturi.csv", toCsv((invoicesQuery.data?.items ?? []).map((document) => toDocumentCsvRow(document, currency))))}
                onIssueSelected={issueDocumentsById}
                onDownloadPdf={(documentId) => void downloadBillingDocumentPdf(documentId)}
                onOpenPreview={(documentId) => window.open(`/billing/documents/${documentId}/print`, "_blank", "noopener,noreferrer")}
                onRecordPaymentSelected={recordPaymentForDocument}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                selectedDocumentIds={selectedInvoiceIds}
                onSelectionChange={setSelectedInvoiceIds}
                selectionLabel="facturi"
              />
            ),
          },
          {
            id: "payments",
            label: "Încasări",
            content: (
              <PaymentsTab
                currency={currency}
                isLoading={paymentsQuery.isLoading}
                locale={locale}
                onExport={() => downloadCsv("incasari.csv", toCsv((paymentsQuery.data?.items ?? []).map((payment) => ({
                  "Factură": payment.documentNumber,
                  "Data încasării": formatCsvDate(payment.paymentDate),
                  "Sumă": (payment.amountMinor / 100).toFixed(2),
                  "Monedă": payment.currency,
                  "Metodă": toPaymentMethodLabel(payment.method),
                  "Număr chitanță": payment.receiptNumber,
                  "Referință": payment.reference,
                }))))}
                payments={paymentsQuery.data?.items ?? []}
              />
            ),
          },
          {
            id: "receivables",
            label: "Restanțe",
            content: (
              <ReceivablesTab
                currency={currency}
                error={receivablesQuery.error}
                isLoading={receivablesQuery.isLoading}
                isMutating={recordPaymentMutation.isPending}
                items={receivablesQuery.data?.items ?? []}
                locale={locale}
                onExport={() => downloadCsv("restante.csv", toCsv((receivablesQuery.data?.items ?? []).map((item) => ({
                  "Factură": item.documentNumber,
                  "Clinică": item.clinicName,
                  "Medici": item.doctorNames.join(", "),
                  "Pacienți": item.patientNames.join(", "),
                  "Lucrări": item.workCodes.join(", "),
                  "Data emiterii": formatCsvDate(item.issueDate),
                  "Scadență": formatCsvDate(item.dueDate),
                  "Zile întârziere": item.daysOverdue,
                  "Sold": (item.balanceMinor / 100).toFixed(2),
                  "Monedă": item.currency,
                }))))}
                onOpenSelected={(documentId) => window.open(`/billing/documents/${documentId}/print`, "_blank", "noopener,noreferrer")}
                onRecordPaymentSelected={recordPaymentForDocument}
                onSelectionChange={setSelectedReceivableIds}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                selectedDocumentIds={selectedReceivableIds}
                selectedDocuments={selectedReceivables}
              />
            ),
          },
          {
            id: "statements",
            label: "Note de plată",
            content: (
              <StatementsTab
                clinicOptions={billableItemClinics}
                clinicStatement={clinicStatementQuery.data}
                doctorOptions={billableItemDoctors}
                doctorStatement={doctorStatementQuery.data}
                isClinicLoading={clinicStatementQuery.isLoading}
                isDoctorLoading={doctorStatementQuery.isLoading}
                selectedClinicId={clinicStatementId}
                selectedDoctorId={doctorStatementId}
                onClinicChange={setClinicStatementId}
                onDoctorChange={setDoctorStatementId}
                onOpenPrint={(scope, source) => void exportStatementPdf(scope, source, selectedWorks)}
                selectedDocumentIds={selectedStatementDocumentIds}
                onSelectionChange={setSelectedStatementDocumentIds}
                scope={statementScope}
                setScope={setStatementScope}
                source={statementSource}
                setSource={setStatementSource}
              />
            ),
          },
          {
            id: "month-close",
            label: "Închidere lună",
            content: <MonthCloseTab
              clinicOverview={monthCloseClinicOverviewQuery.data}
              overview={overviewQuery.data}
              registry={monthRegistryQuery.data}
              currency={currency}
              locale={locale}
              doctorOverview={monthCloseDoctorOverviewQuery.data}
              isClosing={closeMonthRegistryMutation.isPending}
              monthLabel={formatBillingPeriod(selectedPeriod)}
              onOpenArchive={() => navigate(`/billing/archive?year=${selectedPeriod.year}`)}
              onPeriodChange={updateSelectedPeriod}
              onExportRegistry={async () => {
                try {
                  downloadCsv(`registru-lunar-facturare-${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, "0")}.csv`, await downloadMonthRegistryCsv(monthRegistryParams));
                } catch (error) {
                  toast.showToast({ message: getErrorMessage(error), variant: "error" });
                }
              }}
              onPrintRegistry={() => void exportMonthRegistryPdf()}
              onCloseRegistry={() => closeMonthRegistryMutation.mutate()}
              yearOptions={yearOptions}
              selectedPeriod={selectedPeriod}
            />,
          },
          {
            id: "series",
            label: "Serii",
            content: <SeriesTab canConfigure={canConfigureSeries} isLoading={seriesQuery.isLoading} series={seriesQuery.data?.items ?? []} />,
          },
        ]}
      />
    </main>
  );
}

function OverviewCards({
  currency,
  locale,
  onNavigate,
  overview,
}: {
  readonly currency: string;
  readonly locale: string;
  readonly onNavigate: (tab: BillingTabId, nextFilter?: DocumentPaymentFilter) => void;
  readonly overview: BillingOverview;
}): ReactNode {
  const cards = [
    { count: overview.uninvoicedWorkCount, label: "Lucrări nefacturate", tab: "uninvoiced", tone: "money", value: overview.uninvoicedMinor },
    { count: overview.openProformaCount, label: "Proforme deschise", tab: "proformas", tone: "money", value: overview.proformaMinor },
    { count: overview.unpaidInvoiceCount, label: "Facturi neachitate", filter: "UNPAID", tab: "receivables", tone: "money", value: overview.outstandingMinor },
    { count: overview.partialInvoiceCount, label: "Facturi parțial achitate", filter: "PARTIALLY_PAID", tab: "receivables", tone: "money", value: overview.outstandingMinor },
    { count: overview.paidInvoiceCount, label: "Facturi achitate", filter: "PAID", tab: "invoices", tone: "money", value: overview.paidMinor },
    { count: overview.invoiceCount, label: "Total emis", tab: "invoices", tone: "money", value: overview.totalIssuedMinor },
    { count: overview.documentCount, label: "Total documente", tab: "overview", tone: "money", value: overview.paidMinor },
    { count: overview.unpaidInvoiceCount, label: "Sold restant", filter: "OUTSTANDING", tab: "receivables", tone: "money", value: overview.outstandingMinor },
    { count: overview.ambiguousLegacyCount, label: "Documente legacy de revizuit", tab: "overview", tone: "count", value: overview.ambiguousLegacyCount },
  ] as const;

  return (
    <section className="billing-page__cards" aria-label="Indicatori facturare">
      {cards.map((card) => (
          <button
            className="billing-page__kpi-card"
            key={card.label}
            onClick={() => onNavigate(card.tab, "filter" in card ? card.filter : undefined)}
            type="button"
          >
          <span className="billing-page__kpi-label">{card.label}</span>
          <strong className="billing-page__kpi-value">
            {card.tone === "count" ? card.value : formatKpiMoneyMinor(card.value, currency, locale)}
          </strong>
          <small className="billing-page__kpi-meta">{card.count} înregistrări</small>
        </button>
      ))}
    </section>
  );
}

function OverviewTab({
  ambiguousLegacy,
  currency,
  locale,
  onPrint,
  overview,
}: {
  readonly ambiguousLegacy: readonly AmbiguousLegacyBillingRecord[];
  readonly currency: string;
  readonly locale: string;
  readonly onPrint: () => void;
  readonly overview: BillingOverview | undefined;
}): ReactNode {
  if (!overview) {
    return <LoadingState text="Se încarcă prezentarea generală" />;
  }

  const columns: readonly DataTableColumn<AmbiguousLegacyBillingRecord>[] = [
    { id: "number", header: "Document", renderCell: (row) => row.documentNumber ?? "Legacy fără număr" },
    { id: "type", header: "Tip", renderCell: (row) => toDocumentTypeLabel(row.documentType) },
    { id: "clinic", header: "Clinică", renderCell: (row) => row.clinicName },
    { id: "works", header: "Lucrări", renderCell: (row) => row.workCodes.join(", ") || "-" },
    { id: "companies", header: "Firme pe linii", renderCell: (row) => row.lineCompanyCodes.join(", ") || "-" },
    { id: "total", header: "Total", align: "right", renderCell: (row) => formatMoneyMinor(row.totalMinor, currency, locale) },
  ];

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar">
        <p>Documentele legacy sunt doar pentru revizuire read-only. {overview.ambiguousLegacyCount} înregistrări necesită verificare.</p>
        <Button onClick={onPrint} variant="outline">Export PDF</Button>
      </div>
      <DataTable columns={columns} emptyMessage="Nu există documente legacy ambigue pentru firma activă." getRowKey={(row) => row.documentId} rows={ambiguousLegacy} />
    </section>
  );
}

function StatementsTab({
  clinicOptions,
  clinicStatement,
  doctorOptions,
  doctorStatement,
  isClinicLoading,
  isDoctorLoading,
  onClinicChange,
  onDoctorChange,
  onOpenPrint,
  onSelectionChange,
  scope,
  source,
  selectedClinicId,
  selectedDocumentIds,
  selectedDoctorId,
  setScope,
  setSource,
}: {
  readonly clinicOptions: readonly { readonly label: string; readonly value: string }[];
  readonly clinicStatement: ClinicBillingStatement | undefined;
  readonly doctorOptions: readonly { readonly label: string; readonly value: string }[];
  readonly doctorStatement: DoctorBillingStatement | undefined;
  readonly isClinicLoading: boolean;
  readonly isDoctorLoading: boolean;
  readonly onClinicChange: (value: string) => void;
  readonly onDoctorChange: (value: string) => void;
  readonly onOpenPrint: (scope: "clinic" | "doctor", source: StatementSource) => void;
  readonly onSelectionChange: (ids: readonly string[]) => void;
  readonly scope: "clinic" | "doctor";
  readonly source: StatementSource;
  readonly selectedClinicId: string;
  readonly selectedDocumentIds: readonly string[];
  readonly selectedDoctorId: string;
  readonly setScope: (scope: "clinic" | "doctor") => void;
  readonly setSource: (source: StatementSource) => void;
}): ReactNode {
  const statement = scope === "clinic" ? clinicStatement : doctorStatement;
  const isLoading = scope === "clinic" ? isClinicLoading : isDoctorLoading;
  const selectedValue = scope === "clinic" ? selectedClinicId : selectedDoctorId;
  const emptyMessage = scope === "clinic" ? "Nu există clinică disponibilă pentru perioada curentă." : "Nu există medic disponibil pentru perioada curentă.";
  const documents = statement?.documents ?? [];
  const selectedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.documentId));
  const selectedTotalMinor = selectedDocuments.reduce((total, document) => total + document.totalMinor, 0);
  const hasSelection = selectedDocumentIds.length > 0;
  const hasWorks = Boolean(statement?.uninvoicedWorks.length);
  const activeSource = source === "works" && hasWorks ? "works" : "documents";

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar billing-page__toolbar--inline">
        <Button onClick={() => setScope("clinic")} variant={scope === "clinic" ? "primary" : "secondary"}>Clinică</Button>
        <Button onClick={() => setScope("doctor")} variant={scope === "doctor" ? "primary" : "secondary"}>Medic</Button>
        <Button onClick={() => setSource("documents")} variant={activeSource === "documents" ? "primary" : "secondary"}>Documente restante</Button>
        <Button disabled={!hasWorks} onClick={() => setSource("works")} variant={activeSource === "works" ? "primary" : "secondary"}>Lucrări nefacturate</Button>
        <Button disabled={!statement} onClick={() => onOpenPrint(scope, activeSource)} variant="outline">
          {activeSource === "documents" && hasSelection ? "Exportă selecția PDF" : "Export PDF"}
        </Button>
        {hasSelection ? <Button onClick={() => onSelectionChange([])} variant="secondary">Golește selecția</Button> : null}
      </div>
      <div className="billing-page__filters">
        {scope === "clinic" ? (
          <Select
            label="Clinică"
            options={clinicOptions}
            placeholder="Alege clinica"
            value={selectedValue}
            onChange={(event) => onClinicChange(event.target.value)}
          />
        ) : (
          <Select
            label="Medic"
            options={doctorOptions}
            placeholder="Alege medicul"
            value={selectedValue}
            onChange={(event) => onDoctorChange(event.target.value)}
          />
        )}
      </div>
      {isLoading ? <LoadingState text="Se încarcă nota de plată" /> : null}
      {!isLoading && !statement ? <ErrorState title="Nota de plată nu este disponibilă" description={emptyMessage} /> : null}
      {statement ? (
        <StatementPreview
          activeSource={activeSource}
          onSelectionChange={onSelectionChange}
          statement={statement}
          selectedDocumentIds={selectedDocumentIds}
          selectedDocuments={selectedDocuments}
          selectedTotalMinor={selectedTotalMinor}
          scope={scope}
        />
      ) : null}
    </section>
  );
}

function StatementPreview({
  activeSource,
  onSelectionChange,
  scope,
  statement,
  selectedDocumentIds,
  selectedDocuments,
  selectedTotalMinor,
}: {
  readonly activeSource: StatementSource;
  readonly onSelectionChange: (ids: readonly string[]) => void;
  readonly scope: "clinic" | "doctor";
  readonly statement: ClinicBillingStatement | DoctorBillingStatement;
  readonly selectedDocumentIds: readonly string[];
  readonly selectedDocuments: readonly BillingStatementRow[];
  readonly selectedTotalMinor: number;
}): ReactNode {
  const recipientName = scope === "clinic"
    ? ("clinicName" in statement ? statement.clinicName : "")
    : ("doctorName" in statement ? statement.doctorName : "");
  const hasDocuments = statement.documents.length > 0;
  const effectiveDocuments = selectedDocumentIds.length > 0 ? selectedDocuments : statement.documents;
  const effectiveTotalMinor = selectedDocumentIds.length > 0 ? selectedTotalMinor : statement.totalMinor;
  const effectivePaidMinor = selectedDocumentIds.length > 0
    ? effectiveDocuments.reduce((total, row) => total + row.paidMinor, 0)
    : statement.paidMinor;
  const effectiveBalanceMinor = selectedDocumentIds.length > 0
    ? effectiveDocuments.reduce((total, row) => total + row.balanceMinor, 0)
    : statement.documents.reduce((total, row) => total + row.balanceMinor, 0);
  const hasSelection = selectedDocumentIds.length > 0;
  const hasWorks = statement.uninvoicedWorks.length > 0;
  return (
    <div className="billing-page__statement">
      <Card>
        <CardHeader>
          <CardTitle>{recipientName}</CardTitle>
          <CardDescription>{formatDate(statement.dateFrom)} - {formatDate(statement.dateTo)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="billing-page__registry-summary">
            <span>{hasSelection ? "Total selectat" : "Total"}: {formatMoneyMinor(effectiveTotalMinor, statement.currency, "ro-RO")}</span>
            <span>Încasat: {formatMoneyMinor(effectivePaidMinor, statement.currency, "ro-RO")}</span>
            <span>Sold restant: {formatMoneyMinor(effectiveBalanceMinor, statement.currency, "ro-RO")}</span>
            <span>Documente: {effectiveDocuments.length}</span>
          </div>
        </CardContent>
      </Card>
      {activeSource === "documents" ? (
        <Card>
          <CardHeader>
            <CardTitle>Documente incluse</CardTitle>
            <CardDescription>{effectiveDocuments.length} documente {hasSelection ? "selectate" : "din perioadă"}</CardDescription>
          </CardHeader>
          <CardContent>
            {hasDocuments ? (
              <SelectableStatementDocumentsTable
                currency={statement.currency}
                documents={statement.documents}
                onSelectionChange={onSelectionChange}
                selectedDocumentIds={selectedDocumentIds}
              />
            ) : <p className="billing-page__readonly">Nu există documente în perioada selectată.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lucrări nefacturate</CardTitle>
            <CardDescription>{statement.uninvoicedWorks.length} lucrări</CardDescription>
          </CardHeader>
          <CardContent>
            {hasWorks ? <StatementWorksTable rows={statement.uninvoicedWorks} currency={statement.currency} /> : <p className="billing-page__readonly">Nu există lucrări nefacturate în perioada selectată.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SelectableStatementDocumentsTable({
  currency,
  documents,
  onSelectionChange,
  selectedDocumentIds,
}: {
  readonly currency: string;
  readonly documents: readonly BillingStatementRow[];
  readonly onSelectionChange: (ids: readonly string[]) => void;
  readonly selectedDocumentIds: readonly string[];
}): ReactNode {
  const columns = useMemo<readonly DataTableColumn<BillingStatementRow>[]>(() => [
    { id: "select", header: "", renderCell: (row) => <input aria-label={`Selectează ${row.documentNumber ?? row.documentId}`} checked={selectedDocumentIds.includes(row.documentId)} onChange={() => onSelectionChange(toggleSelectedId(selectedDocumentIds, row.documentId))} type="checkbox" /> },
    { id: "number", header: "Document", renderCell: (row) => row.documentNumber ?? "-" },
    { id: "type", header: "Tip", renderCell: (row) => toDocumentTypeLabel(row.documentType) },
    { id: "issue", header: "Emis", renderCell: (row) => formatDate(row.issueDate) },
    { id: "due", header: "Scadență", renderCell: (row) => row.dueDate ? formatDate(row.dueDate) : "-" },
    { id: "works", header: "Lucrări", renderCell: (row) => row.workCodes.join(", ") || "-" },
    { id: "total", header: "Total", align: "right", renderCell: (row) => formatMoneyMinor(row.totalMinor, currency, "ro-RO") },
    { id: "paid", header: "Încasat", align: "right", renderCell: (row) => formatMoneyMinor(row.paidMinor, currency, "ro-RO") },
    { id: "balance", header: "Sold", align: "right", renderCell: (row) => formatMoneyMinor(row.balanceMinor, currency, "ro-RO") },
  ], [currency, onSelectionChange, selectedDocumentIds]);

  return (
    <div className="billing-page__statement-selection">
      <div className="billing-page__toolbar billing-page__toolbar--tight">
        <Button onClick={() => onSelectionChange(selectAllIds(selectedDocumentIds, documents.map((document) => document.documentId)))} variant="secondary">
          {selectedDocumentIds.length === documents.length ? "Deselectează tot" : "Selectează tot"}
        </Button>
        <p className="billing-page__readonly">{selectedDocumentIds.length} documente selectate</p>
      </div>
      <DataTable columns={columns} emptyMessage="Nu există documente." getRowKey={(row) => row.documentId} rows={documents} />
    </div>
  );
}

function StatementWorksTable({ currency, rows }: { readonly currency: string; readonly rows: readonly BillingStatementWorkRow[] }): ReactNode {
  const columns = useMemo<readonly DataTableColumn<BillingStatementWorkRow>[]>(() => [
    { id: "code", header: "Cod", renderCell: (row) => row.code },
    { id: "createdAt", header: "Creat", renderCell: (row) => formatDate(row.createdAt) },
    { id: "patient", header: "Pacient", renderCell: (row) => row.patientName },
    { id: "clinic", header: "Clinică", renderCell: (row) => row.clinicName },
    { id: "doctor", header: "Medic", renderCell: (row) => row.doctorName },
    { id: "type", header: "Tip", renderCell: (row) => row.workTypeName },
    { id: "price", header: "Valoare", align: "right", renderCell: (row) => formatMoneyMinor(row.totalPriceMinor, currency, "ro-RO") },
  ], [currency]);

  return <DataTable columns={columns} emptyMessage="Nu există lucrări." getRowKey={(row) => row.code} rows={rows} />;
}

function BillableWorksTab({
  canCreateInvoice,
  canCreateNote,
  currency,
  isCreating,
  locale,
  onCreateNote,
  onCreateProforma,
  onCreateInvoice,
  onExport,
  onToggleWork,
  query,
  selectedTotal,
  selectedWorkIds,
}: {
  readonly canCreateInvoice: boolean;
  readonly canCreateNote: boolean;
  readonly currency: string;
  readonly isCreating: boolean;
  readonly locale: string;
  readonly onCreateNote: () => void;
  readonly onCreateProforma: () => void;
  readonly onCreateInvoice: () => void;
  readonly onExport: () => void;
  readonly onToggleWork: (work: BillableWork) => void;
  readonly query: ReturnType<typeof useBillableWorks>;
  readonly selectedTotal: number;
  readonly selectedWorkIds: readonly string[];
}): ReactNode {
  const columns = useMemo<readonly DataTableColumn<BillableWork>[]>(() => [
    { id: "select", header: "", renderCell: (work) => <input aria-label={`Selectează ${work.code}`} checked={selectedWorkIds.includes(work.id)} disabled={!work.isBillable} onChange={() => onToggleWork(work)} type="checkbox" /> },
    { id: "code", header: "Cod", renderCell: (work) => work.code },
    { id: "createdAt", header: "Intrare", renderCell: (work) => formatDate(work.createdAt) },
    { id: "clinic", header: "Clinică", renderCell: (work) => work.clinicName },
    { id: "company", header: "Firmă", renderCell: (work) => work.legalEntityCode ?? "-" },
    { id: "cycle", header: "Ciclu", renderCell: (work) => work.workCycleNumber ? `Ciclul ${work.workCycleNumber}` : "-" },
    { id: "doctor", header: "Medic", renderCell: (work) => work.doctorName },
    { id: "patient", header: "Pacient", renderCell: (work) => work.patientName },
    { id: "type", header: "Tip", renderCell: (work) => work.workTypeName },
    { id: "quantity", header: "Elemente", align: "right", renderCell: (work) => work.quantity },
    { id: "total", header: "Valoare", align: "right", renderCell: (work) => work.totalPriceMinor === null ? "Restricționat" : formatMoneyMinor(work.totalPriceMinor, work.currency ?? currency, locale) },
    { id: "status", header: "Facturare", renderCell: (work) => work.isBillable ? "Nefacturat" : work.unavailableReason },
  ], [currency, locale, onToggleWork, selectedWorkIds]);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar">
        <p>{selectedWorkIds.length} lucrări selectate · {formatMoneyMinor(selectedTotal, currency, locale)}</p>
        <Button onClick={onExport} variant="outline">Export CSV</Button>
        {canCreateNote ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateNote} variant="secondary">Creează notă de plată</Button> : null}
        {canCreateNote ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateProforma} variant="secondary">Creează proformă</Button> : null}
        {canCreateInvoice ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateInvoice} variant="secondary">Creează factură</Button> : null}
      </div>
      <DataTable columns={columns} emptyMessage="Nu există lucrări nefacturate în perioada selectată." error={query.error ? getErrorMessage(query.error) : undefined} getRowKey={(work) => work.id} isLoading={query.isLoading} rows={query.data?.items ?? []} />
    </section>
  );
}

function DocumentsTab({
  canConvertSelected,
  canRecordPayment,
  currency,
  documents,
  error,
  isLoading,
  isMutating,
  locale,
  onExport,
  onDownloadPdf,
  onIssueSelected,
  onConvertSelected,
  onOpenPreview,
  onRecordPaymentSelected,
  onSelectionChange,
  paymentForm,
  setPaymentForm,
  selectedDocumentIds,
  selectionLabel,
}: {
  readonly canConvertSelected: boolean;
  readonly canRecordPayment: boolean;
  readonly currency: string;
  readonly documents: readonly BillingDocumentSummary[];
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly locale: string;
  readonly onExport: () => void;
  readonly onDownloadPdf: (documentId: string) => void;
  readonly onIssueSelected: (documents: readonly BillingDocumentSummary[]) => Promise<void>;
  readonly onConvertSelected?: (documents: readonly BillingDocumentSummary[]) => Promise<void>;
  readonly onOpenPreview: (documentId: string) => void;
  readonly onRecordPaymentSelected: (documentId: string) => Promise<void>;
  readonly onSelectionChange: (ids: readonly string[]) => void;
  readonly paymentForm: ManualPaymentFormState;
  readonly setPaymentForm: (updater: (current: ManualPaymentFormState) => ManualPaymentFormState) => void;
  readonly selectedDocumentIds: readonly string[];
  readonly selectionLabel: string;
}): ReactNode {
  const toast = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const selectedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.id));
  const selectedDocument = selectedDocuments[0] ?? null;
  const selectedCount = selectedDocumentIds.length;
  const columns = useMemo<readonly DataTableColumn<BillingDocumentSummary>[]>(() => [
    { id: "select", header: "", renderCell: (document) => <input aria-label={`Selectează ${document.formattedNumber ?? "Draft"}`} checked={selectedDocumentIds.includes(document.id)} onChange={() => onSelectionChange(toggleSelectedId(selectedDocumentIds, document.id))} type="checkbox" /> },
    { id: "number", header: "Număr", renderCell: (document) => document.formattedNumber ?? "Draft" },
    { id: "type", header: "Tip", renderCell: (document) => toDocumentTypeLabel(document.type) },
    { id: "status", header: "Status", renderCell: (document) => toDocumentStatusLabel(document.status) },
    { id: "company", header: "Firmă", renderCell: (document) => document.legalEntityCode ?? "-" },
    { id: "clinic", header: "Clinică", renderCell: (document) => document.clinicName },
    { id: "works", header: "Lucrări", renderCell: (document) => document.workCodes.join(", ") || "-" },
    { id: "due", header: "Scadență", renderCell: (document) => document.dueDate ? formatDate(document.dueDate) : "-" },
    { id: "total", header: "Total", align: "right", renderCell: (document) => formatMoneyMinor(document.totalMinor, document.currency, locale) },
    { id: "payment", header: "Încasare", renderCell: (document) => toPaymentStatusLabel(document.paymentStatus) },
    { id: "balance", header: "Sold restant", align: "right", renderCell: (document) => formatMoneyMinor(document.balanceMinor, document.currency, locale) },
  ], [locale, onSelectionChange, selectedDocumentIds]);
  const canUsePaymentForm = Boolean(selectedDocument && selectedDocument.type === "INVOICE" && selectedDocument.status !== "CANCELLED" && selectedDocument.balanceMinor > 0);
  const selectedTotalMinor = selectedDocuments.reduce((total, document) => total + document.totalMinor, 0);

  useEffect(() => {
    if (!isPaymentOpen || !canUsePaymentForm || !selectedDocument) {
      return;
    }

    const nextAmount = formatMoneyInputMinor(selectedDocument.balanceMinor);
    setPaymentForm((current) => {
      if (current.amount === nextAmount) {
        return current;
      }

      return { ...current, amount: nextAmount };
    });
  }, [canUsePaymentForm, isPaymentOpen, selectedDocument?.balanceMinor, selectedDocument?.id, setPaymentForm]);

  async function issueSelected(): Promise<void> {
    if (selectedDocuments.length === 0) {
      return;
    }

    const issueableDocuments = selectedDocuments.filter((document) => document.status === "DRAFT");
    if (issueableDocuments.length === 0) {
      toast.showToast({ message: "Documentele selectate sunt deja emise.", variant: "error" });
      return;
    }

    await onIssueSelected(issueableDocuments);
    if (issueableDocuments.length !== selectedDocuments.length) {
      toast.showToast({ message: `Au fost emise doar ${issueableDocuments.length} documente draft selectate.`, variant: "success" });
    }
  }

  async function convertSelected(): Promise<void> {
    if (!onConvertSelected || selectedDocuments.length !== 1) {
      return;
    }
    await onConvertSelected(selectedDocuments);
  }

  async function recordSelectedPayment(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    await onRecordPaymentSelected(selectedDocument.id);
    setIsPaymentOpen(false);
  }

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar billing-page__toolbar--wrap">
        <p>{selectedCount} {selectionLabel} selectate · {formatMoneyMinor(selectedTotalMinor, currency, locale)}</p>
        <Button onClick={onExport} variant="outline">Export CSV</Button>
        <Button disabled={selectedCount === 0 || isMutating} onClick={() => void issueSelected()} variant="secondary">Emite selectate</Button>
        {canConvertSelected ? <Button disabled={selectedCount !== 1 || selectedDocument?.type !== "PROFORMA" || isMutating} onClick={() => void convertSelected()} variant="secondary">Transformă în factură</Button> : null}
        {canRecordPayment ? <Button disabled={!canUsePaymentForm || selectedCount !== 1 || isMutating} onClick={() => setIsPaymentOpen(true)} variant="secondary">Înregistrează încasare</Button> : null}
        <Button disabled={selectedCount === 0} onClick={() => onDownloadPdf(selectedDocument ? selectedDocument.id : "")} variant="outline">Export PDF</Button>
      </div>
      <DataTable
        columns={columns}
        emptyMessage="Nu există proforme sau facturi."
        error={error ? getErrorMessage(error) : undefined}
        getRowKey={(document) => document.id}
        isLoading={isLoading}
        onRowAction={(document) => onOpenPreview(document.id)}
        rowActionLabel="Deschide"
        rows={documents}
      />
      {selectedDocument ? (
        <section className="billing-page__print-preview" aria-label="Anexa facturare">
          <h2>{selectedDocument.type === "PROFORMA" ? "PROFORMĂ" : "FACTURĂ"} {selectedDocument.formattedNumber ?? "Draft"}</h2>
          <p>{selectedDocument.legalEntityCode ?? "-"} · {selectedDocument.clinicName} · Total {formatMoneyMinor(selectedDocument.totalMinor, currency, locale)} · Încasat {formatMoneyMinor(selectedDocument.paidMinor, currency, locale)} · Sold restant {formatMoneyMinor(selectedDocument.balanceMinor, currency, locale)}</p>
        </section>
      ) : null}
      {canRecordPayment ? (
        <Modal
          description={selectedDocument ? `${selectedDocument.formattedNumber ?? "Draft"} · sold restant ${formatMoneyMinor(selectedDocument.balanceMinor, currency, locale)}` : "Selectează o factură cu sold restant."}
          footer={<Button disabled={!canUsePaymentForm || isMutating} isLoading={isMutating} onClick={() => void recordSelectedPayment()}>Înregistrează încasarea</Button>}
          isOpen={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          title="Înregistrare manuală încasare"
        >
          <section className="billing-page__payment-form" aria-label="Înregistrare manuală încasare">
            <div>
              <h3>Evidență încasări</h3>
              <p>Înregistrează manual o plată efectuată în afara aplicației. Aplicația nu procesează bani, nu emite bon fiscal și nu se conectează la POS sau bancă.</p>
            </div>
            <TextInput disabled={!canUsePaymentForm} inputMode="decimal" label="Sumă încasată" placeholder="0.00" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
            <DateInput disabled={!canUsePaymentForm} label="Data încasării" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} />
            <Select
              disabled={!canUsePaymentForm}
              label="Metoda informativa"
              options={[
                { label: "Numerar", value: "CASH" },
                { label: "Transfer bancar", value: "BANK_TRANSFER" },
                { label: "Card", value: "CARD" },
                { label: "Altă metodă", value: "OTHER" },
              ]}
              value={paymentForm.method}
              onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))}
            />
            <TextInput disabled={!canUsePaymentForm} label="Număr chitanță" value={paymentForm.receiptNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, receiptNumber: event.target.value }))} />
            <DateInput disabled={!canUsePaymentForm} label="Data chitanței" value={paymentForm.receiptDate} onChange={(event) => setPaymentForm((current) => ({ ...current, receiptDate: event.target.value }))} />
            <TextInput disabled={!canUsePaymentForm} label="Referință bancară" value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} />
            <TextInput disabled={!canUsePaymentForm} label="Observații" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} />
          </section>
        </Modal>
      ) : null}
    </section>
  );
}

function toPaymentStatusLabel(status: BillingDocumentSummary["paymentStatus"]): string {
  if (status === "PAID") {
    return "Achitat integral";
  }

  if (status === "PARTIALLY_PAID") {
    return "Plată parțială";
  }

  return "Neachitat";
}

function PaymentsTab({ currency, isLoading, locale, onExport, payments }: { readonly currency: string; readonly isLoading: boolean; readonly locale: string; readonly onExport: () => void; readonly payments: readonly { readonly amountMinor: number; readonly documentNumber: string | null; readonly id: string; readonly method: string; readonly paymentDate: string; readonly receiptNumber: string | null; readonly reference: string | null }[] }): ReactNode {
  const columns = useMemo<readonly DataTableColumn<(typeof payments)[number]>[]>(() => [
    { id: "date", header: "Data", renderCell: (payment) => formatDate(payment.paymentDate) },
    { id: "document", header: "Document", renderCell: (payment) => payment.documentNumber ?? "-" },
    { id: "method", header: "Metodă", renderCell: (payment) => toPaymentMethodLabel(payment.method) },
    { id: "receipt", header: "Chitanță", renderCell: (payment) => payment.receiptNumber ?? payment.reference ?? "-" },
    { id: "amount", header: "Sumă încasată", align: "right", renderCell: (payment) => formatMoneyMinor(payment.amountMinor, currency, locale) },
  ], [currency, locale]);

  return (
    <section className="billing-page__tab">
      <p className="billing-page__readonly">Evidența manuală a încasărilor efectuate în afara aplicației.</p>
      <div className="billing-page__toolbar"><Button onClick={onExport} variant="outline">Export CSV</Button></div>
      <DataTable columns={columns} emptyMessage="Nu există încasări." getRowKey={(payment) => payment.id} isLoading={isLoading} rows={payments} />
    </section>
  );
}

function ReceivablesTab({
  currency,
  error,
  isLoading,
  isMutating,
  items,
  locale,
  onExport,
  onOpenSelected,
  onRecordPaymentSelected,
  onSelectionChange,
  setPaymentForm,
  selectedDocumentIds,
  selectedDocuments,
  paymentForm,
}: {
  readonly currency: string;
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly items: readonly BillingReceivableRow[];
  readonly locale: string;
  readonly onExport: () => void;
  readonly onOpenSelected: (documentId: string) => void;
  readonly onRecordPaymentSelected: (documentId: string) => Promise<void>;
  readonly onSelectionChange: (ids: readonly string[]) => void;
  readonly setPaymentForm: (updater: (current: ManualPaymentFormState) => ManualPaymentFormState) => void;
  readonly paymentForm: ManualPaymentFormState;
  readonly selectedDocumentIds: readonly string[];
  readonly selectedDocuments: readonly BillingReceivableRow[];
}): ReactNode {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const selectedCount = selectedDocumentIds.length;
  const selectedDocument = selectedDocuments[0] ?? null;
  const canUsePaymentForm = Boolean(selectedDocument && selectedDocument.balanceMinor > 0);
  useEffect(() => {
    if (!isPaymentOpen || !selectedDocument) {
      return;
    }

    const nextAmount = formatMoneyInputMinor(selectedDocument.balanceMinor);
    setPaymentForm((current) => {
      if (current.amount === nextAmount) {
        return current;
      }

      return { ...current, amount: nextAmount };
    });
  }, [isPaymentOpen, selectedDocument?.balanceMinor, selectedDocument?.documentId, setPaymentForm]);

  async function recordSelectedPayment(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    await onRecordPaymentSelected(selectedDocument.documentId);
    setIsPaymentOpen(false);
  }
  const columns = useMemo<readonly DataTableColumn<BillingReceivableRow>[]>(() => [
    { id: "select", header: "", renderCell: (item) => <input aria-label={`Selectează ${item.documentNumber ?? item.documentId}`} checked={selectedDocumentIds.includes(item.documentId)} onChange={() => onSelectionChange(toggleSelectedId(selectedDocumentIds, item.documentId))} type="checkbox" /> },
    { id: "number", header: "Factură", renderCell: (item) => item.documentNumber ?? "-" },
    { id: "clinic", header: "Clinică", renderCell: (item) => item.clinicName },
    { id: "doctor", header: "Medic", renderCell: (item) => item.doctorNames.join(", ") || "-" },
    { id: "patient", header: "Pacient", renderCell: (item) => item.patientNames.join(", ") || "-" },
    { id: "works", header: "Lucrări", renderCell: (item) => item.workCodes.join(", ") || "-" },
    { id: "issue", header: "Emisă", renderCell: (item) => formatDate(item.issueDate) },
    { id: "due", header: "Scadență", renderCell: (item) => item.dueDate ? formatDate(item.dueDate) : "-" },
    { id: "overdue", header: "Restanță", renderCell: (item) => item.daysOverdue > 0 ? `${item.daysOverdue} zile` : "În termen" },
    { id: "balance", header: "Sold", align: "right", renderCell: (item) => formatMoneyMinor(item.balanceMinor, item.currency ?? currency, locale) },
  ], [currency, locale, onSelectionChange, selectedDocumentIds]);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar billing-page__toolbar--wrap">
        <p>{selectedCount} restanțe selectate</p>
        <Button onClick={onExport} variant="outline">Export CSV</Button>
        <Button disabled={selectedCount !== 1 || isMutating} onClick={() => selectedDocument ? onOpenSelected(selectedDocument.documentId) : undefined} variant="secondary">Deschide documentul</Button>
        <Button disabled={!canUsePaymentForm || selectedCount !== 1 || isMutating} onClick={() => setIsPaymentOpen(true)}>Înregistrează încasare</Button>
      </div>
      <DataTable columns={columns} emptyMessage="Nu există facturi restante sau parțial achitate pentru filtrele curente." error={error ? getErrorMessage(error) : undefined} getRowKey={(item) => item.documentId} isLoading={isLoading} rows={items} />
      {selectedDocument ? (
        <section className="billing-page__print-preview" aria-label="Restanță selectată">
          <h2>{selectedDocument.documentNumber ?? "-"}</h2>
          <p>{selectedDocument.clinicName} · {selectedDocument.doctorNames.join(", ") || "-"} · {formatMoneyMinor(selectedDocument.balanceMinor, selectedDocument.currency ?? currency, locale)} restant</p>
        </section>
      ) : null}
      {selectedDocument ? (
        <Modal
          description={`${selectedDocument.documentNumber ?? "Document"} · sold restant ${formatMoneyMinor(selectedDocument.balanceMinor, selectedDocument.currency ?? currency, locale)}`}
          footer={<Button disabled={!canUsePaymentForm || isMutating} isLoading={isMutating} onClick={() => void recordSelectedPayment()}>Înregistrează încasarea</Button>}
          isOpen={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          title="Înregistrare manuală încasare"
        >
          <section className="billing-page__payment-form" aria-label="Înregistrare manuală încasare">
            <div>
              <h3>Evidență încasări</h3>
              <p>Înregistrează manual o plată efectuată în afara aplicației. Aplicația nu procesează bani, nu emite bon fiscal și nu se conectează la POS sau bancă.</p>
            </div>
            <TextInput disabled={!canUsePaymentForm} inputMode="decimal" label="Sumă încasată" placeholder="0.00" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
            <DateInput disabled={!canUsePaymentForm} label="Data încasării" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} />
            <Select
              disabled={!canUsePaymentForm}
              label="Metoda informativa"
              options={[
                { label: "Numerar", value: "CASH" },
                { label: "Transfer bancar", value: "BANK_TRANSFER" },
                { label: "Card", value: "CARD" },
                { label: "Altă metodă", value: "OTHER" },
              ]}
              value={paymentForm.method}
              onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))}
            />
            <TextInput disabled={!canUsePaymentForm} label="Număr chitanță" value={paymentForm.receiptNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, receiptNumber: event.target.value }))} />
            <DateInput disabled={!canUsePaymentForm} label="Data chitanței" value={paymentForm.receiptDate} onChange={(event) => setPaymentForm((current) => ({ ...current, receiptDate: event.target.value }))} />
            <TextInput disabled={!canUsePaymentForm} label="Referință bancară" value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} />
            <TextInput disabled={!canUsePaymentForm} label="Observații" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} />
          </section>
        </Modal>
      ) : null}
    </section>
  );
}

function MonthCloseTab({
  clinicOverview,
  currency,
  doctorOverview,
  isClosing,
  locale,
  monthLabel,
  onExportRegistry,
  onCloseRegistry,
  onOpenArchive,
  onPrintRegistry,
  onPeriodChange,
  selectedPeriod,
  overview,
  registry,
  yearOptions,
}: {
  readonly clinicOverview: BillingOverview | undefined;
  readonly currency: string;
  readonly doctorOverview: BillingOverview | undefined;
  readonly isClosing: boolean;
  readonly locale: string;
  readonly monthLabel: string;
  readonly onExportRegistry: () => void;
  readonly onCloseRegistry: () => void;
  readonly onOpenArchive: () => void;
  readonly onPrintRegistry: () => void;
  readonly onPeriodChange: (period: BillingPeriod) => void;
  readonly selectedPeriod: BillingPeriod;
  readonly overview: BillingOverview | undefined;
  readonly registry: MonthEndRegistry | undefined;
  readonly yearOptions: readonly { readonly label: string; readonly value: string }[];
}): ReactNode {
  if (!overview) {
    return <LoadingState text="Se încarcă închiderea lunii" />;
  }

  return (
    <section className="billing-page__tab">
      <Card>
        <CardHeader>
          <CardTitle>Lună și an</CardTitle>
          <CardDescription>Alege orice perioadă, iar URL-ul rămâne stabil la refresh.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="billing-page__month-picker">
            <Select
              label="An"
              options={yearOptions}
              value={String(selectedPeriod.year)}
              onChange={(event) => onPeriodChange({ month: selectedPeriod.month, year: Number(event.target.value) })}
            />
            <div className="billing-page__month-grid" aria-label="Alege luna">
              {BILLING_MONTH_OPTIONS.map((month) => {
                const isActive = month.value === String(selectedPeriod.month);
                return (
                  <Button
                    key={month.value}
                    onClick={() => onPeriodChange({ month: Number(month.value), year: selectedPeriod.year })}
                    variant={isActive ? "primary" : "secondary"}
                  >
                    {month.label}
                  </Button>
                );
              })}
            </div>
            <div className="billing-page__toolbar billing-page__toolbar--tight">
              <Button onClick={() => onPeriodChange(currentBillingPeriod())} variant="secondary">Luna curentă</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="billing-page__toolbar billing-page__toolbar--wrap">
        <p className="billing-page__readonly">Perioada selectată: {monthLabel}</p>
        <Button onClick={onExportRegistry} variant="outline">Export registru lunar CSV</Button>
        <Button onClick={onPrintRegistry} variant="outline">Export PDF</Button>
        <Button onClick={onOpenArchive} variant="secondary">Arhivă facturare</Button>
        <Button disabled={isClosing} onClick={onCloseRegistry} variant="secondary">Închide și arhivează luna</Button>
      </div>
      {registry ? (
        <div className="billing-page__registry-summary">
          <span>Total emis: {formatMoneyMinor(registry.totalMinor, currency, locale)}</span>
          <span>Încasat: {formatMoneyMinor(registry.paidMinor, currency, locale)}</span>
          <span>Neachitat: {formatMoneyMinor(registry.unpaidTotalMinor, currency, locale)}</span>
          <span>Parțial: {formatMoneyMinor(registry.partialTotalMinor, currency, locale)}</span>
          <span>Achitat: {formatMoneyMinor(registry.paidTotalMinor, currency, locale)}</span>
        </div>
      ) : null}
      <div className="billing-page__month-close">
        <MonthCloseGroupAccordion title="Clinici" overview={clinicOverview ?? overview} currency={currency} locale={locale} />
        <MonthCloseGroupAccordion title="Medici" overview={doctorOverview ?? overview} currency={currency} locale={locale} />
      </div>
    </section>
  );
}

function BillingGuideTab(): ReactNode {
  const items = [
    {
      id: "uninvoiced",
      title: "Lucrări nefacturate",
      content: "Aici selectezi lucrările eligibile și folosești butoanele Creează notă de plată, Creează proformă sau Creează factură.",
    },
    {
      id: "statement",
      title: "Notă de plată",
      content: "În fila Note de plată alegi Clinică sau Medic, schimbi sursa între documente și lucrări nefacturate și exporți PDF-ul anexă.",
    },
    {
      id: "proforma",
      title: "Proformă",
      content: "Proforma rămâne document de lucru până la emitere. Din fila Proforme poți deschide, emite, transforma sau încasa documentul.",
    },
    {
      id: "invoice",
      title: "Factură",
      content: "Fila Facturi afișează doar documentele emise. Aici deschizi PDF-ul și înregistrezi plăți manuale pe facturile neachitate sau parțial achitate.",
    },
    {
      id: "payment",
      title: "Încasare parțială / totală",
      content: "O plată poate acoperi doar o parte din sold. După fiecare încasare, starea documentului și soldul restant se actualizează.",
    },
    {
      id: "receivables",
      title: "Restanțe",
      content: "Fila Restanțe arată doar documentele cu sold rămas. Din ea poți deschide factura și înregistra încasarea lipsă.",
    },
    {
      id: "month-close",
      title: "Închidere lună",
      content: "Alegi anul și luna, verifici registrul lunar și apoi exporți PDF sau CSV. Arhivarea salvează un snapshot separat pe firma activă.",
    },
    {
      id: "archive",
      title: "Arhivă",
      content: "Arhiva facturare este un workspace separat pentru lunile istorice. Aici redeschizi snapshot-uri fără să suprascrii închiderea deja salvată.",
    },
    {
      id: "companies",
      title: "NC vs NG",
      content: "Firma activă din sidebar separă strict documentele și arhivele. Ce este închis pe NC nu apare pe NG și invers.",
    },
  ] as const;

  return (
    <section className="billing-page__tab billing-page__guide">
      <Card>
        <CardHeader>
          <CardTitle>Ghid facturare</CardTitle>
          <CardDescription>Fluxul real din aplicație, cu aceleași butoane pe care le folosește managerul.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            allowMultiple
            items={items.map((item) => ({
              id: item.id,
              title: <strong>{item.title}</strong>,
              content: <p className="billing-page__readonly">{item.content}</p>,
            }))}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function MonthCloseGroupAccordion({
  currency,
  locale,
  overview,
  title,
}: {
  readonly currency: string;
  readonly locale: string;
  readonly overview: BillingOverview;
  readonly title: string;
}): ReactNode {
  return (
    <section className="billing-page__month-close-panel" aria-label={title}>
      <header className="billing-page__month-close-panel-header">
        <h2>{title}</h2>
        <span>{overview.groups.length} grupuri</span>
      </header>
      <Accordion
        allowMultiple
        items={overview.groups.map((group) => ({
          id: group.key,
          title: (
            <span className="billing-page__month-close-trigger">
              <strong>{group.label}</strong>
              <small>{group.count} lucrări · {formatMoneyMinor(group.balanceMinor, currency, locale)} restant</small>
            </span>
          ),
          content: (
            <dl className="billing-page__month-close-details">
              <div><dt>Nefacturat</dt><dd>{formatMoneyMinor(group.uninvoicedMinor, currency, locale)}</dd></div>
              <div><dt>Facturat</dt><dd>{formatMoneyMinor(group.invoicedMinor, currency, locale)}</dd></div>
              <div><dt>Încasat manual</dt><dd>{formatMoneyMinor(group.paidMinor, currency, locale)}</dd></div>
              <div><dt>Sold restant</dt><dd>{formatMoneyMinor(group.balanceMinor, currency, locale)}</dd></div>
            </dl>
          ),
        }))}
      />
    </section>
  );
}

function SeriesTab({ canConfigure, isLoading, series }: { readonly canConfigure: boolean; readonly isLoading: boolean; readonly series: readonly { readonly currentNumber: number; readonly documentType: string; readonly id: string; readonly isActive: boolean; readonly legalEntityCode: string | null; readonly prefix: string; readonly year: number }[] }): ReactNode {
  const columns = useMemo<readonly DataTableColumn<(typeof series)[number]>[]>(() => [
    { id: "type", header: "Tip", renderCell: (row) => row.documentType },
    { id: "company", header: "Firmă", renderCell: (row) => row.legalEntityCode ?? "-" },
    { id: "prefix", header: "Serie", renderCell: (row) => row.prefix },
    { id: "year", header: "An", renderCell: (row) => row.year },
    { id: "current", header: "Ultimul număr", align: "right", renderCell: (row) => row.currentNumber },
    { id: "active", header: "Status", renderCell: (row) => row.isActive ? "Activă" : "Inactivă" },
  ], []);

  return (
    <section className="billing-page__tab">
      <p className="billing-page__readonly">Seriile controlează numerotarea documentelor pe firmă. {canConfigure ? "Le poți configura." : "Ai acces de citire, dar nu poți configura seriile."}</p>
      <DataTable columns={columns} emptyMessage="Nu există serii configurate." getRowKey={(row) => row.id} isLoading={isLoading} rows={series} />
    </section>
  );
}
