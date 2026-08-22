import type { Prisma } from "@prisma/client";

import type { PricingResolution } from "../pricing/pricing-resolver.service.js";
import type { WorkDeadlineData } from "./work-deadline.service.js";

export const EXECUTION_SNAPSHOT_VERSION = 1;

export type ExecutionSnapshotSource = "MANAGER_ASSIGNMENT" | "TECHNICIAN_FIRST_CLAIM";

export interface ExecutionSnapshotWorkContext {
  readonly clinicName: string;
  readonly clinicPublicId: string | null;
  readonly doctorName: string;
  readonly doctorPublicId: string | null;
  readonly quantity: number;
  readonly workCode: string;
  readonly workTypeCode: string;
  readonly workTypeName: string;
  readonly workTypePublicId: string;
}

export interface ExecutionSnapshotLegalEntityContext {
  readonly code: "CDT" | "NG";
  readonly displayName: string;
  readonly publicId: string;
}

export interface ExecutionSnapshotTechnicianContext {
  readonly displayName: string;
  readonly publicId: string;
}

export interface ExecutionClaimContext {
  readonly claimedAt: Date;
  readonly revision: number;
  readonly source: ExecutionSnapshotSource;
}

export function buildPricingSnapshot(resolution: PricingResolution, unit: string | null, resolvedAt: Date): Prisma.InputJsonObject {
  return {
    adjustment: {
      basisPoints: resolution.adjustment.basisPoints,
      fixedAmountMinor: resolution.adjustment.fixedAmountMinor,
      overridePriceMinor: resolution.adjustment.overridePriceMinor,
      type: resolution.adjustment.type,
    },
    catalogItemPublicId: resolution.catalogItemId,
    currency: resolution.currency,
    legalEntityCode: resolution.legalEntityCode,
    explanation: resolution.explanation,
    priceSource: {
      agreementPublicId: resolution.appliedAgreementId,
      ruleScope: resolution.appliedRuleScope,
      sourceLabel: getPricingSourceLabel(resolution),
      sourceType: getPricingSourceType(resolution),
    },
    quantity: resolution.quantity,
    resolutionTrace: [...resolution.resolutionTrace],
    resolvedAt: resolvedAt.toISOString(),
    standardUnitPriceMinor: resolution.standardUnitPriceMinor,
    totalPriceMinor: resolution.totalPriceMinor,
    unit,
    unitPriceMinor: resolution.finalUnitPriceMinor,
    version: EXECUTION_SNAPSHOT_VERSION,
    workTypePublicId: resolution.workTypeId,
  };
}

export function buildDeadlineSnapshot(deadline: WorkDeadlineData, resolvedAt: Date): Prisma.InputJsonObject {
  return {
    calculatedDueAt: deadline.calculatedDueAt?.toISOString() ?? null,
    dueHour: deadline.deadlineDueHour,
    dueMinute: deadline.deadlineDueMinute,
    effectiveDueAt: deadline.effectiveDueAt?.toISOString() ?? null,
    executionDays: deadline.deadlineExecutionDays,
    explanation: deadline.deadlineExplanation,
    includeStartDay: deadline.deadlineIncludeStartDay,
    lockedAt: deadline.deadlineLockedAt?.toISOString() ?? null,
    lockedReason: deadline.deadlineLockedReason,
    manualDueAt: deadline.manualDueAt?.toISOString() ?? null,
    mode: deadline.deadlineMode,
    reasonCode: deadline.deadlineReasonCode,
    resolvedAt: resolvedAt.toISOString(),
    ruleSnapshot: deadline.deadlineRuleSnapshot,
    source: deadline.deadlineSource,
    startAt: deadline.deadlineStartAt.toISOString(),
    timezone: deadline.deadlineTimezone,
    version: EXECUTION_SNAPSHOT_VERSION,
  };
}

export function buildExecutionContextSnapshot(input: {
  readonly claim: ExecutionClaimContext;
  readonly legalEntity: ExecutionSnapshotLegalEntityContext;
  readonly technician: ExecutionSnapshotTechnicianContext;
  readonly work: ExecutionSnapshotWorkContext;
}): Prisma.InputJsonObject {
  return {
    claim: {
      claimedAt: input.claim.claimedAt.toISOString(),
      revision: input.claim.revision,
      source: input.claim.source,
    },
    executionLegalEntity: {
      code: input.legalEntity.code,
      displayName: input.legalEntity.displayName,
      publicId: input.legalEntity.publicId,
    },
    technician: {
      displayName: input.technician.displayName,
      publicId: input.technician.publicId,
    },
    version: EXECUTION_SNAPSHOT_VERSION,
    work: {
      clinicName: input.work.clinicName,
      clinicPublicId: input.work.clinicPublicId,
      doctorName: input.work.doctorName,
      doctorPublicId: input.work.doctorPublicId,
      quantity: input.work.quantity,
      workCode: input.work.workCode,
      workTypeCode: input.work.workTypeCode,
      workTypeName: input.work.workTypeName,
      workTypePublicId: input.work.workTypePublicId,
    },
  };
}

export function getPricingSourceType(resolution: PricingResolution): "CLINIC_AGREEMENT" | "DOCTOR_AGREEMENT" | "STANDARD_CATALOG" {
  if (resolution.appliedAgreementType === "DOCTOR") {
    return "DOCTOR_AGREEMENT";
  }

  if (resolution.appliedAgreementType === "CLINIC") {
    return "CLINIC_AGREEMENT";
  }

  return "STANDARD_CATALOG";
}

export function getPricingSourceLabel(resolution: PricingResolution): string {
  if (resolution.appliedAgreementType === "DOCTOR") {
    return "Acord medic";
  }

  if (resolution.appliedAgreementType === "CLINIC") {
    return "Acord clinică";
  }

  return "Catalog standard firmă";
}
