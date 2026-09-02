import { DEFAULT_DEADLINE_TIMEZONE } from "./deadlines.js";
import type { WorkDeadlineMode } from "./works.js";

export const DEADLINE_VISUAL_STATES = [
  "UNKNOWN",
  "UNRESOLVED",
  "ON_TIME",
  "DUE_TODAY",
  "DUE_TOMORROW",
  "WARNING",
  "LATE",
  "MANUAL",
] as const;

export const DEADLINE_FILTERS = ["ALL", "TODAY", "TOMORROW", "LATE", "MANUAL", "WITHOUT_DEADLINE", "NEXT_7_DAYS"] as const;

export const DEFAULT_DEADLINE_VISUAL_THRESHOLDS = {
  nextDaysWindow: 7,
  warningBusinessDaysRemaining: 2,
} as const;

export type DeadlineVisualState = (typeof DEADLINE_VISUAL_STATES)[number];
export type DeadlineFilter = (typeof DEADLINE_FILTERS)[number];
export type DeadlineColorToken = "blue" | "dark-gray" | "gray" | "green" | "red" | "strong-orange" | "yellow";

export interface DeadlineVisualInput {
  readonly effectiveDueAt: string | null;
  readonly mode: WorkDeadlineMode | null;
  readonly now: string;
}

export interface DeadlineVisualResolution {
  readonly badge: string;
  readonly color: DeadlineColorToken;
  readonly countdown: string;
  readonly state: DeadlineVisualState;
  readonly tooltip: string;
}

export interface DeadlineDashboardSummary {
  readonly completedOnTimeLast7Days: number;
  readonly dueToday: number;
  readonly dueTomorrow: number;
  readonly late: number;
  readonly manual: number;
  readonly next7Days: number;
  readonly unresolved: number;
}

interface LocalDateParts {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

const millisecondsPerDay = 86_400_000;

export function resolveDeadlineVisualState(input: DeadlineVisualInput): DeadlineVisualResolution {
  if (input.mode === null) {
    return createResolution("UNKNOWN", "Termen necunoscut", "fără termen", "Deadline-ul nu a fost încă stabilit.");
  }

  if (input.mode === "UNRESOLVED" || input.effectiveDueAt === null) {
    return createResolution("UNRESOLVED", "Fără termen", "fără termen", "Deadline-ul nu poate fi calculat automat.");
  }

  const nowDate = parseDate(input.now);
  const dueDate = parseDate(input.effectiveDueAt);
  const calendarDays = diffLocalCalendarDays(nowDate, dueDate);
  const businessDays = countBusinessDaysBetween(nowDate, dueDate);

  if (calendarDays < 0) {
    const lateDays = Math.abs(calendarDays);
    return createResolution("LATE", "Întârziată", `întârziată cu ${formatDays(lateDays)}`, `Termen depășit cu ${formatDays(lateDays)}.`);
  }

  if (calendarDays === 0) {
    return createResolution("DUE_TODAY", "Astăzi", "astăzi", "Termenul este astăzi.");
  }

  if (calendarDays === 1) {
    return createResolution("DUE_TOMORROW", "Mâine", "mâine", "Termenul este mâine.");
  }

  if (businessDays < DEFAULT_DEADLINE_VISUAL_THRESHOLDS.warningBusinessDaysRemaining) {
    return createResolution("WARNING", "Aproape", `${formatDays(calendarDays)}`, "Termen apropiat, cu mai puțin de 2 zile lucrătoare rămase.");
  }

  if (input.mode === "MANUAL") {
    return createResolution("MANUAL", "Manual", "termen manual", "Termen setat manual de utilizator autorizat.");
  }

  return createResolution("ON_TIME", "În termen", `${formatDays(calendarDays)}`, "Lucrarea este în termen.");
}

export function isDeadlineInFilter(input: DeadlineVisualInput, filter: DeadlineFilter): boolean {
  if (filter === "ALL") {
    return true;
  }

  const visual = resolveDeadlineVisualState(input);
  if (filter === "LATE") {
    return visual.state === "LATE";
  }
  if (filter === "MANUAL") {
    return visual.state === "MANUAL";
  }
  if (filter === "TODAY") {
    return visual.state === "DUE_TODAY";
  }
  if (filter === "TOMORROW") {
    return visual.state === "DUE_TOMORROW";
  }
  if (filter === "WITHOUT_DEADLINE") {
    return visual.state === "UNKNOWN" || visual.state === "UNRESOLVED";
  }

  if (input.effectiveDueAt === null) {
    return false;
  }

  const calendarDays = diffLocalCalendarDays(parseDate(input.now), parseDate(input.effectiveDueAt));
  return calendarDays >= 0 && calendarDays <= DEFAULT_DEADLINE_VISUAL_THRESHOLDS.nextDaysWindow;
}

export function createEmptyDeadlineDashboardSummary(): DeadlineDashboardSummary {
  return {
    completedOnTimeLast7Days: 0,
    dueToday: 0,
    dueTomorrow: 0,
    late: 0,
    manual: 0,
    next7Days: 0,
    unresolved: 0,
  };
}

export function accumulateDeadlineDashboardSummary(current: DeadlineDashboardSummary, input: DeadlineVisualInput, completedOnTime: boolean): DeadlineDashboardSummary {
  const visual = resolveDeadlineVisualState(input);
  return {
    completedOnTimeLast7Days: current.completedOnTimeLast7Days + (completedOnTime ? 1 : 0),
    dueToday: current.dueToday + (visual.state === "DUE_TODAY" ? 1 : 0),
    dueTomorrow: current.dueTomorrow + (visual.state === "DUE_TOMORROW" ? 1 : 0),
    late: current.late + (visual.state === "LATE" ? 1 : 0),
    manual: current.manual + (visual.state === "MANUAL" ? 1 : 0),
    next7Days: current.next7Days + (isDeadlineInFilter(input, "NEXT_7_DAYS") ? 1 : 0),
    unresolved: current.unresolved + (visual.state === "UNKNOWN" || visual.state === "UNRESOLVED" ? 1 : 0),
  };
}

function createResolution(state: DeadlineVisualState, badge: string, countdown: string, tooltip: string): DeadlineVisualResolution {
  return {
    badge,
    color: toColorToken(state),
    countdown,
    state,
    tooltip,
  };
}

function toColorToken(state: DeadlineVisualState): DeadlineColorToken {
  switch (state) {
    case "UNKNOWN":
      return "gray";
    case "UNRESOLVED":
      return "dark-gray";
    case "MANUAL":
      return "blue";
    case "ON_TIME":
      return "green";
    case "DUE_TOMORROW":
      return "yellow";
    case "DUE_TODAY":
      return "strong-orange";
    case "WARNING":
      return "strong-orange";
    case "LATE":
      return "red";
  }
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid deadline date.");
  }

  return date;
}

function countBusinessDaysBetween(from: Date, to: Date): number {
  const days = diffLocalCalendarDays(from, to);
  if (days <= 0) {
    return 0;
  }

  let count = 0;
  const fromParts = toLocalDateParts(from);
  for (let offset = 1; offset <= days; offset += 1) {
    const candidate = new Date(Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day + offset, 12, 0, 0));
    const weekday = getLocalWeekday(candidate);
    if (weekday >= 1 && weekday <= 5) {
      count += 1;
    }
  }

  return count;
}

function diffLocalCalendarDays(from: Date, to: Date): number {
  const fromParts = toLocalDateParts(from);
  const toParts = toLocalDateParts(to);
  const fromUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toUtc = Date.UTC(toParts.year, toParts.month - 1, toParts.day);

  return Math.round((toUtc - fromUtc) / millisecondsPerDay);
}

function toLocalDateParts(date: Date): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: DEFAULT_DEADLINE_TIMEZONE,
    year: "numeric",
  }).formatToParts(date);
  const year = readPart(parts, "year");
  const month = readPart(parts, "month");
  const day = readPart(parts, "day");

  return { day, month, year };
}

function getLocalWeekday(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_DEADLINE_TIMEZONE,
    weekday: "short",
  }).format(date);

  switch (weekday) {
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    case "Sun":
      return 7;
    default:
      throw new Error("Invalid weekday.");
  }
}

function readPart(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) {
    throw new Error("Invalid localized date.");
  }

  return Number.parseInt(value, 10);
}

function formatDays(days: number): string {
  return days === 1 ? "1 zi" : `${days} zile`;
}
