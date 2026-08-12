import { HttpException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { QR_RESOLVE_LIMIT } from "./qr.constants.js";
import { QrRateLimitService } from "./qr-rate-limit.service.js";
import { parseQrLookup, QrService } from "./qr.service.js";
import { createPatientDisplay, toWorkQrView } from "./qr.view.js";

function qrWork(overrides: Partial<Parameters<typeof toWorkQrView>[0]> = {}): Parameters<typeof toWorkQrView>[0] {
  return {
    clinic: { name: "Clinica Test" },
    code: "WO-2026-000001",
    doctor: { displayName: "Dr. Ana Popescu" },
    id: "work_order_1",
    patientName: "Ion Popescu",
    patientReference: null,
    priority: "NORMAL",
    qrToken: "secure_token_12345678901234567890",
    quantity: 2,
    requestedDeliveryDate: new Date("2026-08-01T00:00:00.000Z"),
    workType: { name: "Coroana zirconiu" },
    ...overrides,
  };
}

describe("QR view helpers", () => {
  it("creates QR metadata without exposing the opaque token", () => {
    const view = toWorkQrView(qrWork());

    expect(JSON.stringify(view)).not.toContain("secure_token_12345678901234567890");
    expect(view.label.patientDisplay).toBe("I. P.");
  });

  it("prefers patient reference on printable labels", () => {
    expect(createPatientDisplay("Ion Popescu", "P-100")).toBe("P-100");
  });
});

describe("parseQrLookup", () => {
  it("accepts opaque QR payloads and work codes", () => {
    expect(parseQrLookup("dl-work:abcdefghijklmnopqrstuvwxyz123456")).toEqual({
      kind: "token",
      value: "abcdefghijklmnopqrstuvwxyz123456",
    });
    expect(parseQrLookup("WO-2026-000001")).toEqual({
      kind: "code",
      value: "WO-2026-000001",
    });
  });

  it("rejects malformed payloads uniformly", () => {
    expect(() => parseQrLookup("dl-work:bad token")).toThrow(NotFoundException);
    expect(() => parseQrLookup("Ion Popescu")).toThrow(NotFoundException);
  });
});

describe("QrRateLimitService", () => {
  it("limits repeated resolve attempts per key", () => {
    const service = new QrRateLimitService();

    for (let index = 0; index < QR_RESOLVE_LIMIT; index += 1) {
      service.assertAllowed("user_1:127.0.0.1");
    }

    expect(() => service.assertAllowed("user_1:127.0.0.1")).toThrow(HttpException);
  });
});

describe("QrService", () => {
  it("resolves QR payloads through an authorized backend lookup and masks pricing", async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const workOrder = {
      ...qrWork(),
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
      clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
      clinicId: "clinic_1",
      createdAt: new Date("2026-07-22T12:00:00.000Z"),
      createdByUserId: "actor_1",
      currency: "RON",
      doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
      doctorId: "doctor_1",
      executionLegalEntity: null,
      executionLegalEntityId: null,
      externalReference: null,
      internalNotes: null,
      logisticsState: null,
      patientReference: "P-100",
      qrCreatedAt: new Date("2026-07-22T12:00:00.000Z"),
      releaseReason: null,
      releasedAt: null,
      releasedByUserId: null,
      status: "REGISTERED",
      totalPriceMinor: 70000,
      updatedAt: new Date("2026-07-22T12:00:00.000Z"),
      updatedByUserId: "actor_1",
      version: 1,
      workType: { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu" },
      workTypeId: "work_type_1",
    };
    const service = new QrService(
      { hasPermission: vi.fn().mockResolvedValue({ allowed: false }) } as never,
      {
        auditLog: { create: auditCreate },
        workOrder: { findUnique: vi.fn().mockResolvedValue(workOrder) },
      } as never,
      { assertAllowed: vi.fn() } as never,
    );

    const result = await service.resolveQr(
      {
        actor: {
          displayName: "Receptie",
          email: "receptie@example.test",
          id: "actor_1",
          isActive: true,
          mustChangePassword: false,
          preferredColor: null,
        },
        requestMetadata: { ipAddress: "127.0.0.1", userAgent: "vitest" },
      },
      { payload: "dl-work:secure_token_12345678901234567890", source: "camera" },
    );

    expect(result.work.code).toBe("WO-2026-000001");
    expect(result.work.totalPriceMinor).toBeNull();
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "works.qr_resolved",
        metadata: {
          source: "camera",
          workCode: "WO-2026-000001",
        },
        resourceId: "work_order_1",
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain("secure_token_12345678901234567890");
  });

  it("keeps resolving the same QR payload against the current active cycle", async () => {
    const activeCycle = (version: number, cycleId: string) => ({
      executionSnapshot: {
        deadlineEffectiveDueAt: new Date("2026-07-29T14:00:00.000Z"),
        deadlineExplanation: "Termen calculat.",
        deadlineExecutionDays: 3,
        deadlineMode: "CALCULATED",
        deadlineStartAt: new Date("2026-07-22T12:00:00.000Z"),
        deadlineTimezone: "Europe/Bucharest",
        executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc" },
        pricingCurrency: "RON",
        pricingQuantity: 1,
        pricingSnapshotJson: null,
        pricingSourceLabel: "Catalog standard",
        pricingSourceType: "STANDARD",
        pricingTotalMinor: 35000,
        pricingUnit: "UNIT",
        pricingUnitPriceMinor: 35000,
        snapshotCreatedAt: new Date("2026-07-22T12:00:00.000Z"),
        snapshotLockedAt: new Date("2026-07-22T12:00:00.000Z"),
        status: "LOCKED",
        technician: { displayName: `Tehnician ${version}`, id: `tech_${version}`, preferredColor: "#0f766e" },
        version,
      },
      id: cycleId,
      logisticsState: null,
      workflowExecution: null,
    });
    const cycle1 = {
      ...qrWork(),
      activeCycle: activeCycle(1, "cycle_1"),
      assignedTechnician: null,
      assignedTechnicianId: null,
      assignmentEvents: [],
      assignmentUpdatedAt: null,
      baseUnitPriceMinor: 35000,
      calculatedDueAt: new Date("2026-07-27T14:00:00.000Z"),
      claimRevision: 0,
      claimSource: null,
      claimStatus: "UNCLAIMED",
      clinic: { code: "CL-0001", id: "clinic_1", name: "Clinica Test" },
      clinicId: "clinic_1",
      createdAt: new Date("2026-07-22T12:00:00.000Z"),
      createdByUserId: "actor_1",
      currency: "RON",
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
      doctor: { displayName: "Dr. Ana Popescu", id: "doctor_1" },
      doctorId: "doctor_1",
      effectiveDueAt: new Date("2026-07-27T14:00:00.000Z"),
      executionLegalEntity: null,
      executionLegalEntityId: null,
      externalReference: null,
      id: "work_order_1",
      internalNotes: null,
      invoicedDocumentId: null,
      logisticsState: null,
      patient: null,
      patientId: "patient_1",
      patientName: "Ion Popescu",
      patientReference: "P-100",
      priority: "NORMAL",
      qrCreatedAt: new Date("2026-07-22T12:00:00.000Z"),
      qrToken: "secure_token_12345678901234567890",
      quantity: 1,
      releaseReason: null,
      releasedAt: null,
      releasedByUserId: null,
      requestedDeliveryDate: new Date("2026-08-01T00:00:00.000Z"),
      status: "REGISTERED",
      totalPriceMinor: 35000,
      updatedAt: new Date("2026-07-22T12:00:00.000Z"),
      updatedByUserId: "actor_1",
      version: 1,
      workType: { code: "WT-0001", id: "work_type_1", name: "Coroana zirconiu" },
      workTypeId: "work_type_1",
    };
    const cycle2 = {
      ...cycle1,
      activeCycle: activeCycle(2, "cycle_2"),
    };
    const service = new QrService(
      { hasPermission: vi.fn().mockResolvedValue({ allowed: false }) } as never,
      {
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        workOrder: {
          findUnique: vi.fn()
            .mockResolvedValueOnce(cycle1)
            .mockResolvedValueOnce(cycle2),
        },
      } as never,
      { assertAllowed: vi.fn() } as never,
    );

    const first = await service.resolveQr(
      {
        actor: {
          displayName: "Receptie",
          email: "receptie@example.test",
          id: "actor_1",
          isActive: true,
          mustChangePassword: false,
          preferredColor: null,
        },
        requestMetadata: { ipAddress: "127.0.0.1", userAgent: "vitest" },
      },
      { payload: "dl-work:secure_token_12345678901234567890", source: "manual" },
    );
    const second = await service.resolveQr(
      {
        actor: {
          displayName: "Receptie",
          email: "receptie@example.test",
          id: "actor_1",
          isActive: true,
          mustChangePassword: false,
          preferredColor: null,
        },
        requestMetadata: { ipAddress: "127.0.0.1", userAgent: "vitest" },
      },
      { payload: "dl-work:secure_token_12345678901234567890", source: "manual" },
    );

    expect(first.work.executionSnapshot.summary.version).toBe(1);
    expect(second.work.executionSnapshot.summary.version).toBe(2);
  });
});
