import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { Clinic, Doctor, Patient, Prisma, WorkType } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import type { PatientsService } from "../patients/patients.service.js";
import type { PricingResolverService } from "../pricing/pricing-resolver.service.js";
import type { WorkQrTokenService } from "../qr/work-qr-token.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import type { WorkFormSubmissionValidationService } from "../work-forms/work-form-submission-validation.service.js";
import type { WorkflowExecutionService } from "../workflow-execution/workflow-execution.service.js";
import { CreateNextWorkCycleDto, CreateWorkDto } from "./dto/works.dto.js";
import type { WorkDeadlineService } from "./work-deadline.service.js";
import type { WorkOrderCodeService } from "./work-order-code.service.js";
import { calculateTotalPriceMinor, parseDateOnly, WorksService } from "./works.service.js";

function clinic(overrides: Partial<Clinic> = {}): Clinic {
  return {
    addressLine1: null,
    addressLine2: null,
    archivedAt: null,
    archivedByUserId: null,
    billingAddressLine1: null,
    billingAddressLine2: null,
    billingCity: null,
    billingCountryCode: "RO",
    billingCountyOrRegion: null,
    billingName: null,
    billingPostalCode: null,
    billingRegistrationNumber: null,
    billingTaxId: null,
    city: "Bucuresti",
    code: "CL-0001",
    contactPersonEmail: null,
    contactPersonName: null,
    contactPersonPhone: null,
    contactPersonRole: null,
    countryCode: "RO",
    countyOrRegion: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
    email: null,
    id: "clinic_1",
    internalNotes: null,
    legalEntityId: null,
    isActive: true,
    legalName: null,
    name: "Clinica Test",
    phone: null,
    postalCode: null,
    registrationNumber: null,
    taxId: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    website: null,
    ...overrides,
  };
}

function doctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    archivedAt: null,
    clinicId: "clinic_1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayName: "Dr. Ana Popescu",
    email: null,
    firstName: "Ana",
    id: "doctor_1",
    internalNotes: null,
    legalEntityId: null,
    isActive: true,
    lastName: "Popescu",
    phone: null,
    professionalCode: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

function workType(overrides: Partial<WorkType> = {}): WorkType {
  return {
    archivedAt: null,
    archivedByUserId: null,
    basePriceMinor: 35000,
    code: "WT-0001",
    colorHex: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
    description: null,
    id: "work_type_1",
    isActive: true,
    probeFamily: null,
    probeTypeCodes: null,
    allowedAddOns: null,
    exclusiveGroup: null,
    name: "Coroana zirconiu",
    symbol: "Zr",
    unit: "UNIT",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    ...overrides,
  };
}

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    archivedAt: null,
    archivedByUserId: null,
    clinicId: null,
    birthDate: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
    doctorId: null,
    firstName: "Ion",
    id: "patient_1",
    isArchived: false,
    lastName: "Pop",
    normalizedFirstName: "ion",
    normalizedLastName: "pop",
    notes: null,
    sex: "UNSPECIFIED",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    ...overrides,
  };
}

function workOrder(overrides: Record<string, unknown> = {}) {
  return {
    baseUnitPriceMinor: 35000,
    assignedTechnician: null,
    assignedTechnicianId: null,
    assignmentEvents: [],
    assignmentUpdatedAt: null,
    clinicalNotes: null,
    claimedAt: null,
    claimedByUserId: null,
    claimRevision: 0,
    claimSource: null,
    claimStatus: "UNCLAIMED",
    clinic: { ...clinic(), legalEntity: { code: "CDT", displayName: "Nicolaie Cristina", id: "legal_cdt" } },
    clinicId: "clinic_1",
    code: "WO-2026-000001",
    createdAt: new Date("2026-07-22T12:00:00.000Z"),
    createdByUserId: "actor_1",
    currency: "RON",
    doctor: doctor(),
    doctorId: "doctor_1",
    executionLegalEntity: null,
    executionLegalEntityId: null,
    activeCycle: {
      cycleNumber: 1,
      executionSnapshot: null,
      id: "cycle_1",
      logisticsState: null,
      reason: "INITIAL",
      status: "ACTIVE",
      workflowExecution: null,
    },
    activeCycleId: "cycle_1",
    externalReference: null,
    calculatedDueAt: new Date("2026-07-27T14:00:00.000Z"),
    deadlineCalculatedAt: new Date("2026-07-22T12:00:00.000Z"),
    deadlineDueHour: 17,
    deadlineDueMinute: 0,
    deadlineExecutionDays: 3,
    deadlineExplanation: "Termen calculat.",
    deadlineIncludeStartDay: false,
    deadlineLockedAt: null,
    deadlineLockedReason: null,
    deadlineMode: "CALCULATED",
    deadlineReasonCode: null,
    deadlineRevision: 1,
    deadlineRuleSnapshot: {},
    deadlineSource: "CREATION",
    deadlineStartAt: new Date("2026-07-22T12:00:00.000Z"),
    deadlineTimezone: "Europe/Bucharest",
    effectiveDueAt: new Date("2026-07-27T14:00:00.000Z"),
    id: "work_order_1",
    internalNotes: null,
    technicalCodeNotes: null,
    patient: patient(),
    patientId: "patient_1",
    patientName: "Ion Pop",
    patientReference: "P-100",
    priority: "NORMAL",
    qrCreatedAt: new Date("2026-07-22T12:00:00.000Z"),
    qrToken: "qr_token_1",
    releaseReason: null,
    releasedAt: null,
    releasedByUserId: null,
    quantity: 2,
    requestedDeliveryDate: new Date("2026-08-01T00:00:00.000Z"),
    shade: "A2",
    status: "RECEPTIE",
    totalPriceMinor: 70000,
    updatedAt: new Date("2026-07-22T12:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    invoicedDocumentId: null,
    logisticsEvents: [],
    deliveryPreparationItems: [],
    manualDueAt: null,
    workFormSubmission: null,
    workType: workType(),
    workTypeId: "work_type_1",
    ...overrides,
  };
}

function createService(
  prisma: unknown,
  authorizationService: unknown = {
    hasPermission: vi.fn().mockImplementation(async ({ permission }: { readonly permission: string }) => {
      if (permission === "pricing.read") {
        return { allowed: false, effectiveScopes: [], permission };
      }
      if (permission === "works.read_all") {
        return { allowed: false, effectiveScopes: [], permission };
      }
      if (permission === "works.read_assigned" || permission === "works.claim.available.read") {
        return { allowed: true, effectiveScopes: ["ASSIGNED"], permission };
      }

      return { allowed: false, effectiveScopes: [], permission };
    }),
    requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "works.read_all" }),
  },
  patientsService: unknown = { findActivePatientOrThrow: vi.fn().mockResolvedValue(patient()) },
  codeService: unknown = { generate: vi.fn().mockResolvedValue("WO-2026-000001") },
  qrTokenService: unknown = { generate: vi.fn().mockResolvedValue("qr_token_1") },
  submissionValidationService: unknown = {
    prepareCreate: vi.fn().mockResolvedValue(null),
    prepareReplaceForWorkTypeChange: vi.fn(),
    prepareUpdateValues: vi.fn(),
    recordSubmissionAudit: vi.fn(),
  },
  workflowExecutionService: unknown = {
    createSnapshotForWork: vi.fn().mockResolvedValue(null),
  },
  deadlineService: unknown = {
    resolveForWork: vi.fn().mockResolvedValue({
      calculatedDueAt: new Date("2026-07-27T14:00:00.000Z"),
      deadlineCalculatedAt: new Date("2026-07-22T12:00:00.000Z"),
      deadlineDueHour: 17,
      deadlineDueMinute: 0,
      deadlineExecutionDays: 3,
      deadlineExplanation: "Termen calculat.",
      deadlineIncludeStartDay: false,
      deadlineLockedAt: null,
      deadlineLockedReason: null,
      deadlineMode: "CALCULATED",
      deadlineReasonCode: null,
      deadlineRuleSnapshot: {},
      deadlineSource: "CREATION",
      deadlineStartAt: new Date("2026-07-22T12:00:00.000Z"),
      deadlineTimezone: "Europe/Bucharest",
      effectiveDueAt: new Date("2026-07-27T14:00:00.000Z"),
      manualDueAt: null,
    }),
    shouldRecalculate: vi.fn().mockReturnValue(false),
    assertExpectedRevision: vi.fn(),
  },
  pricingResolverService: unknown = {
    resolve: vi.fn(),
  },
): WorksService {
  return new WorksService(
    authorizationService as AuthorizationService,
    prisma as PrismaService,
    patientsService as PatientsService,
    codeService as WorkOrderCodeService,
    qrTokenService as WorkQrTokenService,
    submissionValidationService as WorkFormSubmissionValidationService,
    workflowExecutionService as WorkflowExecutionService,
    deadlineService as WorkDeadlineService,
    pricingResolverService as PricingResolverService,
  );
}

const legalEntity = {
  code: "CDT",
  displayName: "Nicolaie Cristina",
  id: "legal_nc",
} as const;

const createDto = {
  clinicId: "clinic_1",
  doctorId: "doctor_1",
  patientId: "patient_1",
  patientReference: "P-100",
  priority: "NORMAL",
  quantity: 2,
  requestedDeliveryDate: "2026-08-20",
  shade: "A2",
  workTypeId: "work_type_1",
} as const;

describe("WorksService", () => {
  beforeEach(() => {
    // Keep date validation deterministic while preserving the production rule
    // that requestedDeliveryDate cannot be before today.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a RECEPTIE work order with immutable pricing snapshot and audit", async () => {
    const createdWorkOrder = workOrder();
    const auditCreate = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue(createdWorkOrder);
    const codeService = { generate: vi.fn().mockResolvedValue("WO-26-0001") };
    const qrTokenService = { generate: vi.fn().mockResolvedValue("qr_token_1") };
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
          doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
          laboratorySettings: {
            upsert: vi.fn().mockResolvedValue({ currency: "RON" }),
          },
          workCycle: { create: vi.fn().mockResolvedValue({ id: "cycle_1" }) },
          workLogisticsState: { create: vi.fn().mockResolvedValue({ id: "logistics_1" }) },
          logisticsEvent: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { create, findUniqueOrThrow: vi.fn().mockResolvedValue(createdWorkOrder), update: vi.fn().mockResolvedValue(createdWorkOrder) },
          workType: { findUnique: vi.fn().mockResolvedValue({ basePriceMinor: 35000, isActive: true }) },
        }),
      ),
    }, undefined, undefined, codeService, qrTokenService);

    const result = await service.createWork(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      legalEntity,
      createDto,
      false,
    );

    expect(codeService.generate).toHaveBeenCalled();
    expect(qrTokenService.generate).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        baseUnitPriceMinor: 35000,
        code: "WO-26-0001",
        currency: "RON",
        patientId: "patient_1",
        patientName: "Ion Pop",
        qrToken: "qr_token_1",
        quantity: 2,
        shade: "A2",
        status: "RECEPTIE",
        statusChangedAt: expect.any(Date) as Date,
        statusChangedByUserId: "actor_1",
        totalPriceMinor: 70000,
      }),
      include: expect.objectContaining({ clinic: true, doctor: true, workType: true }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "work_orders.created",
        resourceId: "work_order_1",
        resourceType: "work_order",
      }),
    });
    expect(result.status).toBe("RECEPTIE");
    expect(result.totalPriceMinor).toBeNull();
  });

  it("persists aggregate items and canonical case-level tooth connections and reads them back", async () => {
    const createdWorkOrder = workOrder({
      items: [
        { archivedAt: null, baseUnitPriceMinor: 35000, commercialSnapshot: null, createdAt: new Date("2026-08-01T09:00:00.000Z"), customImplantPlatformSnapshot: null, customWorkTypeSnapshot: null, id: "item_11", implantPlatform: null, notes: null, restorationType: null, shade: null, scope: "TOOTH", sortOrder: 0, technicalCodeNotes: null, teeth: [{ fdiTooth: 11, sortOrder: 0 }], totalPriceMinor: 35000, updatedAt: new Date("2026-08-01T09:00:00.000Z"), workOrderId: "work_order_1", workType: workType(), workTypeId: "work_type_1", currency: "RON" },
        { archivedAt: null, baseUnitPriceMinor: 35000, commercialSnapshot: null, createdAt: new Date("2026-08-01T09:00:00.000Z"), customImplantPlatformSnapshot: null, customWorkTypeSnapshot: null, id: "item_12", implantPlatform: null, notes: null, restorationType: null, shade: null, scope: "TOOTH", sortOrder: 1, technicalCodeNotes: null, teeth: [{ fdiTooth: 12, sortOrder: 0 }], totalPriceMinor: 35000, updatedAt: new Date("2026-08-01T09:00:00.000Z"), workOrderId: "work_order_1", workType: workType(), workTypeId: "work_type_1", currency: "RON" },
      ],
      toothConnections: [{ createdAt: new Date("2026-08-01T09:00:00.000Z"), id: "connection_1", toothA: 12, toothB: 11, workOrderId: "work_order_1" }],
    });
    const itemCreate = vi.fn().mockResolvedValue({});
    const connectionCreate = vi.fn().mockResolvedValue({});
    const probeCycleCreate = vi.fn();
    const findUniqueOrThrow = vi.fn().mockResolvedValue(createdWorkOrder);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
        doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
        laboratorySettings: { upsert: vi.fn().mockResolvedValue({ currency: "RON" }) },
        workCycle: { create: vi.fn().mockResolvedValue({ id: "cycle_1" }) },
        workLogisticsState: { create: vi.fn().mockResolvedValue({ id: "logistics_1" }) },
        logisticsEvent: { create: vi.fn().mockResolvedValue({}) },
        probeCycle: { create: probeCycleCreate },
        workOrder: { create: vi.fn().mockResolvedValue(createdWorkOrder), findUniqueOrThrow, update: vi.fn().mockResolvedValue(createdWorkOrder) },
        workOrderItem: { create: itemCreate },
        workOrderToothConnection: { create: connectionCreate },
        workType: { findUnique: vi.fn().mockResolvedValue({ allowedAddOns: [{ amountMinor: 5000, code: "PLACATA" }, { amountMinor: 2000, code: "GINGIE" }], basePriceMinor: 35000, exclusiveGroup: null, id: "work_type_1", isActive: true, unit: "ELEMENT" }) },
      })),
    });

    const result = await service.createWork(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      {
        ...createDto,
        items: [
          { scope: "TOOTH", teeth: [11], workTypeId: "work_type_1", selectedAddOns: [{ code: "PLACATA", amountMinor: 5000 }] },
          { scope: "TOOTH", teeth: [12], workTypeId: "work_type_1", selectedAddOns: [{ code: "GINGIE", amountMinor: 2000 }] },
        ],
        toothConnections: [{ toothA: 11, toothB: 12 }],
      },
      false,
    );

    expect(itemCreate).toHaveBeenCalledTimes(2);
    expect(itemCreate.mock.calls[0]?.[0].data.selectedAddOns).toEqual([{ code: "PLACATA", amountMinor: 5000 }]);
    expect(itemCreate.mock.calls[1]?.[0].data.selectedAddOns).toEqual([{ code: "GINGIE", amountMinor: 2000 }]);
    expect(probeCycleCreate).not.toHaveBeenCalled();
    expect(connectionCreate).toHaveBeenCalledWith({ data: { toothA: 12, toothB: 11, workOrderId: "work_order_1" } });
    expect(findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "work_order_1" } }));
    expect(result.items).toHaveLength(2);
    expect(result.toothConnections).toEqual([expect.objectContaining({ toothA: 12, toothB: 11 })]);
  });

  it.each([
    { label: "clinic and doctor", clinicId: "clinic_1", doctorId: "doctor_1", expectedClinic: clinic(), expectedDoctor: doctor() },
    { label: "clinic only", clinicId: "clinic_1", doctorId: null, expectedClinic: clinic(), expectedDoctor: null },
    { label: "doctor only", clinicId: null, doctorId: "doctor_1", expectedClinic: null, expectedDoctor: doctor() },
    { label: "neither clinic nor doctor", clinicId: null, doctorId: null, expectedClinic: null, expectedDoctor: null },
  ])("creates a work order with optional intake source: $label", async ({ clinicId, doctorId, expectedClinic, expectedDoctor }) => {
    const createdWorkOrder = workOrder({
      clinic: expectedClinic,
      clinicId,
      doctor: expectedDoctor,
      doctorId,
    });
    const create = vi.fn().mockResolvedValue(createdWorkOrder);
    const cycleCreate = vi.fn().mockResolvedValue({ id: "cycle_1" });
    const clinicFindUnique = vi.fn().mockResolvedValue({ isActive: true });
    const doctorFindUnique = vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true });
    const deadlineService = {
      resolveForWork: vi.fn().mockResolvedValue({
        calculatedDueAt: new Date("2026-07-27T14:00:00.000Z"),
        deadlineCalculatedAt: new Date("2026-07-22T12:00:00.000Z"),
        deadlineDueHour: 17,
        deadlineDueMinute: 0,
        deadlineExecutionDays: 3,
        deadlineExplanation: "Termen calculat.",
        deadlineIncludeStartDay: false,
        deadlineLockedAt: null,
        deadlineLockedReason: null,
        deadlineMode: "CALCULATED",
        deadlineReasonCode: null,
        deadlineRuleSnapshot: {},
        deadlineSource: "CREATION",
        deadlineStartAt: new Date("2026-07-22T12:00:00.000Z"),
        deadlineTimezone: "Europe/Bucharest",
        effectiveDueAt: new Date("2026-07-27T14:00:00.000Z"),
        manualDueAt: null,
      }),
      shouldRecalculate: vi.fn().mockReturnValue(false),
      assertExpectedRevision: vi.fn(),
    };
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          clinic: { findUnique: clinicFindUnique },
          doctor: { findUnique: doctorFindUnique },
          laboratorySettings: {
            upsert: vi.fn().mockResolvedValue({ currency: "RON" }),
          },
          workCycle: { create: cycleCreate },
          workLogisticsState: { create: vi.fn().mockResolvedValue({ id: "logistics_1" }) },
          logisticsEvent: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { create, findUniqueOrThrow: vi.fn().mockResolvedValue(createdWorkOrder), update: vi.fn().mockResolvedValue(createdWorkOrder) },
          workType: { findUnique: vi.fn().mockResolvedValue({ basePriceMinor: 35000, isActive: true }) },
        }),
      ),
    }, undefined, undefined, { generate: vi.fn().mockResolvedValue("WO-26-0001") }, { generate: vi.fn().mockResolvedValue("qr_token_1") }, undefined, undefined, deadlineService);

    await service.createWork(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      legalEntity,
      { ...createDto, clinicId, doctorId },
      false,
    );

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clinicId,
        doctorId,
      }),
    }));
    expect(cycleCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ cycleNumber: 1, reason: "INITIAL", status: "ACTIVE" }) });
    expect(deadlineService.resolveForWork).toHaveBeenCalledWith(expect.objectContaining({
      clinicId,
      doctorId,
    }));
    expect(clinicFindUnique).toHaveBeenCalledTimes(clinicId ? 1 : 0);
    expect(doctorFindUnique).toHaveBeenCalledTimes(doctorId ? 1 : 0);
  });

  it("persists intake values and reopens them unchanged on the created work detail", async () => {
    const intakeValues = {
      observations: "Ajustare minimă",
      phase_1: "Scanare",
      phase_1_due_date: "2026-08-01",
      phase_2: "Modelare",
      shade: "A2",
      teeth: ["11", "12"],
    };
    const submission = {
      finalizedAt: null,
      realLabSheetStatus: "DRAFT",
      revision: 1,
      schemaSnapshot: {
        fields: [
          { key: "teeth", label: "Dinți", sortOrder: 1, type: "TOOTH" },
          { key: "shade", label: "Culoare", sortOrder: 2, type: "SHADE" },
          { key: "phase_1", label: "Faza 1", sortOrder: 3, type: "TEXT" },
          { key: "phase_1_due_date", label: "Termen faza 1", sortOrder: 4, type: "DATE" },
          { key: "phase_2", label: "Faza 2", sortOrder: 5, type: "TEXT" },
          { key: "observations", label: "Observații", sortOrder: 6, type: "TEXTAREA" },
        ],
      },
      submittedAt: new Date("2026-07-22T12:00:00.000Z"),
      templateId: "template_1",
      templateKind: "GENERIC",
      templateNameSnapshot: "Formular recepție",
      templateVersion: 1,
      updatedAt: new Date("2026-07-22T12:10:00.000Z"),
      values: intakeValues,
    };
    const createdWorkOrder = workOrder({
      patient: patient({ sex: "FEMALE" }),
      workFormSubmissions: [submission],
    } as Record<string, unknown>);
    const create = vi.fn().mockResolvedValue(createdWorkOrder);
    const submissionValidationService = {
      prepareCreate: vi.fn().mockResolvedValue({
        audit: {
          action: "work_forms.submission_created",
          metadata: {
            changedFieldKeys: Object.keys(intakeValues),
            templateId: "template_1",
            templateVersion: 1,
            workCode: "WO-2026-000002",
            workTypeId: "work_type_1",
          },
        },
        data: {
          schemaSnapshot: submission.schemaSnapshot as unknown as Prisma.InputJsonObject,
          submittedByUserId: "actor_1",
          templateId: "template_1",
          templateKind: "GENERIC",
          templateNameSnapshot: "Formular recepție",
          templateVersion: 1,
          updatedByUserId: "actor_1",
          values: intakeValues,
        },
      }),
      prepareReplaceForWorkTypeChange: vi.fn(),
      prepareUpdateValues: vi.fn(),
      recordSubmissionAudit: vi.fn(),
    };
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
          doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
          laboratorySettings: {
            upsert: vi.fn().mockResolvedValue({ currency: "RON" }),
          },
          workCycle: { create: vi.fn().mockResolvedValue({ id: "cycle_1" }) },
          workLogisticsState: { create: vi.fn().mockResolvedValue({ id: "logistics_1" }) },
          logisticsEvent: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { create, findUniqueOrThrow: vi.fn().mockResolvedValue(createdWorkOrder), update: vi.fn().mockResolvedValue(createdWorkOrder) },
          workType: { findUnique: vi.fn().mockResolvedValue({ basePriceMinor: 35000, isActive: true }) },
        }),
      ),
    }, undefined, undefined, { generate: vi.fn().mockResolvedValue("WO-2026-000002") }, { generate: vi.fn().mockResolvedValue("qr_token_2") }, submissionValidationService);

    const result = await service.createWork(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      {
        ...createDto,
        workFormSubmission: {
          templateId: "template_1",
          templateVersion: 1,
          values: intakeValues,
        },
      },
      false,
    );

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workFormSubmissions: {
          create: expect.objectContaining({
            values: intakeValues,
          }),
        },
      }),
    }));
    expect(result.patient?.sex).toBe("FEMALE");
    expect(result.workForm?.values).toEqual(intakeValues);
  });

  it("rejects a doctor from another clinic", async () => {
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
          doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_2", isActive: true }) },
        }),
      ),
    });

    await expect(service.createWork({ actorUserId: "actor_1", requestMetadata: {} }, legalEntity, createDto, false)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects archived work types on create", async () => {
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
          doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
          workType: { findUnique: vi.fn().mockResolvedValue({ basePriceMinor: 35000, isActive: false }) },
        }),
      ),
    });

    await expect(service.createWork({ actorUserId: "actor_1", requestMetadata: {} }, legalEntity, createDto, false)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("masks pricing for readers without pricing.read", async () => {
    const service = createService({
      workOrder: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([workOrder()]),
      },
      $transaction: vi.fn((operations: readonly Promise<unknown>[]) => Promise.all(operations)),
    });

    const result = await service.listWorks("actor_1", { page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }, false);

    expect(result.items[0]?.currency).toBeNull();
    expect(result.items[0]?.totalPriceMinor).toBeNull();
  });

  it("filters by operational deadline state and returns dashboard totals", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T09:00:00.000Z"));
    const rows = [
      workOrder({
        code: "WO-2026-000001",
        effectiveDueAt: new Date("2026-07-29T14:00:00.000Z"),
        id: "work_order_due_today",
      }),
      workOrder({
        code: "WO-2026-000002",
        effectiveDueAt: new Date("2026-07-26T14:00:00.000Z"),
        id: "work_order_late",
      }),
      workOrder({
        code: "WO-2026-000003",
        deadlineMode: "MANUAL",
        effectiveDueAt: new Date("2026-08-01T14:00:00.000Z"),
        id: "work_order_manual",
      }),
    ];
    const findMany = vi.fn()
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([rows[1]]);
    const service = createService({
      workOrder: {
        count: vi.fn().mockResolvedValue(1),
        findMany,
      },
    });

    try {
      const result = await service.listWorks("actor_1", { deadlineFilter: "LATE", page: 1, pageSize: 20, sortBy: "effectiveDueAt", sortDirection: "asc" }, false);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.code).toBe("WO-2026-000002");
      expect(result.items[0]?.deadline.status).toBe("LATE");
      expect(result.total).toBe(1);
      expect(result.deadlineDashboard).toMatchObject({
        dueToday: 1,
        late: 1,
        manual: 1,
      });
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { effectiveDueAt: "asc" },
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists reception-created unclaimed works as claimable without manual dispatch or stage reassignment", async () => {
    const receptionCreatedWork = workOrder({
      activeCycle: {
        ...workOrder().activeCycle,
        workflowExecution: {
          currentStageExecutionId: "stage_reception",
          id: "workflow_reception",
          stages: [
            {
              allowedRoleCodesSnapshot: ["RECEPTIE"],
              assignedUserId: "reception_1",
              id: "stage_reception",
              sortOrder: 1,
              stageKeySnapshot: "receptie",
              status: "PENDING",
              workflowExecutionId: "workflow_reception",
            },
          ],
          status: "ACTIVE",
          version: 1,
          workflowTemplateId: "template_1",
          workflowTemplateVersion: 3,
        },
      },
      claimStatus: "UNCLAIMED",
      claimedByUserId: null,
      code: "WO-26-0008",
      createdByUserId: "reception_1",
      status: "RECEPTIE",
    });
    const findMany = vi.fn().mockResolvedValue([receptionCreatedWork]);
    const service = createService({
      workOrder: {
        count: vi.fn().mockResolvedValue(1),
        findMany,
      },
    }, {
      hasPermission: vi.fn().mockImplementation(async ({ permission }: { readonly permission: string }) => {
        if (permission === "works.claim.available.read") {
          return { allowed: true, effectiveScopes: ["ALL"], permission };
        }
        if (permission === "works.claim.create") {
          return { allowed: true, effectiveScopes: ["ASSIGNED"], permission };
        }
        return { allowed: false, effectiveScopes: [], permission };
      }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "works.claim.available.read" }),
    });

    const result = await service.listAvailableForClaim("technician_1", {
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortDirection: "asc",
    });

    expect(result.items.map((item) => item.code)).toEqual(["WO-26-0008"]);
    expect(result.items[0]?.claim.status).toBe("UNCLAIMED");
    expect(result.items[0]?.claim.canCurrentUserClaim).toBe(true);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        claimStatus: "UNCLAIMED",
      }),
    }));
  });

  it("claims an available work atomically with execution company code", async () => {
    const before = workOrder({
      activeCycle: {
        ...workOrder().activeCycle,
        workflowExecution: {
          currentStageExecutionId: "stage_exec_1",
          id: "workflow_exec_1",
          stages: [
            {
              allowedRoleCodesSnapshot: ["TEHNICIAN"],
              assignedUserId: null,
              id: "stage_exec_1",
              sortOrder: 1,
              stageKeySnapshot: "receptie",
              status: "PENDING",
              workflowExecutionId: "workflow_exec_1",
            },
          ],
          status: "ACTIVE",
          version: 1,
          workflowTemplateId: "template_1",
          workflowTemplateVersion: 3,
        },
      },
    });
    const after = workOrder({
      assignedTechnicianId: "actor_1",
      claimRevision: 1,
      claimSource: "TECHNICIAN_CLAIM",
      claimStatus: "CLAIMED",
      executionLegalEntityId: "legal_nc",
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const assignmentCreate = vi.fn().mockResolvedValue({});
    const snapshotCreate = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({});
    const stageUpdate = vi.fn().mockResolvedValue({});
    const workflowUpdate = vi.fn().mockResolvedValue({});
    const stageEventCreate = vi.fn().mockResolvedValue({});
    const pricingResolve = vi.fn().mockResolvedValue({
      adjustment: {
        basisPoints: null,
        fixedAmountMinor: null,
        overridePriceMinor: null,
        type: null,
      },
      appliedAgreementId: null,
      appliedAgreementType: null,
      appliedRuleScope: null,
      catalogItemId: "catalog_nc_1",
      currency: "RON",
      executionTimeRule: null,
      executionTimeRules: [],
      explanation: "Se folosește prețul standard al firmei active.",
      finalUnitPriceMinor: 40000,
      legalEntityCode: "NC",
      quantity: 2,
      resolutionTrace: ["Catalog NC găsit pentru tipul de lucrare."],
      standardUnitPriceMinor: 40000,
      totalPriceMinor: 80000,
      workTypeId: "work_type_1",
    });
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Actor", id: "actor_1", roles: [{ role: { isActive: true, key: "TEHNICIAN" } }] }) },
          workAssignmentEvent: { create: assignmentCreate },
          workCycle: { update: vi.fn().mockResolvedValue({}) },
          workExecutionSnapshot: { create: snapshotCreate },
          workStageEvent: { create: stageEventCreate },
          workStageExecution: { update: stageUpdate },
          workOrder: { findUniqueOrThrow: vi.fn().mockResolvedValue(after), updateMany },
          workWorkflowExecution: { update: workflowUpdate },
        }),
      ),
      legalEntity: { findUnique: vi.fn().mockResolvedValue({ code: "CDT", displayName: "Nicolaie Cristina", id: "legal_cdt", isActive: true }) },
      workOrder: { findUnique: vi.fn().mockResolvedValue(before) },
    }, {
      hasPermission: vi.fn().mockImplementation(async ({ permission }: { readonly permission: string }) => {
        if (permission === "workflow.start_stage") {
          return { allowed: true, effectiveScopes: ["OWN_STAGE"], permission };
        }
        return { allowed: true, effectiveScopes: ["ASSIGNED"], permission };
      }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
    }, undefined, undefined, undefined, undefined, undefined, undefined, { resolve: pricingResolve });

    const result = await service.claimWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      executionLegalEntityCode: "CDT",
      expectedClaimRevision: 0,
    });

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { claimRevision: 0, claimStatus: "UNCLAIMED", id: "work_order_1" },
    }));
    expect(stageUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignedByUserId: "actor_1",
        assignedUserId: "actor_1",
      }),
      where: { id: "stage_exec_1" },
    });
    expect(workflowUpdate).toHaveBeenCalledWith({
      data: { version: { increment: 1 } },
      where: { id: "workflow_exec_1" },
    });
    expect(stageEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "actor_1",
        stageExecutionId: "stage_exec_1",
        type: "STAGE_ASSIGNED",
        workflowExecutionId: "workflow_exec_1",
      }),
    });
    expect(assignmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        executionSnapshotStatus: "LOCKED",
        executionSnapshotVersion: 1,
        eventType: "CLAIMED",
        newLegalEntityId: "legal_cdt",
        newTechnicianId: "actor_1",
        revision: 1,
      }),
    });
    expect(snapshotCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        executionLegalEntityCode: "CDT",
        pricingTotalMinor: 80000,
        snapshotLockedAt: expect.any(Date) as Date,
        status: "LOCKED",
        version: 1,
      }),
    });
    expect(result.claim.status).toBe("CLAIMED");
  });

  it("releases and reclaims a work without duplicating the execution snapshot", async () => {
    const executionSnapshot = {
      deadlineEffectiveDueAt: new Date("2026-08-01T14:00:00.000Z"),
      deadlineMode: "CALCULATED",
      deadlineExecutionDays: 3,
      deadlineExplanation: "Termen calculat.",
      deadlineStartAt: new Date("2026-07-22T12:00:00.000Z"),
      deadlineTimezone: "Europe/Bucharest",
      executionLegalEntityCode: "CDT",
      executionLegalEntity: { code: "CDT", displayName: "Nicolaie Cristina", id: "legal_cdt" },
      pricingCurrency: "RON",
      pricingQuantity: "2",
      pricingSourceLabel: "Catalog NC",
      pricingSourceType: "STANDARD",
      pricingSnapshotJson: { explanation: "Preț de catalog" },
      pricingTotalMinor: 70000,
      pricingUnit: "UNIT",
      pricingUnitPriceMinor: 35000,
      snapshotCreatedAt: new Date("2026-07-22T12:00:00.000Z"),
      snapshotLockedAt: new Date("2026-07-22T12:00:00.000Z"),
      technician: {
        displayName: "Actor",
        id: "actor_1",
      },
      status: "LOCKED",
      version: 1,
    };
    const createSnapshot = vi.fn().mockResolvedValue({});
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const pricingResolve = vi.fn().mockResolvedValue({
      adjustment: {
        basisPoints: null,
        fixedAmountMinor: null,
        overridePriceMinor: null,
        type: null,
      },
      appliedAgreementId: null,
      appliedAgreementType: null,
      appliedRuleScope: null,
      catalogItemId: "catalog_nc_1",
      currency: "RON",
      executionTimeRule: null,
      executionTimeRules: [],
      explanation: "Se folosește prețul standard al firmei active.",
      finalUnitPriceMinor: 35000,
      legalEntityCode: "NC",
      quantity: 2,
      resolutionTrace: [],
      standardUnitPriceMinor: 35000,
      totalPriceMinor: 70000,
      workTypeId: "work_type_1",
    });
    const beforeClaim = workOrder({
      activeCycle: {
        ...workOrder().activeCycle,
        executionSnapshot: null,
      },
      claimRevision: 0,
      claimStatus: "UNCLAIMED",
      claimedByUserId: null,
      executionLegalEntityId: null,
      assignedTechnicianId: null,
    });
    const afterClaim = workOrder({
      activeCycle: {
        ...workOrder().activeCycle,
        executionSnapshot,
      },
      assignedTechnician: { displayName: "Actor", id: "actor_1", preferredColor: null },
      assignedTechnicianId: "actor_1",
      claimRevision: 1,
      claimSource: "TECHNICIAN_CLAIM",
      claimStatus: "CLAIMED",
      claimedByUserId: "actor_1",
      executionLegalEntityId: "legal_nc",
      releasedAt: null,
      releasedByUserId: null,
      releaseReason: null,
    });
    const afterRelease = workOrder({
      activeCycle: {
        ...workOrder().activeCycle,
        executionSnapshot,
      },
      assignedTechnicianId: null,
      claimRevision: 2,
      claimSource: "TECHNICIAN_RELEASE",
      claimStatus: "UNCLAIMED",
      claimedByUserId: null,
      executionLegalEntityId: null,
      releasedAt: new Date("2026-07-22T12:30:00.000Z"),
      releasedByUserId: "actor_1",
      releaseReason: "Transfer",
    });
    const afterReclaim = workOrder({
      activeCycle: {
        ...workOrder().activeCycle,
        executionSnapshot,
      },
      assignedTechnician: { displayName: "Actor", id: "actor_1", preferredColor: null },
      assignedTechnicianId: "actor_1",
      claimRevision: 3,
      claimSource: "TECHNICIAN_CLAIM",
      claimStatus: "CLAIMED",
      claimedByUserId: "actor_1",
      executionLegalEntityId: "legal_nc",
      releasedAt: null,
      releasedByUserId: null,
      releaseReason: null,
    });
    const findUniqueOrThrow = vi.fn()
      .mockResolvedValueOnce(afterClaim)
      .mockResolvedValueOnce(afterRelease)
      .mockResolvedValueOnce(afterReclaim);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Actor", id: "actor_1" }) },
          workAssignmentEvent: { create: vi.fn().mockResolvedValue({}) },
          workCycle: { update: vi.fn().mockResolvedValue({}) },
          workExecutionSnapshot: { create: createSnapshot },
          workOrder: { findUniqueOrThrow, updateMany },
        }),
      ),
      legalEntity: { findUnique: vi.fn().mockResolvedValue({ code: "CDT", displayName: "Nicolaie Cristina", id: "legal_cdt", isActive: true }) },
      workOrder: { findUnique: vi.fn()
        .mockResolvedValueOnce(beforeClaim)
        .mockResolvedValueOnce(afterClaim)
        .mockResolvedValueOnce(afterRelease) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
    }, undefined, undefined, undefined, undefined, undefined, undefined, { resolve: pricingResolve });

    const claimResult = await service.claimWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      executionLegalEntityCode: "CDT",
      expectedClaimRevision: 0,
    });
    const releaseResult = await service.releaseWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      expectedClaimRevision: 1,
      reason: "Transfer",
    });
    const reclaimResult = await service.claimWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      executionLegalEntityCode: "CDT",
      expectedClaimRevision: 2,
    });

    expect(createSnapshot).toHaveBeenCalledTimes(1);
    expect(claimResult.claim.status).toBe("CLAIMED");
    expect(releaseResult.claim.status).toBe("UNCLAIMED");
    expect(releaseResult.executionSnapshot.summary.exists).toBe(true);
    expect(reclaimResult.claim.status).toBe("CLAIMED");
    expect(reclaimResult.executionSnapshot.summary.exists).toBe(true);
  });

  it("returns a conflict when concurrent claim already changed the revision", async () => {
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Actor", id: "actor_1" }) },
          workCycle: { update: vi.fn().mockResolvedValue({}) },
          workExecutionSnapshot: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        }),
      ),
      legalEntity: { findUnique: vi.fn().mockResolvedValue({ code: "CDT", displayName: "Nicolaie Cristina", id: "legal_cdt", isActive: true }) },
      workOrder: { findUnique: vi.fn().mockResolvedValue(workOrder()) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
    }, undefined, undefined, undefined, undefined, undefined, undefined, {
      resolve: vi.fn().mockResolvedValue({
        adjustment: { basisPoints: null, fixedAmountMinor: null, overridePriceMinor: null, type: null },
        appliedAgreementId: null,
        appliedAgreementType: null,
        appliedRuleScope: null,
        catalogItemId: "catalog_nc_1",
        currency: "RON",
        executionTimeRule: null,
        executionTimeRules: [],
        explanation: "Se folosește prețul standard al firmei active.",
        finalUnitPriceMinor: 40000,
        legalEntityCode: "NC",
        quantity: 2,
        resolutionTrace: [],
        standardUnitPriceMinor: 40000,
        totalPriceMinor: 80000,
        workTypeId: "work_type_1",
      }),
    });

    await expect(service.claimWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      executionLegalEntityCode: "CDT",
      expectedClaimRevision: 0,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows exactly one simultaneous claim to commit", async () => {
    const before = workOrder({ claimRevision: 0, claimStatus: "UNCLAIMED", claimedByUserId: null });
    const committedClaims: { readonly actorUserId: string; readonly claimedAt: Date }[] = [];
    const auditCreate = vi.fn().mockResolvedValue({});
    const assignmentCreate = vi.fn().mockResolvedValue({});
    const updateMany = vi.fn(async ({ data, where }: { readonly data: { readonly claimedAt: Date; readonly claimedByUserId: string }; readonly where: { readonly claimRevision: number; readonly claimStatus: string; readonly id: string } }) => {
      await Promise.resolve();
      const canCommit = committedClaims.length === 0 && where.id === "work_order_1" && where.claimRevision === 0 && where.claimStatus === "UNCLAIMED";
      if (!canCommit) {
        return { count: 0 };
      }
      committedClaims.push({ actorUserId: data.claimedByUserId, claimedAt: data.claimedAt });
      return { count: 1 };
    });
    const findUniqueOrThrow = vi.fn(async () => workOrder({
      assignedTechnician: { displayName: "Actor", id: committedClaims[0]?.actorUserId ?? "actor_1", preferredColor: null },
      assignedTechnicianId: committedClaims[0]?.actorUserId ?? "actor_1",
      assignmentUpdatedAt: committedClaims[0]?.claimedAt ?? new Date("2026-07-22T12:00:00.000Z"),
      claimedAt: committedClaims[0]?.claimedAt ?? new Date("2026-07-22T12:00:00.000Z"),
      claimedByUserId: committedClaims[0]?.actorUserId ?? "actor_1",
      claimRevision: 1,
      claimSource: "TECHNICIAN_CLAIM",
      claimStatus: "CLAIMED",
      executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
      executionLegalEntityId: "legal_nc",
    }));
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          user: { findUnique: vi.fn().mockResolvedValue({ displayName: "Actor", id: "actor_1", roles: [{ role: { isActive: true, key: "TEHNICIAN" } }] }) },
          workAssignmentEvent: { create: assignmentCreate },
          workCycle: { update: vi.fn().mockResolvedValue({}) },
          workExecutionSnapshot: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { findUniqueOrThrow, updateMany },
        }),
      ),
      legalEntity: { findUnique: vi.fn().mockResolvedValue({ code: "CDT", displayName: "Nicolaie Cristina", id: "legal_cdt", isActive: true }) },
      workOrder: { findUnique: vi.fn().mockResolvedValue(before) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.claim.create" }),
    }, undefined, undefined, undefined, undefined, undefined, undefined, {
      resolve: vi.fn().mockResolvedValue({
        adjustment: { basisPoints: null, fixedAmountMinor: null, overridePriceMinor: null, type: null },
        appliedAgreementId: null,
        appliedAgreementType: null,
        appliedRuleScope: null,
        catalogItemId: "catalog_nc_1",
        currency: "RON",
        executionTimeRule: null,
        executionTimeRules: [],
        explanation: "Se folosește prețul standard al firmei active.",
        finalUnitPriceMinor: 40000,
        legalEntityCode: "NC",
        quantity: 2,
        resolutionTrace: [],
        standardUnitPriceMinor: 40000,
        totalPriceMinor: 80000,
        workTypeId: "work_type_1",
      }),
    });

    const results = await Promise.allSettled([
      service.claimWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
        executionLegalEntityCode: "CDT",
        expectedClaimRevision: 0,
      }),
      service.claimWork({ actorUserId: "actor_2", requestMetadata: {} }, "work_order_1", {
        executionLegalEntityCode: "CDT",
        expectedClaimRevision: 0,
      }),
    ]);

    const fulfilled = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<WorksService["claimWork"]>>> => result.status === "fulfilled");
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(ConflictException);
    expect(committedClaims).toHaveLength(1);
    expect(committedClaims[0]?.claimedAt).toBeInstanceOf(Date);
    expect(fulfilled[0]?.value.claim.status).toBe("CLAIMED");
    expect(fulfilled[0]?.value.claim.technician?.publicId).toBe(committedClaims[0]?.actorUserId);
    expect(assignmentCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "work_orders.claim_conflict" }),
    }));
  });

  it("changes claimed work between final operational states with explicit timestamps and audit", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T09:15:00.000Z"));
    const beforeWaiting = workOrder({
      assignedTechnicianId: "actor_1",
      claimStatus: "CLAIMED",
      claimedByUserId: "actor_1",
      status: "IN_LUCRU",
    });
    const afterWaiting = workOrder({
      ...beforeWaiting,
      status: "IN_ASTEPTARE",
      statusChangedAt: new Date("2026-08-20T09:15:00.000Z"),
      statusChangedByUserId: "actor_1",
      waitingStartedAt: new Date("2026-08-20T09:15:00.000Z"),
    });
    const afterInProgress = workOrder({
      ...beforeWaiting,
      status: "IN_LUCRU",
      statusChangedAt: new Date("2026-08-20T09:15:00.000Z"),
      statusChangedByUserId: "actor_1",
      waitingStartedAt: null,
    });
    const auditCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn()
      .mockResolvedValueOnce(afterWaiting)
      .mockResolvedValueOnce(afterInProgress);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          workOrder: { update },
        }),
      ),
      workOrder: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(beforeWaiting)
          .mockResolvedValueOnce({ ...beforeWaiting, status: "IN_ASTEPTARE", waitingStartedAt: new Date("2026-08-20T09:15:00.000Z") }),
      },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["OWN_STAGE"], permission: "works.change_status" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["OWN_STAGE"], permission: "works.change_status" }),
    });

    try {
      const waiting = await service.setWorkStatus({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
        reason: "Așteptăm materiale",
        status: "IN_ASTEPTARE",
      });
      const inProgress = await service.setWorkStatus({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
        reason: "Materialele au venit",
        status: "IN_LUCRU",
      });

      expect(waiting.status).toBe("IN_ASTEPTARE");
      expect(waiting.waitingStartedAt).toBe("2026-08-20T09:15:00.000Z");
      expect(inProgress.status).toBe("IN_LUCRU");
      expect(inProgress.waitingStartedAt).toBeNull();
      expect(update).toHaveBeenNthCalledWith(1, expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_ASTEPTARE",
          statusChangedAt: new Date("2026-08-20T09:15:00.000Z"),
          statusChangedByUserId: "actor_1",
          waitingStartedAt: new Date("2026-08-20T09:15:00.000Z"),
        }),
      }));
      expect(update).toHaveBeenNthCalledWith(2, expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_LUCRU",
          waitingStartedAt: null,
        }),
      }));
      expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: "work_orders.status_changed" }),
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("finalizes claimed work and blocks invalid status transitions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
    const before = workOrder({
      assignedTechnicianId: "actor_1",
      claimStatus: "CLAIMED",
      claimedByUserId: "actor_1",
      status: "IN_LUCRU",
    });
    const after = workOrder({
      ...before,
      completedAt: new Date("2026-08-20T10:00:00.000Z"),
      completedByUserId: "actor_1",
      status: "FINALIZATA",
      statusChangedAt: new Date("2026-08-20T10:00:00.000Z"),
      statusChangedByUserId: "actor_1",
    });
    const auditCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue(after);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          workOrder: { update },
        }),
      ),
      workOrder: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(before)
          .mockResolvedValueOnce({ ...before, status: "RECEPTIE" }),
      },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["OWN_STAGE"], permission: "works.change_status" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["OWN_STAGE"], permission: "works.change_status" }),
    });

    try {
      const result = await service.setWorkStatus({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
        status: "FINALIZATA",
      });

      expect(result.status).toBe("FINALIZATA");
      expect(result.completedAt).toBe("2026-08-20T10:00:00.000Z");
      expect(result.completedByUserId).toBe("actor_1");
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          completedAt: new Date("2026-08-20T10:00:00.000Z"),
          completedByUserId: "actor_1",
          status: "FINALIZATA",
        }),
      }));
      expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: "work_orders.status_changed",
          metadata: expect.objectContaining({
            completedAt: "2026-08-20T10:00:00.000Z",
            completedByUserId: "actor_1",
            newStatus: "FINALIZATA",
          }),
        }),
      }));
      await expect(service.setWorkStatus({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
        status: "FINALIZATA",
      })).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      vi.useRealTimers();
    }
  });

  it("updates own technician details and audits changed fields", async () => {
    const before = workOrder({
      assignedTechnicianId: "actor_1",
      claimStatus: "CLAIMED",
      claimedByUserId: "actor_1",
      clinicalNotes: "Note vechi",
      internalNotes: "Intern vechi",
      technicalCodeNotes: "COD-1",
    });
    const after = workOrder({
      ...before,
      clinicalNotes: "Note noi",
      internalNotes: "Intern nou",
      technicalCodeNotes: "COD-2",
      version: 2,
    });
    const auditCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue(after);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          workOrder: { update },
        }),
      ),
      workOrder: { findUnique: vi.fn().mockResolvedValue(before) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.technical_details.update" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.technical_details.update" }),
    });

    const result = await service.updateTechnicianDetails({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      clinicalNotes: "Note noi",
      internalNotes: "Intern nou",
      technicalCodeNotes: "COD-2",
    });

    expect(result.technicalCodeNotes).toBe("COD-2");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clinicalNotes: "Note noi",
        internalNotes: "Intern nou",
        technicalCodeNotes: "COD-2",
        version: { increment: 1 },
      }),
    }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "work_orders.technical_details_updated",
        metadata: expect.objectContaining({
          changedFields: expect.arrayContaining(["clinicalNotes", "internalNotes", "technicalCodeNotes"]),
        }),
      }),
    }));
  });

  it("blocks technician detail updates for unassigned work", async () => {
    const service = createService({
      workOrder: { findUnique: vi.fn().mockResolvedValue(workOrder({ assignedTechnicianId: "other_tech", claimedByUserId: "other_tech" })) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.technical_details.update" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ASSIGNED"], permission: "works.technical_details.update" }),
    });

    await expect(service.updateTechnicianDetails({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", {
      technicalCodeNotes: "COD",
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects quantity changes above one for a unit-based work", async () => {
    const before = workOrder({ baseUnitPriceMinor: 35000, quantity: 2, totalPriceMinor: 70000 });
    const after = workOrder({ baseUnitPriceMinor: 35000, quantity: 3, totalPriceMinor: 105000, version: 2 });
    const update = vi.fn().mockResolvedValue(after);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { update },
        }),
      ),
      workOrder: { findUnique: vi.fn().mockResolvedValue(before) },
    });

    await expect(service.updateWork({ actorUserId: "actor_1", requestMetadata: {} }, legalEntity, "work_order_1", { expectedDeadlineRevision: 1, quantity: 3 })).rejects.toThrow("cantitatea 1");
    expect(update).not.toHaveBeenCalled();
  });

  it("creates the next cycle without duplicating the work order", async () => {
    const before = workOrder({
      activeCycle: {
        cycleNumber: 1,
        executionSnapshot: null,
        id: "cycle_1",
        logisticsState: { status: "DELIVERED" },
        reason: "INITIAL",
        status: "ACTIVE",
        workflowExecution: null,
      },
      assignedTechnicianId: "tech_1",
      claimRevision: 2,
      claimStatus: "CLAIMED",
      claimedByUserId: "tech_1",
      executionLegalEntityId: "legal_nc",
    });
    const auditCreate = vi.fn().mockResolvedValue({});
    const workflowCreate = vi.fn().mockResolvedValue("workflow_2");
    const workCycleCreate = vi.fn().mockResolvedValue({ cycleNumber: 2, id: "cycle_2" });
    const workOrderUpdate = vi.fn().mockResolvedValue({});
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $queryRaw: vi.fn().mockResolvedValue([]),
          auditLog: { create: auditCreate },
          clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
          doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
          logisticsEvent: { create: vi.fn().mockResolvedValue({}) },
          workCycle: {
            create: workCycleCreate,
            findFirst: vi.fn().mockResolvedValue({ cycleNumber: 1 }),
            update: vi.fn().mockResolvedValue({}),
          },
          workLogisticsState: { create: vi.fn().mockResolvedValue({ id: "logistics_2" }) },
          workOrder: {
            findUnique: vi.fn().mockResolvedValue(before),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              activeCycle: { id: "cycle_2" },
              activeCycleId: "cycle_2",
              clinicId: "clinic_1",
              code: "WO-2026-000001",
              cycles: [],
              doctorId: "doctor_1",
              id: "work_order_1",
              patientId: "patient_1",
              patientName: "Ion Pop",
            }),
            update: workOrderUpdate,
          },
        }),
      ),
      clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
      workOrder: { findUnique: vi.fn().mockResolvedValue(before) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: false, effectiveScopes: [], permission: "pricing.read" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "cycles.create_next" }),
    }, undefined, undefined, undefined, undefined, { createSnapshotForWork: workflowCreate });

    const result = await service.createNextCycle(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      "work_order_1",
      { clinicId: "clinic_1", doctorId: "doctor_1", expectedActiveCycleId: "cycle_1", notes: "Retur medic", reason: "REPAIR" },
      false,
    );

    expect(workflowCreate).toHaveBeenCalledTimes(1);
    expect(workflowCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      workCycleId: "cycle_2",
      workOrderId: "work_order_1",
    }));
    expect(workCycleCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: "clinic_1",
        doctorId: "doctor_1",
        reason: "REPAIR",
        reasonNotes: "Retur medic",
      }),
    });
    expect(workOrderUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignedTechnicianId: null,
        claimStatus: "UNCLAIMED",
        clinicId: "clinic_1",
        doctorId: "doctor_1",
        executionLegalEntityId: null,
      }),
      where: { id: "work_order_1" },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "work_cycles.closed", resourceId: "work_order_1" }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "work_cycles.created", resourceId: "work_order_1" }),
    });
    expect(result.activeCycleId).toBe("cycle_2");
  });

  it("creates repeated return cycles generically and preserves the full history", async () => {
    const beforeCycle1 = workOrder({
      activeCycle: {
        cycleNumber: 1,
        executionSnapshot: null,
        id: "cycle_1",
        logisticsState: { status: "DELIVERED" },
        reason: "INITIAL",
        status: "ACTIVE",
        workflowExecution: null,
      },
      assignedTechnicianId: "tech_1",
      claimRevision: 2,
      claimStatus: "CLAIMED",
      claimedByUserId: "tech_1",
      executionLegalEntityId: "legal_nc",
    });
    const beforeCycle2 = workOrder({
      activeCycle: {
        cycleNumber: 2,
        executionSnapshot: null,
        id: "cycle_2",
        logisticsState: { status: "DELIVERED" },
        reason: "REPAIR",
        status: "ACTIVE",
        workflowExecution: null,
      },
      assignedTechnicianId: "tech_2",
      claimRevision: 3,
      claimStatus: "CLAIMED",
      claimedByUserId: "tech_2",
      executionLegalEntityId: "legal_nc",
    });
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
      logisticsEvent: { create: vi.fn().mockResolvedValue({}) },
      workCycle: {
        create: vi.fn()
          .mockResolvedValueOnce({ cycleNumber: 2, id: "cycle_2" })
          .mockResolvedValueOnce({ cycleNumber: 3, id: "cycle_3" }),
        findFirst: vi.fn()
          .mockResolvedValueOnce({ cycleNumber: 1 })
          .mockResolvedValueOnce({ cycleNumber: 2 }),
        update: vi.fn().mockResolvedValue({}),
      },
      workLogisticsState: { create: vi.fn().mockResolvedValue({ id: "logistics_2" }) },
      workOrder: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(beforeCycle1)
          .mockResolvedValueOnce(beforeCycle2),
        update: vi.fn().mockResolvedValue({}),
        findUniqueOrThrow: vi.fn()
          .mockResolvedValueOnce({
            activeCycle: { id: "cycle_2" },
            activeCycleId: "cycle_2",
            clinicId: "clinic_1",
            code: "WO-2026-000001",
            cycles: [
              { id: "cycle_1", cycleNumber: 1, reason: "INITIAL", reasonNotes: null, status: "CLOSED", openedAt: new Date(), closedAt: new Date(), clinic: clinic(), doctor: doctor(), executionLegalEntityCodeSnapshot: "NC", executionLegalEntityNameSnapshot: "Nicolaie Cristina", workflowExecution: null, logisticsState: null, deliveryPreparationItems: [], deadlineEffectiveDueAtSnapshot: null, deadlineModeSnapshot: "CALCULATED", deadlineSnapshotJson: null, executionSnapshotJson: null, executionSnapshotStatus: null, executionSnapshotVersion: null, pricingSnapshotJson: null, createdBy: null },
              { id: "cycle_2", cycleNumber: 2, reason: "REPAIR", reasonNotes: "Retur medic", status: "ACTIVE", openedAt: new Date(), closedAt: null, clinic: clinic(), doctor: doctor(), executionLegalEntityCodeSnapshot: "NC", executionLegalEntityNameSnapshot: "Nicolaie Cristina", workflowExecution: null, logisticsState: null, deliveryPreparationItems: [], deadlineEffectiveDueAtSnapshot: null, deadlineModeSnapshot: "CALCULATED", deadlineSnapshotJson: null, executionSnapshotJson: null, executionSnapshotStatus: null, executionSnapshotVersion: null, pricingSnapshotJson: null, createdBy: null },
            ],
            doctorId: "doctor_1",
            id: "work_order_1",
            patientId: "patient_1",
            patientName: "Ion Pop",
          })
          .mockResolvedValueOnce({
            activeCycle: { id: "cycle_3" },
            activeCycleId: "cycle_3",
            clinicId: "clinic_1",
            code: "WO-2026-000001",
            cycles: [
              { id: "cycle_1", cycleNumber: 1, reason: "INITIAL", reasonNotes: null, status: "CLOSED", openedAt: new Date(), closedAt: new Date(), clinic: clinic(), doctor: doctor(), executionLegalEntityCodeSnapshot: "NC", executionLegalEntityNameSnapshot: "Nicolaia Cristina", workflowExecution: null, logisticsState: null, deliveryPreparationItems: [], deadlineEffectiveDueAtSnapshot: null, deadlineModeSnapshot: "CALCULATED", deadlineSnapshotJson: null, executionSnapshotJson: null, executionSnapshotStatus: null, executionSnapshotVersion: null, pricingSnapshotJson: null, createdBy: null },
              { id: "cycle_2", cycleNumber: 2, reason: "REPAIR", reasonNotes: "Retur medic", status: "CLOSED", openedAt: new Date(), closedAt: new Date(), clinic: clinic(), doctor: doctor(), executionLegalEntityCodeSnapshot: "NC", executionLegalEntityNameSnapshot: "Nicolaia Cristina", workflowExecution: null, logisticsState: null, deliveryPreparationItems: [], deadlineEffectiveDueAtSnapshot: null, deadlineModeSnapshot: "CALCULATED", deadlineSnapshotJson: null, executionSnapshotJson: null, executionSnapshotStatus: null, executionSnapshotVersion: null, pricingSnapshotJson: null, createdBy: null },
              { id: "cycle_3", cycleNumber: 3, reason: "REPAIR", reasonNotes: "Retur 2", status: "ACTIVE", openedAt: new Date(), closedAt: null, clinic: clinic(), doctor: doctor(), executionLegalEntityCodeSnapshot: "NC", executionLegalEntityNameSnapshot: "Nicolaia Cristina", workflowExecution: null, logisticsState: null, deliveryPreparationItems: [], deadlineEffectiveDueAtSnapshot: null, deadlineModeSnapshot: "CALCULATED", deadlineSnapshotJson: null, executionSnapshotJson: null, executionSnapshotStatus: null, executionSnapshotVersion: null, pricingSnapshotJson: null, createdBy: null },
            ],
            doctorId: "doctor_1",
            id: "work_order_1",
            patientId: "patient_1",
            patientName: "Ion Pop",
          }),
      },
    };
    const workflowCreate = vi.fn().mockResolvedValue("workflow_cycle");
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
      clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_1", isActive: true }) },
      workOrder: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(beforeCycle1)
          .mockResolvedValueOnce(beforeCycle2),
      },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: false, effectiveScopes: [], permission: "pricing.read" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "cycles.create_next" }),
    }, undefined, undefined, undefined, undefined, { createSnapshotForWork: workflowCreate });

    const first = await service.createNextCycle(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      "work_order_1",
      { clinicId: "clinic_1", doctorId: "doctor_1", expectedActiveCycleId: "cycle_1", notes: "Retur medic", reason: "REPAIR" },
      false,
    );
    const second = await service.createNextCycle(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      "work_order_1",
      { clinicId: "clinic_1", doctorId: "doctor_1", expectedActiveCycleId: "cycle_2", notes: "Retur 2", reason: "REPAIR" },
      false,
    );

    expect(first.activeCycleId).toBe("cycle_2");
    expect(second.activeCycleId).toBe("cycle_3");
    expect(second.cycles.map((cycle) => cycle.cycleNumber)).toEqual([1, 2, 3]);
    expect(workflowCreate).toHaveBeenCalledTimes(2);
  });

  it("requires notes for OTHER return reason before creating a new cycle", async () => {
    const service = createService({
      workOrder: { findUnique: vi.fn().mockResolvedValue(workOrder()) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: false, effectiveScopes: [], permission: "pricing.read" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "cycles.create_next" }),
    });

    await expect(service.createNextCycle(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      "work_order_1",
      { clinicId: "clinic_1", doctorId: "doctor_1", expectedActiveCycleId: "cycle_1", reason: "OTHER" },
      false,
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects returned cycle doctor outside the selected clinic", async () => {
    const service = createService({
      clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      doctor: { findUnique: vi.fn().mockResolvedValue({ clinicId: "clinic_2", isActive: true }) },
      workOrder: { findUnique: vi.fn().mockResolvedValue(workOrder()) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: false, effectiveScopes: [], permission: "pricing.read" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "cycles.create_next" }),
    });

    await expect(service.createNextCycle(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      "work_order_1",
      { clinicId: "clinic_1", doctorId: "doctor_2", expectedActiveCycleId: "cycle_1", reason: "PROBA" },
      false,
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects inactive clinics for returned cycle registration", async () => {
    const service = createService({
      clinic: { findUnique: vi.fn().mockResolvedValue({ isActive: false }) },
      workOrder: { findUnique: vi.fn().mockResolvedValue(workOrder()) },
    }, {
      hasPermission: vi.fn().mockResolvedValue({ allowed: false, effectiveScopes: [], permission: "pricing.read" }),
      requirePermission: vi.fn().mockResolvedValue({ allowed: true, effectiveScopes: ["ALL"], permission: "cycles.create_next" }),
    });

    await expect(service.createNextCycle(
      { actorUserId: "actor_1", requestMetadata: {} },
      legalEntity,
      "work_order_1",
      { clinicId: "clinic_1", doctorId: "doctor_1", expectedActiveCycleId: "cycle_1", reason: "FINISHING" },
      false,
    )).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("work order helpers", () => {
  it("calculates totals and rejects invalid dates", () => {
    expect(calculateTotalPriceMinor(35000, 3)).toBe(105000);
    expect(() => parseDateOnly("not-a-date", true)).toThrow(BadRequestException);
  });
});

describe("CreateWorkDto", () => {
  it("validates required intake fields", async () => {
    const dto = plainToInstance(CreateWorkDto, {
      clinicId: "clinic_1",
      doctorId: "doctor_1",
      patientName: "",
      quantity: 0,
      requestedDeliveryDate: "2026-08-01",
      workTypeId: "work_type_1",
    });

    const fields = (await validate(dto)).map((error) => error.property);

    expect(fields).toContain("patientName");
    expect(fields).toContain("quantity");
  });
});

describe("CreateNextWorkCycleDto", () => {
  it("accepts all machine-readable return reasons added for reception returns", async () => {
    for (const reason of ["PROBA", "FINISHING", "ADJUSTMENT", "REPAIR", "REMAKE", "WARRANTY", "CLARIFICATION", "OTHER"] as const) {
      const dto = plainToInstance(CreateNextWorkCycleDto, {
        clinicId: "clinic_1",
        doctorId: "doctor_1",
        notes: reason === "OTHER" ? "Motiv detaliat" : undefined,
        reason,
      });

      const fields = (await validate(dto)).map((error) => error.property);

      expect(fields).not.toContain("reason");
    }
  });
});
