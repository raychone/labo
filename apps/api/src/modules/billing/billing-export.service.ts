import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
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
  readonly formattedNumber: string | null;
  readonly issueDate: Date;
  readonly payments: readonly { readonly amountMinor: number; readonly cancelledAt: Date | null }[];
  readonly status: string;
  readonly totalMinor: number;
  readonly type: string;
}

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

  public async getMonthRegistryCsv(context: ActorContext, query: BillingRangeQueryDto): Promise<string> {
    const range = resolveDateRange(query);
    const documents = await this.prisma.billingDocument.findMany({
      include: EXPORT_DOCUMENT_INCLUDE,
      orderBy: [{ issueDate: "asc" }, { formattedNumber: "asc" }],
      where: {
        issueDate: { gte: range.from, lte: range.to },
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
    ["Data", "Tip", "Numar", "Clinica", "Status", "Total", "Incasat manual", "Sold"],
    ...documents.map((document) => {
      const amounts = calculateBillingAmounts(document);

      return [
        toDateOnly(document.issueDate),
        document.type,
        document.formattedNumber ?? "Draft",
        document.clinicNameSnapshot,
        document.status,
        minorToCsvMoney(document.totalMinor),
        minorToCsvMoney(amounts.paidMinor),
        minorToCsvMoney(amounts.balanceMinor),
      ];
    }),
  ];

  return rows.map((row) => row.map(toSafeCsvCell).join(",")).join("\n");
}

export function toSafeCsvCell(value: string): string {
  const trimmedStart = value.trimStart();
  const safeValue = CSV_FORMULA_PREFIXES.some((prefix) => trimmedStart.startsWith(prefix)) ? `'${value}` : value;

  return `"${safeValue.replaceAll("\"", "\"\"")}"`;
}

function minorToCsvMoney(value: number): string {
  return (value / 100).toFixed(2);
}
