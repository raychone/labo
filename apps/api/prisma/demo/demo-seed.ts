import { DeliveryPreparationGroupStatus, LogisticsBlockReasonCode, LogisticsLocationCode, WorkLogisticsStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Prisma, WorkFormFieldType } from "@prisma/client";

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
  await seedDemoWorkFormTemplates(prisma);
  await seedDemoWorkflowTemplates(prisma);
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
    const submission = toDemoWorkFormSubmission(work);
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
    logisticsState("002", WorkLogisticsStatus.IN_PRODUCTION, LogisticsLocationCode.PRODUCTIE),
    logisticsState("003", WorkLogisticsStatus.IN_PRODUCTION, LogisticsLocationCode.PRODUCTIE),
    logisticsState("004", WorkLogisticsStatus.BLOCKED, LogisticsLocationCode.PRODUCTIE, LogisticsBlockReasonCode.MISSING_INFO, "Lipsește confirmarea medicului pentru nuanță."),
    logisticsState("006", WorkLogisticsStatus.READY_FOR_PACKING, LogisticsLocationCode.RAFT_FINISARE),
    logisticsState("012", WorkLogisticsStatus.PACKING, LogisticsLocationCode.ZONA_AMBALARE),
    logisticsState("018", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("024", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("030", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
    logisticsState("036", WorkLogisticsStatus.READY_FOR_DELIVERY, LogisticsLocationCode.GATA_LIVRARE),
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

  await createDemoDeliveryPreparationGroup(prisma, "draft_1", "demo_clinic_smile", ["demo_work_018", "demo_work_030"], DeliveryPreparationGroupStatus.DRAFT);
  await createDemoDeliveryPreparationGroup(prisma, "draft_2", "demo_clinic_point", ["demo_work_024"], DeliveryPreparationGroupStatus.DRAFT);
  await createDemoDeliveryPreparationGroup(prisma, "ready_1", "demo_clinic_point", ["demo_work_036"], DeliveryPreparationGroupStatus.READY);
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
      code: `PG-2026-DEMO-${suffix.toUpperCase()}`,
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
