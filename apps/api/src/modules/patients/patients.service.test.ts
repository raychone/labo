import { BadRequestException } from "@nestjs/common";
import type { Patient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { PatientsService, normalizePatientName, normalizeSearch } from "./patients.service.js";

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    archivedAt: null,
    archivedByUserId: null,
    birthDate: null,
    createdAt: new Date("2026-07-29T00:00:00.000Z"),
    createdByUserId: "actor_1",
    firstName: "Maria",
    id: "patient_1",
    isArchived: false,
    lastName: "Popescu",
    normalizedFirstName: "maria",
    normalizedLastName: "popescu",
    notes: null,
    sex: "UNSPECIFIED",
    updatedAt: new Date("2026-07-29T00:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    ...overrides,
  };
}

function createService(prisma: unknown): PatientsService {
  return new PatientsService(prisma as PrismaService);
}

describe("PatientsService", () => {
  it("normalizes patient names without changing display values", () => {
    expect(normalizeSearch("  Ștefan   Țară  ")).toBe("stefan tara");
    expect(normalizePatientName("Ștefan", "Țară")).toStrictEqual({ firstName: "stefan", lastName: "tara" });
  });

  it("creates a minimal patient and audits without personal payload details", async () => {
    const created = patient({ firstName: "Ion", lastName: "Radu", normalizedFirstName: "ion", normalizedLastName: "radu" });
    const auditCreate = vi.fn().mockResolvedValue({});
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          patient: { create: vi.fn().mockResolvedValue(created) },
        }),
      ),
      patient: { findUnique: vi.fn().mockResolvedValue(created) },
      workOrder: { findMany: vi.fn().mockResolvedValue([]) },
    });

    const result = await service.createPatient(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      { firstName: "Ion", lastName: "Radu", sex: "UNSPECIFIED" },
    );

    expect(result.overview.fullName).toBe("Ion Radu");
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "patient.created",
        metadata: { hasBirthDate: false, hasNotes: false },
        resourceId: "patient_1",
        resourceType: "patient",
      }),
    });
  });

  it("returns patient options without notes or documents", async () => {
    const service = createService({
      patient: {
        findMany: vi.fn().mockResolvedValue([patient({ notes: "Nu trebuie expus" })]),
      },
      workOrder: {
        groupBy: vi.fn().mockResolvedValue([{ _count: { _all: 2 }, patientId: "patient_1" }]),
      },
    });

    const result = await service.listPatientOptions({ limit: 10, search: "Maria" });

    expect(result).toStrictEqual([
      {
        birthDate: null,
        firstName: "Maria",
        fullName: "Maria Popescu",
        id: "patient_1",
        lastName: "Popescu",
        workCount: 2,
      },
    ]);
  });

  it("rejects archived patients for new work orders", async () => {
    const service = createService({
      patient: { findUnique: vi.fn().mockResolvedValue(patient({ isArchived: true })) },
    });

    const client = { patient: { findUnique: vi.fn().mockResolvedValue(patient({ isArchived: true })) } } as unknown as PrismaService;

    await expect(service.findActivePatientOrThrow(client, "patient_1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
