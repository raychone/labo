import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "../settings/settings.constants.js";
import { BILLING_AUDIT_ACTIONS, BILLING_RESOURCE_TYPES } from "./billing.constants.js";
import { toBillingDocumentDetail, toBillingClinicSnapshot } from "./billing.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

export interface BillingPrintParty {
  readonly address: string | null;
  readonly email: string | null;
  readonly legalName: string | null;
  readonly name: string;
  readonly phone: string | null;
  readonly registrationNumber: string | null;
  readonly taxId: string | null;
  readonly website?: string | null;
}

type PrintableDocumentRecord = Prisma.BillingDocumentGetPayload<{
  include: {
    clinic: true;
    lines: true;
    payments: true;
  };
}>;

const PRINT_DOCUMENT_INCLUDE = {
  clinic: true,
  lines: true,
  payments: true,
} as const satisfies Prisma.BillingDocumentInclude;

const COMPLIANCE_NOTICE = "Document intern neintegrat cu RO e-Factura.";

@Injectable()
export class BillingPrintService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  public async getDocumentPrintView(context: ActorContext, documentId: string) {
    const document = await this.findPrintableDocument(documentId);
    const supplier = await this.getSupplier();
    await this.recordPrintAudit(context, BILLING_AUDIT_ACTIONS.documentPrintViewed, document);

    return {
      ...toBillingDocumentDetail(document),
      complianceNotice: COMPLIANCE_NOTICE,
      customer: toCustomer(document),
      documentTitle: document.type === "INVOICE" ? "Factura" : "Proforma",
      generatedAt: new Date().toISOString(),
      supplier,
    };
  }

  public async getAttachmentPrintView(context: ActorContext, documentId: string) {
    const document = await this.findPrintableDocument(documentId);
    const supplier = await this.getSupplier();
    await this.recordPrintAudit(context, BILLING_AUDIT_ACTIONS.attachmentPrintViewed, document);
    const detail = toBillingDocumentDetail(document);

    return {
      complianceNotice: COMPLIANCE_NOTICE,
      currency: document.currency,
      customer: toCustomer(document),
      documentId: document.id,
      documentNumber: document.formattedNumber,
      documentTitle: document.type === "INVOICE" ? "Anexa factura" : "Anexa proforma",
      generatedAt: new Date().toISOString(),
      lines: detail.lines,
      supplier,
      totalMinor: document.totalMinor,
    };
  }

  private async findPrintableDocument(documentId: string): Promise<PrintableDocumentRecord> {
    const document = await this.prisma.billingDocument.findUnique({
      include: PRINT_DOCUMENT_INCLUDE,
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException("Billing document was not found.");
    }

    return document;
  }

  private async getSupplier(): Promise<BillingPrintParty> {
    const settings = await this.prisma.laboratorySettings.findUnique({
      where: { id: SETTINGS_SINGLETON_KEY },
    });
    const addressParts = [
      settings?.addressLine1,
      settings?.addressLine2,
      settings?.city,
      settings?.countyOrRegion,
      settings?.postalCode,
      settings?.countryCode ?? DEFAULT_LABORATORY_SETTINGS.countryCode,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return {
      address: addressParts.length > 0 ? addressParts.join(", ") : null,
      email: settings?.email ?? null,
      legalName: settings?.legalName ?? null,
      name: settings?.laboratoryName ?? DEFAULT_LABORATORY_SETTINGS.laboratoryName,
      phone: settings?.phone ?? null,
      registrationNumber: settings?.companyRegistrationNumber ?? null,
      taxId: settings?.taxId ?? null,
      website: settings?.website ?? null,
    };
  }

  private async recordPrintAudit(context: ActorContext, action: string, document: PrintableDocumentRecord): Promise<void> {
    await this.auditService.record({
      action,
      actorUserId: context.actorUserId,
      metadata: {
        clinicId: document.clinicId,
        documentId: document.id,
        documentNumber: document.formattedNumber,
        documentType: document.type,
      },
      requestMetadata: context.requestMetadata,
      resourceId: document.id,
      resourceType: BILLING_RESOURCE_TYPES.billingDocument,
    });
  }
}

function toCustomer(document: PrintableDocumentRecord): BillingPrintParty {
  const snapshot = toBillingClinicSnapshot(document);

  return {
    address: snapshot.address,
    email: snapshot.email,
    legalName: snapshot.legalName,
    name: snapshot.name,
    phone: snapshot.phone,
    registrationNumber: snapshot.registrationNumber,
    taxId: snapshot.taxId,
  };
}
