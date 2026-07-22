import { BadRequestException } from "@nestjs/common";
import type { LaboratorySettings } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import { DEFAULT_LABORATORY_SETTINGS, SETTINGS_SINGLETON_KEY } from "./settings.constants.js";
import { SettingsService } from "./settings.service.js";

const settings: LaboratorySettings = {
  addressLine1: null,
  addressLine2: null,
  city: "Bucuresti",
  companyRegistrationNumber: null,
  countryCode: "RO",
  countyOrRegion: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  currency: "RON",
  documentFooter: null,
  email: "contact@example.test",
  id: "settings_1",
  key: SETTINGS_SINGLETON_KEY,
  laboratoryName: "Dental Lab",
  legalName: null,
  locale: "ro-RO",
  logoFileKey: null,
  phone: "+40722111222",
  postalCode: null,
  primaryColor: "#0f766e",
  taxId: null,
  timezone: "Europe/Bucharest",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedByUserId: null,
  website: "https://example.test/",
};

function createService(prisma: unknown): SettingsService {
  return new SettingsService(prisma as PrismaService);
}

describe("SettingsService", () => {
  it("returns the singleton settings and creates defaults when missing", async () => {
    const upsert = vi.fn().mockResolvedValue(settings);
    const service = createService({
      laboratorySettings: {
        upsert,
      },
    });

    const result = await service.getSettings();

    expect(upsert).toHaveBeenCalledWith({
      create: DEFAULT_LABORATORY_SETTINGS,
      update: {},
      where: {
        key: SETTINGS_SINGLETON_KEY,
      },
    });
    expect(result).toMatchObject({
      email: "contact@example.test",
      laboratoryName: "Dental Lab",
    });
    expect(JSON.stringify(result)).not.toContain("key");
  });

  it("updates only provided fields and writes audit metadata", async () => {
    const after = {
      ...settings,
      email: "office@example.test",
      laboratoryName: "Updated Lab",
      updatedByUserId: "actor_1",
    };
    const auditCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue(after);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: {
            create: auditCreate,
          },
          laboratorySettings: {
            update,
            upsert: vi.fn().mockResolvedValue(settings),
          },
        }),
      ),
    });

    const result = await service.updateSettings(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      { email: "office@example.test", laboratoryName: "Updated Lab" },
    );

    expect(update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "office@example.test",
        laboratoryName: "Updated Lab",
        updatedByUserId: "actor_1",
      }),
      where: {
        key: SETTINGS_SINGLETON_KEY,
      },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "settings.updated",
        actorUserId: "actor_1",
        metadata: expect.objectContaining({
          fieldsChanged: ["email", "laboratoryName"],
        }),
      }),
    });
    expect(result.email).toBe("office@example.test");
  });

  it("rejects an empty update", async () => {
    const service = createService({});

    await expect(
      service.updateSettings({ actorUserId: "actor_1", requestMetadata: {} }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("UpdateSettingsDto", () => {
  it("rejects invalid controlled localization values", async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      countryCode: "Romania",
      currency: "ABC",
      locale: "zz-ZZ",
      timezone: "GMT+2",
      website: "ftp://example.test",
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toStrictEqual([
      "countryCode",
      "currency",
      "locale",
      "timezone",
      "website",
    ]);
  });

  it("normalizes optional contact fields", async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      countryCode: "ro",
      email: "  OFFICE@EXAMPLE.TEST ",
      primaryColor: " #ABCDEF ",
      website: "https://example.test",
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.countryCode).toBe("RO");
    expect(dto.email).toBe("office@example.test");
    expect(dto.primaryColor).toBe("#abcdef");
    expect(dto.website).toBe("https://example.test/");
  });
});
