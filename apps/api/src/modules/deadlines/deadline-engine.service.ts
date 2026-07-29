import { Inject, Injectable } from "@nestjs/common";

import {
  DEADLINE_DEFAULT_DUE_HOUR,
  DEADLINE_DEFAULT_DUE_MINUTE,
} from "./deadline.constants.js";
import { BusinessCalendarService, isValidDueTime } from "./business-calendar.service.js";
import { selectDeadlineExecutionRule } from "./deadline-rule-selector.js";
import type { DeadlineCalculationInput, DeadlineCalculationResult, DeadlineMatchedRule, DeadlineUnresolvedReason } from "./deadline.types.js";

@Injectable()
export class DeadlineEngineService {
  public constructor(@Inject(BusinessCalendarService) private readonly calendarService: BusinessCalendarService) {}

  public calculate(input: DeadlineCalculationInput): DeadlineCalculationResult {
    const dueHour = input.dueHour ?? DEADLINE_DEFAULT_DUE_HOUR;
    const dueMinute = input.dueMinute ?? DEADLINE_DEFAULT_DUE_MINUTE;

    if (!this.calendarService.isSupportedTimezone(input.timezone)) {
      return createUnresolvedResult(input, "INVALID_TIMEZONE", null, "Fusul orar nu este suportat pentru calculul termenului.");
    }

    if (!isValidDueTime(dueHour, dueMinute)) {
      return createUnresolvedResult(input, "INVALID_DUE_TIME", null, "Ora termenului este invalidă.");
    }

    if (!this.calendarService.validateCalendar(input.calendar)) {
      return createUnresolvedResult(input, "INVALID_CALENDAR", null, "Calendarul lucrător este invalid.");
    }

    const startDate = new Date(input.startAt);
    const startLocalDate = this.calendarService.toLocalDate(startDate, input.timezone);
    if (!startLocalDate) {
      return createUnresolvedResult(input, "INVALID_START_DATE", null, "Data de pornire este invalidă.");
    }

    const selection = selectDeadlineExecutionRule(input.rules, input.quantity);
    if (selection.mode === "UNRESOLVED") {
      return createUnresolvedResult(input, selection.reason, startLocalDate, createUnresolvedExplanation(selection.reason));
    }

    if (selection.rule.requiresManualDueDate) {
      return {
        businessDaysCounted: 0,
        calculatedDueAt: null,
        dueLocalDate: null,
        dueLocalTime: null,
        executionDays: null,
        explanation: "Regula aplicabilă cere stabilirea manuală a termenului.",
        includeStartDay: input.includeStartDay,
        matchedRule: selection.rule,
        mode: "MANUAL",
        reason: null,
        skippedHolidayDays: 0,
        skippedWeekendDays: 0,
        startLocalDate,
        timezone: input.timezone,
      };
    }

    const executionDays = selection.rule.executionDays ?? 0;
    const due = this.calendarService.addBusinessDays(startLocalDate, executionDays, input.calendar, input.includeStartDay);
    if (due.unsupportedYear !== null) {
      return createUnresolvedResult(input, "UNSUPPORTED_CALENDAR_YEAR", startLocalDate, `Calendarul lucrător nu acoperă anul ${due.unsupportedYear}.`, selection.rule);
    }

    const calculatedDueAt = this.calendarService.toZonedIso(due.dueLocalDate, dueHour, dueMinute, input.timezone);
    if (!calculatedDueAt) {
      return createUnresolvedResult(input, "INVALID_DUE_TIME", startLocalDate, "Ora termenului este invalidă.", selection.rule);
    }

    return {
      businessDaysCounted: due.businessDaysCounted,
      calculatedDueAt,
      dueLocalDate: due.dueLocalDate,
      dueLocalTime: `${String(dueHour).padStart(2, "0")}:${String(dueMinute).padStart(2, "0")}`,
      executionDays,
      explanation: createCalculatedExplanation({
        dueLocalDate: due.dueLocalDate,
        dueMinute,
        dueHour,
        executionDays,
        includeStartDay: input.includeStartDay,
        skippedHolidayDays: due.skippedHolidayDays,
        skippedWeekendDays: due.skippedWeekendDays,
        startLocalDate,
        timezone: input.timezone,
      }),
      includeStartDay: input.includeStartDay,
      matchedRule: selection.rule,
      mode: "CALCULATED",
      reason: null,
      skippedHolidayDays: due.skippedHolidayDays,
      skippedWeekendDays: due.skippedWeekendDays,
      startLocalDate,
      timezone: input.timezone,
    };
  }
}

function createUnresolvedResult(
  input: DeadlineCalculationInput,
  reason: DeadlineUnresolvedReason,
  startLocalDate: string | null,
  explanation: string,
  matchedRule: DeadlineMatchedRule | null = null,
): DeadlineCalculationResult {
  return {
    businessDaysCounted: 0,
    calculatedDueAt: null,
    dueLocalDate: null,
    dueLocalTime: null,
    executionDays: matchedRule?.executionDays ?? null,
    explanation,
    includeStartDay: input.includeStartDay,
    matchedRule,
    mode: "UNRESOLVED",
    reason,
    skippedHolidayDays: 0,
    skippedWeekendDays: 0,
    startLocalDate,
    timezone: input.timezone,
  };
}

function createUnresolvedExplanation(reason: DeadlineUnresolvedReason): string {
  switch (reason) {
    case "AMBIGUOUS_EXECUTION_RULES":
      return "Există mai multe reguli active potrivite cu aceeași prioritate; termenul nu poate fi ales automat.";
    case "INVALID_EXECUTION_RULE":
      return "Regula de execuție are o configurație invalidă.";
    case "INVALID_QUANTITY":
      return "Cantitatea trebuie să fie un întreg pozitiv.";
    case "NO_EXECUTION_RULE":
      return "Nu există regulă activă de termen pentru cantitatea aleasă.";
    case "INVALID_CALENDAR":
    case "INVALID_DUE_TIME":
    case "INVALID_START_DATE":
    case "INVALID_TIMEZONE":
    case "UNSUPPORTED_CALENDAR_YEAR":
      return "Termenul nu poate fi calculat cu datele curente.";
  }
}

function createCalculatedExplanation(input: {
  readonly dueHour: number;
  readonly dueLocalDate: string;
  readonly dueMinute: number;
  readonly executionDays: number;
  readonly includeStartDay: boolean;
  readonly skippedHolidayDays: number;
  readonly skippedWeekendDays: number;
  readonly startLocalDate: string;
  readonly timezone: string;
}): string {
  const includeText = input.includeStartDay ? "ziua de start este inclusă" : "ziua de start nu este inclusă";
  const skippedText = input.skippedHolidayDays + input.skippedWeekendDays === 0
    ? "fără zile nelucrătoare sărite"
    : `${input.skippedWeekendDays} zile de weekend și ${input.skippedHolidayDays} sărbători legale sărite`;

  return `Termen calculat din ${input.startLocalDate}: ${input.executionDays} zile lucrătoare, ${includeText}, ${skippedText}; scadență ${input.dueLocalDate} la ${String(input.dueHour).padStart(2, "0")}:${String(input.dueMinute).padStart(2, "0")} (${input.timezone}).`;
}
