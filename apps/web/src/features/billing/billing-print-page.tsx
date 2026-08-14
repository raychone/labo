import { Button, ErrorState, LoadingState, Tabs } from "@dental-lab/ui";
import { formatMoneyMinor, formatWorkTypeUnit, type BillingDocumentLineView, type PrintableBillingDocument } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import type { ReactNode } from "react";

import { billingQueryKeys, downloadBillingDocumentPdf, fetchBillingDocumentPrint } from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function parseFormattedNumber(formattedNumber: string | null): { readonly prefix: string; readonly serial: string; readonly year: string } | null {
  if (!formattedNumber) {
    return null;
  }

  const match = /^(.*)-(\d{4})-(\d+)$/.exec(formattedNumber);
  if (!match) {
    return null;
  }

  return {
    prefix: match[1] ?? formattedNumber,
    serial: match[3] ?? formattedNumber,
    year: match[2] ?? "",
  };
}

export function BillingPrintPage(): ReactNode {
  const params = useParams();
  const documentId = params.id ?? "";
  const documentQuery = useQuery({
    enabled: documentId.length > 0,
    queryFn: () => fetchBillingDocumentPrint(documentId),
    queryKey: billingQueryKeys.documentPrint(documentId),
    retry: false,
  });

  if (!documentId) {
    return <main className="billing-print-page"><ErrorState title="Document invalid" description="Lipsește identificatorul documentului." /></main>;
  }

  if (documentQuery.isLoading) {
    return <main className="billing-print-page"><LoadingState text="Se încarcă documentul pentru print" /></main>;
  }

  if (documentQuery.error || !documentQuery.data) {
    return (
      <main className="billing-print-page">
        <ErrorState title="Documentul nu poate fi încărcat" description={getErrorMessage(documentQuery.error)} />
      </main>
    );
  }

  return (
    <main className="billing-print-page">
      <div className="billing-print-page__actions">
        <Button onClick={() => void downloadBillingDocumentPdf(documentId)}>Export PDF</Button>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <Tabs tabs={[{ id: "document", label: "Document", content: <PrintableDocumentView document={documentQuery.data} /> }]} />
    </main>
  );
}

function PrintableDocumentView({ document }: { readonly document: PrintableBillingDocument }): ReactNode {
  const numberParts = parseFormattedNumber(document.formattedNumber);
  const pages = chunkRows(document.lines, 8);
  return (
    <article className="billing-print billing-print--invoice">
      <div className="billing-print__pages billing-print__pages--invoice">
        {pages.map((pageLines, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          return (
            <section className="billing-print__paper billing-print__paper--invoice" key={`${pageIndex}-${pageLines.length}`}>
              <div className="billing-print__paper-content billing-print__paper-content--invoice">
                <header className="billing-print__invoice-header">
                  <div className="billing-print__invoice-series">
                    <span>Seria:</span>
                    <strong>{numberParts?.prefix ?? document.formattedNumber ?? "Draft"}</strong>
                  </div>
                  <div className="billing-print__invoice-number">
                    <span>Număr:</span>
                    <strong>{numberParts?.serial ?? document.formattedNumber ?? "Draft"}</strong>
                    {numberParts ? <small>{numberParts.year}</small> : null}
                  </div>
                </header>

                <section className="billing-print__parties billing-print__parties--invoice">
                  <PartyBlock
                    label="Furnizor"
                    party={document.supplier}
                  />
                  <PartyBlock
                    label="Cumpărător"
                    party={document.customer}
                  />
                </section>

                <section className="billing-print__invoice-title">
                  <h1>FACTURA</h1>
                  <div className="billing-print__invoice-title-meta">
                    <strong>{document.documentTitle}</strong>
                    <span>Nr. {document.formattedNumber ?? "Draft"}</span>
                    <span>Data: {formatDate(document.issueDate)}</span>
                    <span>Generat la {formatDate(document.generatedAt)}</span>
                    <span>{document.complianceNotice}</span>
                  </div>
                </section>

                <LinesTable
                  currency={document.currency}
                  lines={pageLines}
                  startIndex={pageIndex * 8}
                  variant="invoice"
                />

                {isLastPage ? (
                  <>
                    <InvoiceTotal currency={document.currency} totalMinor={document.totalMinor} />
                    {document.notes ? <p className="billing-print__notes">{document.notes}</p> : null}
                  </>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function PartyBlock({
  label,
  lines,
  party,
}: {
  readonly label: string;
  readonly lines?: readonly (string | null | undefined)[];
  readonly party: PrintableBillingDocument["supplier"];
}): ReactNode {
  return (
    <section className="billing-print__party">
      <h2>{label}</h2>
      <strong>{party.legalName ?? party.name}</strong>
      <p>{party.name}</p>
      <p>{party.address ?? "-"}</p>
      <p>CUI: {party.taxId ?? "-"}</p>
      <p>Reg: {party.registrationNumber ?? "-"}</p>
      <p>{party.email ?? "-"}</p>
      <p>{party.phone ?? "-"}</p>
      {party.website ? <p>{party.website}</p> : null}
      {lines?.filter((line): line is string => typeof line === "string" && line.length > 0).map((line) => <p key={line}>{line}</p>)}
    </section>
  );
}

function LinesTable({
  currency,
  lines,
  startIndex = 0,
  variant,
}: {
  readonly currency: string;
  readonly lines: readonly BillingDocumentLineView[];
  readonly startIndex?: number;
  readonly variant: "attachment" | "invoice";
}): ReactNode {
  return (
    <table className={`billing-print__table billing-print__table--${variant}`}>
      <thead>
        <tr>
          {variant === "attachment" ? (
            <>
              <th>Data intr.</th>
              <th>Nr. fișa lab GSI</th>
              <th>Nume pacient</th>
              <th>Tip lucrare</th>
              <th>Poziție arcadă</th>
              <th>Nr. elem.</th>
              <th>Preț / elem.</th>
              <th>Valoare lei</th>
            </>
          ) : (
            <>
              <th>Nr.</th>
              <th>Denumirea produselor sau serviciilor</th>
              <th>U.M.</th>
              <th>Cantitate</th>
              <th>Preț unitar</th>
              <th>Valoare</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={line.id}>
            {variant === "attachment" ? (
              <>
                <td>{formatDate(line.workCreatedAtSnapshot)}</td>
                <td>{line.workCode}</td>
                <td>{line.patientNameSnapshot}</td>
                <td>{line.description}</td>
                <td>{line.toothPositionSnapshot ?? "-"}</td>
                <td>{line.quantity}</td>
                <td>{formatMoneyMinor(line.unitPriceMinor, currency, "ro-RO")}</td>
                <td>{formatMoneyMinor(line.lineTotalMinor, currency, "ro-RO")}</td>
              </>
            ) : (
              <>
                <td>{startIndex + index + 1}</td>
                <td>
                  <strong>{line.description}</strong>
                  <small>{line.workCode} · {line.patientNameSnapshot}</small>
                </td>
                <td>{formatWorkTypeUnit(line.workTypeUnitSnapshot)}</td>
                <td>{line.quantity}</td>
                <td>{formatMoneyMinor(line.unitPriceMinor, currency, "ro-RO")}</td>
                <td>{formatMoneyMinor(line.lineTotalMinor, currency, "ro-RO")}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function chunkRows<T>(rows: readonly T[], chunkSize: number): T[][] {
  if (rows.length === 0) {
    return [[]];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks;
}

function InvoiceTotal({ currency, totalMinor }: { readonly currency: string; readonly totalMinor: number }): ReactNode {
  return (
    <dl className="billing-print__totals billing-print__totals--invoice">
      <div><dt>Total factură</dt><dd>{formatMoneyMinor(totalMinor, currency, "ro-RO")}</dd></div>
    </dl>
  );
}
