import {
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
  type BillingReceivableRow,
  type DocumentPaymentFilter,
  type MonthEndRegistry,
  type PaymentMethod,
  type RecordPaymentInput,
} from "@dental-lab/shared";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { useSettings } from "../settings/settings-api.js";
import {
  useBillableWorks,
  useBillingDocuments,
  useBillingOverview,
  useBillingSeries,
  useCreateInvoice,
  useCreateProforma,
  useConvertProforma,
  useIssueDocument,
  useMonthRegistry,
  usePayments,
  useRecordPayment,
  useReceivables,
  useAmbiguousLegacyRecords,
  downloadMonthRegistryCsv,
  type BillingWorkspaceParams,
} from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

const pageSize = 20;
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

function currentMonthRange(now = new Date()): { readonly dateFrom: string; readonly dateTo: string } {
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
}

function previousMonthRange(now = new Date()): { readonly dateFrom: string; readonly dateTo: string } {
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
}

function currentYearRange(now = new Date()): { readonly dateFrom: string; readonly dateTo: string } {
  return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: `${now.getFullYear()}-12-31` };
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
  const [range, setRange] = useState(currentMonthRange);
  const [groupBy, setGroupBy] = useState("clinic");
  const [paymentFilter, setPaymentFilter] = useState<DocumentPaymentFilter>("ALL");
  const [patientFilter, setPatientFilter] = useState("");
  const [workCodeFilter, setWorkCodeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [paymentForm, setPaymentForm] = useState<ManualPaymentFormState>(createEmptyPaymentForm(range.dateTo));
  const [selectedWorkIds, setSelectedWorkIds] = useState<readonly string[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
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
  const billableWorksQuery = useBillableWorks(billableParams, canCreateInvoice);
  const proformasQuery = useBillingDocuments(proformaParams, canReadInvoices);
  const invoicesQuery = useBillingDocuments(invoiceParams, canReadInvoices);
  const paymentsQuery = usePayments(canReadFinance);
  const receivablesQuery = useReceivables(receivablesParams, canReadReports);
  const monthRegistryQuery = useMonthRegistry(overviewParams, canReadReports);
  const ambiguousLegacyQuery = useAmbiguousLegacyRecords(canReadReports);
  const seriesQuery = useBillingSeries(canConfigureSeries);
  const createProformaMutation = useCreateProforma();
  const createInvoiceMutation = useCreateInvoice();
  const issueMutation = useIssueDocument();
  const convertMutation = useConvertProforma();
  const recordPaymentMutation = useRecordPayment();

  const selectedWorks = useMemo(
    () => (billableWorksQuery.data?.items ?? []).filter((work) => selectedWorkIds.includes(work.id)),
    [billableWorksQuery.data?.items, selectedWorkIds],
  );
  const documents = useMemo(() => [...(proformasQuery.data?.items ?? []), ...(invoicesQuery.data?.items ?? [])], [invoicesQuery.data?.items, proformasQuery.data?.items]);
  const selectedClinicId = selectedWorks[0]?.clinicId ?? null;
  const selectedTotal = selectedWorks.reduce((total, work) => total + (work.totalPriceMinor ?? 0), 0);
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? invoicesQuery.data?.items[0] ?? proformasQuery.data?.items[0] ?? null;

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
      const created = await mutation.mutateAsync({
        issueDate: range.dateTo,
        workOrderIds: selectedWorkIds,
      });
      setSelectedDocumentId(created.id);
      setSelectedWorkIds([]);
      toast.showToast({ message: kind === "invoice" ? "Factura draft a fost creată." : "Proforma draft a fost creată.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function issueSelectedDocument(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    try {
      const issued = await issueMutation.mutateAsync(selectedDocument.id);
      setSelectedDocumentId(issued.id);
      toast.showToast({ message: "Documentul a fost emis.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function convertSelectedProforma(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    try {
      const invoice = await convertMutation.mutateAsync(selectedDocument.id);
      setSelectedDocumentId(invoice.id);
      toast.showToast({ message: "Proforma a fost transformată în factură.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function recordManualPayment(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    const input = toRecordPaymentInput(paymentForm);
    if (!input) {
      toast.showToast({ message: "Introdu o sumă încasată mai mare decât 0.", variant: "error" });
      return;
    }
    try {
      await recordPaymentMutation.mutateAsync({
        documentId: selectedDocument.id,
        input,
      });
      setPaymentForm(createEmptyPaymentForm(range.dateTo));
      toast.showToast({ message: "Încasarea a fost înregistrată manual.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
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
          <Button onClick={() => setRange(currentMonthRange())} variant="secondary">Luna curentă</Button>
          <Button onClick={() => setRange(previousMonthRange())} variant="secondary">Luna anterioară</Button>
          <Button onClick={() => setRange(currentYearRange())} variant="secondary">Anul curent</Button>
        </div>
      </section>

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

      {overviewQuery.isLoading ? <LoadingState text="Se încarcă situația financiară" /> : null}
      {overviewQuery.error ? <ErrorState title="Situația nu poate fi încărcată" description={getErrorMessage(overviewQuery.error)} /> : null}
      {overviewQuery.data ? <OverviewCards overview={overviewQuery.data} currency={currency} locale={locale} /> : null}

      <Tabs
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
            id: "uninvoiced",
            label: "Lucrări nefacturate",
            content: (
              <BillableWorksTab
                canCreateInvoice={canCreateInvoice}
                currency={currency}
                isCreating={createProformaMutation.isPending || createInvoiceMutation.isPending}
                locale={locale}
                onCreateInvoice={() => void createDocument("invoice")}
                onCreateProforma={() => void createDocument("proforma")}
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
                canRecordPayment={false}
                currency={currency}
                documents={proformasQuery.data?.items ?? []}
                error={proformasQuery.error}
                isLoading={proformasQuery.isLoading}
                isMutating={issueMutation.isPending || convertMutation.isPending || recordPaymentMutation.isPending}
                locale={locale}
                onConvert={convertSelectedProforma}
                onExport={() => downloadCsv("proforme.csv", toCsv((proformasQuery.data?.items ?? []).map((document) => toDocumentCsvRow(document, currency))))}
                onIssue={issueSelectedDocument}
                onPrint={(documentId) => window.open(`/billing/documents/${documentId}/print`, "_blank", "noopener,noreferrer")}
                onRecordPayment={recordManualPayment}
                onSelect={setSelectedDocumentId}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                selectedDocument={selectedDocument}
              />
            ),
          },
          {
            id: "invoices",
            label: "Facturi",
            content: (
              <DocumentsTab
                canRecordPayment={canRecordPayment}
                currency={currency}
                documents={invoicesQuery.data?.items ?? []}
                error={invoicesQuery.error}
                isLoading={invoicesQuery.isLoading}
                isMutating={issueMutation.isPending || convertMutation.isPending || recordPaymentMutation.isPending}
                locale={locale}
                onConvert={convertSelectedProforma}
                onExport={() => downloadCsv("facturi.csv", toCsv((invoicesQuery.data?.items ?? []).map((document) => toDocumentCsvRow(document, currency))))}
                onIssue={issueSelectedDocument}
                onPrint={(documentId) => window.open(`/billing/documents/${documentId}/print`, "_blank", "noopener,noreferrer")}
                onRecordPayment={recordManualPayment}
                onSelect={setSelectedDocumentId}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                selectedDocument={selectedDocument}
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
              />
            ),
          },
          {
            id: "month-close",
            label: "Închidere lună",
            content: <MonthCloseTab
              overview={overviewQuery.data}
              registry={monthRegistryQuery.data}
              currency={currency}
              locale={locale}
              onExportRegistry={async () => {
                try {
                  downloadCsv("registru-lunar-facturare.csv", await downloadMonthRegistryCsv(overviewParams));
                } catch (error) {
                  toast.showToast({ message: getErrorMessage(error), variant: "error" });
                }
              }}
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

function OverviewCards({ currency, locale, overview }: { readonly currency: string; readonly locale: string; readonly overview: BillingOverview }): ReactNode {
  const cards = [
    { label: "Lucrări nefacturate", value: overview.uninvoicedMinor, count: overview.uninvoicedWorkCount },
    { label: "Proforme deschise", value: overview.proformaMinor, count: overview.openProformaCount },
    { label: "Facturi neachitate", value: overview.outstandingMinor, count: overview.unpaidInvoiceCount },
    { label: "Facturi parțial achitate", value: overview.outstandingMinor, count: overview.partialInvoiceCount },
    { label: "Facturi achitate", value: overview.paidMinor, count: overview.paidInvoiceCount },
    { label: "Total emis", value: overview.totalIssuedMinor, count: overview.invoiceCount },
    { label: "Total încasat", value: overview.paidMinor, count: overview.documentCount },
    { label: "Sold restant", value: overview.outstandingMinor, count: overview.unpaidInvoiceCount },
    { label: "Ambigue legacy", value: 0, count: overview.ambiguousLegacyCount },
  ];

  return (
    <section className="billing-page__cards" aria-label="Indicatori facturare">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle>{card.label}</CardTitle>
            <CardDescription>{card.count} înregistrări</CardDescription>
          </CardHeader>
          <CardContent><strong>{formatMoneyMinor(card.value, currency, locale)}</strong></CardContent>
        </Card>
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
        <p>Documente ambigue legacy pentru revizuire read-only: {overview.ambiguousLegacyCount}</p>
        <Button onClick={onPrint} variant="outline">Print prezentare</Button>
      </div>
      <DataTable columns={columns} emptyMessage="Nu există documente legacy ambigue pentru firma activă." getRowKey={(row) => row.documentId} rows={ambiguousLegacy} />
    </section>
  );
}

function BillableWorksTab({
  canCreateInvoice,
  currency,
  isCreating,
  locale,
  onCreateInvoice,
  onCreateProforma,
  onExport,
  onToggleWork,
  query,
  selectedTotal,
  selectedWorkIds,
}: {
  readonly canCreateInvoice: boolean;
  readonly currency: string;
  readonly isCreating: boolean;
  readonly locale: string;
  readonly onCreateInvoice: () => void;
  readonly onCreateProforma: () => void;
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
        {canCreateInvoice ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateProforma}>Creează proformă</Button> : null}
        {canCreateInvoice ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateInvoice} variant="secondary">Creează factură</Button> : null}
      </div>
      <DataTable columns={columns} emptyMessage="Nu există lucrări nefacturate în perioada selectată." error={query.error ? getErrorMessage(query.error) : undefined} getRowKey={(work) => work.id} isLoading={query.isLoading} rows={query.data?.items ?? []} />
    </section>
  );
}

function DocumentsTab({
  canRecordPayment,
  currency,
  documents,
  error,
  isLoading,
  isMutating,
  locale,
  onConvert,
  onExport,
  onIssue,
  onPrint,
  onRecordPayment,
  onSelect,
  paymentForm,
  setPaymentForm,
  selectedDocument,
}: {
  readonly canRecordPayment: boolean;
  readonly currency: string;
  readonly documents: readonly BillingDocumentSummary[];
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly locale: string;
  readonly onConvert: () => void;
  readonly onExport: () => void;
  readonly onIssue: () => void;
  readonly onPrint: (documentId: string) => void;
  readonly onRecordPayment: () => void;
  readonly onSelect: (documentId: string) => void;
  readonly paymentForm: ManualPaymentFormState;
  readonly setPaymentForm: (updater: (current: ManualPaymentFormState) => ManualPaymentFormState) => void;
  readonly selectedDocument: BillingDocumentSummary | null;
}): ReactNode {
  const columns = useMemo<readonly DataTableColumn<BillingDocumentSummary>[]>(() => [
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
  ], [locale]);
  const canUsePaymentForm = Boolean(selectedDocument && selectedDocument.type === "INVOICE" && selectedDocument.status !== "CANCELLED" && selectedDocument.balanceMinor > 0);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar">
        <Button onClick={onExport} variant="outline">Export CSV</Button>
        <Button disabled={!selectedDocument || selectedDocument.status !== "DRAFT" || isMutating} onClick={onIssue}>Emite</Button>
        <Button disabled={!selectedDocument || selectedDocument.type !== "PROFORMA" || selectedDocument.status !== "ISSUED" || isMutating} onClick={onConvert} variant="secondary">Transformă în factură</Button>
        {canRecordPayment ? <Button disabled={!canUsePaymentForm || isMutating} onClick={onRecordPayment} variant="secondary">Înregistrează încasare</Button> : null}
        <Button disabled={!selectedDocument} onClick={() => selectedDocument ? onPrint(selectedDocument.id) : undefined} variant="outline">Print / PDF</Button>
      </div>
      <DataTable columns={columns} emptyMessage="Nu există proforme sau facturi." error={error ? getErrorMessage(error) : undefined} getRowKey={(document) => document.id} isLoading={isLoading} onRowAction={(document) => onSelect(document.id)} rowActionLabel="Selectează" rows={documents} />
      {selectedDocument ? (
        <section className="billing-page__print-preview" aria-label="Anexa facturare">
          <h2>{selectedDocument.type === "PROFORMA" ? "PROFORMĂ" : "FACTURĂ INTERNĂ / PREVIEW"} {selectedDocument.formattedNumber ?? "Draft"}</h2>
          <p>{selectedDocument.legalEntityCode ?? "-"} · {selectedDocument.clinicName} · Total factură {formatMoneyMinor(selectedDocument.totalMinor, currency, locale)} · Încasat manual {formatMoneyMinor(selectedDocument.paidMinor, currency, locale)} · Sold restant {formatMoneyMinor(selectedDocument.balanceMinor, currency, locale)}</p>
        </section>
      ) : null}
      {canRecordPayment ? (
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
  items,
  locale,
  onExport,
}: {
  readonly currency: string;
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly items: readonly BillingReceivableRow[];
  readonly locale: string;
  readonly onExport: () => void;
}): ReactNode {
  const columns = useMemo<readonly DataTableColumn<BillingReceivableRow>[]>(() => [
    { id: "number", header: "Factură", renderCell: (item) => item.documentNumber ?? "-" },
    { id: "clinic", header: "Clinică", renderCell: (item) => item.clinicName },
    { id: "doctor", header: "Medic", renderCell: (item) => item.doctorNames.join(", ") || "-" },
    { id: "patient", header: "Pacient", renderCell: (item) => item.patientNames.join(", ") || "-" },
    { id: "works", header: "Lucrări", renderCell: (item) => item.workCodes.join(", ") || "-" },
    { id: "issue", header: "Emisă", renderCell: (item) => formatDate(item.issueDate) },
    { id: "due", header: "Scadență", renderCell: (item) => item.dueDate ? formatDate(item.dueDate) : "-" },
    { id: "overdue", header: "Restanță", renderCell: (item) => item.daysOverdue > 0 ? `${item.daysOverdue} zile` : "În termen" },
    { id: "balance", header: "Sold", align: "right", renderCell: (item) => formatMoneyMinor(item.balanceMinor, item.currency ?? currency, locale) },
  ], [currency, locale]);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar"><Button onClick={onExport} variant="outline">Export CSV</Button></div>
      <DataTable columns={columns} emptyMessage="Nu există facturi restante sau parțial achitate pentru filtrele curente." error={error ? getErrorMessage(error) : undefined} getRowKey={(item) => item.documentId} isLoading={isLoading} rows={items} />
    </section>
  );
}

function MonthCloseTab({ currency, locale, onExportRegistry, overview, registry }: { readonly currency: string; readonly locale: string; readonly onExportRegistry: () => void; readonly overview: BillingOverview | undefined; readonly registry: MonthEndRegistry | undefined }): ReactNode {
  if (!overview) {
    return <LoadingState text="Se încarcă închiderea lunii" />;
  }

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar">
        <Button onClick={onExportRegistry} variant="outline">Export registru lunar CSV</Button>
        <Button onClick={() => window.print()} variant="outline">Print registru</Button>
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
        {overview.groups.map((group) => (
          <Card key={group.key}>
            <CardHeader><CardTitle>{group.label}</CardTitle><CardDescription>{group.count} lucrări</CardDescription></CardHeader>
            <CardContent>
              <dl>
                <div><dt>Nefacturat</dt><dd>{formatMoneyMinor(group.uninvoicedMinor, currency, locale)}</dd></div>
                <div><dt>Facturat</dt><dd>{formatMoneyMinor(group.invoicedMinor, currency, locale)}</dd></div>
                <div><dt>Încasat manual</dt><dd>{formatMoneyMinor(group.paidMinor, currency, locale)}</dd></div>
                <div><dt>Sold restant</dt><dd>{formatMoneyMinor(group.balanceMinor, currency, locale)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
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
      {!canConfigure ? <p className="billing-page__readonly">Ai acces de citire, dar nu poți configura seriile.</p> : null}
      <DataTable columns={columns} emptyMessage="Nu există serii configurate." getRowKey={(row) => row.id} isLoading={isLoading} rows={series} />
    </section>
  );
}
