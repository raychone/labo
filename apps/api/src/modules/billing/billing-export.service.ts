import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { BILLING_AUDIT_ACTIONS, BILLING_RESOURCE_TYPES } from "./billing.constants.js";
import { toDateOnly } from "./billing.helpers.js";
import { calculateBillingAmounts } from "./billing.view.js";
import { resolveDateRange } from "./billing-statement.service.js";
import type { BillingRangeQueryDto } from "./dto/billing.dto.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

interface CsvDocumentRecord {
  readonly clinicNameSnapshot: string;
  readonly dueDate: Date | null;
  readonly formattedNumber: string | null;
  readonly issueDate: Date;
  readonly lines: readonly {
    readonly doctorNameSnapshot: string;
    readonly patientNameSnapshot: string;
    readonly workCode: string;
  }[];
  readonly payments: readonly { readonly amountMinor: number; readonly cancelledAt: Date | null }[];
  readonly status: string;
  readonly totalMinor: number;
  readonly type: string;
}

const BILLING_DOCUMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  CANCELLED: "Anulat",
  DRAFT: "Draft",
  ISSUED: "Emis",
  PAID: "Achitat integral",
  PARTIALLY_PAID: "Parțial încasat",
};

const EXPORT_DOCUMENT_INCLUDE = {
  lines: true,
  payments: true,
} as const satisfies Prisma.BillingDocumentInclude;

const CSV_FORMULA_PREFIXES = ["=", "+", "-", "@"] as const;

@Injectable()
export class BillingExportService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  public async getMonthRegistryCsv(context: ActorContext, legalEntity: LegalEntityContext, query: BillingRangeQueryDto): Promise<string> {
    const range = resolveDateRange(query);
    const documents = await this.prisma.billingDocument.findMany({
      include: EXPORT_DOCUMENT_INCLUDE,
      orderBy: [{ issueDate: "asc" }, { formattedNumber: "asc" }],
      where: {
        issueDate: { gte: range.from, lte: range.to },
        legalEntityId: legalEntity.id,
        status: { not: "CANCELLED" },
      },
    });

    await this.auditService.record({
      action: BILLING_AUDIT_ACTIONS.csvExported,
      actorUserId: context.actorUserId,
      metadata: {
        dateFrom: toDateOnly(range.from),
        dateTo: toDateOnly(range.to),
        exportType: "month_registry",
        legalEntityCode: legalEntity.code,
        rowCount: documents.length,
      },
      requestMetadata: context.requestMetadata,
      resourceType: BILLING_RESOURCE_TYPES.billingExport,
    });

    return createMonthRegistryCsv(documents);
  }
}

export function createMonthRegistryCsv(documents: readonly CsvDocumentRecord[]): string {
  const rows = [
    ["Data", "Scadență", "Tip", "Număr", "Clinică", "Medici", "Pacienți", "Lucrări", "Status", "Total", "Încasat manual", "Sold restant", "Monedă"],
    ...documents.map((document) => {
      const amounts = calculateBillingAmounts(document);

      return [
        formatRoDate(document.issueDate),
        document.dueDate ? formatRoDate(document.dueDate) : "",
        document.type === "INVOICE" ? "Factură" : "Proformă",
        document.formattedNumber ?? "Draft",
        document.clinicNameSnapshot,
        uniqueStrings(document.lines.map((line) => line.doctorNameSnapshot)).join(", "),
        uniqueStrings(document.lines.map((line) => line.patientNameSnapshot)).join(", "),
        uniqueStrings(document.lines.map((line) => line.workCode)).join(", "),
        formatBillingDocumentStatus(document.status),
        minorToCsvMoney(document.totalMinor),
        minorToCsvMoney(amounts.paidMinor),
        minorToCsvMoney(amounts.balanceMinor),
        "RON",
      ];
    }),
  ];

  return `\uFEFF${rows.map((row) => row.map(toSafeCsvCell).join(";")).join("\r\n")}\r\n`;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export function formatBillingDocumentStatus(status: string): string {
  return BILLING_DOCUMENT_STATUS_LABELS[status] ?? status;
}

export function toSafeCsvCell(value: string): string {
  const trimmedStart = value.trimStart();
  const safeValue = CSV_FORMULA_PREFIXES.some((prefix) => trimmedStart.startsWith(prefix)) ? `'${value}` : value;

  return `"${safeValue.replaceAll("\"", "\"\"")}"`;
}

function minorToCsvMoney(value: number): string {
  return (value / 100).toFixed(2);
}

function formatRoDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${value.getFullYear()}`;
}
