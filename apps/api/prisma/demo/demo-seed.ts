import type { PrismaClient } from "@prisma/client";

import { hashPassword } from "../../src/modules/auth/password.hashing.js";
import { DEMO_INVOICE_SERIES, DEMO_PASSWORD, DEMO_PROFORMA_SERIES } from "./demo.constants.js";
import { assertDemoDatasetConsistency, buildDemoDataset, getDocumentSeries, type DemoBillingDocumentSeed, type DemoDataset, type DemoWorkSeed } from "./demo-data.js";
import { resetDemoData } from "./demo-reset.js";

export async function seedDemoData(prisma: PrismaClient, now = new Date()): Promise<DemoDataset> {
  const dataset = buildDemoDataset(now);
  assertDemoDatasetConsistency(dataset);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await resetDemoData(prisma);
  await seedDemoUsers(prisma, dataset, passwordHash);
  await seedDemoSettings(prisma);
  await seedDemoClinics(prisma, dataset);
  await seedDemoDoctors(prisma, dataset);
  await seedDemoWorkTypes(prisma, dataset);
  await seedDemoWorks(prisma, dataset);
  await seedDemoBilling(prisma, dataset);

  return dataset;
}

async function seedDemoSettings(prisma: PrismaClient): Promise<void> {
  const manager = await prisma.user.findFirst({
    select: { id: true },
    where: { email: "manager@demo.local" },
  });

  await prisma.laboratorySettings.upsert({
    create: {
      addressLine1: "Strada Demo nr. 10",
      addressLine2: "Etaj 1, spatiu demonstrativ",
      city: "Bucuresti",
      companyRegistrationNumber: "J00/0000/2026",
      countryCode: "RO",
      currency: "RON",
      documentFooter: "Document demonstrativ. Date fictive.",
      email: "contact@demo.local",
      key: "default",
      laboratoryName: "Laborator Dentar Demo",
      legalName: "Dental Lab Demo SRL",
      locale: "ro-RO",
      phone: "+40000000000",
      postalCode: "000000",
      primaryColor: "#0f766e",
      taxId: "RO12345678",
      timezone: "Europe/Bucharest",
      updatedByUserId: manager?.id ?? null,
      website: "https://demo.local",
    },
    update: {
      addressLine1: "Strada Demo nr. 10",
      addressLine2: "Etaj 1, spatiu demonstrativ",
      city: "Bucuresti",
      companyRegistrationNumber: "J00/0000/2026",
      countryCode: "RO",
      currency: "RON",
      documentFooter: "Document demonstrativ. Date fictive.",
      email: "contact@demo.local",
      laboratoryName: "Laborator Dentar Demo",
      legalName: "Dental Lab Demo SRL",
      locale: "ro-RO",
      phone: "+40000000000",
      postalCode: "000000",
      primaryColor: "#0f766e",
      taxId: "RO12345678",
      timezone: "Europe/Bucharest",
      updatedByUserId: manager?.id ?? null,
      website: "https://demo.local",
    },
    where: { key: "default" },
  });
}

async function seedDemoUsers(prisma: PrismaClient, dataset: DemoDataset, passwordHash: string): Promise<void> {
  for (const user of dataset.users) {
    await prisma.user.create({
      data: {
        displayName: user.displayName,
        email: user.email,
        id: user.id,
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
    });

    const role = await prisma.role.findUniqueOrThrow({
      where: { key: user.roleKey },
    });

    await prisma.userRole.create({
      data: {
        roleId: role.id,
        userId: user.id,
      },
    });
  }
}

async function seedDemoClinics(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const clinic of dataset.clinics) {
    await prisma.clinic.create({
      data: {
        addressLine1: `Adresa demo ${clinic.code}`,
        billingAddressLine1: `Adresa facturare demo ${clinic.code}`,
        billingCity: clinic.city,
        billingCountryCode: "RO",
        billingCountyOrRegion: clinic.countyOrRegion,
        billingName: clinic.legalName,
        billingPostalCode: "000000",
        billingRegistrationNumber: clinic.registrationNumber,
        billingTaxId: clinic.taxId,
        city: clinic.city,
        code: clinic.code,
        contactPersonEmail: `contact.${clinic.code.toLowerCase()}@demo.local`,
        contactPersonName: "Contact Demo",
        contactPersonPhone: "+40000000000",
        contactPersonRole: "Coordonator demo",
        countryCode: "RO",
        countyOrRegion: clinic.countyOrRegion,
        email: clinic.email,
        id: clinic.id,
        internalNotes: "Clinica fictiva pentru prezentare demo.",
        isActive: clinic.isActive,
        legalName: clinic.legalName,
        name: clinic.name,
        phone: "+40000000000",
        postalCode: "000000",
        registrationNumber: clinic.registrationNumber,
        taxId: clinic.taxId,
        website: "https://demo.local",
      },
    });
  }
}

async function seedDemoDoctors(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const doctor of dataset.doctors) {
    await prisma.doctor.create({
      data: {
        clinicId: doctor.clinicId,
        displayName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        email: doctor.email,
        firstName: doctor.firstName,
        id: doctor.id,
        internalNotes: "Medic fictiv pentru demo.",
        isActive: doctor.isActive,
        lastName: doctor.lastName,
        phone: doctor.phone,
        professionalCode: doctor.professionalCode,
      },
    });
  }
}

async function seedDemoWorkTypes(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const workType of dataset.workTypes) {
    await prisma.workType.create({
      data: {
        archivedAt: workType.isActive ? null : new Date(),
        basePriceMinor: workType.basePriceMinor,
        code: workType.code,
        description: workType.description,
        id: workType.id,
        isActive: workType.isActive,
        name: workType.name,
        unit: "UNIT",
      },
    });
  }
}

async function seedDemoWorks(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const work of dataset.works) {
    await prisma.workOrder.create({
      data: {
        baseUnitPriceMinor: work.baseUnitPriceMinor,
        clinicalNotes: work.clinicalNotes,
        clinicId: work.clinicId,
        code: work.code,
        createdAt: work.createdAt,
        currency: "RON",
        doctorId: work.doctorId,
        externalReference: work.externalReference,
        id: work.id,
        internalNotes: "Lucrare fictiva pentru dataset demo.",
        patientName: work.patientName,
        patientReference: work.patientReference,
        priority: work.priority,
        qrCreatedAt: work.createdAt,
        qrToken: work.qrToken,
        quantity: work.quantity,
        requestedDeliveryDate: work.requestedDeliveryDate,
        status: "REGISTERED",
        totalPriceMinor: work.totalPriceMinor,
        workTypeId: work.workTypeId,
      },
    });
  }
}

async function seedDemoBilling(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  await seedDemoSeries(prisma, dataset.year);

  for (const document of dataset.billingDocuments) {
    await createBillingDocument(prisma, dataset, document);
  }

  for (const payment of dataset.payments) {
    const document = await prisma.billingDocument.findUniqueOrThrow({
      where: { id: payment.billingDocumentId },
    });

    await prisma.payment.create({
      data: {
        amountMinor: payment.amountMinor,
        billingDocumentId: payment.billingDocumentId,
        clinicId: document.clinicId,
        currency: document.currency,
        id: payment.id,
        method: payment.method,
        paymentDate: payment.paymentDate,
        receiptDate: payment.receiptDate,
        receiptNumber: payment.receiptNumber,
        reference: payment.reference,
        notes: "Incasare manuala fictiva pentru demo.",
      },
    });
  }

  for (const document of dataset.billingDocuments.filter((item) => item.type === "INVOICE" && item.status !== "CANCELLED")) {
    await prisma.workOrder.updateMany({
      data: { invoicedDocumentId: document.id },
      where: { id: { in: [...document.workIds] } },
    });
  }
}

async function seedDemoSeries(prisma: PrismaClient, year: number): Promise<void> {
  for (const series of [
    { documentType: "PROFORMA" as const, prefix: DEMO_PROFORMA_SERIES },
    { documentType: "INVOICE" as const, prefix: DEMO_INVOICE_SERIES },
  ]) {
    await prisma.billingSeries.create({
      data: {
        currentNumber: series.documentType === "PROFORMA" ? 2 : 8,
        documentType: series.documentType,
        isActive: true,
        prefix: series.prefix,
        year,
      },
    });
  }
}

async function createBillingDocument(prisma: PrismaClient, dataset: DemoDataset, documentSeed: DemoBillingDocumentSeed): Promise<void> {
  const documentWorks = documentSeed.workIds.map((workId) => findWork(dataset, workId));
  const firstWork = documentWorks[0];
  if (!firstWork) {
    throw new Error(`Document ${documentSeed.id} must contain at least one work.`);
  }
  const clinic = dataset.clinics.find((item) => item.id === firstWork.clinicId);
  const doctorIds = new Set(documentWorks.map((work) => work.doctorId));
  const subtotalMinor = documentWorks.reduce((sum, work) => sum + work.totalPriceMinor, 0);

  if (!clinic) {
    throw new Error(`Clinic ${firstWork.clinicId} was not found.`);
  }

  await prisma.billingDocument.create({
    data: {
      clinicAddressSnapshot: `${clinic.city}, adresa demo ${clinic.code}`,
      clinicEmailSnapshot: clinic.email,
      clinicId: clinic.id,
      clinicLegalNameSnapshot: clinic.legalName,
      clinicNameSnapshot: clinic.name,
      clinicPhoneSnapshot: "+40000000000",
      clinicRegistrationNumberSnapshot: clinic.registrationNumber,
      clinicTaxIdSnapshot: clinic.taxId,
      currency: "RON",
      discountMinor: 0,
      doctorId: doctorIds.size === 1 ? firstWork.doctorId : null,
      dueDate: documentSeed.dueDate,
      formattedNumber: documentSeed.formattedNumber,
      id: documentSeed.id,
      issueDate: documentSeed.issueDate,
      issuedAt: documentSeed.status === "DRAFT" ? null : documentSeed.issueDate,
      notes: documentSeed.notes,
      number: documentSeed.number,
      series: getDocumentSeries(documentSeed),
      status: documentSeed.status,
      subtotalMinor,
      taxMinor: 0,
      totalMinor: subtotalMinor,
      type: documentSeed.type,
      lines: {
        create: documentWorks.map((work, index) => toLineCreateInput(dataset, work, index)),
      },
      ...(documentSeed.status === "CANCELLED" ? { cancelledAt: documentSeed.issueDate } : {}),
    },
  });
}

function toLineCreateInput(dataset: DemoDataset, work: DemoWorkSeed, index: number) {
  const doctor = dataset.doctors.find((item) => item.id === work.doctorId);
  const workType = dataset.workTypes.find((item) => item.id === work.workTypeId);

  if (!doctor || !workType) {
    throw new Error(`Billing line references missing demo data for ${work.id}.`);
  }

  return {
    description: `${workType.name} - ${work.patientName}`,
    doctorNameSnapshot: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    lineTotalMinor: work.totalPriceMinor,
    patientNameSnapshot: work.patientName,
    quantity: work.quantity,
    sortOrder: index + 1,
    toothPositionSnapshot: work.patientReference,
    unitPriceMinor: work.baseUnitPriceMinor,
    workCode: work.code,
    workCreatedAtSnapshot: work.createdAt,
    workOrderId: work.id,
    workTypeNameSnapshot: workType.name,
  };
}

function findWork(dataset: DemoDataset, workId: string): DemoWorkSeed {
  const work = dataset.works.find((item) => item.id === workId);
  if (!work) {
    throw new Error(`Work ${workId} was not found.`);
  }

  return work;
}
