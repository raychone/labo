import { Button, ErrorState, LoadingState, Tabs } from "@dental-lab/ui";
import { formatMoneyMinor, formatWorkTypeUnit, type BillingDocumentAttachment, type BillingDocumentLineView, type PrintableBillingDocument } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import type { ReactNode } from "react";

import { billingQueryKeys, fetchBillingDocumentAttachment, fetchBillingDocumentPrint } from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
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
  const attachmentQuery = useQuery({
    enabled: documentId.length > 0,
    queryFn: () => fetchBillingDocumentAttachment(documentId),
    queryKey: billingQueryKeys.documentAttachment(documentId),
    retry: false,
  });

  if (!documentId) {
    return <main className="billing-print-page"><ErrorState title="Document invalid" description="Lipsește identificatorul documentului." /></main>;
  }

  if (documentQuery.isLoading || attachmentQuery.isLoading) {
    return <main className="billing-print-page"><LoadingState text="Se încarcă documentul pentru print" /></main>;
  }

  if (documentQuery.error || attachmentQuery.error || !documentQuery.data || !attachmentQuery.data) {
    return (
      <main className="billing-print-page">
        <ErrorState title="Documentul nu poate fi încărcat" description={getErrorMessage(documentQuery.error ?? attachmentQuery.error)} />
      </main>
    );
  }

  return (
    <main className="billing-print-page">
      <div className="billing-print-page__actions">
        <Button onClick={() => window.print()}>Export PDF</Button>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <Tabs
        tabs={[
          { id: "document", label: "Document", content: <PrintableDocumentView document={documentQuery.data} /> },
          { id: "attachment", label: "Anexa", content: <AttachmentView attachment={attachmentQuery.data} /> },
        ]}
      />
    </main>
  );
}

function PrintableDocumentView({ document }: { readonly document: PrintableBillingDocument }): ReactNode {
  return (
    <article className="billing-print billing-print--invoice">
      <PrintHeader
        complianceNotice={document.complianceNotice}
        customer={document.customer}
        generatedAt={document.generatedAt}
        supplier={document.supplier}
        subtitle={`Serie / număr: ${document.formattedNumber ?? "Draft"}`}
        title={`${document.documentTitle} ${document.formattedNumber ?? "Draft"}`}
      />
      <dl className="billing-print__meta billing-print__meta--document">
        <div><dt>Data emiterii</dt><dd>{formatDate(document.issueDate)}</dd></div>
        <div><dt>Scadență</dt><dd>{document.dueDate ? formatDate(document.dueDate) : "-"}</dd></div>
        <div><dt>Status</dt><dd>{document.status}</dd></div>
        <div><dt>Lucrări</dt><dd>{document.workCodes.join(", ") || "-"}</dd></div>
      </dl>
      <LinesTable currency={document.currency} lines={document.lines} />
      <Totals currency={document.currency} paidMinor={document.paidMinor} totalMinor={document.totalMinor} balanceMinor={document.balanceMinor} />
      {document.notes ? <p className="billing-print__notes">{document.notes}</p> : null}
    </article>
  );
}

function AttachmentView({ attachment }: { readonly attachment: BillingDocumentAttachment }): ReactNode {
  return (
    <article className="billing-print billing-print--invoice">
      <PrintHeader
        complianceNotice={attachment.complianceNotice}
        customer={attachment.customer}
        generatedAt={attachment.generatedAt}
        supplier={attachment.supplier}
        subtitle={`Număr: ${attachment.documentNumber ?? "Draft"}`}
        title={`${attachment.documentTitle} ${attachment.documentNumber ?? "Draft"}`}
      />
      <LinesTable currency={attachment.currency} lines={attachment.lines} />
      <Totals currency={attachment.currency} paidMinor={0} totalMinor={attachment.totalMinor} balanceMinor={attachment.totalMinor} />
    </article>
  );
}

function PrintHeader({
  complianceNotice,
  customer,
  generatedAt,
  supplier,
  subtitle,
  title,
}: {
  readonly complianceNotice: string;
  readonly customer: PrintableBillingDocument["customer"];
  readonly generatedAt: string;
  readonly supplier: PrintableBillingDocument["supplier"];
  readonly subtitle: string;
  readonly title: string;
}): ReactNode {
  return (
    <header className="billing-print__header billing-print__header--invoice">
      <div className="billing-print__title-block">
        <p className="billing-print__eyebrow">Document de facturare</p>
        <h1>{title}</h1>
        <p className="billing-print__subtitle">{subtitle}</p>
        <p className="billing-print__compliance">{complianceNotice}</p>
        <small>Generat la {formatDate(generatedAt)}</small>
      </div>
      <div className="billing-print__header-parties">
        <PartyBlock label="Furnizor" party={supplier} />
        <PartyBlock label="Cumpărător" party={customer} />
      </div>
    </header>
  );
}

function PartyBlock({ label, party }: { readonly label: string; readonly party: PrintableBillingDocument["supplier"] }): ReactNode {
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
    </section>
  );
}

function LinesTable({ currency, lines }: { readonly currency: string; readonly lines: readonly BillingDocumentLineView[] }): ReactNode {
  return (
    <table className="billing-print__table billing-print__table--invoice">
      <thead>
        <tr>
          <th>Nr.</th>
          <th>Denumirea produselor sau serviciilor</th>
          <th>U.M.</th>
          <th>Cantitate</th>
          <th>Preț unitar</th>
          <th>Valoare</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={line.id}>
            <td>{index + 1}</td>
            <td>
              <strong>{line.description}</strong>
              <small>{line.workCode} · {line.patientNameSnapshot}</small>
            </td>
            <td>{formatWorkTypeUnit(line.workTypeUnitSnapshot)}</td>
            <td>{line.quantity}</td>
            <td>{formatMoneyMinor(line.unitPriceMinor, currency, "ro-RO")}</td>
            <td>{formatMoneyMinor(line.lineTotalMinor, currency, "ro-RO")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totals({ balanceMinor, currency, paidMinor, totalMinor }: { readonly balanceMinor: number; readonly currency: string; readonly paidMinor: number; readonly totalMinor: number }): ReactNode {
  return (
    <dl className="billing-print__totals">
      <div><dt>Total factură</dt><dd>{formatMoneyMinor(totalMinor, currency, "ro-RO")}</dd></div>
      <div><dt>Încasat manual</dt><dd>{formatMoneyMinor(paidMinor, currency, "ro-RO")}</dd></div>
      <div><dt>Sold restant</dt><dd>{formatMoneyMinor(balanceMinor, currency, "ro-RO")}</dd></div>
    </dl>
  );
}
