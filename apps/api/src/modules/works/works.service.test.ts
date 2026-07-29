import { BadRequestException } from "@nestjs/common";
import type { Clinic, Doctor, Patient, WorkOrder, WorkType } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import type { PatientsService } from "../patients/patients.service.js";
import type { WorkQrTokenService } from "../qr/work-qr-token.service.js";
import type { WorkFormSubmissionValidationService } from "../work-forms/work-form-submission-validation.service.js";
import type { WorkflowExecutionService } from "../workflow-execution/workflow-execution.service.js";
import { CreateWorkDto } from "./dto/works.dto.js";
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
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
    description: null,
    id: "work_type_1",
    isActive: true,
    name: "Coroana zirconiu",
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
    birthDate: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
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

function workOrder(overrides: Partial<WorkOrder> = {}) {
  return {
    baseUnitPriceMinor: 35000,
    clinicalNotes: null,
    clinic: clinic(),
    clinicId: "clinic_1",
    code: "WO-2026-000001",
    createdAt: new Date("2026-07-22T12:00:00.000Z"),
    createdByUserId: "actor_1",
    currency: "RON",
    doctor: doctor(),
    doctorId: "doctor_1",
    externalReference: null,
    id: "work_order_1",
    internalNotes: null,
    patient: patient(),
    patientId: "patient_1",
    patientName: "Ion Pop",
    patientReference: "P-100",
    priority: "NORMAL",
    qrCreatedAt: new Date("2026-07-22T12:00:00.000Z"),
    qrToken: "qr_token_1",
    quantity: 2,
    requestedDeliveryDate: new Date("2026-08-01T00:00:00.000Z"),
    status: "REGISTERED",
    totalPriceMinor: 70000,
    updatedAt: new Date("2026-07-22T12:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    workFormSubmission: null,
    workType: workType(),
    workTypeId: "work_type_1",
    ...overrides,
  };
}

function createService(
  prisma: unknown,
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
): WorksService {
  return new WorksService(
    prisma as PrismaService,
    patientsService as PatientsService,
    codeService as WorkOrderCodeService,
    qrTokenService as WorkQrTokenService,
    submissionValidationService as WorkFormSubmissionValidationService,
    workflowExecutionService as WorkflowExecutionService,
  );
}

const createDto = {
  clinicId: "clinic_1",
  doctorId: "doctor_1",
  patientId: "patient_1",
  patientReference: "P-100",
  priority: "NORMAL",
  quantity: 2,
  requestedDeliveryDate: "2026-08-01",
  workTypeId: "work_type_1",
} as const;

describe("WorksService", () => {
  it("creates a REGISTERED work order with immutable pricing snapshot and audit", async () => {
    const createdWorkOrder = workOrder();
    const auditCreate = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue(createdWorkOrder);
    const codeService = { generate: vi.fn().mockResolvedValue("WO-2026-000001") };
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
          workOrder: { create, findUniqueOrThrow: vi.fn().mockResolvedValue(createdWorkOrder) },
          workType: { findUnique: vi.fn().mockResolvedValue({ basePriceMinor: 35000, isActive: true }) },
        }),
      ),
    }, undefined, codeService, qrTokenService);

    const result = await service.createWork(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      createDto,
    );

    expect(codeService.generate).toHaveBeenCalled();
    expect(qrTokenService.generate).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        baseUnitPriceMinor: 35000,
        code: "WO-2026-000001",
        currency: "RON",
        patientId: "patient_1",
        patientName: "Ion Pop",
        qrToken: "qr_token_1",
        quantity: 2,
        status: "REGISTERED",
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
    expect(result.status).toBe("REGISTERED");
    expect(result.totalPriceMinor).toBe(70000);
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

    await expect(service.createWork({ actorUserId: "actor_1", requestMetadata: {} }, createDto)).rejects.toBeInstanceOf(BadRequestException);
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

    await expect(service.createWork({ actorUserId: "actor_1", requestMetadata: {} }, createDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("masks pricing for readers without pricing.read", async () => {
    const service = createService({
      workOrder: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([workOrder()]),
      },
      $transaction: vi.fn((operations: readonly Promise<unknown>[]) => Promise.all(operations)),
    });

    const result = await service.listWorks({ page: 1, pageSize: 20, sortBy: "createdAt", sortDirection: "desc" }, false);

    expect(result.items[0]?.currency).toBeNull();
    expect(result.items[0]?.totalPriceMinor).toBeNull();
  });

  it("keeps existing pricing snapshot when catalog price changes later", async () => {
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

    await service.updateWork({ actorUserId: "actor_1", requestMetadata: {} }, "work_order_1", { quantity: 3 });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        quantity: 3,
        totalPriceMinor: 105000,
      }),
    }));
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
