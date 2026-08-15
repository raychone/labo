import { Button, ErrorState, LoadingState } from "@dental-lab/ui";
import { type MonthCloseArchiveSummary, type MonthEndRegistry, formatMoneyMinor } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useMemo, type ReactNode } from "react";

import { downloadMonthRegistryPdf, fetchMonthRegistry, fetchMonthRegistryArchives, type BillingWorkspaceParams } from "./billing-api.js";
import { useSettings } from "../settings/settings-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function formatDatetime(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function readRegistryParams(searchParams: URLSearchParams): BillingWorkspaceParams {
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (Number.isInteger(year) && Number.isInteger(month) && year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
    return { month, year };
  }
  return {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
}

export function BillingMonthRegistryPrintPage(): ReactNode {
  const [searchParams] = useSearchParams();
  const params = readRegistryParams(searchParams);
  const settingsQuery = useSettings(true);
  const hasRegistryParams = Boolean((params.year && params.month) || (params.dateFrom && params.dateTo));
  const registryQuery = useQuery<MonthEndRegistry>({
    enabled: hasRegistryParams,
    queryFn: () => fetchMonthRegistry(params),
    queryKey: ["billing", "month-registry-print", params, settingsQuery.data?.legalEntityCode ?? "loading"],
    retry: false,
  });
  const archivesQuery = useQuery<{ readonly items: readonly MonthCloseArchiveSummary[] }>({
    enabled: !hasRegistryParams && Boolean(settingsQuery.data?.legalEntityCode),
    queryFn: fetchMonthRegistryArchives,
    queryKey: ["billing", "month-registry-print", "archives", settingsQuery.data?.legalEntityCode ?? "loading"],
    retry: false,
  });

  if (!hasRegistryParams) {
    if (settingsQuery.isLoading || archivesQuery.isLoading) {
      return <main className="billing-print-page"><LoadingState text="Se încarcă arhiva închiderilor" /></main>;
    }

    if (settingsQuery.error || archivesQuery.error || !settingsQuery.data || !archivesQuery.data) {
      return (
        <main className="billing-print-page">
          <ErrorState title="Arhiva închiderilor nu poate fi încărcată" description={getErrorMessage(archivesQuery.error ?? settingsQuery.error)} />
        </main>
      );
    }

    return (
      <main className="billing-print-page billing-print-page--month-registry">
        <div className="billing-print-page__actions">
          <Button onClick={() => void downloadMonthRegistryPdf(params)}>Export PDF</Button>
          <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
        </div>
        <ArchiveLandingView
          archives={archivesQuery.data.items}
          companyLabel={`${settingsQuery.data.legalEntityCode} — ${settingsQuery.data.legalEntityDisplayName}`}
        />
      </main>
    );
  }

  if (settingsQuery.isLoading || registryQuery.isLoading) {
    return <main className="billing-print-page"><LoadingState text="Se încarcă registrul lunar" /></main>;
  }

  if (settingsQuery.error || registryQuery.error || !registryQuery.data || !settingsQuery.data) {
    return (
      <main className="billing-print-page">
        <ErrorState title="Registrul lunar nu poate fi încărcat" description={getErrorMessage(registryQuery.error ?? settingsQuery.error)} />
      </main>
    );
  }

  return (
    <main className="billing-print-page billing-print-page--month-registry">
      <div className="billing-print-page__actions">
        <Button onClick={() => void downloadMonthRegistryPdf(params)}>Export PDF</Button>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <MonthRegistryReportView companyLabel={`${settingsQuery.data.legalEntityCode} — ${settingsQuery.data.legalEntityDisplayName}`} registry={registryQuery.data} />
    </main>
  );
}

function ArchiveLandingView({
  archives,
  companyLabel,
}: {
  readonly archives: readonly MonthCloseArchiveSummary[];
  readonly companyLabel: string;
}): ReactNode {
  return (
    <article className="billing-month-registry billing-month-registry--landing">
      <section className="billing-month-registry__paper">
        <header className="billing-month-registry__header billing-month-registry__header--landing">
          <div className="billing-month-registry__identity">
            <h1>ARHIVĂ ÎNCHIDERI</h1>
            <strong>Facturare</strong>
            <span>Arhiva lunară salvează snapshot-uri separate pe firma activă.</span>
            <small>Alege o lună închisă pentru a redeschide registrul lunar PDF.</small>
          </div>
          <div className="billing-month-registry__company">
            <span>Firma activă</span>
            <strong>{companyLabel}</strong>
            <small>{archives.length === 1 ? "1 lună arhivată pentru compania activă." : `${archives.length} luni arhivate pentru compania activă.`}</small>
          </div>
        </header>

        {archives.length > 0 ? (
          <section className="billing-month-registry__archive-list" aria-label="Arhivă închideri">
            {archives.map((archive) => (
              <article className="billing-month-registry__archive-card" key={archive.archiveId}>
                <div className="billing-month-registry__archive-card-meta">
                  <strong>{new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(archive.year, archive.month - 1, 1)))}</strong>
                  <span>
                    {formatDate(archive.periodStart)} – {formatDate(archive.periodEnd)}
                  </span>
                  <small>Închis la {formatDatetime(archive.closedAt)}</small>
                  <small>Închis de {archive.closedByDisplayName ?? archive.closedByEmail ?? "Necunoscut"}</small>
                </div>
                <div className="billing-month-registry__archive-card-summary">
                  <span>Total: {formatMoneyMinor(archive.totalMinor, archive.currency, "ro-RO")}</span>
                  <span>Încasat: {formatMoneyMinor(archive.paidMinor, archive.currency, "ro-RO")}</span>
                  <span>Neachitat: {formatMoneyMinor(archive.unpaidTotalMinor, archive.currency, "ro-RO")}</span>
                </div>
                <div className="billing-page__toolbar billing-page__toolbar--tight">
                  <Button
                    onClick={() => void downloadMonthRegistryPdf({ year: archive.year, month: archive.month })}
                    variant="secondary"
                  >
                    Deschide PDF
                  </Button>
                  <Button
                    onClick={() => window.open(`/billing?year=${archive.year}&month=${archive.month}`, "_blank", "noopener,noreferrer")}
                    variant="outline"
                  >
                    Deschide în facturare
                  </Button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <p className="billing-month-registry__empty-archive">Nu există încă închideri arhivate pentru compania activă.</p>
        )}
      </section>
    </article>
  );
}

export function MonthRegistryReportView({
  companyLabel,
  registry,
}: {
  readonly companyLabel: string;
  readonly registry: MonthEndRegistry;
}): ReactNode {
  const clinics = useMemo(() => groupRowsByClinic(registry.rows), [registry.rows]);
  const doctors = useMemo(() => groupRowsByDoctor(registry.rows), [registry.rows]);
  const documents = registry.rows;
  const periodPayments = registry.payments.filter((payment) => payment.cancelledAt === null);

  const summaryCards = [
    { label: "Total emis", value: registry.totalMinor },
    { label: "Încasat", value: registry.paidMinor },
    { label: "Neachitat", value: registry.unpaidTotalMinor },
    { label: "Parțial", value: registry.partialTotalMinor },
    { label: "Achitat", value: registry.paidTotalMinor },
  ] as const;

  return (
    <article className="billing-month-registry">
      <section className="billing-month-registry__paper">
        <header className="billing-month-registry__header">
          <div className="billing-month-registry__identity">
            <h1>ÎNCHIDERE LUNĂ</h1>
            <strong>Registru lunar facturare</strong>
            <span>Perioada: {formatDate(registry.dateFrom)} – {formatDate(registry.dateTo)}</span>
            <small>Generat la: {formatDatetime(registry.generatedAt)}</small>
          </div>
          <div className="billing-month-registry__company">
            <span>Firma activă</span>
            <strong>{companyLabel}</strong>
            <small>Registre și documente separate pe companie activă.</small>
          </div>
        </header>

        <section className="billing-month-registry__summary" aria-label="Rezumat registru lunar">
          {summaryCards.map((card) => (
            <div className="billing-month-registry__summary-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{formatMoneyMinor(card.value, registry.currency, "ro-RO")}</strong>
            </div>
          ))}
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>SITUAȚIE PE CLINICI</h2>
          </header>
          <RegistryTable
            columns={[
              { label: "Clinică", width: "28%", align: "left" },
              { label: "Lucrări", width: "9%", align: "right" },
              { label: "Total emis", width: "21%", align: "right" },
              { label: "Încasat", width: "21%", align: "right" },
              { label: "Sold restant", width: "21%", align: "right" },
            ]}
            rows={clinics.map((group) => ([
              { content: group.clinicName },
              { align: "right", content: String(group.count), nowrap: true },
              { align: "right", content: money(group.totalMinor, registry.currency) },
              { align: "right", content: money(group.paidMinor, registry.currency) },
              { align: "right", content: money(group.balanceMinor, registry.currency) },
            ]))}
          />
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>SITUAȚIE PE MEDICI</h2>
          </header>
          <RegistryTable
            columns={[
              { label: "Medic", width: "22%", align: "left" },
              { label: "Clinică", width: "22%", align: "left" },
              { label: "Lucrări", width: "8%", align: "right" },
              { label: "Total emis", width: "16%", align: "right" },
              { label: "Încasat", width: "16%", align: "right" },
              { label: "Sold restant", width: "16%", align: "right" },
            ]}
            rows={doctors.map((group) => ([
              { content: group.doctorName },
              { content: group.clinicName },
              { align: "right", content: String(group.count), nowrap: true },
              { align: "right", content: money(group.totalMinor, registry.currency) },
              { align: "right", content: money(group.paidMinor, registry.currency) },
              { align: "right", content: money(group.balanceMinor, registry.currency) },
            ]))}
          />
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>DOCUMENTE EMISE ÎN PERIOADĂ</h2>
          </header>
          <RegistryTable
            columns={[
              { label: "Data", width: "9%", align: "left", nowrap: true },
              { label: "Tip", width: "9%", align: "left", nowrap: true },
              { label: "Număr", width: "12%", align: "left", nowrap: true },
              { label: "Client", width: "21%", align: "left" },
              { label: "Lucrări", width: "24%", align: "left" },
              { label: "Total", width: "8%", align: "right", nowrap: true },
              { label: "Încasat", width: "8%", align: "right", nowrap: true },
              { label: "Sold", width: "9%", align: "right", nowrap: true },
            ]}
            rows={documents.map((row) => ([
              { content: formatDate(row.issueDate), nowrap: true },
              { content: row.documentType === "INVOICE" ? "Factură" : "Proformă", nowrap: true },
              { content: row.documentNumber ?? "-", nowrap: true },
              {
                content: (
                  <span className="billing-month-registry__client-cell">
                    <strong>{row.clinicName}</strong>
                    <small>{row.doctorNames.join(", ") || "—"}</small>
                  </span>
                ),
              },
              {
                content: (
                  <span className="billing-month-registry__work-code-list">
                    {row.workCodes.length > 0
                      ? row.workCodes.map((workCode) => <span className="billing-month-registry__work-code" key={`${row.documentId}-${workCode}`}>{workCode}</span>)
                      : <span className="billing-month-registry__cell-empty">—</span>}
                  </span>
                ),
              },
              { align: "right", content: money(row.totalMinor, registry.currency) },
              { align: "right", content: money(row.paidMinor, registry.currency) },
              { align: "right", content: money(row.balanceMinor, registry.currency) },
            ]))}
          />
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>ÎNCASĂRI ÎN PERIOADĂ</h2>
          </header>
          <RegistryTable
            columns={[
              { label: "Data", width: "14%", align: "left", nowrap: true },
              { label: "Document", width: "16%", align: "left", nowrap: true },
              { label: "Metodă", width: "20%", align: "left", nowrap: true },
              { label: "Chitanță / Referință", width: "30%", align: "left" },
              { label: "Sumă", width: "20%", align: "right", nowrap: true },
            ]}
            rows={periodPayments.map((payment) => ([
              { content: formatDate(payment.paymentDate), nowrap: true },
              { content: payment.documentNumber ?? "-", nowrap: true },
              { content: toPaymentMethodLabel(payment.method), nowrap: true },
              {
                content: (
                  <span className="billing-month-registry__client-cell">
                    <strong>{payment.receiptNumber ?? "—"}</strong>
                    <small>{payment.reference ?? "—"}</small>
                  </span>
                ),
              },
              { align: "right", content: money(payment.amountMinor, registry.currency) },
            ]))}
          />
        </section>
      </section>
    </article>
  );
}

function toPaymentMethodLabel(method: string): string {
  return {
    BANK_TRANSFER: "Transfer bancar",
    CARD: "Card",
    CASH: "Numerar",
    OTHER: "Altă metodă",
  }[method] ?? method;
}

function RegistryTable({
  columns,
  rows,
}: {
  readonly columns: readonly RegistryTableColumn[];
  readonly rows: readonly (readonly RegistryTableCell[])[];
}): ReactNode {
  return (
    <table className="billing-month-registry__table">
      <colgroup>
        {columns.map((column) => (
          <col key={column.label} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              className={[
                column.align === "right" ? "billing-month-registry__cell--right" : "",
                column.className ?? "",
                column.nowrap ? "billing-month-registry__cell--nowrap" : "",
              ].filter(Boolean).join(" ")}
              key={column.label}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`month-registry-row-${rowIndex}`}>
            {row.map((cell, columnIndex) => (
              <td
                className={[
                  cell.align === "right" ? "billing-month-registry__cell--right" : "",
                  cell.className ?? "",
                  cell.nowrap ? "billing-month-registry__cell--nowrap" : "",
                ].filter(Boolean).join(" ")}
                key={`${rowIndex}-${columnIndex}`}
              >
                {cell.content}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ClinicRegistryGroup {
  balanceMinor: number;
  clinicName: string;
  count: number;
  paidMinor: number;
  totalMinor: number;
}

interface DoctorRegistryGroup {
  balanceMinor: number;
  clinicName: string;
  count: number;
  doctorName: string;
  paidMinor: number;
  totalMinor: number;
}

interface RegistryTableColumn {
  readonly align?: "left" | "right";
  readonly className?: string;
  readonly label: string;
  readonly nowrap?: boolean;
  readonly width?: string;
}

interface RegistryTableCell {
  readonly align?: "left" | "right";
  readonly className?: string;
  readonly content: ReactNode;
  readonly nowrap?: boolean;
}

function money(valueMinor: number, currency: string): string {
  return formatMoneyMinor(valueMinor, currency, "ro-RO");
}

function groupRowsByClinic(rows: MonthEndRegistry["rows"]): ClinicRegistryGroup[] {
  const groups = new Map<string, ClinicRegistryGroup>();
  for (const row of rows) {
    const current = groups.get(row.clinicName) ?? {
      balanceMinor: 0,
      clinicName: row.clinicName,
      count: 0,
      paidMinor: 0,
      totalMinor: 0,
    };
    current.balanceMinor += row.balanceMinor;
    current.count += 1;
    current.paidMinor += row.paidMinor;
    current.totalMinor += row.totalMinor;
    groups.set(row.clinicName, current);
  }
  return Array.from(groups.values()).sort((left, right) => left.clinicName.localeCompare(right.clinicName, "ro"));
}

function groupRowsByDoctor(rows: MonthEndRegistry["rows"]): DoctorRegistryGroup[] {
  const groups = new Map<string, DoctorRegistryGroup>();
  for (const row of rows) {
    const doctorName = row.doctorNames.join(", ") || "-";
    const key = `${row.clinicName}::${doctorName}`;
    const current = groups.get(key) ?? {
      balanceMinor: 0,
      clinicName: row.clinicName,
      count: 0,
      doctorName,
      paidMinor: 0,
      totalMinor: 0,
    };
    current.balanceMinor += row.balanceMinor;
    current.count += 1;
    current.paidMinor += row.paidMinor;
    current.totalMinor += row.totalMinor;
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((left, right) => `${left.doctorName} ${left.clinicName}`.localeCompare(`${right.doctorName} ${right.clinicName}`, "ro"));
}
