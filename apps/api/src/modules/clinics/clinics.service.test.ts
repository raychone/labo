import { BadRequestException } from "@nestjs/common";
import type { Clinic } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { ClinicsService } from "./clinics.service.js";
import { DoctorsService } from "./doctors.service.js";

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
    contactPersonName: "Reception",
    contactPersonPhone: null,
    contactPersonRole: null,
    countryCode: "RO",
    countyOrRegion: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
    email: "clinic@example.test",
    id: "clinic_1",
    internalNotes: null,
    isActive: true,
    legalName: null,
    name: "Clinica Test",
    phone: "+40722111222",
    postalCode: null,
    registrationNumber: null,
    taxId: "RO123",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedByUserId: "actor_1",
    version: 1,
    website: null,
    ...overrides,
  };
}

function createClinicsService(prisma: unknown): ClinicsService {
  return new ClinicsService(prisma as PrismaService);
}

function createDoctorsService(prisma: unknown): DoctorsService {
  return new DoctorsService(prisma as PrismaService);
}

describe("ClinicsService", () => {
  it("creates a clinic with a generated code and audit entry", async () => {
    const createdClinic = clinic();
    const auditCreate = vi.fn().mockResolvedValue({});
    const clinicCreate = vi.fn().mockResolvedValue(createdClinic);
    const service = createClinicsService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $queryRaw: vi.fn().mockResolvedValue([{ nextval: 1n }]),
          auditLog: {
            create: auditCreate,
          },
          clinic: {
            create: clinicCreate,
          },
        }),
      ),
    });

    const result = await service.createClinic(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      { name: "Clinica Test", phone: "+40722111222" },
    );

    expect(clinicCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "CL-0001",
        createdByUserId: "actor_1",
        name: "Clinica Test",
      }),
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "clinics.created",
        actorUserId: "actor_1",
        resourceId: "clinic_1",
        resourceType: "clinic",
      }),
    });
    expect(result).toMatchObject({ code: "CL-0001", id: "clinic_1", name: "Clinica Test" });
  });
});

describe("DoctorsService", () => {
  it("rejects creating a doctor for an archived clinic", async () => {
    const service = createDoctorsService({
      clinic: {
        findUnique: vi.fn().mockResolvedValue({ isActive: false }),
      },
    });

    await expect(
      service.createDoctor(
        { actorUserId: "actor_1", requestMetadata: {} },
        { clinicId: "clinic_1", firstName: "Ana", lastName: "Popescu" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
