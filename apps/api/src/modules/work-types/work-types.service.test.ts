import { BadRequestException } from "@nestjs/common";
import type { WorkType } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../database/prisma.service.js";
import { CreateWorkTypeDto } from "./dto/work-types.dto.js";
import type { WorkTypeCodeService } from "./work-type-code.service.js";
import { WorkTypesService } from "./work-types.service.js";

function workType(overrides: Partial<WorkType> = {}): WorkType {
  return {
    archivedAt: null,
    archivedByUserId: null,
    basePriceMinor: 35000,
    code: "WT-0001",
    colorHex: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByUserId: "actor_1",
    description: "Coroana zirconiu",
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

function createService(prisma: unknown, codeService: unknown = { generate: vi.fn().mockResolvedValue("WT-0001") }): WorkTypesService {
  return new WorkTypesService(prisma as PrismaService, codeService as WorkTypeCodeService);
}

describe("WorkTypesService", () => {
  it("creates and reuses an unpriced operational catalog name", async () => {
    const created = workType({ basePriceMinor: null, code: "CU-ABC", name: "Gutieră specială", symbol: "custom-ABC" });
    const findFirst = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(created);
    const create = vi.fn().mockResolvedValue(created);
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        workType: { create, findFirst },
      })),
    });

    const result = await service.saveOperationalNameToCatalog({ actorUserId: "actor_1", requestMetadata: {} }, "  Gutieră   specială ");

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ basePriceMinor: null, name: "Gutieră specială" }) });
    expect(result.name).toBe("Gutieră specială");
  });

  it("propagates only the first configured price to unresolved active items", async () => {
    const before = workType({ basePriceMinor: null });
    const after = workType({ basePriceMinor: 35000, version: 2 });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        workOrderItem: { findMany: vi.fn().mockResolvedValue([{ workOrder: { code: "WO-1" } }]), updateMany },
        workType: { update: vi.fn().mockResolvedValue(after) },
      })),
      workType: { findUnique: vi.fn().mockResolvedValue(before) },
    });

    await service.updateWorkType({ actorUserId: "actor_1", requestMetadata: {} }, "work_type_1", { basePriceMinor: 35000 });

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ archivedAt: null, baseUnitPriceMinor: null, commercialSnapshot: { equals: expect.anything() }, totalPriceMinor: null, workTypeId: "work_type_1" }) }));
  });

  it("creates a work type with a generated immutable code and audit entry", async () => {
    const createdWorkType = workType();
    const auditCreate = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue(createdWorkType);
    const codeService = { generate: vi.fn().mockResolvedValue("WT-0001") };
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          workType: { create },
        }),
      ),
    }, codeService);

    const result = await service.createWorkType(
      { actorUserId: "actor_1", requestMetadata: { ipAddress: "127.0.0.1" } },
      { basePriceMinor: 35000, name: "Coroana zirconiu", symbol: "Zr", unit: "UNIT" },
    );

    expect(codeService.generate).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        basePriceMinor: 35000,
        code: "WT-0001",
        createdByUserId: "actor_1",
        name: "Coroana zirconiu",
        symbol: "Zr",
      }),
    });
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("basePrice");
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "work_types.created",
        resourceId: "work_type_1",
        resourceType: "work_type",
      }),
    });
    expect(result.code).toBe("WT-0001");
  });

  it("audits price changes with old and new minor unit values", async () => {
    const before = workType();
    const after = workType({ basePriceMinor: 37500, version: 2 });
    const auditCreate = vi.fn().mockResolvedValue({});
    const service = createService({
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          auditLog: { create: auditCreate },
          workType: {
            update: vi.fn().mockResolvedValue(after),
          },
        }),
      ),
      workType: {
        findUnique: vi.fn().mockResolvedValue(before),
      },
    });

    await service.updateWorkType(
      { actorUserId: "actor_1", requestMetadata: {} },
      "work_type_1",
      { basePriceMinor: 37500 },
    );

    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "work_types.price_updated",
        metadata: expect.objectContaining({
          newBasePriceMinor: 37500,
          oldBasePriceMinor: 35000,
        }),
      }),
    });
  });

  it("returns only active work types from options", async () => {
    const service = createService({
      workType: {
        findMany: vi.fn().mockResolvedValue([workType({ id: "active_1" })]),
      },
    });

    const result = await service.listWorkTypeOptions();

    expect(result).toStrictEqual([
      {
        basePriceMinor: 35000,
        code: "WT-0001",
        id: "active_1",
        name: "Coroana zirconiu",
        symbol: "Zr",
        unit: "UNIT",
      },
    ]);
  });

  it("rejects editing archived work types", async () => {
    const service = createService({
      workType: {
        findUnique: vi.fn().mockResolvedValue(workType({ archivedAt: new Date(), isActive: false })),
      },
    });

    await expect(
      service.updateWorkType({ actorUserId: "actor_1", requestMetadata: {} }, "work_type_1", { name: "Nou" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("CreateWorkTypeDto", () => {
  it("rejects negative or non-integer minor unit prices", async () => {
    const negative = plainToInstance(CreateWorkTypeDto, { basePriceMinor: -1, name: "Test", symbol: "T", unit: "UNIT" });
    const decimal = plainToInstance(CreateWorkTypeDto, { basePriceMinor: 12.5, name: "Test", symbol: "T", unit: "UNIT" });

    expect((await validate(negative)).map((error) => error.property)).toContain("basePriceMinor");
    expect((await validate(decimal)).map((error) => error.property)).toContain("basePriceMinor");
  });
});
