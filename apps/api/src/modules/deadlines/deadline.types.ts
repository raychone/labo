export type DeadlineCalculationMode = "CALCULATED" | "MANUAL" | "UNRESOLVED";

export type DeadlineUnresolvedReason =
  | "AMBIGUOUS_EXECUTION_RULES"
  | "INVALID_CALENDAR"
  | "INVALID_DUE_TIME"
  | "INVALID_EXECUTION_RULE"
  | "INVALID_QUANTITY"
  | "INVALID_START_DATE"
  | "INVALID_TIMEZONE"
  | "NO_EXECUTION_RULE"
  | "UNSUPPORTED_CALENDAR_YEAR";

export interface BusinessHoliday {
  readonly date: string;
  readonly kind: "FIXED" | "MOBILE";
  readonly name: string;
}

export interface BusinessCalendar {
  readonly countryCode: "RO";
  readonly holidays: readonly BusinessHoliday[];
  readonly supportedYears: readonly number[];
  readonly timezone: "Europe/Bucharest";
  readonly workingWeekdays: readonly number[];
}

export interface DeadlineExecutionRuleInput {
  readonly executionDays?: number | null;
  readonly id?: string;
  readonly isActive?: boolean;
  readonly maxQuantity?: number | null;
  readonly minQuantity: number;
  readonly priority?: number;
  readonly requiresManualDueDate: boolean;
}

export interface DeadlineMatchedRule {
  readonly executionDays: number | null;
  readonly maxQuantity: number | null;
  readonly minQuantity: number;
  readonly priority: number;
  readonly requiresManualDueDate: boolean;
}

export interface DeadlineCalculationInput {
  readonly calendar: BusinessCalendar;
  readonly dueHour?: number;
  readonly dueMinute?: number;
  readonly includeStartDay: boolean;
  readonly quantity: number;
  readonly rules: readonly DeadlineExecutionRuleInput[];
  readonly startAt: string;
  readonly timezone: string;
}

export interface DeadlineCalculationResult {
  readonly businessDaysCounted: number;
  readonly calculatedDueAt: string | null;
  readonly dueLocalDate: string | null;
  readonly dueLocalTime: string | null;
  readonly executionDays: number | null;
  readonly explanation: string;
  readonly includeStartDay: boolean;
  readonly matchedRule: DeadlineMatchedRule | null;
  readonly mode: DeadlineCalculationMode;
  readonly reason: DeadlineUnresolvedReason | null;
  readonly skippedHolidayDays: number;
  readonly skippedWeekendDays: number;
  readonly startLocalDate: string | null;
  readonly timezone: string;
}
