import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { BusinessCalendarService } from "../deadlines/business-calendar.service.js";
import { DeadlineEngineService } from "../deadlines/deadline-engine.service.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { PricingResolverService } from "../pricing/pricing-resolver.service.js";
import { WorkDeadlineService } from "./work-deadline.service.js";

function createService(pricingResolver: Pick<PricingResolverService, "resolve">): WorkDeadlineService {
  const calendar = new BusinessCalendarService();
  const prisma = {
    legalEntitySettings: {
      findUnique: vi.fn().mockResolvedValue({ timezone: "Europe/Bucharest" }),
    },
  } as unknown as PrismaService;

  return new WorkDeadlineService(
    calendar,
    new DeadlineEngineService(calendar),
    pricingResolver as PricingResolverService,
    prisma,
  );
}

describe("WorkDeadlineService", () => {
  it("returns an unresolved preview when no pricing catalog item exists for deadline rules", async () => {
    const service = createService({
      resolve: vi.fn().mockRejectedValue(new NotFoundException("Nu există preț standard activ pentru firma activă și tipul de lucrare.")),
    });

    await expect(service.preview({
      clinicId: "clinic_1",
      doctorId: "doctor_1",
      legalEntity: { code: "NC", displayName: "Nicolaie Cristina", id: "legal_entity_nc" },
      now: new Date("2026-07-29T10:00:00.000Z"),
      quantity: 2,
      startAt: "2026-07-29T10:00:00.000Z",
      workTypeId: "work_type_without_catalog",
    })).resolves.toMatchObject({
      calculatedDueAt: null,
      effectiveDueAt: null,
      mode: "UNRESOLVED",
      reasonCode: "NO_EXECUTION_RULE",
      sourceSummary: {
        executionRuleSource: "NONE",
        pricingSource: "NONE",
      },
    });
  });
});
