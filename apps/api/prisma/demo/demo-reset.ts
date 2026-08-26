import type { Prisma, PrismaClient } from "@prisma/client";

import { DEMO_EMAIL_DOMAIN, DEMO_ID_PREFIX, DEMO_INVOICE_SERIES, DEMO_PROFORMA_SERIES } from "./demo.constants.js";

export async function resetDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.workOrder.updateMany({
      data: { activeCycleId: null, invoicedDocumentId: null },
      where: {
        OR: [
          demoWorkOrderWhere(),
          { invoicedDocumentId: { startsWith: DEMO_ID_PREFIX } },
        ],
      },
    });

    await tx.courierRouteEvent.deleteMany({
      where: { routeId: { startsWith: `${DEMO_ID_PREFIX}route_` } },
    });
    await tx.courierRouteStop.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}route_` } },
          { routeId: { startsWith: `${DEMO_ID_PREFIX}route_` } },
          { pickupRequestId: { startsWith: `${DEMO_ID_PREFIX}pickup_` } },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });
    await tx.courierRoute.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}route_` } },
    });
    // Pickup requests are referenced with RESTRICT by route stops. Clear any
    // legacy/demo references explicitly before deleting the requests so a
    // partially seeded database can be reset safely as well.
    await tx.courierRouteStop.updateMany({
      data: { pickupRequestId: null },
      where: { pickupRequestId: { startsWith: `${DEMO_ID_PREFIX}pickup_` } },
    });
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { resourceId: { startsWith: `${DEMO_ID_PREFIX}invoice_` } },
          { action: { startsWith: "billing.document_share_" }, actorUserId: { startsWith: `${DEMO_ID_PREFIX}user_` } },
        ],
      },
    });
    // Older demo runs can have pickup IDs without the current demo prefix;
    // only remove them when their request is still explicitly demo-owned.
    await tx.courierRouteStop.deleteMany({
      where: {
        pickupRequest: {
          OR: [
            { id: { startsWith: `${DEMO_ID_PREFIX}pickup_` } },
          ],
        },
      },
    });
    await tx.pickupRequest.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}pickup_` } },
        ],
      },
    });
    await tx.technicianPerformedOperation.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}performed_` } },
          { workOrder: demoWorkOrderWhere() },
        ],
      },
    });
    await tx.technicianOperationRate.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}rate_` } },
          { technicianId: { startsWith: `${DEMO_ID_PREFIX}user_` } },
        ],
      },
    });
    await tx.technicianOperation.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}operation_` } },
    });

    await tx.pricingAgreementRule.deleteMany({
      where: {
        OR: [
          { pricingAgreementId: { startsWith: `${DEMO_ID_PREFIX}pricing_agreement_` } },
          { priceCatalogItemId: { startsWith: `${DEMO_ID_PREFIX}price_catalog_` } },
          { priceCatalogItem: { workTypeId: { startsWith: DEMO_ID_PREFIX } } },
        ],
      },
    });

    await tx.pricingAgreement.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}pricing_agreement_` } },
        ],
      },
    });

    await tx.executionTimeRule.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}execution_time_` } },
          { priceCatalogItemId: { startsWith: `${DEMO_ID_PREFIX}price_catalog_` } },
          { priceCatalogItem: { workTypeId: { startsWith: DEMO_ID_PREFIX } } },
        ],
      },
    });

    await tx.priceCatalogItem.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}price_catalog_` } },
          { workTypeId: { startsWith: DEMO_ID_PREFIX } },
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

    await tx.workAssignmentEvent.deleteMany({
      where: {
        workOrder: demoWorkOrderWhere(),
      },
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
          { id: { startsWith: `${DEMO_ID_PREFIX}real_lab_sheet_` } },
          { workTypeId: { startsWith: DEMO_ID_PREFIX } },
        ],
      },
    });

    await tx.workflowTemplate.deleteMany({
      where: {
        OR: [
          { id: { startsWith: `${DEMO_ID_PREFIX}workflow_template_` } },
          { workTypeId: { startsWith: DEMO_ID_PREFIX } },
        ],
      },
    });

    await tx.doctor.deleteMany({
      where: { id: { startsWith: `${DEMO_ID_PREFIX}doctor_` } },
    });

    await tx.workType.deleteMany({
      where: { id: { startsWith: DEMO_ID_PREFIX } },
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

    await tx.technicianPayment.deleteMany({
      where: {
        OR: [
          { technicianId: { startsWith: `${DEMO_ID_PREFIX}user_` } },
          { createdByUserId: { startsWith: `${DEMO_ID_PREFIX}user_` } },
        ],
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
      { series: { in: [DEMO_PROFORMA_SERIES, DEMO_INVOICE_SERIES] } },
    ],
  };
}

function demoWorkOrderWhere(): Prisma.WorkOrderWhereInput {
  // Never infer ownership from a shared demo clinic/doctor. Reception can
  // create real work using those records; only explicit demo work IDs belong
  // to the resettable dataset.
  return { id: { startsWith: `${DEMO_ID_PREFIX}work_` } };
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
            { workTypeId: { startsWith: DEMO_ID_PREFIX } },
          ],
        },
      },
    ],
  };
}
