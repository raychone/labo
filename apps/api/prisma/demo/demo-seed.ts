import {
  DeliveryEventType,
  DeliveryFailureReasonCode,
  DeliveryPreparationGroupStatus,
  DeliveryStatus,
  LogisticsBlockReasonCode,
  LogisticsLocationCode,
  WorkLogisticsStatus,
  type PricingAgreementSubjectType,
  type PricingRuleScope,
  type WorkTypeUnit,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { Prisma, type WorkFormFieldType } from "@prisma/client";
import { createHash } from "node:crypto";

import { hashPassword } from "../../src/modules/auth/password.hashing.js";
import { REAL_PRICING_CATALOG, REAL_PRICING_SOURCE_SUMMARY, type RealPricingCatalogEntry } from "../catalog/real-pricing-catalog.js";
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
  await seedDemoPricing(prisma);
  await seedDemoWorkFormTemplates(prisma);
  await seedDemoWorkflowTemplates(prisma);
  await seedDemoPatients(prisma, dataset);
  await seedDemoWorks(prisma, dataset);
  await seedDemoWorkflowExecutions(prisma, dataset);
  await seedDemoBilling(prisma, dataset);
  await seedDemoLogistics(prisma);

  return dataset;
}

export function getDemoWorkflowTemplateCount(): number {
  return demoWorkflowTemplates.length;
}

interface DemoFormField {
  readonly key: string;
  readonly label: string;
  readonly helpText: string | null;
  readonly type: WorkFormFieldType;
  readonly required: boolean;
  readonly sortOrder: number;
  readonly placeholder: string | null;
  readonly defaultValue: Prisma.InputJsonValue | null;
  readonly options: readonly { readonly label: string; readonly value: string }[];
  readonly validation: Prisma.InputJsonObject;
}

interface DemoFormTemplate {
  readonly fields: readonly DemoFormField[];
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly workTypeId: string;
}

const shadeOptions = [
  { label: "A1", value: "A1" },
  { label: "A2", value: "A2" },
  { label: "A3", value: "A3" },
  { label: "B1", value: "B1" },
] as const;

const demoFormTemplates: readonly DemoFormTemplate[] = [
  {
    fields: [
      field("teeth", "Dinți", "Selectează codurile FDI relevante.", "TOOTH", true, 1),
      field("shade", "Nuanță", null, "SHADE", true, 2, null, null, shadeOptions),
      field("zirconia_type", "Tip zirconiu", null, "SELECT", false, 3, null, null, [
        { label: "Monolitic", value: "monolitic" },
        { label: "Multilayer", value: "multilayer" },
        { label: "Cut-back", value: "cut_back" },
      ]),
      field("try_in_required", "Probă solicitată", null, "CHECKBOX", false, 4),
      field("clinical_notes", "Observații specifice", "Text simplu, fără date medicale sensibile.", "TEXTAREA", false, 5, "Observații pentru laborator", null, [], { maxLength: 5000 }),
    ],
    id: "demo_form_template_zirconiu_v1",
    name: "Formular coroană zirconiu",
    version: 1,
    workTypeId: "demo_wt_zirconiu",
  },
  {
    fields: [
      field("arch", "Arcadă", null, "SELECT", true, 1, null, null, [
        { label: "Maxilar", value: "maxilar" },
        { label: "Mandibulă", value: "mandibula" },
        { label: "Ambele arcade", value: "ambele" },
      ]),
      field("teeth_shade", "Nuanță dinți", null, "SHADE", false, 2, null, null, shadeOptions),
      field("wax_try_in", "Probă machetă ceară", null, "CHECKBOX", false, 3),
      field("occlusion_notes", "Observații ocluzie", null, "TEXTAREA", false, 4, "Observații de ocluzie", null, [], { maxLength: 5000 }),
    ],
    id: "demo_form_template_proteza_totala_v1",
    name: "Formular proteză totală",
    version: 1,
    workTypeId: "demo_wt_proteza_totala",
  },
  {
    fields: [
      field("implant_system", "Sistem implant", null, "SELECT", true, 1, null, null, [
        { label: "Straumann", value: "straumann" },
        { label: "Nobel Biocare", value: "nobel" },
        { label: "MegaGen", value: "megagen" },
      ]),
      field("platform", "Platformă", null, "TEXT", true, 2, "Ex. NC, RC, WP"),
      field("diameter", "Diametru", null, "NUMBER", false, 3, null, null, [], { min: 2, max: 8, step: 0.1 }),
      field("restoration_type", "Tip restaurare", null, "RADIO", false, 4, null, null, [
        { label: "Cimentată", value: "cimentata" },
        { label: "Înșurubată", value: "insurubata" },
      ]),
      field("shade", "Nuanță", null, "SHADE", false, 5, null, null, shadeOptions),
    ],
    id: "demo_form_template_bont_v1",
    name: "Formular bont implant",
    version: 1,
    workTypeId: "demo_wt_bont",
  },
];

interface DemoWorkflowStageSeed {
  readonly key: string;
  readonly name: string;
  readonly estimatedDurationMinutes: number;
  readonly allowedRoleCodes: readonly string[];
}

interface DemoWorkflowTemplateSeed {
  readonly id: string;
  readonly name: string;
  readonly workTypeId: string;
  readonly stages: readonly DemoWorkflowStageSeed[];
}

interface DemoClaimPricingCatalogItem {
  readonly category: string;
  readonly displayName: string;
  readonly executionDays: number;
  readonly key: string;
  readonly priceMinor: number;
  readonly unit: WorkTypeUnit;
  readonly workTypeId: string;
}

const demoClaimPricingCatalog: readonly DemoClaimPricingCatalogItem[] = [
  {
    category: "Zirconiu",
    displayName: "Coroană zirconiu demo",
    executionDays: 4,
    key: "claim-zirconiu",
    priceMinor: 24_000,
    unit: "UNIT",
    workTypeId: "demo_wt_zirconiu",
  },
  {
    category: "Protetica mobilă",
    displayName: "Proteză totală demo",
    executionDays: 6,
    key: "claim-proteza-totala",
    priceMinor: 120_000,
    unit: "UNIT",
    workTypeId: "demo_wt_proteza_totala",
  },
  {
    category: "Implanturi",
    displayName: "Bont implant demo",
    executionDays: 3,
    key: "claim-bont-implant",
    priceMinor: 35_000,
    unit: "UNIT",
    workTypeId: "demo_wt_bont",
  },
];

const demoWorkflowTemplates: readonly DemoWorkflowTemplateSeed[] = [
  {
    id: "demo_workflow_template_zirconiu_v1",
    name: "Flux coroană zirconiu",
    stages: [
      receptionStage(),
      technicianStage("model", "Model", 120),
      technicianStage("scanare", "Scanare", 45),
      technicianStage("cad", "CAD", 180),
      technicianStage("frezare", "Frezare", 120),
      technicianStage("sinterizare", "Sinterizare", 480),
      technicianStage("ceramica", "Ceramică", 240),
      technicianStage("finisare", "Finisare", 120),
      deliveryPrepStage(),
    ],
    workTypeId: "demo_wt_zirconiu",
  },
  {
    id: "demo_workflow_template_proteza_totala_v1",
    name: "Flux proteză totală",
    stages: [
      receptionStage(),
      technicianStage("model", "Model", 120),
      technicianStage("lingura_individuala", "Lingură individuală", 180),
      technicianStage("sablon_ocluzie", "Șablon ocluzie", 180),
      technicianStage("montare_dinti", "Montare dinți", 240),
      technicianStage("proba_ceara", "Probă ceară", 120),
      technicianStage("acrilare", "Acrilare", 360),
      technicianStage("finisare", "Finisare", 120),
      deliveryPrepStage(),
    ],
    workTypeId: "demo_wt_proteza_totala",
  },
  {
    id: "demo_workflow_template_bont_v1",
    name: "Flux bont implant",
    stages: [
      receptionStage(),
      technicianStage("verificare_componente", "Verificare componente", 45),
      technicianStage("cad", "CAD", 120),
      technicianStage("frezare", "Frezare", 120),
      technicianStage("finisare", "Finisare", 90),
      deliveryPrepStage(),
    ],
    workTypeId: "demo_wt_bont",
  },
];

async function seedDemoWorkFormTemplates(prisma: PrismaClient): Promise<void> {
  for (const template of demoFormTemplates) {
    await prisma.workFormTemplate.create({
      data: {
        activatedAt: new Date("2026-07-01T09:00:00.000Z"),
        id: template.id,
        name: template.name,
        status: "ACTIVE",
        version: template.version,
        workTypeId: template.workTypeId,
        fields: {
          create: template.fields.map(toDemoFieldCreateInput),
        },
      },
    });
  }
}

async function seedDemoWorkflowTemplates(prisma: PrismaClient): Promise<void> {
  for (const template of demoWorkflowTemplates) {
    await prisma.workflowTemplate.create({
      data: {
        activatedAt: new Date("2026-07-01T10:00:00.000Z"),
        id: template.id,
        name: template.name,
        status: "ACTIVE",
        version: 1,
        workTypeId: template.workTypeId,
        stages: {
          create: template.stages.map((stage, index) => ({
            allowedRoleCodes: [...stage.allowedRoleCodes],
            description: `Etapă demo pentru ${stage.name}.`,
            estimatedDurationMinutes: stage.estimatedDurationMinutes,
            isFinal: index === template.stages.length - 1,
            isInitial: index === 0,
            key: stage.key,
            name: stage.name,
            sortOrder: index + 1,
          })),
        },
      },
    });
  }
}

function receptionStage(): DemoWorkflowStageSeed {
  return {
    allowedRoleCodes: ["RECEPTIE", "MANAGER"],
    estimatedDurationMinutes: 30,
    key: "receptie",
    name: "Recepție",
  };
}

function technicianStage(key: string, name: string, estimatedDurationMinutes: number): DemoWorkflowStageSeed {
  return {
    allowedRoleCodes: ["TEHNICIAN", "MANAGER"],
    estimatedDurationMinutes,
    key,
    name,
  };
}

function deliveryPrepStage(): DemoWorkflowStageSeed {
  return {
    allowedRoleCodes: ["LOGISTICA", "MANAGER"],
    estimatedDurationMinutes: 30,
    key: "pregatire_livrare",
    name: "Pregătire livrare",
  };
}

function toDemoFieldCreateInput(item: DemoFormField): Prisma.WorkFormFieldDefinitionCreateWithoutTemplateInput {
  const data: Prisma.WorkFormFieldDefinitionCreateWithoutTemplateInput = {
    helpText: item.helpText,
    key: item.key,
    label: item.label,
    placeholder: item.placeholder,
    required: item.required,
    sortOrder: item.sortOrder,
    type: item.type,
  };

  if (item.defaultValue !== null) {
    data.defaultValue = item.defaultValue;
  }

  if (item.options.length > 0) {
    data.options = [...item.options];
  }

  if (Object.keys(item.validation).length > 0) {
    data.validation = item.validation;
  }

  return data;
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

  for (const settings of [
    {
      addressLine1: "Strada Nicolaie Cristina Demo nr. 12",
      bankName: "Banca Demo NC",
      city: "Bucuresti",
      companyRegistrationNumber: "J40/900001/2026",
      documentFooter: "Document demonstrativ NC. Date fictive.",
      email: "contact.nc@demo.local",
      iban: "RO49AAAA1B31007593840000",
      legalName: "NC Demo Tehnică Dentară",
      postalCode: "010901",
      taxId: "RO90000001",
      code: "NC",
    },
    {
      addressLine1: "Strada Nicolaie Gabriel Demo nr. 18",
      bankName: "Banca Demo NG",
      city: "Bucuresti",
      companyRegistrationNumber: "J40/900002/2026",
      documentFooter: "Document demonstrativ NG. Date fictive.",
      email: "contact.ng@demo.local",
      iban: "RO98BBBB1B31007593840000",
      legalName: "NG Demo Tehnică Dentară",
      postalCode: "010902",
      taxId: "RO90000002",
      code: "NG",
    },
  ] as const) {
    const legalEntity = await prisma.legalEntity.findUniqueOrThrow({
      where: { code: settings.code },
    });

    await prisma.legalEntitySettings.upsert({
      create: {
        addressLine1: settings.addressLine1,
        bankName: settings.bankName,
        city: settings.city,
        companyRegistrationNumber: settings.companyRegistrationNumber,
        countryCode: "RO",
        currency: "RON",
        documentFooter: settings.documentFooter,
        email: settings.email,
        iban: settings.iban,
        legalEntityId: legalEntity.id,
        legalName: settings.legalName,
        locale: "ro-RO",
        postalCode: settings.postalCode,
        primaryColor: "#0f766e",
        taxId: settings.taxId,
        timezone: "Europe/Bucharest",
        updatedByUserId: manager?.id ?? null,
        website: "https://demo.local",
      },
      update: {
        addressLine1: settings.addressLine1,
        bankName: settings.bankName,
        city: settings.city,
        companyRegistrationNumber: settings.companyRegistrationNumber,
        countryCode: "RO",
        currency: "RON",
        documentFooter: settings.documentFooter,
        email: settings.email,
        iban: settings.iban,
        legalName: settings.legalName,
        locale: "ro-RO",
        postalCode: settings.postalCode,
        primaryColor: "#0f766e",
        taxId: settings.taxId,
        timezone: "Europe/Bucharest",
        updatedByUserId: manager?.id ?? null,
        website: "https://demo.local",
      },
      where: { legalEntityId: legalEntity.id },
    });
  }
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

async function seedDemoPricing(prisma: PrismaClient): Promise<void> {
  for (const item of REAL_PRICING_CATALOG) {
    await prisma.workType.create({
      data: {
        archivedAt: null,
        basePriceMinor: item.priceMinor,
        code: item.workTypeCode,
        description: toDemoPricingDescription(item),
        id: toDemoPricingWorkTypeId(item.key),
        isActive: true,
        name: item.displayName,
        unit: item.unit,
      },
    });
  }

  const manager = await prisma.user.findUniqueOrThrow({
    select: { id: true },
    where: { id: "demo_user_manager" },
  });
  const legalEntities = await prisma.legalEntity.findMany({
    select: { code: true, id: true },
    where: { code: { in: ["NC", "NG"] } },
  });

  for (const legalEntity of legalEntities) {
    for (const [index, item] of REAL_PRICING_CATALOG.entries()) {
      const priceCatalogItemId = toDemoPriceCatalogItemId(legalEntity.code, item.key);

      await prisma.priceCatalogItem.create({
        data: {
          category: item.category,
          createdByUserId: manager.id,
          displayName: item.displayName,
          id: priceCatalogItemId,
          isActive: true,
          legalEntityId: legalEntity.id,
          notes: toDemoPricingDescription(item),
          sortOrder: index + 1,
          standardPriceMinor: item.priceMinor,
          unit: item.unit,
          updatedByUserId: manager.id,
          workTypeId: toDemoPricingWorkTypeId(item.key),
        },
      });

      await seedDemoExecutionTimeRules(prisma, legalEntity.code, item, priceCatalogItemId, manager.id);
    }

    for (const [index, item] of demoClaimPricingCatalog.entries()) {
      const priceCatalogItemId = toDemoClaimPriceCatalogItemId(legalEntity.code, item.key);

      await prisma.priceCatalogItem.create({
        data: {
          category: item.category,
          createdByUserId: manager.id,
          displayName: item.displayName,
          id: priceCatalogItemId,
          isActive: true,
          legalEntityId: legalEntity.id,
          notes: "Preț demo determinist pentru lucrări istorice revendicabile.",
          sortOrder: REAL_PRICING_CATALOG.length + index + 1,
          standardPriceMinor: item.priceMinor,
          unit: item.unit,
          updatedByUserId: manager.id,
          workTypeId: item.workTypeId,
        },
      });

      await prisma.executionTimeRule.create({
        data: {
          createdByUserId: manager.id,
          executionDays: item.executionDays,
          id: `demo_execution_time_claim_${legalEntity.code.toLowerCase()}_${item.key}`,
          isActive: true,
          maxQuantity: null,
          minQuantity: 1,
          priceCatalogItemId,
          priority: 1,
          requiresManualDueDate: false,
          updatedByUserId: manager.id,
        },
      });
    }
  }

  await seedDemoPricingAgreements(prisma, manager.id);
}

async function seedDemoExecutionTimeRules(
  prisma: PrismaClient,
  legalEntityCode: string,
  item: RealPricingCatalogEntry,
  priceCatalogItemId: string,
  managerUserId: string,
): Promise<void> {
  const rules = getDemoExecutionRules(item.executionGroup);

  for (const [index, rule] of rules.entries()) {
    await prisma.executionTimeRule.create({
      data: {
        createdByUserId: managerUserId,
        executionDays: rule.executionDays,
        id: `demo_execution_time_${legalEntityCode.toLowerCase()}_${item.key}_${index + 1}`,
        isActive: true,
        maxQuantity: rule.maxQuantity,
        minQuantity: rule.minQuantity,
        priceCatalogItemId,
        priority: index + 1,
        requiresManualDueDate: rule.requiresManualDueDate,
        updatedByUserId: managerUserId,
      },
    });
  }
}

async function seedDemoPricingAgreements(prisma: PrismaClient, managerUserId: string): Promise<void> {
  const nc = await prisma.legalEntity.findUniqueOrThrow({ select: { id: true }, where: { code: "NC" } });
  const ng = await prisma.legalEntity.findUniqueOrThrow({ select: { id: true }, where: { code: "NG" } });

  await createDemoPricingAgreement(prisma, {
    id: "demo_pricing_agreement_nc_clinic_aurora",
    legalEntityId: nc.id,
    managerUserId,
    name: "Aurora Demo - discount clinică 10%",
    rules: [
      {
        adjustmentPercentageBasisPoints: 1_000,
        adjustmentType: "PERCENTAGE",
        scope: "ALL",
      },
    ],
    subjectId: "demo_clinic_aurora",
    subjectType: "CLINIC",
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
  });

  await createDemoPricingAgreement(prisma, {
    id: "demo_pricing_agreement_nc_clinic_smile",
    legalEntityId: nc.id,
    managerUserId,
    name: "Smile Avenue Demo - zirconiu +50 RON",
    rules: [
      {
        adjustmentValueMinor: 5_000,
        adjustmentType: "FIXED_AMOUNT",
        category: "Zirconiu",
        scope: "CATEGORY",
      },
    ],
    subjectId: "demo_clinic_smile",
    subjectType: "CLINIC",
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
  });

  await createDemoPricingAgreement(prisma, {
    id: "demo_pricing_agreement_ng_clinic_future",
    legalEntityId: ng.id,
    managerUserId,
    name: "Dental Point Demo - discount viitor",
    rules: [
      {
        adjustmentPercentageBasisPoints: 500,
        adjustmentType: "PERCENTAGE",
        scope: "ALL",
      },
    ],
    subjectId: "demo_clinic_point",
    subjectType: "CLINIC",
    validFrom: new Date("2027-01-01T00:00:00.000Z"),
  });

  await createDemoPricingAgreement(prisma, {
    id: "demo_pricing_agreement_nc_doctor_ana",
    legalEntityId: nc.id,
    managerUserId,
    name: "Dr. Ana Popescu - preț fix zirconiu multistrat",
    rules: [
      {
        adjustmentType: "OVERRIDE_PRICE",
        overridePriceMinor: 28_000,
        priceCatalogItemId: toDemoPriceCatalogItemId("NC", "cor-zirconia-multistrat"),
        scope: "ITEM",
      },
    ],
    subjectId: "demo_doctor_aurora_ana",
    subjectType: "DOCTOR",
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
  });

  await createDemoPricingAgreement(prisma, {
    id: "demo_pricing_agreement_nc_doctor_mihai",
    legalEntityId: nc.id,
    managerUserId,
    name: "Dr. Mihai Ionescu - +30 RON",
    rules: [
      {
        adjustmentValueMinor: 3_000,
        adjustmentType: "FIXED_AMOUNT",
        scope: "ALL",
      },
    ],
    subjectId: "demo_doctor_aurora_mihai",
    subjectType: "DOCTOR",
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
  });

  await createDemoPricingAgreement(prisma, {
    archivedAt: new Date("2026-07-20T00:00:00.000Z"),
    archivedByUserId: managerUserId,
    id: "demo_pricing_agreement_ng_doctor_archived",
    isActive: false,
    legalEntityId: ng.id,
    managerUserId,
    name: "Dr. Sorin Matei - acord arhivat implanturi",
    rules: [
      {
        adjustmentPercentageBasisPoints: 750,
        adjustmentType: "PERCENTAGE",
        category: "Implanturi",
        scope: "CATEGORY",
      },
    ],
    subjectId: "demo_doctor_point_sorin",
    subjectType: "DOCTOR",
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
  });
}

interface DemoExecutionRuleSeed {
  readonly executionDays: number | null;
  readonly maxQuantity: number | null;
  readonly minQuantity: number;
  readonly requiresManualDueDate: boolean;
}

interface DemoPricingAgreementRuleSeed {
  readonly adjustmentPercentageBasisPoints?: number;
  readonly adjustmentValueMinor?: number;
  readonly adjustmentType: "FIXED_AMOUNT" | "OVERRIDE_PRICE" | "PERCENTAGE";
  readonly category?: string;
  readonly overridePriceMinor?: number;
  readonly priceCatalogItemId?: string;
  readonly scope: PricingRuleScope;
}

interface DemoPricingAgreementSeed {
  readonly archivedAt?: Date;
  readonly archivedByUserId?: string;
  readonly id: string;
  readonly isActive?: boolean;
  readonly legalEntityId: string;
  readonly managerUserId: string;
  readonly name: string;
  readonly rules: readonly DemoPricingAgreementRuleSeed[];
  readonly subjectId: string;
  readonly subjectType: PricingAgreementSubjectType;
  readonly validFrom: Date;
  readonly validUntil?: Date;
}

async function createDemoPricingAgreement(prisma: PrismaClient, seed: DemoPricingAgreementSeed): Promise<void> {
  await prisma.pricingAgreement.create({
    data: {
      archivedAt: seed.archivedAt ?? null,
      archivedByUserId: seed.archivedByUserId ?? null,
      clinicId: seed.subjectType === "CLINIC" ? seed.subjectId : null,
      createdByUserId: seed.managerUserId,
      doctorId: seed.subjectType === "DOCTOR" ? seed.subjectId : null,
      id: seed.id,
      isActive: seed.isActive ?? true,
      legalEntityId: seed.legalEntityId,
      name: seed.name,
      notes: "Acord comercial fictiv pentru demonstrație.",
      rules: {
        create: seed.rules.map((rule, index) => toDemoPricingAgreementRuleCreateInput(seed.id, rule, index)),
      },
      subjectType: seed.subjectType,
      updatedByUserId: seed.managerUserId,
      validFrom: seed.validFrom,
      validUntil: seed.validUntil ?? null,
    },
  });
}

function toDemoPricingAgreementRuleCreateInput(
  agreementId: string,
  rule: DemoPricingAgreementRuleSeed,
  index: number,
): Prisma.PricingAgreementRuleCreateWithoutPricingAgreementInput {
  return {
    adjustmentPercentageBasisPoints: rule.adjustmentPercentageBasisPoints ?? null,
    adjustmentValueMinor: rule.adjustmentValueMinor ?? null,
    adjustmentType: rule.adjustmentType,
    category: rule.category ?? null,
    id: `${agreementId}_rule_${index + 1}`,
    overridePriceMinor: rule.overridePriceMinor ?? null,
    ...(rule.priceCatalogItemId
      ? {
          priceCatalogItem: {
            connect: { id: rule.priceCatalogItemId },
          },
        }
      : {}),
    scope: rule.scope,
  };
}

function getDemoExecutionRules(group: RealPricingCatalogEntry["executionGroup"]): readonly DemoExecutionRuleSeed[] {
  if (group === "PROVISIONAL_REPAIR") {
    return [executionRule(1, null, 3)];
  }

  if (group === "MOBILE_PROSTHESIS") {
    return [executionRule(1, null, 5)];
  }

  return [
    executionRule(1, 3, 3),
    executionRule(4, 7, 4),
    executionRule(8, 12, 5),
    { executionDays: null, maxQuantity: null, minQuantity: 13, requiresManualDueDate: true },
  ];
}

function executionRule(minQuantity: number, maxQuantity: number | null, executionDays: number): DemoExecutionRuleSeed {
  return {
    executionDays,
    maxQuantity,
    minQuantity,
    requiresManualDueDate: false,
  };
}

function toDemoPricingWorkTypeId(key: string): string {
  return `demo_wt_pricing_${key}`;
}

function toDemoPriceCatalogItemId(legalEntityCode: string, key: string): string {
  return `demo_price_catalog_${legalEntityCode.toLowerCase()}_${key}`;
}

function toDemoClaimPriceCatalogItemId(legalEntityCode: string, key: string): string {
  return `demo_price_catalog_claim_${legalEntityCode.toLowerCase()}_${key}`;
}

function toDemoPricingDescription(item: RealPricingCatalogEntry): string {
  const validationNote = item.requiresClientValidation ? " Necesită validare client pentru valoarea finală." : "";
  const sourceNote = item.sourceNote ? ` ${item.sourceNote}` : "";

  return `${REAL_PRICING_SOURCE_SUMMARY}${sourceNote}${validationNote}`;
}

async function seedDemoPatients(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const patientName of [...new Set(dataset.works.map((work) => work.patientName))].sort()) {
    const parsed = parseDemoPatientName(patientName);
    await prisma.patient.create({
      data: {
        firstName: parsed.firstName,
        id: toDemoPatientId(patientName),
        lastName: parsed.lastName,
        normalizedFirstName: normalizeDemoPatientName(parsed.firstName),
        normalizedLastName: normalizeDemoPatientName(parsed.lastName),
        notes: "Pacient fictiv pentru demonstrație.",
        sex: "UNSPECIFIED",
      },
    });
  }
}

async function seedDemoWorks(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const [index, work] of dataset.works.entries()) {
    const submission = toDemoWorkFormSubmission(work);
    const deadline = toDemoDeadlineSnapshot(work, index);
    await prisma.workOrder.create({
      data: {
        baseUnitPriceMinor: work.baseUnitPriceMinor,
        clinicalNotes: work.clinicalNotes,
        clinicId: work.clinicId,
        code: work.code,
        createdAt: work.createdAt,
        ...deadline,
        currency: "RON",
        doctorId: work.doctorId,
        externalReference: work.externalReference,
        id: work.id,
        patientId: toDemoPatientId(work.patientName),
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
        ...(submission
          ? {
              workFormSubmission: {
                create: submission,
              },
            }
          : {}),
      },
    });
  }

  await seedDemoWorkClaims(prisma, dataset);
}

async function seedDemoWorkClaims(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  const [nc, ng] = await Promise.all([
    prisma.legalEntity.findUniqueOrThrow({ select: { id: true }, where: { code: "NC" } }),
    prisma.legalEntity.findUniqueOrThrow({ select: { id: true }, where: { code: "NG" } }),
  ]);
  const scenarios = [
    claimScenario(dataset, 1, "demo_user_tehnician_1", nc.id, "CLAIMED", "TECHNICIAN_CLAIM", 1),
    claimScenario(dataset, 2, "demo_user_tehnician_2", ng.id, "CLAIMED", "MANAGER_ASSIGNMENT", 1),
    claimScenario(dataset, 3, "demo_user_tehnician_2", nc.id, "CLAIMED", "MANAGER_REASSIGNMENT", 2),
    claimScenario(dataset, 4, null, ng.id, "UNCLAIMED", "TECHNICIAN_RELEASE", 2),
  ] as const;

  for (const scenario of scenarios) {
    if (!scenario) {
      continue;
    }
    await prisma.workOrder.update({
      data: {
        assignedTechnicianId: scenario.technicianId,
        assignmentUpdatedAt: scenario.updatedAt,
        claimedAt: scenario.technicianId ? scenario.claimedAt : null,
        claimedByUserId: scenario.technicianId ? scenario.claimedByUserId : null,
        claimRevision: scenario.revision,
        claimSource: scenario.source,
        claimStatus: scenario.status,
        executionLegalEntityId: scenario.status === "CLAIMED" ? scenario.legalEntityId : null,
        releasedAt: scenario.status === "UNCLAIMED" ? scenario.updatedAt : null,
        releasedByUserId: scenario.status === "UNCLAIMED" ? scenario.claimedByUserId : null,
        releaseReason: scenario.status === "UNCLAIMED" ? "Demo: lucrare eliberată pentru a arăta revenirea în lista disponibilă." : null,
      },
      where: { id: scenario.workId },
    });
    if (scenario.legalEntityId) {
      await createDemoExecutionSnapshot(prisma, scenario);
    }
  }

  await createDemoAssignmentEvent(prisma, dataset, 1, {
    actorUserId: "demo_user_tehnician_1",
    eventType: "CLAIMED",
    executionSnapshotStatus: "LOCKED",
    executionSnapshotVersion: 1,
    newLegalEntityId: nc.id,
    newTechnicianId: "demo_user_tehnician_1",
    revision: 1,
  });
  await createDemoAssignmentEvent(prisma, dataset, 2, {
    actorUserId: "demo_user_manager",
    eventType: "ASSIGNED",
    executionSnapshotStatus: "LOCKED",
    executionSnapshotVersion: 1,
    newLegalEntityId: ng.id,
    newTechnicianId: "demo_user_tehnician_2",
    reason: "Demo: asignare directă de manager.",
    revision: 1,
  });
  await createDemoAssignmentEvent(prisma, dataset, 3, {
    actorUserId: "demo_user_manager",
    eventType: "ASSIGNED",
    executionSnapshotStatus: "LOCKED",
    executionSnapshotVersion: 1,
    newLegalEntityId: nc.id,
    newTechnicianId: "demo_user_tehnician_1",
    reason: "Demo: asignare inițială.",
    revision: 1,
  });
  await createDemoAssignmentEvent(prisma, dataset, 3, {
    actorUserId: "demo_user_manager",
    eventType: "REASSIGNED",
    executionSnapshotStatus: "LOCKED",
    executionSnapshotVersion: 1,
    newLegalEntityId: nc.id,
    newTechnicianId: "demo_user_tehnician_2",
    previousLegalEntityId: nc.id,
    previousTechnicianId: "demo_user_tehnician_1",
    reason: "Demo: transfer către alt tehnician.",
    revision: 2,
  });
  await createDemoAssignmentEvent(prisma, dataset, 4, {
    actorUserId: "demo_user_tehnician_1",
    eventType: "CLAIMED",
    executionSnapshotStatus: "LOCKED",
    executionSnapshotVersion: 1,
    newLegalEntityId: ng.id,
    newTechnicianId: "demo_user_tehnician_1",
    revision: 1,
  });
  await createDemoAssignmentEvent(prisma, dataset, 4, {
    actorUserId: "demo_user_tehnician_1",
    eventType: "RELEASED",
    executionSnapshotStatus: "LOCKED",
    executionSnapshotVersion: 1,
    previousLegalEntityId: ng.id,
    previousTechnicianId: "demo_user_tehnician_1",
    reason: "Demo: lucrare eliberată pentru a arăta revenirea în lista disponibilă.",
    revision: 2,
  });
}

interface DemoClaimScenario {
  readonly claimedAt: Date;
  readonly claimedByUserId: string;
  readonly legalEntityId: string | null;
  readonly revision: number;
  readonly source: "MANAGER_ASSIGNMENT" | "MANAGER_REASSIGNMENT" | "TECHNICIAN_CLAIM" | "TECHNICIAN_RELEASE";
  readonly status: "CLAIMED" | "UNCLAIMED";
  readonly technicianId: string | null;
  readonly updatedAt: Date;
  readonly workId: string;
}

interface DemoAssignmentEventInput {
  readonly actorUserId: string;
  readonly eventType: "ASSIGNED" | "CLAIMED" | "REASSIGNED" | "RELEASED";
  readonly executionSnapshotStatus?: "INVALID" | "LOCKED" | "NOT_CREATED";
  readonly executionSnapshotVersion?: number;
  readonly newLegalEntityId?: string;
  readonly newTechnicianId?: string;
  readonly previousLegalEntityId?: string;
  readonly previousTechnicianId?: string;
  readonly reason?: string;
  readonly revision: number;
}

function claimScenario(
  dataset: DemoDataset,
  workIndex: number,
  technicianId: string | null,
  legalEntityId: string | null,
  status: "CLAIMED" | "UNCLAIMED",
  source: DemoClaimScenario["source"],
  revision: number,
): DemoClaimScenario | null {
  const work = dataset.works[workIndex];
  if (!work) {
    return null;
  }

  return {
    claimedAt: new Date(work.createdAt.getTime() + 900_000),
    claimedByUserId: technicianId ?? "demo_user_tehnician_1",
    legalEntityId,
    revision,
    source,
    status,
    technicianId,
    updatedAt: new Date(work.createdAt.getTime() + (revision + 1) * 900_000),
    workId: work.id,
  };
}

async function createDemoExecutionSnapshot(prisma: PrismaClient, scenario: DemoClaimScenario): Promise<void> {
  const work = await prisma.workOrder.findUniqueOrThrow({
    include: {
      clinic: true,
      doctor: true,
      workType: true,
    },
    where: { id: scenario.workId },
  });
  const [legalEntity, technician] = await Promise.all([
    prisma.legalEntity.findUniqueOrThrow({
      select: { code: true, displayName: true, id: true },
      where: { id: scenario.legalEntityId ?? "" },
    }),
    prisma.user.findUniqueOrThrow({
      select: { displayName: true, id: true },
      where: { id: scenario.technicianId ?? scenario.claimedByUserId },
    }),
  ]);
  const catalogItem = await prisma.priceCatalogItem.findFirst({
    where: {
      archivedAt: null,
      isActive: true,
      legalEntityId: legalEntity.id,
      workTypeId: work.workTypeId,
    },
  });
  const unitPriceMinor = catalogItem?.standardPriceMinor ?? work.baseUnitPriceMinor;
  const totalMinor = unitPriceMinor * work.quantity;
  const pricingSourceType = catalogItem ? "STANDARD_CATALOG" : "LEGACY_WORK_TYPE";
  const pricingSourceLabel = catalogItem ? "Catalog standard firmă" : "Preț legacy demo";
  const deadlineMode = work.deadlineMode ?? "UNRESOLVED";
  const createdAt = scenario.claimedAt;

  await prisma.workExecutionSnapshot.create({
    data: {
      claimRevision: Math.max(1, scenario.revision),
      claimedAt: createdAt,
      contextSnapshotJson: {
        claim: { claimedAt: createdAt.toISOString(), revision: Math.max(1, scenario.revision), source: scenario.source.startsWith("MANAGER") ? "MANAGER_ASSIGNMENT" : "TECHNICIAN_FIRST_CLAIM" },
        executionLegalEntity: { code: legalEntity.code, displayName: legalEntity.displayName, publicId: legalEntity.id },
        technician: { displayName: technician.displayName, publicId: technician.id },
        version: 1,
        work: {
          clinicName: work.clinic.name,
          clinicPublicId: work.clinic.id,
          doctorName: work.doctor.displayName,
          doctorPublicId: work.doctor.id,
          quantity: work.quantity,
          workCode: work.code,
          workTypeCode: work.workType.code,
          workTypeName: work.workType.name,
          workTypePublicId: work.workType.id,
        },
      },
      createdByUserId: scenario.claimedByUserId,
      deadlineEffectiveDueAt: work.effectiveDueAt,
      deadlineExecutionDays: work.deadlineExecutionDays,
      deadlineExplanation: work.deadlineExplanation,
      deadlineDueHour: work.deadlineDueHour,
      deadlineIncludeStartDay: work.deadlineIncludeStartDay,
      deadlineMode,
      deadlineReasonCode: work.deadlineReasonCode,
      deadlineRuleVersion: 1,
      deadlineSnapshotJson: {
        calculatedDueAt: work.calculatedDueAt?.toISOString() ?? null,
        effectiveDueAt: work.effectiveDueAt?.toISOString() ?? null,
        executionDays: work.deadlineExecutionDays,
        explanation: work.deadlineExplanation,
        mode: deadlineMode,
        reasonCode: work.deadlineReasonCode,
        resolvedAt: createdAt.toISOString(),
        ruleSnapshot: work.deadlineRuleSnapshot ?? { version: 1 },
        source: work.deadlineSource,
        startAt: (work.deadlineStartAt ?? createdAt).toISOString(),
        timezone: work.deadlineTimezone ?? "Europe/Bucharest",
        version: 1,
      },
      deadlineStartAt: work.deadlineStartAt ?? createdAt,
      deadlineTimezone: work.deadlineTimezone,
      executionLegalEntityCode: legalEntity.code,
      executionLegalEntityId: legalEntity.id,
      pricingAgreementId: null,
      pricingCatalogItemId: catalogItem?.id ?? null,
      pricingCurrency: work.currency,
      pricingQuantity: work.quantity.toString(),
      pricingRuleVersion: 1,
      pricingSnapshotJson: {
        catalogItemPublicId: catalogItem?.id ?? null,
        currency: work.currency,
        explanation: catalogItem ? "Se folosește prețul standard al firmei active." : "Demo fallback la prețul legacy al lucrării.",
        legalEntityCode: legalEntity.code,
        priceSource: { agreementPublicId: null, ruleScope: null, sourceLabel: pricingSourceLabel, sourceType: pricingSourceType },
        quantity: work.quantity,
        resolvedAt: createdAt.toISOString(),
        totalPriceMinor: totalMinor,
        unit: work.workType.unit,
        unitPriceMinor,
        version: 1,
        workTypePublicId: work.workType.id,
      },
      pricingSourceLabel,
      pricingSourceType,
      pricingTotalMinor: totalMinor,
      pricingUnit: work.workType.unit,
      pricingUnitPriceMinor: unitPriceMinor,
      snapshotCreatedAt: createdAt,
      snapshotLockedAt: createdAt,
      source: scenario.source.startsWith("MANAGER") ? "MANAGER_ASSIGNMENT" : "TECHNICIAN_FIRST_CLAIM",
      status: "LOCKED",
      technicianDisplayName: technician.displayName,
      technicianId: technician.id,
      version: 1,
      workOrderId: work.id,
    },
  });
}

async function createDemoAssignmentEvent(
  prisma: PrismaClient,
  dataset: DemoDataset,
  workIndex: number,
  input: DemoAssignmentEventInput,
): Promise<void> {
  const work = dataset.works[workIndex];
  if (!work) {
    return;
  }

  await prisma.workAssignmentEvent.create({
    data: {
      actorUserId: input.actorUserId,
      createdAt: new Date(work.createdAt.getTime() + input.revision * 900_000),
      eventType: input.eventType,
      executionSnapshotStatus: input.executionSnapshotStatus ?? null,
      executionSnapshotVersion: input.executionSnapshotVersion ?? null,
      id: `demo_assignment_event_${work.id.replace("demo_work_", "")}_${String(input.revision).padStart(2, "0")}_${input.eventType.toLowerCase()}`,
      newLegalEntityId: input.newLegalEntityId ?? null,
      newTechnicianId: input.newTechnicianId ?? null,
      previousLegalEntityId: input.previousLegalEntityId ?? null,
      previousTechnicianId: input.previousTechnicianId ?? null,
      reason: input.reason ?? null,
      revision: input.revision,
      workOrderId: work.id,
    },
  });
}

interface DemoDeadlineSnapshot {
  readonly calculatedDueAt?: Date | null;
  readonly deadlineCalculatedAt: Date;
  readonly deadlineDueHour: number;
  readonly deadlineDueMinute: number;
  readonly deadlineExecutionDays: number | null;
  readonly deadlineExplanation: string;
  readonly deadlineIncludeStartDay: boolean;
  readonly deadlineLockedAt: Date | null;
  readonly deadlineLockedReason: string | null;
  readonly deadlineMode: "CALCULATED" | "MANUAL" | "UNRESOLVED";
  readonly deadlineReasonCode: string | null;
  readonly deadlineRevision: number;
  readonly deadlineRuleSnapshot: Prisma.InputJsonObject;
  readonly deadlineSource: "CREATION" | "MANUAL_OVERRIDE";
  readonly deadlineStartAt: Date;
  readonly deadlineTimezone: string;
  readonly effectiveDueAt: Date | null;
  readonly manualDueAt: Date | null;
}

function toDemoDeadlineSnapshot(work: DemoWorkSeed, index: number): DemoDeadlineSnapshot {
  const calculatedDueAt = addDemoDays(work.createdAt, index % 5 === 0 ? 6 : 4);
  const baseSnapshot = {
    calendarCoverage: { fromYear: 2026, toYear: 2030 },
    dueHour: 17,
    dueMinute: 0,
    executionTimeRuleCode: null,
    includeStartDay: false,
    maxQuantity: index % 6 === 0 ? null : 7,
    minQuantity: 1,
    pricingSourceType: index % 2 === 0 ? "STANDARD" : "CLINIC",
    sourceType: index % 2 === 0 ? "STANDARD" : "CLINIC",
    timezone: "Europe/Bucharest",
    version: 1,
    workingWeekdays: [1, 2, 3, 4, 5],
  };

  if (index === 1 || index === 7) {
    return {
      deadlineCalculatedAt: work.createdAt,
      deadlineDueHour: 17,
      deadlineDueMinute: 0,
      deadlineExecutionDays: null,
      deadlineExplanation: "Termen demo setat manual pentru prezentare.",
      deadlineIncludeStartDay: false,
      deadlineLockedAt: work.createdAt,
      deadlineLockedReason: "Termen manual demo.",
      deadlineMode: "MANUAL",
      deadlineReasonCode: null,
      deadlineRevision: 1,
      deadlineRuleSnapshot: { ...baseSnapshot, executionDays: null, requiresManualDueDate: false },
      deadlineSource: "MANUAL_OVERRIDE",
      deadlineStartAt: work.createdAt,
      deadlineTimezone: "Europe/Bucharest",
      effectiveDueAt: work.requestedDeliveryDate,
      manualDueAt: work.requestedDeliveryDate,
    };
  }

  if (index === 2 || index === 8) {
    return {
      calculatedDueAt: null,
      deadlineCalculatedAt: work.createdAt,
      deadlineDueHour: 17,
      deadlineDueMinute: 0,
      deadlineExecutionDays: null,
      deadlineExplanation: "Demo: nu există regulă activă de termen pentru această combinație.",
      deadlineIncludeStartDay: false,
      deadlineLockedAt: null,
      deadlineLockedReason: null,
      deadlineMode: "UNRESOLVED",
      deadlineReasonCode: "NO_EXECUTION_RULE",
      deadlineRevision: 1,
      deadlineRuleSnapshot: { ...baseSnapshot, executionDays: null, requiresManualDueDate: false, sourceType: "NONE" },
      deadlineSource: "CREATION",
      deadlineStartAt: work.createdAt,
      deadlineTimezone: "Europe/Bucharest",
      effectiveDueAt: null,
      manualDueAt: null,
    };
  }

  return {
    calculatedDueAt,
    deadlineCalculatedAt: work.createdAt,
    deadlineDueHour: 17,
    deadlineDueMinute: 0,
    deadlineExecutionDays: index % 5 === 0 ? 6 : 4,
    deadlineExplanation: "Termen demo calculat determinist din regulile de execuție.",
    deadlineIncludeStartDay: false,
    deadlineLockedAt: null,
    deadlineLockedReason: null,
    deadlineMode: "CALCULATED",
    deadlineReasonCode: null,
    deadlineRevision: 1,
    deadlineRuleSnapshot: { ...baseSnapshot, executionDays: index % 5 === 0 ? 6 : 4, requiresManualDueDate: false },
    deadlineSource: "CREATION",
    deadlineStartAt: work.createdAt,
    deadlineTimezone: "Europe/Bucharest",
    effectiveDueAt: calculatedDueAt,
    manualDueAt: null,
  };
}

function addDemoDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}

async function seedDemoWorkflowExecutions(prisma: PrismaClient, dataset: DemoDataset): Promise<void> {
  for (const work of dataset.works) {
    const templateSeed = demoWorkflowTemplates.find((item) => item.workTypeId === work.workTypeId);
    if (!templateSeed) {
      continue;
    }

    const template = await prisma.workflowTemplate.findUniqueOrThrow({
      include: {
        stages: {
          orderBy: { sortOrder: "asc" },
        },
      },
      where: { id: templateSeed.id },
    });
    const executionId = `demo_workflow_execution_${work.id.replace("demo_work_", "")}`;
    await prisma.workWorkflowExecution.create({
      data: {
        createdAt: work.createdAt,
        id: executionId,
        startedAt: work.createdAt,
        status: getDemoWorkflowStatus(work),
        updatedAt: work.createdAt,
        version: 1,
        workflowNameSnapshot: template.name,
        workflowTemplateId: template.id,
        workflowTemplateVersion: template.version,
        workOrderId: work.id,
      },
    });

    const currentStageId = await seedDemoStageExecutions(prisma, executionId, work, template.stages);
    await prisma.workWorkflowExecution.update({
      data: {
        completedAt: getDemoWorkflowStatus(work) === "COMPLETED" ? new Date(work.createdAt.getTime() + 3_600_000) : null,
        currentStageExecutionId: currentStageId,
      },
      where: { id: executionId },
    });
  }
}

async function seedDemoStageExecutions(
  prisma: PrismaClient,
  executionId: string,
  work: DemoWorkSeed,
  stages: readonly {
    readonly allowedRoleCodes: Prisma.JsonValue;
    readonly description: string | null;
    readonly estimatedDurationMinutes: number | null;
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly sortOrder: number;
  }[],
): Promise<string | null> {
  const currentOrder = getDemoCurrentStageOrder(work, stages.length);
  let currentStageId: string | null = null;

  for (const stage of stages) {
    const stageExecutionId = `demo_stage_execution_${work.id.replace("demo_work_", "")}_${String(stage.sortOrder).padStart(2, "0")}`;
    const status = getDemoStageStatus(work, stage.sortOrder, currentOrder, getDemoWorkflowStatus(work));
    const assignedUserId = getDemoAssignedTechnician(work, stage, currentOrder, status);
    if (stage.sortOrder === currentOrder && status !== "COMPLETED") {
      currentStageId = stageExecutionId;
    }

    await prisma.workStageExecution.create({
      data: {
        allowedRoleCodesSnapshot: Array.isArray(stage.allowedRoleCodes) ? stage.allowedRoleCodes.filter((item): item is string => typeof item === "string") : [],
        assignedAt: assignedUserId ? new Date(work.createdAt.getTime() + stage.sortOrder * 240_000) : null,
        assignedByUserId: assignedUserId ? "demo_user_manager" : null,
        assignedUserId,
        completedAt: status === "COMPLETED" ? new Date(work.createdAt.getTime() + stage.sortOrder * 600_000) : null,
        completedByUserId: status === "COMPLETED" ? "demo_user_tehnician_1" : null,
        createdAt: work.createdAt,
        estimatedDurationMinutesSnapshot: stage.estimatedDurationMinutes,
        id: stageExecutionId,
        sortOrder: stage.sortOrder,
        stageDefinitionId: stage.id,
        stageDescriptionSnapshot: stage.description,
        stageKeySnapshot: stage.key,
        stageNameSnapshot: stage.name,
        startedAt: status === "IN_PROGRESS" || status === "COMPLETED" ? new Date(work.createdAt.getTime() + stage.sortOrder * 300_000) : null,
        startedByUserId: status === "IN_PROGRESS" || status === "COMPLETED" ? (assignedUserId ?? getDemoStageActor(stage.key)) : null,
        status,
        updatedAt: work.createdAt,
        workflowExecutionId: executionId,
      },
    });

    if (assignedUserId) {
      await prisma.workStageEvent.create({
        data: {
          actorUserId: "demo_user_manager",
          id: `demo_stage_event_${work.id.replace("demo_work_", "")}_${String(stage.sortOrder).padStart(2, "0")}_assigned`,
          metadata: {
            newAssignedUserId: assignedUserId,
            oldAssignedUserId: null,
            stageExecutionId,
            stageKey: stage.key,
            workCode: work.code,
            workId: work.id,
            workflowExecutionId: executionId,
          },
          occurredAt: new Date(work.createdAt.getTime() + stage.sortOrder * 240_000),
          stageExecutionId,
          type: "STAGE_ASSIGNED",
          workflowExecutionId: executionId,
        },
      });
    }
  }

  await prisma.workStageEvent.create({
    data: {
      actorUserId: "demo_user_receptie",
      id: `demo_stage_event_${work.id.replace("demo_work_", "")}_created`,
      metadata: { workCode: work.code, workId: work.id, workflowExecutionId: executionId },
      occurredAt: work.createdAt,
      stageExecutionId: currentStageId,
      type: "WORKFLOW_CREATED",
      workflowExecutionId: executionId,
    },
  });

  return currentStageId;
}

function getDemoWorkflowStatus(work: DemoWorkSeed): "ACTIVE" | "COMPLETED" {
  return Number(work.id.slice(-3)) % 6 === 0 ? "COMPLETED" : "ACTIVE";
}

function getDemoCurrentStageOrder(work: DemoWorkSeed, stageCount: number): number | null {
  const suffix = Number(work.id.slice(-3));
  if (suffix % 6 === 0) {
    return null;
  }

  if (suffix % 3 === 0) {
    return Math.min(2, stageCount);
  }

  return 1;
}

function getDemoStageStatus(work: DemoWorkSeed, sortOrder: number, currentOrder: number | null, workflowStatus: "ACTIVE" | "COMPLETED"): "COMPLETED" | "IN_PROGRESS" | "PENDING" {
  if (workflowStatus === "COMPLETED") {
    return "COMPLETED";
  }

  if (currentOrder === null || sortOrder < currentOrder) {
    return "COMPLETED";
  }

  if (sortOrder === currentOrder && currentOrder > 1) {
    return Number(work.id.slice(-3)) % 9 === 0 ? "PENDING" : "IN_PROGRESS";
  }

  return "PENDING";
}

function getDemoAssignedTechnician(
  work: DemoWorkSeed,
  stage: {
    readonly allowedRoleCodes: Prisma.JsonValue;
    readonly sortOrder: number;
  },
  currentOrder: number | null,
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING",
): string | null {
  const roleCodes = Array.isArray(stage.allowedRoleCodes)
    ? stage.allowedRoleCodes.filter((item): item is string => typeof item === "string")
    : [];
  const suffix = Number(work.id.slice(-3));
  if (stage.sortOrder !== currentOrder || status === "COMPLETED" || !roleCodes.includes("TEHNICIAN")) {
    return null;
  }

  if (suffix % 15 === 0) {
    return null;
  }

  return suffix % 4 === 1 ? "demo_user_tehnician_1" : "demo_user_tehnician_2";
}

function getDemoStageActor(stageKey: string): string {
  if (stageKey === "receptie") {
    return "demo_user_receptie";
  }

  if (stageKey === "pregatire_livrare") {
    return "demo_user_logistica";
  }

  return "demo_user_tehnician_1";
}

function toDemoWorkFormSubmission(work: DemoWorkSeed): Prisma.WorkFormSubmissionUncheckedCreateWithoutWorkOrderInput | null {
  const template = demoFormTemplates.find((item) => item.workTypeId === work.workTypeId);
  if (!template) {
    return null;
  }

  return {
    createdAt: work.createdAt,
    schemaSnapshot: toSchemaSnapshot(template),
    submittedAt: work.createdAt,
    submittedByUserId: "demo_user_receptie",
    templateId: template.id,
    templateNameSnapshot: template.name,
    templateVersion: template.version,
    updatedAt: work.createdAt,
    updatedByUserId: "demo_user_receptie",
    values: toDemoSubmissionValues(work, template),
  };
}

function toSchemaSnapshot(template: DemoFormTemplate): Prisma.InputJsonObject {
  return {
    fields: template.fields.map((item) => ({
      defaultValue: item.defaultValue,
      helpText: item.helpText,
      key: item.key,
      label: item.label,
      options: [...item.options],
      placeholder: item.placeholder,
      required: item.required,
      sortOrder: item.sortOrder,
      type: item.type,
      validation: item.validation,
    })),
  };
}

function toDemoSubmissionValues(work: DemoWorkSeed, template: DemoFormTemplate): Prisma.InputJsonObject {
  const suffix = Number(work.id.slice(-3));
  if (template.workTypeId === "demo_wt_zirconiu") {
    return {
      clinical_notes: "Instrucțiuni demo pentru contur și contact proximal.",
      shade: suffix % 2 === 0 ? "A2" : "A3",
      teeth: suffix % 3 === 0 ? ["11", "12"] : ["21"],
      try_in_required: suffix % 2 === 0,
      zirconia_type: suffix % 2 === 0 ? "multilayer" : "monolitic",
    };
  }

  if (template.workTypeId === "demo_wt_proteza_totala") {
    return {
      arch: suffix % 2 === 0 ? "maxilar" : "mandibula",
      occlusion_notes: "Observații demo pentru probă și plan ocluzal.",
      teeth_shade: "A2",
      wax_try_in: true,
    };
  }

  return {
    diameter: 4.2,
    implant_system: suffix % 2 === 0 ? "straumann" : "megagen",
    platform: suffix % 2 === 0 ? "RC" : "NC",
    restoration_type: suffix % 2 === 0 ? "insurubata" : "cimentata",
    shade: "A2",
  };
}

function field(
  key: string,
  label: string,
  helpText: string | null,
  type: WorkFormFieldType,
  required: boolean,
  sortOrder: number,
  placeholder: string | null = null,
  defaultValue: Prisma.InputJsonValue | null = null,
  options: readonly { readonly label: string; readonly value: string }[] = [],
  validation: Prisma.InputJsonObject = {},
): DemoFormField {
  return { defaultValue, helpText, key, label, options, placeholder, required, sortOrder, type, validation };
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

async function seedDemoLogistics(prisma: PrismaClient): Promise<void> {
  const logisticsSeeds = [
    logisticsState("001", WorkLogisticsStatus.RECEIVED, LogisticsLocationCode.RECEPTIE),
    logisticsState("002", WorkLogisticsStatus.DELIVERED, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("003", WorkLogisticsStatus.IN_PRODUCTION, LogisticsLocationCode.PRODUCTIE),
    logisticsState("004", WorkLogisticsStatus.BLOCKED, LogisticsLocationCode.PRODUCTIE, LogisticsBlockReasonCode.MISSING_INFO, "Lipsește confirmarea medicului pentru nuanță."),
    logisticsState("006", WorkLogisticsStatus.READY_FOR_PACKING, LogisticsLocationCode.RAFT_FINISARE),
    logisticsState("012", WorkLogisticsStatus.PACKING, LogisticsLocationCode.ZONA_AMBALARE),
    logisticsState("010", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("014", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("018", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("022", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("026", WorkLogisticsStatus.HANDED_TO_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("030", WorkLogisticsStatus.HANDED_TO_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("034", WorkLogisticsStatus.DELIVERED, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("038", WorkLogisticsStatus.DELIVERED, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("042", WorkLogisticsStatus.HANDED_TO_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("046", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
  ] as const;

  for (const seed of logisticsSeeds) {
    const now = new Date("2026-07-26T09:00:00.000Z");
    await prisma.workLogisticsState.create({
      data: {
        blockedAt: seed.status === "BLOCKED" ? now : null,
        blockedByUserId: seed.status === "BLOCKED" ? "demo_user_logistica" : null,
        blockedReasonCode: seed.blockedReasonCode,
        blockedReasonNotes: seed.blockedReasonNotes,
        id: `demo_logistics_state_${seed.suffix}`,
        packingStartedAt: seed.status === "PACKING" ? now : null,
        packingStartedByUserId: seed.status === "PACKING" ? "demo_user_logistica" : null,
        physicalLocationCode: seed.locationCode,
        readyForDeliveryAt: seed.status === "READY_FOR_DELIVERY" ? now : null,
        readyForDeliveryByUserId: seed.status === "READY_FOR_DELIVERY" ? "demo_user_logistica" : null,
        readyForPackingAt: seed.status === "READY_FOR_PACKING" || seed.status === "PACKING" || seed.status === "READY_FOR_DELIVERY" ? now : null,
        readyForPackingByUserId: seed.status === "READY_FOR_PACKING" || seed.status === "PACKING" || seed.status === "READY_FOR_DELIVERY" ? "demo_user_logistica" : null,
        status: seed.status,
        updatedByUserId: "demo_user_logistica",
        workOrderId: `demo_work_${seed.suffix}`,
      },
    });
    await prisma.logisticsEvent.create({
      data: {
        actorUserId: "demo_user_logistica",
        id: `demo_logistics_event_${seed.suffix}_state`,
        logisticsStateId: `demo_logistics_state_${seed.suffix}`,
        metadata: { newStatus: seed.status, workId: `demo_work_${seed.suffix}` },
        type: seed.status === "BLOCKED" ? "WORK_BLOCKED" : "WORK_RECEIVED",
        workOrderId: `demo_work_${seed.suffix}`,
      },
    });
  }

  await createDemoDeliveryPreparationGroup(prisma, "draft_1", "demo_clinic_smile", ["demo_work_006"], DeliveryPreparationGroupStatus.DRAFT);
  await createDemoDeliveryPreparationGroup(prisma, "draft_2", "demo_clinic_point", ["demo_work_024"], DeliveryPreparationGroupStatus.DRAFT);
  await createDemoDeliveryWithGroup(prisma, { courierUserId: null, sequence: 1, status: DeliveryStatus.PLANNED, suffix: "planned_1", workSuffix: "010" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: null, sequence: 2, status: DeliveryStatus.PLANNED, suffix: "planned_2", workSuffix: "014" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 3, status: DeliveryStatus.ASSIGNED, suffix: "assigned_1", workSuffix: "018" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 4, status: DeliveryStatus.ASSIGNED, suffix: "assigned_2", workSuffix: "022" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 5, status: DeliveryStatus.PICKED_UP, suffix: "picked_up_1", workSuffix: "026" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 6, status: DeliveryStatus.IN_TRANSIT, suffix: "in_transit_1", workSuffix: "030" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 7, status: DeliveryStatus.DELIVERED, suffix: "delivered_1", workSuffix: "034" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 8, status: DeliveryStatus.DELIVERED, suffix: "delivered_2", workSuffix: "038" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 9, status: DeliveryStatus.FAILED, suffix: "failed_1", workSuffix: "042" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: null, sequence: 10, status: DeliveryStatus.PLANNED, suffix: "unassigned_1", workSuffix: "046" });
  await createDemoDeliveryWithGroup(prisma, { courierUserId: "demo_user_curier", sequence: 11, status: DeliveryStatus.DELIVERED, suffix: "delivered_override", workSuffix: "002" });
}

function logisticsState(
  suffix: string,
  status: WorkLogisticsStatus,
  locationCode: LogisticsLocationCode,
  blockedReasonCode: LogisticsBlockReasonCode | null = null,
  blockedReasonNotes: string | null = null,
) {
  return { blockedReasonCode, blockedReasonNotes, locationCode, status, suffix };
}

async function createDemoDeliveryPreparationGroup(
  prisma: PrismaClient,
  suffix: string,
  clinicId: string,
  workOrderIds: readonly string[],
  status: DeliveryPreparationGroupStatus,
): Promise<void> {
  const groupId = `demo_delivery_group_${suffix}`;
  await prisma.deliveryPreparationGroup.create({
    data: {
      clinicId,
      code: `PG-DEMO-${suffix.toUpperCase().replaceAll("_", "-").slice(0, 16)}`,
      createdByUserId: "demo_user_logistica",
      id: groupId,
      plannedDate: new Date("2026-07-27T08:00:00.000Z"),
      status,
      updatedByUserId: "demo_user_logistica",
      items: {
        create: workOrderIds.map((workOrderId) => ({
          addedByUserId: "demo_user_logistica",
          id: `demo_delivery_item_${suffix}_${workOrderId.replace("demo_work_", "")}`,
          isActive: true,
          workOrderId,
        })),
      },
    },
  });
}

interface DemoDeliverySeed {
  readonly courierUserId: string | null;
  readonly sequence: number;
  readonly status: DeliveryStatus;
  readonly suffix: string;
  readonly workSuffix: string;
}

async function createDemoDeliveryWithGroup(prisma: PrismaClient, seed: DemoDeliverySeed): Promise<void> {
  const groupId = `demo_delivery_group_${seed.suffix}`;
  const deliveryId = `demo_delivery_${seed.suffix}`;
  const plannedDate = new Date("2026-07-27T08:00:00.000Z");
  await createDemoDeliveryPreparationGroup(prisma, seed.suffix, "demo_clinic_smile", [`demo_work_${seed.workSuffix}`], DeliveryPreparationGroupStatus.READY);
  await prisma.delivery.create({
    data: {
      assignedAt: seed.courierUserId ? new Date("2026-07-26T10:00:00.000Z") : null,
      assignedByUserId: seed.courierUserId ? "demo_user_logistica" : null,
      clinicId: "demo_clinic_smile",
      code: `DLV-2026-DEMO-${seed.sequence.toString().padStart(2, "0")}`,
      courierUserId: seed.courierUserId,
      deliveredAt: seed.status === DeliveryStatus.DELIVERED ? new Date("2026-07-26T14:00:00.000Z") : null,
      deliveredByUserId: seed.status === DeliveryStatus.DELIVERED ? seed.courierUserId : null,
      failedAt: seed.status === DeliveryStatus.FAILED ? new Date("2026-07-26T13:00:00.000Z") : null,
      failureDetails: seed.status === DeliveryStatus.FAILED ? "Destinatarul nu era disponibil la clinică." : null,
      failureReasonCode: seed.status === DeliveryStatus.FAILED ? DeliveryFailureReasonCode.RECIPIENT_UNAVAILABLE : null,
      id: deliveryId,
      inTransitAt: seed.status === DeliveryStatus.IN_TRANSIT || seed.status === DeliveryStatus.DELIVERED || seed.status === DeliveryStatus.FAILED ? new Date("2026-07-26T12:00:00.000Z") : null,
      pickedUpAt: seed.status === DeliveryStatus.PICKED_UP || seed.status === DeliveryStatus.IN_TRANSIT || seed.status === DeliveryStatus.DELIVERED || seed.status === DeliveryStatus.FAILED ? new Date("2026-07-26T11:00:00.000Z") : null,
      pickedUpByUserId: seed.status === DeliveryStatus.PICKED_UP || seed.status === DeliveryStatus.IN_TRANSIT || seed.status === DeliveryStatus.DELIVERED || seed.status === DeliveryStatus.FAILED ? seed.courierUserId : null,
      plannedDate,
      preparationGroupId: groupId,
      recipientName: seed.status === DeliveryStatus.DELIVERED ? "Recepție clinică" : null,
      recipientRole: seed.status === DeliveryStatus.DELIVERED ? "Recepție" : null,
      sequenceOrder: seed.sequence,
      status: seed.status,
      createdByUserId: "demo_user_logistica",
      updatedByUserId: "demo_user_logistica",
      events: {
        create: {
          actorUserId: "demo_user_logistica",
          id: `demo_delivery_event_${seed.suffix}_created`,
          metadata: { deliveryId, deliveryCode: `DLV-2026-DEMO-${seed.sequence.toString().padStart(2, "0")}`, newStatus: seed.status },
          type: DeliveryEventType.DELIVERY_CREATED,
        },
      },
    },
  });
  if (seed.status === DeliveryStatus.DELIVERED) {
    await createDemoDeliveryProof(prisma, deliveryId, seed.suffix);
  }
}

async function createDemoDeliveryProof(prisma: PrismaClient, deliveryId: string, suffix: string): Promise<void> {
  const signed = suffix !== "delivered_override";
  const signature = createDemoSignature(suffix);
  const canonical = JSON.stringify(signature);
  const signatureHash = createHash("sha256").update(canonical).digest("hex");
  const confirmedAt = suffix === "delivered_override" ? new Date("2026-07-26T14:20:00.000Z") : new Date("2026-07-26T14:05:00.000Z");
  await prisma.deliveryProof.create({
    data: {
      confirmedAt,
      confirmedByUserId: signed ? "demo_user_curier" : "demo_user_manager",
      deliveryId,
      id: `demo_delivery_proof_${suffix}`,
      recipientName: signed ? "Recepție clinică" : "Dr. Radu Stan",
      recipientNotes: signed ? "Predare demo confirmată cu semnătură fictivă." : "Predare demo finalizată prin override manager.",
      recipientRole: signed ? "Recepție" : "Medic",
      signatureCapturedAt: signed ? confirmedAt : null,
      signatureHash: signed ? signatureHash : null,
      signatureOverrideDetails: signed ? null : "Telefonul curierului nu a putut captura semnătura în scenariul demo.",
      signatureOverrideReasonCode: signed ? null : "DEVICE_UNAVAILABLE",
      signatureStrokes: signed ? signature : Prisma.DbNull,
      signed,
    },
  });
  await prisma.deliveryEvent.create({
    data: {
      actorUserId: signed ? "demo_user_curier" : "demo_user_manager",
      deliveryId,
      id: `demo_delivery_event_${suffix}_${signed ? "signature" : "override"}`,
      metadata: {
        actorUserId: signed ? "demo_user_curier" : "demo_user_manager",
        overrideReasonCode: signed ? null : "DEVICE_UNAVAILABLE",
        proofId: `demo_delivery_proof_${suffix}`,
        signed,
        signatureHashPrefix: signed ? signatureHash.slice(0, 12) : null,
      },
      type: signed ? DeliveryEventType.DELIVERY_SIGNATURE_CAPTURED : DeliveryEventType.DELIVERY_COMPLETED_WITHOUT_SIGNATURE,
    },
  });
}

function createDemoSignature(seed: string): Prisma.InputJsonObject {
  const offset = seed.endsWith("2") ? 0.08 : 0;
  return {
    strokes: [
      {
        points: [
          { t: 0, x: 0.12 + offset, y: 0.62 },
          { t: 20, x: 0.2 + offset, y: 0.42 },
          { t: 40, x: 0.3 + offset, y: 0.56 },
          { t: 60, x: 0.4 + offset, y: 0.38 },
          { t: 80, x: 0.52 + offset, y: 0.58 },
        ],
      },
      {
        points: [
          { t: 100, x: 0.18 + offset, y: 0.72 },
          { t: 120, x: 0.34 + offset, y: 0.68 },
          { t: 140, x: 0.52 + offset, y: 0.7 },
          { t: 160, x: 0.7 + offset, y: 0.66 },
        ],
      },
    ],
  };
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

function parseDemoPatientName(patientName: string): { readonly firstName: string; readonly lastName: string } {
  const parts = patientName.trim().replace(/\s+/g, " ").split(" ");
  const lastName = parts.pop() ?? "Nespecificat";

  return {
    firstName: parts.join(" ") || patientName.trim(),
    lastName,
  };
}

function normalizeDemoPatientName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function toDemoPatientId(patientName: string): string {
  return `demo_patient_${createHash("sha1").update(normalizeDemoPatientName(patientName)).digest("hex").slice(0, 16)}`;
}

function findWork(dataset: DemoDataset, workId: string): DemoWorkSeed {
  const work = dataset.works.find((item) => item.id === workId);
  if (!work) {
    throw new Error(`Work ${workId} was not found.`);
  }

  return work;
}
