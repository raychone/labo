import { Button, ErrorState, LoadingState } from "@dental-lab/ui";
import { type BillingDocumentAttachment, type BillingDocumentLineView, type ClinicBillingStatement, type DoctorBillingStatement } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { useMemo, type ReactNode } from "react";

import { downloadClinicStatementPdf, downloadDoctorStatementPdf, fetchBillingDocumentAttachment, fetchClinicStatement, fetchDoctorStatement, type BillingStatementParams } from "./billing-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./billing-page.css";

type NoteFormat = "a4" | "a5";
type StatementSource = "documents" | "works";

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

interface StatementNoteLine {
  readonly id: string;
  readonly lineTotalMinor: number;
  readonly patientNameSnapshot: string;
  readonly quantity: number;
  readonly toothPositionSnapshot: string | null;
  readonly unitPriceMinor: number;
  readonly workCode: string;
  readonly workCreatedAtSnapshot: string;
  readonly workTypeNameSnapshot: string;
}

const STATEMENT_TEMPLATE_SOURCES: Record<NoteFormat, string> = {
  a4: "/billing-notes/nota-a4.png",
  a5: "/billing-notes/nota-a5.png",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoneyMinorCompact(value: number, currency: string): string {
  return new Intl.NumberFormat("ro-RO", {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
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

function readStatementFormat(searchParams: URLSearchParams): NoteFormat {
  return searchParams.get("format") === "a5" ? "a5" : "a4";
}

function readStatementSource(searchParams: URLSearchParams): StatementSource {
  return searchParams.get("source") === "works" ? "works" : "documents";
}

function readWorkPayload(searchParams: URLSearchParams): readonly SerializedStatementWork[] {
  const raw = searchParams.get("workPayload");
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Partial<SerializedStatementWork>;
      if (typeof record.code !== "string" || typeof record.createdAt !== "string" || typeof record.id !== "string" || typeof record.patientName !== "string" || typeof record.quantity !== "number" || typeof record.workTypeName !== "string") {
        return [];
      }

      return [{
        baseUnitPriceMinor: typeof record.baseUnitPriceMinor === "number" ? record.baseUnitPriceMinor : null,
        code: record.code,
        createdAt: record.createdAt,
        doctorName: typeof record.doctorName === "string" ? record.doctorName : "",
        id: record.id,
        patientName: record.patientName,
        patientReference: typeof record.patientReference === "string" ? record.patientReference : null,
        quantity: record.quantity,
        totalPriceMinor: typeof record.totalPriceMinor === "number" ? record.totalPriceMinor : null,
        workCycleNumber: typeof record.workCycleNumber === "number" ? record.workCycleNumber : null,
        workTypeName: record.workTypeName,
      }];
    });
  } catch {
    return [];
  }
}

function toNoteLineFromAttachment(line: BillingDocumentLineView): StatementNoteLine {
  return {
    id: line.id,
    lineTotalMinor: line.lineTotalMinor,
    patientNameSnapshot: line.patientNameSnapshot,
    quantity: line.quantity,
    toothPositionSnapshot: line.toothPositionSnapshot,
    unitPriceMinor: line.unitPriceMinor,
    workCode: line.workCode,
    workCreatedAtSnapshot: line.workCreatedAtSnapshot,
    workTypeNameSnapshot: line.workTypeNameSnapshot,
  };
}

function toNoteLineFromWork(work: SerializedStatementWork): StatementNoteLine {
  const unitPriceMinor = work.baseUnitPriceMinor ?? (work.quantity > 0 ? Math.round((work.totalPriceMinor ?? 0) / work.quantity) : 0);
  const totalMinor = work.totalPriceMinor ?? unitPriceMinor * work.quantity;
  return {
    id: work.id,
    lineTotalMinor: totalMinor,
    patientNameSnapshot: work.patientName,
    quantity: work.quantity,
    toothPositionSnapshot: work.patientReference,
    unitPriceMinor,
    workCode: work.code,
    workCreatedAtSnapshot: work.createdAt,
    workTypeNameSnapshot: work.workTypeName,
  };
}

export function BillingStatementPrintPage(): ReactNode {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const scope = params.scope === "doctor" ? "doctor" : "clinic";
  const format = readStatementFormat(searchParams);
  const source = readStatementSource(searchParams);
  const statementParams = readStatementParams(searchParams);
  const selectedDocumentIds = readSelectedDocumentIds(searchParams);
  const selectedWorkPayload = readWorkPayload(searchParams);
  const statementQuery = useQuery<ClinicBillingStatement | DoctorBillingStatement>({
    enabled: scope === "clinic" ? Boolean(statementParams.clinicId) : Boolean(statementParams.doctorId),
    queryFn: () => scope === "clinic" ? fetchClinicStatement(statementParams) : fetchDoctorStatement(statementParams),
    queryKey: ["billing", "statement-print", scope, statementParams],
    retry: false,
  });
  const invalidScope = scope === "clinic" ? !statementParams.clinicId : !statementParams.doctorId;

  const attachmentDocumentIds = useMemo(() => {
    if (source === "works" || !statementQuery.data) {
      return [];
    }

    const selectedDocumentIdSet = new Set(selectedDocumentIds);
    return statementQuery.data.documents
      .filter((document) => document.balanceMinor > 0 && (selectedDocumentIds.length === 0 || selectedDocumentIdSet.has(document.documentId)))
      .map((document) => document.documentId);
  }, [selectedDocumentIds, source, statementQuery.data]);

  const attachmentsQuery = useQuery<readonly BillingDocumentAttachment[]>({
    enabled: source === "documents" && statementQuery.isSuccess && attachmentDocumentIds.length > 0,
    queryFn: async () => Promise.all(attachmentDocumentIds.map((documentId) => fetchBillingDocumentAttachment(documentId))),
    queryKey: ["billing", "statement-print", scope, format, attachmentDocumentIds.join(",")],
    retry: false,
  });
  const attachments = attachmentsQuery.data ?? [];

  const noteRows = useMemo<readonly StatementNoteLine[]>(() => {
    if (source === "works") {
      if (selectedWorkPayload.length > 0) {
        return selectedWorkPayload.map(toNoteLineFromWork);
      }

      if (!statementQuery.data) {
        return [];
      }

      return statementQuery.data.uninvoicedWorks.map((work) => ({
        id: work.code,
        lineTotalMinor: work.totalPriceMinor,
        patientNameSnapshot: work.patientName,
        quantity: 1,
        toothPositionSnapshot: null,
        unitPriceMinor: work.totalPriceMinor,
        workCode: work.code,
        workCreatedAtSnapshot: work.createdAt,
        workTypeNameSnapshot: work.workTypeName,
      }));
    }

    return attachments.flatMap((attachment) => attachment.lines.map(toNoteLineFromAttachment));
  }, [attachments, selectedWorkPayload, source, statementQuery.data]);

  const totalMinor = noteRows.reduce((total, row) => total + row.lineTotalMinor, 0);
  const pages = useMemo(() => chunkRows(noteRows, format === "a4" ? 10 : 6), [format, noteRows]);
  const attachmentLabel = source === "works"
    ? "Anexa la factura"
    : attachments.length === 1
      ? `Anexa la factura ${attachments[0]?.documentNumber ?? ""}`.trim()
      : attachments.length > 1
        ? "Anexa la facturile selectate"
        : "Anexa la factura";

  async function exportPdf(): Promise<void> {
    const downloadParams = {
      ...statementParams,
      format,
      source,
      ...(selectedDocumentIds.length > 0 ? { documentIds: selectedDocumentIds.join(",") } : {}),
      ...(selectedWorkPayload.length > 0 ? { workPayload: JSON.stringify(selectedWorkPayload) } : {}),
    };

    if (scope === "clinic") {
      await downloadClinicStatementPdf(downloadParams);
      return;
    }

    await downloadDoctorStatementPdf(downloadParams);
  }

  if (invalidScope) {
    return (
      <main className="billing-print-page">
        <ErrorState title={scope === "clinic" ? "Clinică invalidă" : "Medic invalid"} description={scope === "clinic" ? "Lipsește identificatorul clinicii." : "Lipsește identificatorul medicului."} />
      </main>
    );
  }

  if (statementQuery.isLoading || attachmentsQuery.isLoading) {
    return <main className="billing-print-page"><LoadingState text="Se încarcă nota de plată" /></main>;
  }

  if (statementQuery.error || attachmentsQuery.error || !statementQuery.data) {
    return (
      <main className="billing-print-page">
        <ErrorState title="Nota de plată nu poate fi încărcată" description={getErrorMessage(statementQuery.error ?? attachmentsQuery.error)} />
      </main>
    );
  }

  return (
    <main className={`billing-print-page billing-print-page--statement billing-print-page--statement-${format}`}>
      <div className="billing-print-page__actions">
        <Button onClick={() => void exportPdf()}>Export PDF</Button>
        <span className="billing-print-page__format-badge">Format {format.toUpperCase()}</span>
        <Link className="billing-print-page__back-link" to="/billing">Înapoi la facturare</Link>
      </div>
      <StatementPrintView
        attachmentLabel={attachmentLabel}
        format={format}
        pages={pages}
        scope={scope}
        statement={statementQuery.data}
        totalMinor={totalMinor}
      />
    </main>
  );
}

function StatementPrintView({
  attachmentLabel,
  format,
  pages,
  scope,
  statement,
  totalMinor,
}: {
  readonly attachmentLabel: string;
  readonly format: NoteFormat;
  readonly pages: readonly StatementNoteLine[][];
  readonly scope: "clinic" | "doctor";
  readonly statement: ClinicBillingStatement | DoctorBillingStatement;
  readonly totalMinor: number;
}): ReactNode {
  const recipientName = scope === "clinic"
    ? ("clinicName" in statement ? statement.clinicName : "")
    : ("doctorName" in statement ? statement.doctorName : "");
  return (
    <article className="billing-statement">
      <div className="billing-statement__pages">
        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          return (
            <section className={`billing-statement__paper billing-statement__paper--${format}`} key={`${pageIndex}-${pageRows.length}`}>
              <img
                alt=""
                aria-hidden="true"
                className="billing-statement__header-art"
                src={`${STATEMENT_TEMPLATE_SOURCES[format]}?v=20260813`}
                title={`Antet notă de plată ${format.toUpperCase()}`}
              />
              <div className="billing-statement__content">
                <section className="billing-statement__sheet">
                  <header className="billing-statement__header">
                    <div className="billing-statement__brand">
                      <span>Catre:</span>
                      <strong>{recipientName}</strong>
                      <small>{attachmentLabel}</small>
                    </div>
                  </header>

                  <div className="billing-statement__frame">
                    <section className="billing-statement__section">
                      <NoteLinesTable currency={statement.currency} rows={pageRows} />
                    </section>

                    {isLastPage ? (
                      <footer className="billing-statement__footer">
                        <div className="billing-statement__footer-total">
                          <span>Total:</span>
                          <strong>{formatMoneyMinorCompact(totalMinor, statement.currency)}</strong>
                        </div>
                      </footer>
                    ) : null}
                  </div>
                </section>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function NoteLinesTable({ currency, rows }: { readonly currency: string; readonly rows: readonly StatementNoteLine[] }): ReactNode {
  return (
    <table className="billing-print__table billing-print__table--attachment">
      <thead>
        <tr>
          <th>Data intr.</th>
          <th>Nr. fișa lab GSI</th>
          <th>Nume pacient</th>
          <th>Tip lucrare</th>
          <th>Poziție arcadă</th>
          <th>Nr. elem.</th>
          <th>Preț / elem.</th>
          <th>Valoare lei</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{formatDate(row.workCreatedAtSnapshot)}</td>
            <td>{row.workCode}</td>
            <td>{row.patientNameSnapshot}</td>
            <td>{row.workTypeNameSnapshot}</td>
            <td>{row.toothPositionSnapshot ?? "-"}</td>
            <td>{row.quantity}</td>
            <td>{formatMoneyMinorCompact(row.unitPriceMinor, currency)}</td>
            <td>{formatMoneyMinorCompact(row.lineTotalMinor, currency)}</td>
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
