import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { BusinessCalendarService } from "../deadlines/business-calendar.service.js";
import {
  DEADLINE_DEFAULT_DUE_HOUR,
  DEADLINE_DEFAULT_DUE_MINUTE,
  DEADLINE_DEFAULT_TIMEZONE,
} from "../deadlines/deadline.constants.js";
import { DeadlineEngineService } from "../deadlines/deadline-engine.service.js";
import type { DeadlineCalculationResult } from "../deadlines/deadline.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { PricingResolverService, type PricingResolution } from "../pricing/pricing-resolver.service.js";

export const WORK_DEADLINE_RECALCULATION_FIELDS = ["clinicId", "doctorId", "quantity", "workTypeId"] as const;

export interface WorkDeadlineData {
  readonly calculatedDueAt: Date | null;
  readonly deadlineCalculatedAt: Date;
  readonly deadlineDueHour: number;
  readonly deadlineDueMinute: number;
  readonly deadlineExecutionDays: number | null;
  readonly deadlineExplanation: string;
  readonly deadlineIncludeStartDay: boolean;
  readonly deadlineLockedAt: Date | null;
  readonly deadlineLockedReason: string | null;
  readonly deadlineMode: "CALCULATED" | "MANUAL" | "UNRESOLVED";
  readonly deadlineReasonCode: string | null;
  readonly deadlineRuleSnapshot: Prisma.InputJsonObject;
  readonly deadlineSource: "CREATION" | "WORK_UPDATE" | "MANUAL_OVERRIDE" | "MANUAL_RECALCULATION" | "LEGACY_BACKFILL" | "FUTURE_TECH_CLAIM";
  readonly deadlineStartAt: Date;
  readonly deadlineTimezone: string;
  readonly effectiveDueAt: Date | null;
  readonly manualDueAt: Date | null;
}

export interface WorkDeadlinePrismaData {
  readonly calculatedDueAt: Date | null;
  readonly deadlineCalculatedAt: Date;
  readonly deadlineDueHour: number;
  readonly deadlineDueMinute: number;
  readonly deadlineExecutionDays: number | null;
  readonly deadlineExplanation: string;
  readonly deadlineIncludeStartDay: boolean;
  readonly deadlineLockedAt: Date | null;
  readonly deadlineLockedReason: string | null;
  readonly deadlineMode: "CALCULATED" | "MANUAL" | "UNRESOLVED";
  readonly deadlineReasonCode: string | null;
  readonly deadlineRevision: number;
  readonly deadlineRuleSnapshot: Prisma.InputJsonObject;
  readonly deadlineSource: "CREATION" | "WORK_UPDATE" | "MANUAL_OVERRIDE" | "MANUAL_RECALCULATION" | "LEGACY_BACKFILL" | "FUTURE_TECH_CLAIM";
  readonly deadlineStartAt: Date;
  readonly deadlineTimezone: string;
  readonly effectiveDueAt: Date | null;
  readonly manualDueAt: Date | null;
}

export interface WorkDeadlinePreviewView {
  readonly calculatedDueAt: string | null;
  readonly effectiveDueAt: string | null;
  readonly executionDays: number | null;
  readonly explanation: string;
  readonly includeStartDay: boolean;
  readonly manualDueAt: string | null;
  readonly mode: "CALCULATED" | "MANUAL" | "UNRESOLVED";
  readonly reasonCode: string | null;
  readonly sourceSummary: {
    readonly executionRuleSource: "MANUAL_REQUIRED" | "NONE" | "RESOLVED";
    readonly pricingSource: "CLINIC" | "DOCTOR" | "NONE" | "STANDARD";
  };
  readonly startAt: string;
  readonly timezone: string;
}

type WorkDeadlineClient = Pick<PrismaService, "legalEntitySettings" | "priceCatalogItem" | "pricingAgreement">;

@Injectable()
export class WorkDeadlineService {
  public constructor(
    @Inject(BusinessCalendarService) private readonly businessCalendar: BusinessCalendarService,
    @Inject(DeadlineEngineService) private readonly deadlineEngine: DeadlineEngineService,
    @Inject(PricingResolverService) private readonly pricingResolver: PricingResolverService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public shouldRecalculate(changedFields: readonly string[], isManualLocked: boolean): boolean {
    if (isManualLocked) {
      return false;
    }

    return changedFields.some((field) => WORK_DEADLINE_RECALCULATION_FIELDS.includes(field as (typeof WORK_DEADLINE_RECALCULATION_FIELDS)[number]));
  }

  public assertExpectedRevision(currentRevision: number, expectedRevision: number): void {
    if (currentRevision !== expectedRevision) {
      throw new ConflictException("Deadline-ul a fost modificat între timp. Reîncarcă lucrarea și încearcă din nou.");
    }
  }

  public async preview(input: {
    readonly clinicId: string;
    readonly doctorId: string;
    readonly includeStartDay?: boolean;
    readonly legalEntity: LegalEntityContext;
    readonly manualDueAt?: string | null;
    readonly now: Date;
    readonly quantity: number;
    readonly startAt?: string;
    readonly workTypeId: string;
  }): Promise<WorkDeadlinePreviewView> {
    const startAt = input.startAt ? parseIsoDateTime(input.startAt, "Data de start nu este validă.") : input.now;
    const manualDueAt = input.manualDueAt ? parseIsoDateTime(input.manualDueAt, "Termenul manual nu este valid.") : null;
    const deadline = await this.resolveDeadline({
      clinicId: input.clinicId,
      doctorId: input.doctorId,
      includeStartDay: input.includeStartDay ?? false,
      legalEntity: input.legalEntity,
      manualDueAt,
      now: input.now,
      quantity: input.quantity,
      source: "CREATION",
      startAt,
      workTypeId: input.workTypeId,
    });

    return toDeadlinePreview(deadline);
  }

  public async resolveForWork(input: {
    readonly client?: WorkDeadlineClient;
    readonly clinicId: string;
    readonly doctorId: string;
    readonly includeStartDay?: boolean;
    readonly legalEntity: LegalEntityContext;
    readonly manualDueAt?: Date | null;
    readonly now: Date;
    readonly quantity: number;
    readonly source: WorkDeadlineData["deadlineSource"];
    readonly startAt: Date;
    readonly workTypeId: string;
  }): Promise<WorkDeadlineData> {
    return this.resolveDeadline({
      clinicId: input.clinicId,
      doctorId: input.doctorId,
      includeStartDay: input.includeStartDay ?? false,
      legalEntity: input.legalEntity,
      manualDueAt: input.manualDueAt ?? null,
      now: input.now,
      quantity: input.quantity,
      source: input.source,
      startAt: input.startAt,
      workTypeId: input.workTypeId,
      ...(input.client ? { client: input.client } : {}),
    });
  }

  private async resolveDeadline(input: {
    readonly client?: WorkDeadlineClient;
    readonly clinicId: string;
    readonly doctorId: string;
    readonly includeStartDay: boolean;
    readonly legalEntity: LegalEntityContext;
    readonly manualDueAt: Date | null;
    readonly now: Date;
    readonly quantity: number;
    readonly source: WorkDeadlineData["deadlineSource"];
    readonly startAt: Date;
    readonly workTypeId: string;
  }): Promise<WorkDeadlineData> {
    const client = input.client ?? this.prisma;
    const timezone = await this.getTimezone(client, input.legalEntity.id);
    if (input.manualDueAt) {
      return this.createManualDeadline(input, timezone);
    }

    const resolution = await this.resolvePricingForDeadline(client, {
      clinicId: input.clinicId,
      doctorId: input.doctorId,
      evaluationDate: input.now,
      legalEntityCode: input.legalEntity.code,
      legalEntityId: input.legalEntity.id,
      quantity: input.quantity,
      workTypeId: input.workTypeId,
    });
    const calendar = this.businessCalendar.getRomanianBusinessCalendar();
    const result = this.deadlineEngine.calculate({
      calendar,
      includeStartDay: input.includeStartDay,
      quantity: input.quantity,
      rules: resolution?.executionTimeRules ?? [],
      startAt: input.startAt.toISOString(),
      timezone,
    });

    if (result.mode === "CALCULATED" && result.calculatedDueAt) {
      const calculatedDueAt = new Date(result.calculatedDueAt);
      return {
        calculatedDueAt,
        deadlineCalculatedAt: input.now,
        deadlineDueHour: DEADLINE_DEFAULT_DUE_HOUR,
        deadlineDueMinute: DEADLINE_DEFAULT_DUE_MINUTE,
        deadlineExecutionDays: result.executionDays,
        deadlineExplanation: result.explanation,
        deadlineIncludeStartDay: input.includeStartDay,
        deadlineLockedAt: null,
        deadlineLockedReason: null,
        deadlineMode: "CALCULATED",
        deadlineReasonCode: null,
        deadlineRuleSnapshot: createRuleSnapshot(result, resolution, timezone),
        deadlineSource: input.source,
        deadlineStartAt: input.startAt,
        deadlineTimezone: timezone,
        effectiveDueAt: calculatedDueAt,
        manualDueAt: null,
      };
    }

    const reasonCode = result.mode === "MANUAL" ? "MANUAL_DUE_DATE_REQUIRED" : result.reason ?? "NO_EXECUTION_RULE";
    return {
      calculatedDueAt: null,
      deadlineCalculatedAt: input.now,
      deadlineDueHour: DEADLINE_DEFAULT_DUE_HOUR,
      deadlineDueMinute: DEADLINE_DEFAULT_DUE_MINUTE,
      deadlineExecutionDays: result.executionDays,
      deadlineExplanation: result.mode === "MANUAL" ? "Regula aplicabilă cere termen manual. Lucrarea rămâne fără termen efectiv până la setare manuală." : result.explanation,
      deadlineIncludeStartDay: input.includeStartDay,
      deadlineLockedAt: null,
      deadlineLockedReason: null,
      deadlineMode: "UNRESOLVED",
      deadlineReasonCode: reasonCode,
      deadlineRuleSnapshot: createRuleSnapshot(result, resolution, timezone),
      deadlineSource: input.source,
      deadlineStartAt: input.startAt,
      deadlineTimezone: timezone,
      effectiveDueAt: null,
      manualDueAt: null,
    };
  }

  private createManualDeadline(input: {
    readonly includeStartDay: boolean;
    readonly manualDueAt: Date | null;
    readonly now: Date;
    readonly source: WorkDeadlineData["deadlineSource"];
    readonly startAt: Date;
  }, timezone: string): WorkDeadlineData {
    if (!input.manualDueAt) {
      throw new BadRequestException("Termenul manual este obligatoriu.");
    }

    if (input.manualDueAt.getTime() < input.startAt.getTime()) {
      throw new BadRequestException("Termenul manual nu poate fi anterior datei de pornire.");
    }

    return {
      calculatedDueAt: null,
      deadlineCalculatedAt: input.now,
      deadlineDueHour: DEADLINE_DEFAULT_DUE_HOUR,
      deadlineDueMinute: DEADLINE_DEFAULT_DUE_MINUTE,
      deadlineExecutionDays: null,
      deadlineExplanation: "Termen setat manual de utilizator autorizat.",
      deadlineIncludeStartDay: input.includeStartDay,
      deadlineLockedAt: input.now,
      deadlineLockedReason: "Termen manual setat explicit.",
      deadlineMode: "MANUAL",
      deadlineReasonCode: null,
      deadlineRuleSnapshot: createManualRuleSnapshot(input.includeStartDay, timezone),
      deadlineSource: input.source,
      deadlineStartAt: input.startAt,
      deadlineTimezone: timezone,
      effectiveDueAt: input.manualDueAt,
      manualDueAt: input.manualDueAt,
    };
  }

  private async resolvePricingForDeadline(client: WorkDeadlineClient, input: {
    readonly clinicId: string;
    readonly doctorId: string;
    readonly evaluationDate: Date;
    readonly legalEntityCode: string;
    readonly legalEntityId: string;
    readonly quantity: number;
    readonly workTypeId: string;
  }): Promise<PricingResolution | null> {
    try {
      return await this.pricingResolver.resolve(input, client);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }
  }

  private async getTimezone(client: WorkDeadlineClient, legalEntityId: string): Promise<string> {
    const settings = await client.legalEntitySettings.findUnique({
      select: { timezone: true },
      where: { legalEntityId },
    });

    return settings?.timezone ?? DEADLINE_DEFAULT_TIMEZONE;
  }
}

export function deadlineDataToPrisma(data: WorkDeadlineData, nextRevision: number): WorkDeadlinePrismaData {
  return {
    calculatedDueAt: data.calculatedDueAt,
    deadlineCalculatedAt: data.deadlineCalculatedAt,
    deadlineDueHour: data.deadlineDueHour,
    deadlineDueMinute: data.deadlineDueMinute,
    deadlineExecutionDays: data.deadlineExecutionDays,
    deadlineExplanation: data.deadlineExplanation,
    deadlineIncludeStartDay: data.deadlineIncludeStartDay,
    deadlineLockedAt: data.deadlineLockedAt,
    deadlineLockedReason: data.deadlineLockedReason,
    deadlineMode: data.deadlineMode,
    deadlineReasonCode: data.deadlineReasonCode,
    deadlineRevision: nextRevision,
    deadlineRuleSnapshot: data.deadlineRuleSnapshot,
    deadlineSource: data.deadlineSource,
    deadlineStartAt: data.deadlineStartAt,
    deadlineTimezone: data.deadlineTimezone,
    effectiveDueAt: data.effectiveDueAt,
    manualDueAt: data.manualDueAt,
  };
}

function createRuleSnapshot(result: DeadlineCalculationResult, resolution: PricingResolution | null, timezone: string): Prisma.InputJsonObject {
  const matchedRule = result.matchedRule;
  return {
    calendarCoverage: { fromYear: 2026, toYear: 2030 },
    dueHour: DEADLINE_DEFAULT_DUE_HOUR,
    dueMinute: DEADLINE_DEFAULT_DUE_MINUTE,
    executionDays: matchedRule?.executionDays ?? null,
    executionTimeRuleCode: null,
    includeStartDay: result.includeStartDay,
    maxQuantity: matchedRule?.maxQuantity ?? null,
    minQuantity: matchedRule?.minQuantity ?? null,
    pricingSourceType: resolution?.appliedAgreementType ?? (resolution ? "STANDARD" : "NONE"),
    requiresManualDueDate: matchedRule?.requiresManualDueDate ?? false,
    sourceType: result.mode === "UNRESOLVED" && matchedRule === null ? "NONE" : resolution?.appliedAgreementType ?? (resolution ? "STANDARD" : "NONE"),
    timezone,
    version: 1,
    workingWeekdays: [1, 2, 3, 4, 5],
  };
}

function createManualRuleSnapshot(includeStartDay: boolean, timezone: string): Prisma.InputJsonObject {
  return {
    calendarCoverage: { fromYear: 2026, toYear: 2030 },
    dueHour: DEADLINE_DEFAULT_DUE_HOUR,
    dueMinute: DEADLINE_DEFAULT_DUE_MINUTE,
    executionDays: null,
    executionTimeRuleCode: null,
    includeStartDay,
    maxQuantity: null,
    minQuantity: null,
    pricingSourceType: "STANDARD",
    requiresManualDueDate: false,
    sourceType: "NONE",
    timezone,
    version: 1,
    workingWeekdays: [1, 2, 3, 4, 5],
  };
}

function toDeadlinePreview(deadline: WorkDeadlineData): WorkDeadlinePreviewView {
  const snapshot = deadline.deadlineRuleSnapshot as {
    readonly requiresManualDueDate?: boolean;
    readonly sourceType?: "CLINIC" | "DOCTOR" | "NONE" | "STANDARD";
  };

  return {
    calculatedDueAt: deadline.calculatedDueAt?.toISOString() ?? null,
    effectiveDueAt: deadline.effectiveDueAt?.toISOString() ?? null,
    executionDays: deadline.deadlineExecutionDays,
    explanation: deadline.deadlineExplanation,
    includeStartDay: deadline.deadlineIncludeStartDay,
    manualDueAt: deadline.manualDueAt?.toISOString() ?? null,
    mode: deadline.deadlineMode,
    reasonCode: deadline.deadlineReasonCode,
    sourceSummary: {
      executionRuleSource: deadline.deadlineReasonCode === "MANUAL_DUE_DATE_REQUIRED" || snapshot.requiresManualDueDate === true ? "MANUAL_REQUIRED" : snapshot.sourceType === "NONE" ? "NONE" : "RESOLVED",
      pricingSource: snapshot.sourceType === "CLINIC" || snapshot.sourceType === "DOCTOR" || snapshot.sourceType === "NONE" ? snapshot.sourceType : "STANDARD",
    },
    startAt: deadline.deadlineStartAt.toISOString(),
    timezone: deadline.deadlineTimezone,
  };
}

function parseIsoDateTime(value: string, message: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new BadRequestException(message);
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new BadRequestException(message);
  }

  return date;
}
