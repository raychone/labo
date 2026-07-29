export const DEADLINE_CALCULATION_MODES = ["CALCULATED", "MANUAL", "UNRESOLVED"] as const;

export const DEADLINE_UNRESOLVED_REASONS = [
  "AMBIGUOUS_EXECUTION_RULES",
  "INVALID_CALENDAR",
  "INVALID_DUE_TIME",
  "INVALID_EXECUTION_RULE",
  "INVALID_QUANTITY",
  "INVALID_START_DATE",
  "INVALID_TIMEZONE",
  "NO_EXECUTION_RULE",
  "UNSUPPORTED_CALENDAR_YEAR",
] as const;

export const ROMANIAN_BUSINESS_CALENDAR_SUPPORTED_YEARS = [2026, 2027, 2028, 2029, 2030] as const;
export const ROMANIAN_BUSINESS_WORKING_WEEKDAYS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_DEADLINE_DUE_HOUR = 17;
export const DEFAULT_DEADLINE_DUE_MINUTE = 0;
export const DEFAULT_DEADLINE_TIMEZONE = "Europe/Bucharest";

export type DeadlineCalculationMode = (typeof DEADLINE_CALCULATION_MODES)[number];
export type DeadlineUnresolvedReason = (typeof DEADLINE_UNRESOLVED_REASONS)[number];
export type RomanianBusinessCalendarSupportedYear = (typeof ROMANIAN_BUSINESS_CALENDAR_SUPPORTED_YEARS)[number];

export interface BusinessHoliday {
  readonly date: string;
  readonly kind: "FIXED" | "MOBILE";
  readonly name: string;
}

export interface BusinessCalendar {
  readonly countryCode: "RO";
  readonly holidays: readonly BusinessHoliday[];
  readonly supportedYears: readonly number[];
  readonly timezone: typeof DEFAULT_DEADLINE_TIMEZONE;
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

export function formatDeadlineMode(mode: DeadlineCalculationMode): string {
  switch (mode) {
    case "CALCULATED":
      return "Calculat automat";
    case "MANUAL":
      return "Termen manual";
    case "UNRESOLVED":
      return "Nerezolvat";
  }
}

export function formatDeadlineUnresolvedReason(reason: DeadlineUnresolvedReason): string {
  switch (reason) {
    case "AMBIGUOUS_EXECUTION_RULES":
      return "Există mai multe reguli active potrivite.";
    case "INVALID_CALENDAR":
      return "Calendarul lucrător este invalid.";
    case "INVALID_DUE_TIME":
      return "Ora termenului este invalidă.";
    case "INVALID_EXECUTION_RULE":
      return "Configurația regulii de execuție este invalidă.";
    case "INVALID_QUANTITY":
      return "Cantitatea trebuie să fie un întreg pozitiv.";
    case "INVALID_START_DATE":
      return "Data de pornire este invalidă.";
    case "INVALID_TIMEZONE":
      return "Fusul orar nu este suportat.";
    case "NO_EXECUTION_RULE":
      return "Nu există regulă de termen pentru cantitatea aleasă.";
    case "UNSUPPORTED_CALENDAR_YEAR":
      return "Calendarul lucrător nu acoperă anul necesar.";
  }
}
