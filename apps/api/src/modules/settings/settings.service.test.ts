import { BadRequestException, UnprocessableEntityException } from "@nestjs/common";
import type { LegalEntitySettings } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import { SettingsService } from "./settings.service.js";

const baseSettings: LegalEntitySettings = {
  addressLine1: "Strada NC",
  addressLine2: null,
  bankName: "Banca NC",
  city: "Bucuresti",
  companyRegistrationNumber: "J40/1/2026",
  countryCode: "RO",
  countyOrRegion: "Bucuresti",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  currency: "RON",
  documentFooter: null,
  email: "nc@example.test",
  iban: "RO49AAAA1B31007593840000",
  id: "settings_nc",
  legalEntityId: "legal_nc",
  largeOutstandingThresholdMinor: null,
  legalName: "NC Demo Tehnică Dentară",
  locale: "ro-RO",
  logoFileKey: null,
  phone: "+40722111222",
  postalCode: "010101",
  primaryColor: "#0f766e",
  taxId: "RO90000001",
  timezone: "Europe/Bucharest",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedByUserId: null,
  website: "https://nc.example.test/",
};

function withLegalEntity(settings: LegalEntitySettings, code: "NC" | "NG", displayName: string) {
  return {
    ...settings,
    legalEntity: {
      code,
      displayName,
    },
  };
}

function createService(prisma: unknown): SettingsService {
  return new SettingsService(prisma as PrismaService);
}

describe("SettingsService", () => {
  it("returns settings for the active legal entity without internal IDs", async () => {
    const upsert = vi.fn().mockResolvedValue(withLegalEntity(baseSettings, "NC", "Nicolaie Cristina"));
    const service = createService({
      laboratorySettings: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      legalEntity: {
        findFirst: vi.fn().mockResolvedValue({
          code: "NC",
          displayName: "Nicolaie Cristina",
          id: "legal_nc",
          isActive: true,
        }),
      },
      legalEntitySettings: {
        upsert,
      },
    });

    const result = await service.getSettings({ code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc" });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { legalEntityId: "legal_nc" },
    }));
    expect(result).toMatchObject({
      email: "nc@example.test",
      legalEntityCode: "NC",
      legalEntityDisplayName: "Nicolaie Cristina",
      legalName: "NC Demo Tehnică Dentară",
    });
    expect(JSON.stringify(result)).not.toContain("settings_nc");
    expect(JSON.stringify(result)).not.toContain("legal_nc");
  });

  it("updates only the active legal entity and writes safe audit metadata", async () => {
    const after = withLegalEntity({
      ...baseSettings,
      iban: "RO98BBBB1B31007593840000",
      legalName: "NC Actualizat",
      updatedByUserId: "actor_1",
    }, "NC", "Nicolaie Cristina");
    const auditCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue(after);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: {
            create: auditCreate,
          },
          laboratorySettings: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
          legalEntity: {
            findFirst: vi.fn().mockResolvedValue({
              code: "NC",
              displayName: "Nicolaie Cristina",
              id: "legal_nc",
              isActive: true,
            }),
          },
          legalEntitySettings: {
            update,
            upsert: vi.fn().mockResolvedValue(withLegalEntity(baseSettings, "NC", "Nicolaie Cristina")),
          },
        }),
      ),
    });

    const result = await service.updateSettings(
      {
        actorUserId: "actor_1",
        legalEntity: { code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc" },
        requestMetadata: { ipAddress: "127.0.0.1" },
      },
      { iban: "RO98BBBB1B31007593840000", legalName: "NC Actualizat" },
    );

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        iban: "RO98BBBB1B31007593840000",
        legalName: "NC Actualizat",
        updatedByUserId: "actor_1",
      }),
      where: {
        legalEntityId: "legal_nc",
      },
    }));
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "settings.updated",
        actorUserId: "actor_1",
        metadata: expect.objectContaining({
          changedFields: ["iban", "legalName"],
          legalEntityCode: "NC",
        }),
        resourceId: "NC",
        resourceType: "legal_entity_settings",
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain("RO98BBBB1B31007593840000");
    expect(result.legalName).toBe("NC Actualizat");
  });

  it("rejects an empty update", async () => {
    const service = createService({});

    await expect(
      service.updateSettings({
        actorUserId: "actor_1",
        legalEntity: { code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc" },
        requestMetadata: {},
      }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects context spoofing fields even outside the controller", async () => {
    const service = createService({});

    await expect(
      service.updateSettings({
        actorUserId: "actor_1",
        legalEntity: { code: "NC", displayName: "Nicolaie Cristina", id: "legal_nc" },
        requestMetadata: {},
      }, { legalEntityCode: "NG" } as UpdateSettingsDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an inactive or missing context", async () => {
    const service = createService({
      legalEntity: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(service.getSettings({ code: "NG", displayName: "Nicolaie Gabriel", id: "legal_ng" })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe("UpdateSettingsDto", () => {
  it("rejects invalid controlled legal and localization values", async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      companyRegistrationNumber: "invalid",
      countryCode: "Romania",
      currency: "ABC",
      iban: "not-an-iban",
      locale: "zz-ZZ",
      taxId: "abc",
      timezone: "GMT+2",
      website: "ftp://example.test",
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toStrictEqual([
      "companyRegistrationNumber",
      "countryCode",
      "currency",
      "iban",
      "locale",
      "taxId",
      "timezone",
      "website",
    ]);
  });

  it("normalizes optional contact and fiscal fields", async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      countryCode: "ro",
      email: "  OFFICE@EXAMPLE.TEST ",
      iban: " ro49 aaaa 1b31 0075 9384 0000 ",
      primaryColor: " #ABCDEF ",
      taxId: " ro90000001 ",
      website: "https://example.test",
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.countryCode).toBe("RO");
    expect(dto.email).toBe("office@example.test");
    expect(dto.iban).toBe("RO49AAAA1B31007593840000");
    expect(dto.primaryColor).toBe("#abcdef");
    expect(dto.taxId).toBe("RO90000001");
    expect(dto.website).toBe("https://example.test/");
  });
});
