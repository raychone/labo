import { Button, ErrorState, LoadingState } from "@dental-lab/ui";
import { formatMoneyMinor, type BillingStatementRow, type BillingStatementWorkRow, type ClinicBillingStatement, type DoctorBillingStatement } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import type { ReactNode } from "react";

import { fetchClinicStatement, fetchDoctorStatement, type BillingStatementParams } from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

const STATEMENT_HEADER_ASSETS = {
  a4: encodeURI("/Nota Plata 2026.pdf#page=1&view=FitH&toolbar=0&navpanes=0"),
  a5: encodeURI("/Nota Plata A5 2026.pdf#page=1&view=FitH&toolbar=0&navpanes=0"),
} as const;

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

function readSelectedDocumentIds(searchParams: URLSearchParams): readonly string[] {
  const raw = searchParams.get("documentIds");
  return raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : [];
}

function readStatementFormat(searchParams: URLSearchParams): keyof typeof STATEMENT_HEADER_ASSETS {
  return searchParams.get("format") === "a5" ? "a5" : "a4";
}

export function BillingStatementPrintPage(): ReactNode {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const scope = params.scope === "doctor" ? "doctor" : "clinic";
  const format = readStatementFormat(searchParams);
  const statementParams = readStatementParams(searchParams);
  const selectedDocumentIds = readSelectedDocumentIds(searchParams);
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
        <Button onClick={() => window.print()}>Export PDF</Button>
        <span className="billing-print-page__format-badge">Format {format.toUpperCase()}</span>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <StatementPrintView format={format} scope={scope} selectedDocumentIds={selectedDocumentIds} statement={query.data} />
    </main>
  );
}

function StatementPrintView({
  format,
  scope,
  selectedDocumentIds,
  statement,
}: {
  readonly format: keyof typeof STATEMENT_HEADER_ASSETS;
  readonly scope: "clinic" | "doctor";
  readonly selectedDocumentIds: readonly string[];
  readonly statement: ClinicBillingStatement | DoctorBillingStatement;
}): ReactNode {
  const recipientName = scope === "clinic"
    ? ("clinicName" in statement ? statement.clinicName : "")
    : ("doctorName" in statement ? statement.doctorName : "");
  const selectedDocuments = selectedDocumentIds.length > 0
    ? statement.documents.filter((row) => selectedDocumentIds.includes(row.documentId))
    : statement.documents;
  const effectiveDocuments = selectedDocuments.length > 0 ? selectedDocuments : statement.documents;
  const effectiveTotalMinor = effectiveDocuments.reduce((total, row) => total + row.totalMinor, 0);
  const effectivePaidMinor = effectiveDocuments.reduce((total, row) => total + row.paidMinor, 0);
  const effectiveBalanceMinor = effectiveDocuments.reduce((total, row) => total + row.balanceMinor, 0);
  const showCustomSelection = selectedDocumentIds.length > 0;
  return (
    <article className="billing-statement">
      <div className="billing-statement__header-art-wrap">
        <iframe aria-label={`Antet notă de plată ${format.toUpperCase()}`} className="billing-statement__header-art" src={STATEMENT_HEADER_ASSETS[format]} title={`Antet notă de plată ${format.toUpperCase()}`}>
          <p>Antetul PDF nu poate fi afișat în browserul curent.</p>
        </iframe>
      </div>
      <header className="billing-statement__header">
        <div className="billing-statement__brand">
          <strong>Notă de plată</strong>
          <span>{scope === "clinic" ? "Clinică" : "Medic"} · {recipientName}</span>
          {showCustomSelection ? <small>{effectiveDocuments.length} documente selectate din perioadă</small> : null}
        </div>
        <div className="billing-statement__recipient">
          <span>Perioadă</span>
          <strong>{statement.dateFrom} - {statement.dateTo}</strong>
          <small>Generat la {formatDate(statement.generatedAt)}</small>
        </div>
      </header>

      <section className="billing-statement__summary">
        <div><span>{showCustomSelection ? "Total selectat" : "Total"}</span><strong>{formatMoneyMinor(effectiveTotalMinor, statement.currency, "ro-RO")}</strong></div>
        <div><span>Încasat</span><strong>{formatMoneyMinor(effectivePaidMinor, statement.currency, "ro-RO")}</strong></div>
        <div><span>Sold restant</span><strong>{formatMoneyMinor(effectiveBalanceMinor, statement.currency, "ro-RO")}</strong></div>
        <div><span>Documente</span><strong>{effectiveDocuments.length}</strong></div>
      </section>

      <StatementSection title="Documente" count={effectiveDocuments.length}>
        <StatementDocumentsTable currency={statement.currency} rows={effectiveDocuments} />
      </StatementSection>

      {showCustomSelection ? null : (
        <StatementSection title="Lucrări nefacturate" count={statement.uninvoicedWorks.length}>
          <StatementWorksTable currency={statement.currency} rows={statement.uninvoicedWorks} />
        </StatementSection>
      )}
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
