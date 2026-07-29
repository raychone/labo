import type { Prisma, PrismaClient } from "@prisma/client";

import { DEMO_EMAIL_DOMAIN, DEMO_ID_PREFIX, DEMO_INVOICE_SERIES, DEMO_PROFORMA_SERIES } from "./demo.constants.js";

export async function resetDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.workOrder.updateMany({
      data: { invoicedDocumentId: null },
      where: {
        OR: [
          demoWorkOrderWhere(),
          { invoicedDocumentId: { startsWith: DEMO_ID_PREFIX } },
        ],
      },
    });

    await tx.pricingAgreementRule.deleteMany({
      where: {
        OR: [
          { pricingAgreementId: { startsWith: `${DEMO_ID_PREFIX}pricing_agreement_` } },
          { priceCatalogItemId: { startsWith: `${DEMO_ID_PREFIX}price_catalog_` } },
          { priceCatalogItem: { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } } },
        ],
      },
    });

    await tx.pricingAgreement.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}pricing_agreement_` } },
          { clinicId: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
          { doctorId: { startsWith: `${DEMO_ID_PREFIX}doctor_` } },
        ],
      },
    });

    await tx.executionTimeRule.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}execution_time_` } },
          { priceCatalogItemId: { startsWith: `${DEMO_ID_PREFIX}price_catalog_` } },
          { priceCatalogItem: { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } } },
        ],
      },
    });

    await tx.priceCatalogItem.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}price_catalog_` } },
          { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } },
        ],
      },
    });

    await tx.deliveryEvent.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}delivery_event_` } },
          { delivery: { id: { startsWith: `${DEMO_ID_PREFIX}delivery_` } } },
        ],
      },
    });

    await tx.delivery.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}delivery_` } },
          { clinicId: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
        ],
      },
    });

    await tx.deliveryPreparationItem.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}delivery_item_` } },
          { groupId: { startsWith: `${DEMO_ID_PREFIX}delivery_group_` } },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });

    await tx.deliveryPreparationGroup.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}delivery_group_` } },
          { clinicId: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
        ],
      },
    });

    await tx.logisticsEvent.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}logistics_event_` } },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });

    await tx.workLogisticsState.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}logistics_state_` } },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });

    await tx.payment.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}payment_` } },
          { clinicId: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
          { billingDocumentId: { startsWith: `${DEMO_ID_PREFIX}invoice_` } },
          { billingDocumentId: { startsWith: `${DEMO_ID_PREFIX}proforma_` } },
          { billingDocument: demoBillingDocumentWhere() },
        ],
      },
    });

    await tx.billingDocumentLine.deleteMany({
      where: {
        OR: [
          { billingDocumentId: { startsWith: DEMO_ID_PREFIX } },
          { billingDocument: demoBillingDocumentWhere() },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });

    await tx.billingDocument.deleteMany({
      where: demoBillingDocumentWhere(),
    });

    await tx.workFormSubmission.deleteMany({
      where: {
        OR: [
          { templateId: { startsWith: `${DEMO_ID_PREFIX}form_template_` } },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });

    await tx.workStageEvent.deleteMany({
      where: {
        workflowExecution: demoWorkflowExecutionWhere(),
      },
    });

    await tx.workStageExecution.deleteMany({
      where: {
        workflowExecution: demoWorkflowExecutionWhere(),
      },
    });

    await tx.workWorkflowExecution.deleteMany({
      where: demoWorkflowExecutionWhere(),
    });

    await tx.workOrder.deleteMany({
      where: demoWorkOrderWhere(),
    });

    await tx.patient.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}patient_` } },
          {
            id: { startsWith: "pat_backfill_" },
            workOrders: { none: {} },
          },
        ],
      },
    });

    await tx.workFormTemplate.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}form_template_` } },
          { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } },
        ],
      },
    });

    await tx.workflowTemplate.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}workflow_template_` } },
          { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } },
        ],
      },
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

function demoBillingDocumentWhere(): Prisma.BillingDocumentWhereInput {
  return {
    OR: [
      { id: { startsWith: DEMO_ID_PREFIX } },
      { clinicId: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
      { doctorId: { startsWith: `${DEMO_ID_PREFIX}doctor_` } },
      { series: { in: [DEMO_PROFORMA_SERIES, DEMO_INVOICE_SERIES] } },
    ],
  };
}

function demoWorkOrderWhere(): Prisma.WorkOrderWhereInput {
  return {
    OR: [
      { id: { startsWith: `${DEMO_ID_PREFIX}work_` } },
      { clinicId: { startsWith: `${DEMO_ID_PREFIX}clinic_` } },
      { doctorId: { startsWith: `${DEMO_ID_PREFIX}doctor_` } },
      { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } },
    ],
  };
}

function demoWorkflowExecutionWhere(): Prisma.WorkWorkflowExecutionWhereInput {
  return {
    OR: [
      { id: { startsWith: `${DEMO_ID_PREFIX}workflow_execution_` } },
      { workOrder: demoWorkOrderWhere() },
      {
        workflowTemplate: {
          OR: [
            { id: { startsWith: `${DEMO_ID_PREFIX}workflow_template_` } },
            { workTypeId: { startsWith: `${DEMO_ID_PREFIX}wt_` } },
          ],
        },
      },
    ],
  };
}
