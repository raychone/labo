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
  type BillableWork,
  type BillingDocumentSummary,
  type BillingListQuery,
  type BillingOverview,
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
  usePayments,
  useRecordPayment,
  type BillingWorkspaceParams,
} from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

const pageSize = 20;

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function toCsv(rows: readonly Readonly<Record<string, string | number | null>>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? null)).join(","))].join("\n");
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

export function BillingPage(): ReactNode {
  const toast = useToast();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadFinance = hasPermission(permissionsQuery.data, "finance.read");
  const canReadInvoices = hasPermission(permissionsQuery.data, "invoice.read");
  const canCreateInvoice = hasPermission(permissionsQuery.data, "invoice.create");
  const canRecordPayment = hasPermission(permissionsQuery.data, "finance.record_payment");
  const canConfigureSeries = hasPermission(permissionsQuery.data, "invoice.configure_series");
  const canUseBilling = canReadFinance || canReadInvoices || canCreateInvoice;
  const settingsQuery = useSettings(canUseBilling);
  const currency = settingsQuery.data?.currency ?? "RON";
  const locale = settingsQuery.data?.locale ?? "ro-RO";
  const [range, setRange] = useState(currentMonthRange);
  const [groupBy, setGroupBy] = useState("clinic");
  const [search, setSearch] = useState("");
  const [selectedWorkIds, setSelectedWorkIds] = useState<readonly string[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const overviewParams: BillingWorkspaceParams = { ...range, groupBy };
  const billableParams: BillingWorkspaceParams = { ...range, search, uninvoicedOnly: true };
  const documentParams: BillingListQuery = {
    ...range,
    page: 1,
    pageSize,
    sortBy: "createdAt",
    sortDirection: "desc",
    ...(search ? { search } : {}),
  };
  const overviewQuery = useBillingOverview(overviewParams, canReadFinance);
  const billableWorksQuery = useBillableWorks(billableParams, canCreateInvoice);
  const documentsQuery = useBillingDocuments(documentParams, canReadInvoices);
  const paymentsQuery = usePayments(canReadFinance);
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
  const selectedClinicId = selectedWorks[0]?.clinicId ?? null;
  const selectedTotal = selectedWorks.reduce((total, work) => total + (work.totalPriceMinor ?? 0), 0);
  const selectedDocument = documentsQuery.data?.items.find((document) => document.id === selectedDocumentId) ?? documentsQuery.data?.items[0] ?? null;

  function toggleWork(work: BillableWork): void {
    if (!work.isBillable) {
      return;
    }
    if (selectedClinicId && work.clinicId !== selectedClinicId && !selectedWorkIds.includes(work.id)) {
      toast.showToast({ message: "Selectia pentru un document trebuie sa fie din aceeasi clinica.", variant: "error" });
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
      toast.showToast({ message: kind === "invoice" ? "Factura draft a fost creata." : "Proforma draft a fost creata.", variant: "success" });
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
      toast.showToast({ message: "Proforma a fost transformata in factura.", variant: "success" });
    } catch (error) {
      toast.showToast({ message: getErrorMessage(error), variant: "error" });
    }
  }

  async function recordQuickPayment(): Promise<void> {
    if (!selectedDocument) {
      return;
    }
    try {
      await recordPaymentMutation.mutateAsync({
        documentId: selectedDocument.id,
        input: {
          amountMinor: selectedDocument.balanceMinor,
          method: "BANK_TRANSFER",
          paymentDate: range.dateTo,
          reference: `OP-${selectedDocument.formattedNumber ?? selectedDocument.id.slice(-6)}`,
        },
      });
      toast.showToast({ message: "Plata a fost inregistrata.", variant: "success" });
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
          <p>Registru lunar pentru lucrari, proforme, facturi, incasari si solduri.</p>
        </div>
        <div className="billing-page__quick-actions">
          <Button onClick={() => setRange(currentMonthRange())} variant="secondary">Luna curenta</Button>
          <Button onClick={() => setRange(previousMonthRange())} variant="secondary">Luna anterioara</Button>
          <Button onClick={() => setRange(currentYearRange())} variant="secondary">Anul curent</Button>
        </div>
      </section>

      <section className="billing-page__filters" aria-label="Filtre facturare">
        <DateInput label="De la" value={range.dateFrom} onChange={(event) => setRange((current) => ({ ...current, dateFrom: event.target.value }))} />
        <DateInput label="Pana la" value={range.dateTo} onChange={(event) => setRange((current) => ({ ...current, dateTo: event.target.value }))} />
        <TextInput label="Cautare" placeholder="Cauta pacient, clinica, medic, cod lucrare, factura sau chitanta" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select
          label="Grupare"
          options={[
            { label: "Clinica", value: "clinic" },
            { label: "Medic", value: "doctor" },
            { label: "Zi", value: "day" },
            { label: "Luna", value: "month" },
            { label: "Pacient", value: "patient" },
            { label: "Status facturare", value: "billingStatus" },
            { label: "Status incasare", value: "paymentStatus" },
          ]}
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value)}
        />
      </section>

      {overviewQuery.isLoading ? <LoadingState text="Incarc situatia financiara" /> : null}
      {overviewQuery.error ? <ErrorState title="Situatia nu poate fi incarcata" description={getErrorMessage(overviewQuery.error)} /> : null}
      {overviewQuery.data ? <OverviewCards overview={overviewQuery.data} currency={currency} locale={locale} /> : null}

      <Tabs
        tabs={[
          {
            id: "uninvoiced",
            label: "Lucrari nefacturate",
            content: (
              <BillableWorksTab
                canCreateInvoice={canCreateInvoice}
                currency={currency}
                isCreating={createProformaMutation.isPending || createInvoiceMutation.isPending}
                locale={locale}
                onCreateInvoice={() => void createDocument("invoice")}
                onCreateProforma={() => void createDocument("proforma")}
                onExport={() => downloadCsv("lucrari-nefacturate.csv", toCsv((billableWorksQuery.data?.items ?? []).map((work) => ({
                  cod: work.code,
                  clinica: work.clinicName,
                  medic: work.doctorName,
                  pacient: work.patientName,
                  valoare: work.totalPriceMinor ?? "",
                }))))}
                onToggleWork={toggleWork}
                query={billableWorksQuery}
                selectedTotal={selectedTotal}
                selectedWorkIds={selectedWorkIds}
              />
            ),
          },
          {
            id: "documents",
            label: "Proforme si facturi",
            content: (
              <DocumentsTab
                canRecordPayment={canRecordPayment}
                currency={currency}
                documents={documentsQuery.data?.items ?? []}
                error={documentsQuery.error}
                isLoading={documentsQuery.isLoading}
                isMutating={issueMutation.isPending || convertMutation.isPending || recordPaymentMutation.isPending}
                locale={locale}
                onConvert={convertSelectedProforma}
                onExport={() => downloadCsv("documente-facturare.csv", toCsv((documentsQuery.data?.items ?? []).map((document) => ({
                  numar: document.formattedNumber,
                  tip: document.type,
                  status: document.status,
                  clinica: document.clinicName,
                  total: document.totalMinor,
                  sold: document.balanceMinor,
                }))))}
                onIssue={issueSelectedDocument}
                onPrint={() => window.print()}
                onRecordPayment={recordQuickPayment}
                onSelect={setSelectedDocumentId}
                selectedDocument={selectedDocument}
              />
            ),
          },
          {
            id: "payments",
            label: "Incasari",
            content: (
              <PaymentsTab
                currency={currency}
                isLoading={paymentsQuery.isLoading}
                locale={locale}
                onExport={() => downloadCsv("incasari.csv", toCsv((paymentsQuery.data?.items ?? []).map((payment) => ({
                  data: payment.paymentDate,
                  document: payment.documentNumber,
                  metoda: payment.method,
                  chitanta: payment.receiptNumber,
                  referinta: payment.reference,
                  valoare: payment.amountMinor,
                }))))}
                payments={paymentsQuery.data?.items ?? []}
              />
            ),
          },
          {
            id: "month-close",
            label: "Inchidere luna",
            content: <MonthCloseTab overview={overviewQuery.data} currency={currency} locale={locale} />,
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
    { label: "Nefacturat", value: overview.uninvoicedMinor, count: overview.uninvoicedWorkCount },
    { label: "Facturat", value: overview.proformaMinor + overview.outstandingMinor + overview.paidMinor, count: overview.invoiceCount },
    { label: "Incasat", value: overview.paidMinor, count: overview.documentCount },
    { label: "Sold restant", value: overview.outstandingMinor, count: overview.unpaidInvoiceCount },
    { label: "Proforme deschise", value: overview.proformaMinor, count: overview.openProformaCount },
    { label: "Facturi neincasate", value: overview.outstandingMinor, count: overview.unpaidInvoiceCount },
  ];

  return (
    <section className="billing-page__cards" aria-label="Indicatori facturare">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle>{card.label}</CardTitle>
            <CardDescription>{card.count} inregistrari</CardDescription>
          </CardHeader>
          <CardContent><strong>{formatMoneyMinor(card.value, currency, locale)}</strong></CardContent>
        </Card>
      ))}
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
    { id: "select", header: "", renderCell: (work) => <input aria-label={`Selecteaza ${work.code}`} checked={selectedWorkIds.includes(work.id)} disabled={!work.isBillable} onChange={() => onToggleWork(work)} type="checkbox" /> },
    { id: "code", header: "Cod", renderCell: (work) => work.code },
    { id: "createdAt", header: "Intrare", renderCell: (work) => formatDate(work.createdAt) },
    { id: "clinic", header: "Clinica", renderCell: (work) => work.clinicName },
    { id: "doctor", header: "Medic", renderCell: (work) => work.doctorName },
    { id: "patient", header: "Pacient", renderCell: (work) => work.patientName },
    { id: "type", header: "Tip", renderCell: (work) => work.workTypeName },
    { id: "quantity", header: "Elemente", align: "right", renderCell: (work) => work.quantity },
    { id: "total", header: "Valoare", align: "right", renderCell: (work) => work.totalPriceMinor === null ? "Restrictionat" : formatMoneyMinor(work.totalPriceMinor, work.currency ?? currency, locale) },
    { id: "status", header: "Facturare", renderCell: (work) => work.isBillable ? "Nefacturat" : work.unavailableReason },
  ], [currency, locale, onToggleWork, selectedWorkIds]);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar">
        <p>{selectedWorkIds.length} lucrari selectate · {formatMoneyMinor(selectedTotal, currency, locale)}</p>
        <Button onClick={onExport} variant="outline">Export CSV</Button>
        {canCreateInvoice ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateProforma}>Creeaza proforma</Button> : null}
        {canCreateInvoice ? <Button disabled={selectedWorkIds.length === 0 || isCreating} onClick={onCreateInvoice} variant="secondary">Creeaza factura</Button> : null}
      </div>
      <DataTable columns={columns} emptyMessage="Nu exista lucrari nefacturate in perioada selectata." error={query.error ? getErrorMessage(query.error) : undefined} getRowKey={(work) => work.id} isLoading={query.isLoading} rows={query.data?.items ?? []} />
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
  readonly onPrint: () => void;
  readonly onRecordPayment: () => void;
  readonly onSelect: (documentId: string) => void;
  readonly selectedDocument: BillingDocumentSummary | null;
}): ReactNode {
  const columns = useMemo<readonly DataTableColumn<BillingDocumentSummary>[]>(() => [
    { id: "number", header: "Numar", renderCell: (document) => document.formattedNumber ?? "Draft" },
    { id: "type", header: "Tip", renderCell: (document) => document.type },
    { id: "status", header: "Status", renderCell: (document) => document.status },
    { id: "clinic", header: "Clinica", renderCell: (document) => document.clinicName },
    { id: "total", header: "Total", align: "right", renderCell: (document) => formatMoneyMinor(document.totalMinor, document.currency, locale) },
    { id: "balance", header: "Sold", align: "right", renderCell: (document) => formatMoneyMinor(document.balanceMinor, document.currency, locale) },
  ], [locale]);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar">
        <Button onClick={onExport} variant="outline">Export CSV</Button>
        <Button disabled={!selectedDocument || selectedDocument.status !== "DRAFT" || isMutating} onClick={onIssue}>Emite</Button>
        <Button disabled={!selectedDocument || selectedDocument.type !== "PROFORMA" || selectedDocument.status !== "ISSUED" || isMutating} onClick={onConvert} variant="secondary">Transforma in factura</Button>
        {canRecordPayment ? <Button disabled={!selectedDocument || selectedDocument.type !== "INVOICE" || selectedDocument.balanceMinor <= 0 || isMutating} onClick={onRecordPayment} variant="secondary">Incaseaza sold</Button> : null}
        <Button onClick={onPrint} variant="outline">Print</Button>
      </div>
      <DataTable columns={columns} emptyMessage="Nu exista proforme sau facturi." error={error ? getErrorMessage(error) : undefined} getRowKey={(document) => document.id} isLoading={isLoading} onRowAction={(document) => onSelect(document.id)} rowActionLabel="Selecteaza" rows={documents} />
      {selectedDocument ? (
        <section className="billing-page__print-preview" aria-label="Anexa facturare">
          <h2>{selectedDocument.type === "PROFORMA" ? "PROFORMA" : "FACTURA INTERNA / PREVIEW"} {selectedDocument.formattedNumber ?? "Draft"}</h2>
          <p>{selectedDocument.clinicName} · Total {formatMoneyMinor(selectedDocument.totalMinor, currency, locale)} · Sold {formatMoneyMinor(selectedDocument.balanceMinor, currency, locale)}</p>
        </section>
      ) : null}
    </section>
  );
}

function PaymentsTab({ currency, isLoading, locale, onExport, payments }: { readonly currency: string; readonly isLoading: boolean; readonly locale: string; readonly onExport: () => void; readonly payments: readonly { readonly amountMinor: number; readonly documentNumber: string | null; readonly id: string; readonly method: string; readonly paymentDate: string; readonly receiptNumber: string | null; readonly reference: string | null }[] }): ReactNode {
  const columns = useMemo<readonly DataTableColumn<(typeof payments)[number]>[]>(() => [
    { id: "date", header: "Data", renderCell: (payment) => formatDate(payment.paymentDate) },
    { id: "document", header: "Document", renderCell: (payment) => payment.documentNumber ?? "-" },
    { id: "method", header: "Metoda", renderCell: (payment) => payment.method },
    { id: "receipt", header: "Chitanta", renderCell: (payment) => payment.receiptNumber ?? payment.reference ?? "-" },
    { id: "amount", header: "Valoare", align: "right", renderCell: (payment) => formatMoneyMinor(payment.amountMinor, currency, locale) },
  ], [currency, locale]);

  return (
    <section className="billing-page__tab">
      <div className="billing-page__toolbar"><Button onClick={onExport} variant="outline">Export CSV</Button></div>
      <DataTable columns={columns} emptyMessage="Nu exista incasari." getRowKey={(payment) => payment.id} isLoading={isLoading} rows={payments} />
    </section>
  );
}

function MonthCloseTab({ currency, locale, overview }: { readonly currency: string; readonly locale: string; readonly overview: BillingOverview | undefined }): ReactNode {
  if (!overview) {
    return <LoadingState text="Incarc inchiderea lunii" />;
  }

  return (
    <section className="billing-page__tab">
      <div className="billing-page__month-close">
        {overview.groups.map((group) => (
          <Card key={group.key}>
            <CardHeader><CardTitle>{group.label}</CardTitle><CardDescription>{group.count} lucrari</CardDescription></CardHeader>
            <CardContent>
              <dl>
                <div><dt>Nefacturat</dt><dd>{formatMoneyMinor(group.uninvoicedMinor, currency, locale)}</dd></div>
                <div><dt>Facturat</dt><dd>{formatMoneyMinor(group.invoicedMinor, currency, locale)}</dd></div>
                <div><dt>Incasat</dt><dd>{formatMoneyMinor(group.paidMinor, currency, locale)}</dd></div>
                <div><dt>Sold</dt><dd>{formatMoneyMinor(group.balanceMinor, currency, locale)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SeriesTab({ canConfigure, isLoading, series }: { readonly canConfigure: boolean; readonly isLoading: boolean; readonly series: readonly { readonly currentNumber: number; readonly documentType: string; readonly id: string; readonly isActive: boolean; readonly prefix: string; readonly year: number }[] }): ReactNode {
  const columns = useMemo<readonly DataTableColumn<(typeof series)[number]>[]>(() => [
    { id: "type", header: "Tip", renderCell: (row) => row.documentType },
    { id: "prefix", header: "Serie", renderCell: (row) => row.prefix },
    { id: "year", header: "An", renderCell: (row) => row.year },
    { id: "current", header: "Ultimul numar", align: "right", renderCell: (row) => row.currentNumber },
    { id: "active", header: "Status", renderCell: (row) => row.isActive ? "Activa" : "Inactiva" },
  ], []);

  return (
    <section className="billing-page__tab">
      {!canConfigure ? <p className="billing-page__readonly">Ai acces de citire, dar nu poti configura seriile.</p> : null}
      <DataTable columns={columns} emptyMessage="Nu exista serii configurate." getRowKey={(row) => row.id} isLoading={isLoading} rows={series} />
    </section>
  );
}
