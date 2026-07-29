import type { WorkDeadlineMode } from "@prisma/client";

export const DEADLINE_FILTERS = ["ALL", "TODAY", "TOMORROW", "LATE", "MANUAL", "WITHOUT_DEADLINE", "NEXT_7_DAYS"] as const;
export type DeadlineFilter = (typeof DEADLINE_FILTERS)[number];
export type DeadlineVisualState = "UNKNOWN" | "UNRESOLVED" | "ON_TIME" | "DUE_TODAY" | "DUE_TOMORROW" | "WARNING" | "LATE" | "MANUAL";

export interface DeadlineVisualResolution {
  readonly badge: string;
  readonly color: string;
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

const millisecondsPerDay = 86_400_000;
const timezone = "Europe/Bucharest";

export function resolveDeadlineVisualState(input: {
  readonly effectiveDueAt: string | null;
  readonly mode: WorkDeadlineMode | null;
  readonly now: string;
}): DeadlineVisualResolution {
  if (input.mode === null) {
    return createResolution("UNKNOWN", "Termen necunoscut", "fără termen", "Deadline-ul nu a fost încă stabilit.");
  }
  if (input.mode === "UNRESOLVED" || input.effectiveDueAt === null) {
    return createResolution("UNRESOLVED", "Fără termen", "fără termen", "Deadline-ul nu poate fi calculat automat.");
  }
  if (input.mode === "MANUAL") {
    return createResolution("MANUAL", "Manual", "termen manual", "Termen setat manual de utilizator autorizat.");
  }

  const calendarDays = diffLocalCalendarDays(new Date(input.now), new Date(input.effectiveDueAt));
  if (calendarDays < 0) {
    const days = Math.abs(calendarDays);
    return createResolution("LATE", "Întârziată", `întârziată cu ${formatDays(days)}`, `Termen depășit cu ${formatDays(days)}.`);
  }
  if (calendarDays === 0) {
    return createResolution("DUE_TODAY", "Astăzi", "astăzi", "Termenul este astăzi.");
  }
  if (calendarDays === 1) {
    return createResolution("DUE_TOMORROW", "Mâine", "mâine", "Termenul este mâine.");
  }
  if (countBusinessDaysBetween(new Date(input.now), new Date(input.effectiveDueAt)) < 2) {
    return createResolution("WARNING", "Aproape", formatDays(calendarDays), "Termen apropiat, cu mai puțin de 2 zile lucrătoare rămase.");
  }

  return createResolution("ON_TIME", "În termen", formatDays(calendarDays), "Lucrarea este în termen.");
}

export function isDeadlineInFilter(input: { readonly effectiveDueAt: string | null; readonly mode: WorkDeadlineMode | null; readonly now: string }, filter: DeadlineFilter): boolean {
  if (filter === "ALL") {
    return true;
  }

  const visual = resolveDeadlineVisualState(input);
  if (filter === "TODAY") {
    return visual.state === "DUE_TODAY";
  }
  if (filter === "TOMORROW") {
    return visual.state === "DUE_TOMORROW";
  }
  if (filter === "LATE") {
    return visual.state === "LATE";
  }
  if (filter === "MANUAL") {
    return visual.state === "MANUAL";
  }
  if (filter === "WITHOUT_DEADLINE") {
    return visual.state === "UNKNOWN" || visual.state === "UNRESOLVED";
  }
  if (input.effectiveDueAt === null) {
    return false;
  }

  const days = diffLocalCalendarDays(new Date(input.now), new Date(input.effectiveDueAt));
  return days >= 0 && days <= 7;
}

export function createEmptyDeadlineDashboardSummary(): DeadlineDashboardSummary {
  return { completedOnTimeLast7Days: 0, dueToday: 0, dueTomorrow: 0, late: 0, manual: 0, next7Days: 0, unresolved: 0 };
}

export function accumulateDeadlineDashboardSummary(
  current: DeadlineDashboardSummary,
  input: { readonly effectiveDueAt: string | null; readonly mode: WorkDeadlineMode | null; readonly now: string },
  completedOnTime: boolean,
): DeadlineDashboardSummary {
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
  return { badge, color: toColor(state), countdown, state, tooltip };
}

function toColor(state: DeadlineVisualState): string {
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
    case "WARNING":
      return "strong-orange";
    case "LATE":
      return "red";
  }
}

function countBusinessDaysBetween(from: Date, to: Date): number {
  const days = diffLocalCalendarDays(from, to);
  let count = 0;
  const fromParts = toLocalDateParts(from);
  for (let offset = 1; offset <= days; offset += 1) {
    const weekday = getLocalWeekday(new Date(Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day + offset, 12)));
    if (weekday >= 1 && weekday <= 5) {
      count += 1;
    }
  }

  return count;
}

function diffLocalCalendarDays(from: Date, to: Date): number {
  const fromParts = toLocalDateParts(from);
  const toParts = toLocalDateParts(to);
  return Math.round((Date.UTC(toParts.year, toParts.month - 1, toParts.day) - Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day)) / millisecondsPerDay);
}

function toLocalDateParts(date: Date): { readonly day: number; readonly month: number; readonly year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: timezone, year: "numeric" }).formatToParts(date);
  return {
    day: Number.parseInt(parts.find((part) => part.type === "day")?.value ?? "0", 10),
    month: Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "0", 10),
    year: Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "0", 10),
  };
}

function getLocalWeekday(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(date);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday) + 1;
}

function formatDays(days: number): string {
  return days === 1 ? "1 zi" : `${days} zile`;
}
