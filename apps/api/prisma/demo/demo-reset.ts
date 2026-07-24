import type { PrismaClient } from "@prisma/client";

import { DEMO_EMAIL_DOMAIN, DEMO_ID_PREFIX, DEMO_INVOICE_SERIES, DEMO_PROFORMA_SERIES } from "./demo.constants.js";

export async function resetDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.workOrder.updateMany({
      data: { invoicedDocumentId: null },
      where: { id: { startsWith: `${DEMO_ID_PREFIX}work_` } },
    });

    await tx.payment.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}payment_` } },
          { billingDocumentId: { startsWith: `${DEMO_ID_PREFIX}invoice_` } },
        ],
      },
    });

    await tx.billingDocumentLine.deleteMany({
      where: { billingDocumentId: { startsWith: DEMO_ID_PREFIX } },
    });

    await tx.billingDocument.deleteMany({
      where: { id: { startsWith: DEMO_ID_PREFIX } },
    });

    await tx.workOrder.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}work_` } },
    });

    await tx.doctor.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}doctor_` } },
    });

    await tx.clinic.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
    });

    await tx.workType.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}wt_` } },
    });

    await tx.userRole.deleteMany({
      where: {
        user: {
          email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    });

    await tx.session.deleteMany({
      where: {
        user: {
          email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    });

    await tx.userPermissionOverride.deleteMany({
      where: {
        user: {
          email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` },
        },
      },
    });

    await tx.user.deleteMany({
      where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    });

    await tx.billingSeries.deleteMany({
      where: {
        prefix: { in: [DEMO_PROFORMA_SERIES, DEMO_INVOICE_SERIES] },
      },
    });

    await tx.laboratorySettings.updateMany({
      data: {
        addressLine1: null,
        addressLine2: null,
        city: null,
        companyRegistrationNumber: null,
        countryCode: "RO",
        currency: "RON",
        documentFooter: "Multumim pentru colaborare.",
        email: null,
        laboratoryName: "Dental Lab Management",
        legalName: null,
        locale: "ro-RO",
        phone: null,
        postalCode: null,
        primaryColor: "#0f766e",
        taxId: null,
        timezone: "Europe/Bucharest",
        website: null,
      },
      where: {
        key: "default",
        laboratoryName: "Laborator Dentar Demo",
      },
    });
  });
}
