import { Button, ErrorState, LoadingState } from "@dental-lab/ui";
import { formatMoneyMinor, type BillingStatementRow, type BillingStatementWorkRow, type ClinicBillingStatement, type DoctorBillingStatement } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import type { ReactNode } from "react";

import { fetchClinicStatement, fetchDoctorStatement, type BillingStatementParams } from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function readStatementParams(searchParams: URLSearchParams): BillingStatementParams {
  const clinicId = searchParams.get("clinicId");
  const doctorId = searchParams.get("doctorId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  return {
    ...(clinicId ? { clinicId } : {}),
    ...(doctorId ? { doctorId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
}

export function BillingStatementPrintPage(): ReactNode {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const scope = params.scope === "doctor" ? "doctor" : "clinic";
  const statementParams = readStatementParams(searchParams);
  const query = useQuery<ClinicBillingStatement | DoctorBillingStatement>({
    enabled: scope === "clinic" ? Boolean(statementParams.clinicId) : Boolean(statementParams.doctorId),
    queryFn: () => scope === "clinic" ? fetchClinicStatement(statementParams) : fetchDoctorStatement(statementParams),
    queryKey: ["billing", "statement-print", scope, statementParams],
    retry: false,
  });

  if (scope === "clinic" && !statementParams.clinicId) {
    return <main className="billing-print-page"><ErrorState title="Clinică invalidă" description="Lipsește identificatorul clinicii." /></main>;
  }

  if (scope === "doctor" && !statementParams.doctorId) {
    return <main className="billing-print-page"><ErrorState title="Medic invalid" description="Lipsește identificatorul medicului." /></main>;
  }

  if (query.isLoading) {
    return <main className="billing-print-page"><LoadingState text="Se încarcă nota de plată" /></main>;
  }

  if (query.error || !query.data) {
    return (
      <main className="billing-print-page">
        <ErrorState title="Nota de plată nu poate fi încărcată" description={getErrorMessage(query.error)} />
      </main>
    );
  }

  return (
    <main className="billing-print-page">
      <div className="billing-print-page__actions">
        <Button onClick={() => window.print()}>Printează / Salvează PDF</Button>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <StatementPrintView scope={scope} statement={query.data} />
    </main>
  );
}

function StatementPrintView({ scope, statement }: { readonly scope: "clinic" | "doctor"; readonly statement: ClinicBillingStatement | DoctorBillingStatement }): ReactNode {
  const recipientName = scope === "clinic"
    ? ("clinicName" in statement ? statement.clinicName : "")
    : ("doctorName" in statement ? statement.doctorName : "");
  return (
    <article className="billing-statement">
      <header className="billing-statement__header">
        <div className="billing-statement__brand">
          <strong>Dental Lab Management</strong>
          <span>Notă de plată</span>
        </div>
        <div className="billing-statement__recipient">
          <span>{scope === "clinic" ? "Clinică" : "Medic"}</span>
          <strong>{recipientName}</strong>
          <small>{statement.dateFrom} - {statement.dateTo}</small>
        </div>
      </header>

      <section className="billing-statement__summary">
        <div><span>Generat la</span><strong>{formatDate(statement.generatedAt)}</strong></div>
        <div><span>Total</span><strong>{formatMoneyMinor(statement.totalMinor, statement.currency, "ro-RO")}</strong></div>
        <div><span>Încasat</span><strong>{formatMoneyMinor(statement.paidMinor, statement.currency, "ro-RO")}</strong></div>
        <div><span>Nefacturat</span><strong>{formatMoneyMinor(statement.uninvoicedMinor, statement.currency, "ro-RO")}</strong></div>
      </section>

      <StatementSection title="Documente" count={statement.documents.length}>
        <StatementDocumentsTable currency={statement.currency} rows={statement.documents} />
      </StatementSection>

      <StatementSection title="Lucrări nefacturate" count={statement.uninvoicedWorks.length}>
        <StatementWorksTable currency={statement.currency} rows={statement.uninvoicedWorks} />
      </StatementSection>
    </article>
  );
}

function StatementSection({ children, count, title }: { readonly children: ReactNode; readonly count: number; readonly title: string }): ReactNode {
  return (
    <section className="billing-statement__section">
      <div className="billing-statement__section-header">
        <strong>{title}</strong>
        <span>{count}</span>
      </div>
      {children}
    </section>
  );
}

function StatementDocumentsTable({ currency, rows }: { readonly currency: string; readonly rows: readonly BillingStatementRow[] }): ReactNode {
  return (
    <table className="billing-statement__table">
      <thead>
        <tr>
          <th>Document</th>
          <th>Tip</th>
          <th>Emis</th>
          <th>Scadență</th>
          <th>Lucrări</th>
          <th>Total</th>
          <th>Încasat</th>
          <th>Sold</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.documentId}>
            <td>{row.documentNumber ?? "-"}</td>
            <td>{row.documentType === "INVOICE" ? "Factură" : "Proformă"}</td>
            <td>{formatDate(row.issueDate)}</td>
            <td>{row.dueDate ? formatDate(row.dueDate) : "-"}</td>
            <td>{row.workCodes.join(", ") || "-"}</td>
            <td>{formatMoneyMinor(row.totalMinor, currency, "ro-RO")}</td>
            <td>{formatMoneyMinor(row.paidMinor, currency, "ro-RO")}</td>
            <td>{formatMoneyMinor(row.balanceMinor, currency, "ro-RO")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatementWorksTable({ currency, rows }: { readonly currency: string; readonly rows: readonly BillingStatementWorkRow[] }): ReactNode {
  return (
    <table className="billing-statement__table">
      <thead>
        <tr>
          <th>Cod</th>
          <th>Creat</th>
          <th>Pacient</th>
          <th>Clinică</th>
          <th>Medic</th>
          <th>Tip</th>
          <th>Valoare</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.code}>
            <td>{row.code}</td>
            <td>{formatDate(row.createdAt)}</td>
            <td>{row.patientName}</td>
            <td>{row.clinicName}</td>
            <td>{row.doctorName}</td>
            <td>{row.workTypeName}</td>
            <td>{formatMoneyMinor(row.totalPriceMinor, currency, "ro-RO")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
