import { describe, expect, it } from "vitest";

import {
  EXECUTION_SNAPSHOT_VERSION,
  buildDeadlineSnapshot,
  buildExecutionContextSnapshot,
  buildPricingSnapshot,
  getPricingSourceLabel,
  getPricingSourceType,
} from "./work-execution-snapshot.js";

describe("work execution snapshot mappers", () => {
  it("builds a versioned standard catalog pricing snapshot with minor units", () => {
    const snapshot = buildPricingSnapshot({
      adjustment: { basisPoints: null, fixedAmountMinor: null, overridePriceMinor: null, type: null },
      appliedAgreementId: null,
      appliedAgreementType: null,
      appliedRuleScope: null,
      catalogItemId: "catalog_1",
      currency: "RON",
      executionTimeRule: null,
      executionTimeRules: [],
      explanation: "Se folosește prețul standard al firmei active.",
      finalUnitPriceMinor: 450000,
      legalEntityCode: "NC",
      quantity: 2,
      resolutionTrace: ["Catalog NC găsit."],
      standardUnitPriceMinor: 450000,
      totalPriceMinor: 900000,
      workTypeId: "work_type_1",
    }, "ELEMENT", new Date("2026-07-29T10:00:00.000Z"));

    expect(snapshot).toMatchObject({
      currency: "RON",
      quantity: 2,
      totalPriceMinor: 900000,
      unitPriceMinor: 450000,
      version: EXECUTION_SNAPSHOT_VERSION,
    });
    expect(snapshot).not.toHaveProperty("patientName");
  });

  it("labels agreement precedence sources", () => {
    const baseResolution = {
      adjustment: { basisPoints: null, fixedAmountMinor: null, overridePriceMinor: null, type: null },
      appliedRuleScope: "ITEM",
      catalogItemId: "catalog_1",
      currency: "RON",
      executionTimeRule: null,
      executionTimeRules: [],
      explanation: "S-a aplicat acordul.",
      finalUnitPriceMinor: 10000,
      legalEntityCode: "NG",
      quantity: 1,
      resolutionTrace: [],
      standardUnitPriceMinor: 12000,
      totalPriceMinor: 10000,
      workTypeId: "work_type_1",
    } as const;

    expect(getPricingSourceType({ ...baseResolution, appliedAgreementId: "agreement_doctor", appliedAgreementType: "DOCTOR" })).toBe("DOCTOR_AGREEMENT");
    expect(getPricingSourceLabel({ ...baseResolution, appliedAgreementId: "agreement_clinic", appliedAgreementType: "CLINIC" })).toBe("Acord clinică");
  });

  it("builds calculated and unresolved deadline snapshots with version", () => {
    const calculated = buildDeadlineSnapshot({
      calculatedDueAt: new Date("2026-08-03T14:00:00.000Z"),
      deadlineCalculatedAt: new Date("2026-07-29T10:00:00.000Z"),
      deadlineDueHour: 17,
      deadlineDueMinute: 0,
      deadlineExecutionDays: 3,
      deadlineExplanation: "Termen calculat.",
      deadlineIncludeStartDay: false,
      deadlineLockedAt: null,
      deadlineLockedReason: null,
      deadlineMode: "CALCULATED",
      deadlineReasonCode: null,
      deadlineRuleSnapshot: { version: 1 },
      deadlineSource: "FUTURE_TECH_CLAIM",
      deadlineStartAt: new Date("2026-07-29T10:00:00.000Z"),
      deadlineTimezone: "Europe/Bucharest",
      effectiveDueAt: new Date("2026-08-03T14:00:00.000Z"),
      manualDueAt: null,
    }, new Date("2026-07-29T10:00:00.000Z"));

    expect(calculated).toMatchObject({
      effectiveDueAt: "2026-08-03T14:00:00.000Z",
      mode: "CALCULATED",
      version: 1,
    });
  });

  it("builds a context snapshot without private patient or auth data", () => {
    const snapshot = buildExecutionContextSnapshot({
      claim: { claimedAt: new Date("2026-07-29T10:00:00.000Z"), revision: 1, source: "TECHNICIAN_FIRST_CLAIM" },
      legalEntity: { code: "CDT", displayName: "Nicolaie Cristina", publicId: "legal_cdt" },
      technician: { displayName: "Tehnician Demo", publicId: "user_1" },
      work: {
        clinicName: "Clinica Demo",
        clinicPublicId: "clinic_1",
        doctorName: "Dr. Demo",
        doctorPublicId: "doctor_1",
        quantity: 1,
        workCode: "WO-2026-000001",
        workTypeCode: "WT-1",
        workTypeName: "Coroană",
        workTypePublicId: "work_type_1",
      },
    });

    expect(snapshot).toMatchObject({ version: 1 });
    expect(JSON.stringify(snapshot)).not.toContain("password");
    expect(JSON.stringify(snapshot)).not.toContain("cookie");
    expect(JSON.stringify(snapshot)).not.toContain("CNP");
  });
});
