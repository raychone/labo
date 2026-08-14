import { Button, ErrorState, LoadingState } from "@dental-lab/ui";
import { type MonthEndRegistry, formatMoneyMinor } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useMemo, type ReactNode } from "react";

import { fetchMonthRegistry, type BillingWorkspaceParams } from "./billing-api.js";
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
  const registryQuery = useQuery<MonthEndRegistry>({
    enabled: Boolean((params.year && params.month) || (params.dateFrom && params.dateTo)),
    queryFn: () => fetchMonthRegistry(params),
    queryKey: ["billing", "month-registry-print", params, settingsQuery.data?.legalEntityCode ?? "loading"],
    retry: false,
  });

  if (!((params.year && params.month) || (params.dateFrom && params.dateTo))) {
    return (
      <main className="billing-print-page">
        <ErrorState title="Interval invalid" description="Lipsesc year/month sau dateFrom/dateTo pentru registrul lunar." />
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
        <Button onClick={() => window.print()}>Export PDF</Button>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <MonthRegistryPrintView companyLabel={`${settingsQuery.data.legalEntityCode} — ${settingsQuery.data.legalEntityDisplayName}`} registry={registryQuery.data} />
    </main>
  );
}

function MonthRegistryPrintView({
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
            columns={["Clinică", "Lucrări", "Total emis", "Încasat", "Sold restant"]}
            rows={clinics.map((group) => ([
              group.clinicName,
              String(group.count),
              group.totalMinor,
              group.paidMinor,
              group.balanceMinor,
            ]))}
            currency={registry.currency}
          />
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>SITUAȚIE PE MEDICI</h2>
          </header>
          <RegistryTable
            columns={["Medic", "Clinică", "Lucrări", "Total emis", "Încasat", "Sold restant"]}
            rows={doctors.map((group) => ([
              group.doctorName,
              group.clinicName,
              String(group.count),
              group.totalMinor,
              group.paidMinor,
              group.balanceMinor,
            ]))}
            currency={registry.currency}
          />
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>DOCUMENTE EMISE ÎN PERIOADĂ</h2>
          </header>
          <RegistryTable
            columns={["Data", "Tip", "Număr", "Clinică", "Medic", "Pacient", "Lucrări", "Total", "Încasat", "Sold"]}
            rows={documents.map((row) => ([
              formatDate(row.issueDate),
              row.documentType === "INVOICE" ? "Factură" : "Proformă",
              row.documentNumber ?? "-",
              row.clinicName,
              row.doctorNames.join(", ") || "-",
              row.patientNames.join(", ") || "-",
              row.workCodes.join(", ") || "-",
              row.totalMinor,
              row.paidMinor,
              row.balanceMinor,
            ]))}
            currency={registry.currency}
          />
        </section>

        <section className="billing-month-registry__section">
          <header>
            <h2>ÎNCASĂRI ÎN PERIOADĂ</h2>
          </header>
          <RegistryTable
            columns={["Data", "Document", "Metodă", "Chitanță / Referință", "Sumă"]}
            rows={periodPayments.map((payment) => ([
              formatDate(payment.paymentDate),
              payment.documentNumber ?? "-",
              toPaymentMethodLabel(payment.method),
              payment.receiptNumber ?? payment.reference ?? "-",
              payment.amountMinor,
            ]))}
            currency={registry.currency}
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
  currency,
  rows,
}: {
  readonly columns: readonly string[];
  readonly currency: string;
  readonly rows: readonly (readonly (string | number | null)[])[];
}): ReactNode {
  return (
    <table className="billing-month-registry__table">
      <thead>
        <tr>
          {columns.map((column) => <th key={column}>{column}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${rowIndex}-${row[2] ?? row[0] ?? "row"}`}>
            {row.map((value, columnIndex) => (
              <td key={`${rowIndex}-${columnIndex}`}>
                {typeof value === "number"
                  ? formatMoneyMinor(value, currency, "ro-RO")
                  : value ?? "-"}
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
