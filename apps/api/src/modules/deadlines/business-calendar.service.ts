import { Injectable } from "@nestjs/common";

import {
  DEADLINE_DEFAULT_TIMEZONE,
  DEADLINE_SUPPORTED_YEARS,
  DEADLINE_WORKING_WEEKDAYS,
} from "./deadline.constants.js";
import type { BusinessCalendar } from "./deadline.types.js";
import { getRomanianHolidaysForYears } from "./romanian-holidays.js";

interface LocalDateParts {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

interface AddBusinessDaysResult {
  readonly businessDaysCounted: number;
  readonly dueLocalDate: string;
  readonly skippedHolidayDays: number;
  readonly skippedWeekendDays: number;
  readonly unsupportedYear: number | null;
}

@Injectable()
export class BusinessCalendarService {
  public getRomanianBusinessCalendar(years: readonly number[] = DEADLINE_SUPPORTED_YEARS): BusinessCalendar {
    const uniqueYears = [...new Set(years)].sort((left, right) => left - right);

    return {
      countryCode: "RO",
      holidays: getRomanianHolidaysForYears(uniqueYears),
      supportedYears: uniqueYears,
      timezone: DEADLINE_DEFAULT_TIMEZONE,
      workingWeekdays: DEADLINE_WORKING_WEEKDAYS,
    };
  }

  public validateCalendar(calendar: BusinessCalendar): boolean {
    if (calendar.countryCode !== "RO" || calendar.timezone !== DEADLINE_DEFAULT_TIMEZONE) {
      return false;
    }

    if (!calendar.workingWeekdays.every((weekday) => Number.isSafeInteger(weekday) && weekday >= 0 && weekday <= 6)) {
      return false;
    }

    return calendar.holidays.every((holiday) => isIsoLocalDate(holiday.date));
  }

  public isSupportedTimezone(timezone: string): boolean {
    if (timezone !== DEADLINE_DEFAULT_TIMEZONE) {
      return false;
    }

    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  public toLocalDate(instant: Date, timezone: string): string | null {
    if (!Number.isFinite(instant.getTime()) || !this.isSupportedTimezone(timezone)) {
      return null;
    }

    const formatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });
    const parts = formatter.formatToParts(instant);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return year && month && day ? `${year}-${month}-${day}` : null;
  }

  public addBusinessDays(
    startLocalDate: string,
    businessDays: number,
    calendar: BusinessCalendar,
    includeStartDay: boolean,
  ): AddBusinessDaysResult {
    const holidays = new Set(calendar.holidays.map((holiday) => holiday.date));
    const workingWeekdays = new Set(calendar.workingWeekdays);
    let cursor = startLocalDate;
    let counted = 0;
    let skippedWeekendDays = 0;
    let skippedHolidayDays = 0;

    if (businessDays === 0 && this.isBusinessDay(cursor, holidays, workingWeekdays)) {
      return {
        businessDaysCounted: 0,
        dueLocalDate: cursor,
        skippedHolidayDays,
        skippedWeekendDays,
        unsupportedYear: this.getUnsupportedYear(cursor, calendar),
      };
    }

    if (!includeStartDay || !this.isBusinessDay(cursor, holidays, workingWeekdays)) {
      cursor = addCalendarDays(cursor, 1);
    }

    while (counted < businessDays || !this.isBusinessDay(cursor, holidays, workingWeekdays)) {
      const unsupportedYear = this.getUnsupportedYear(cursor, calendar);
      if (unsupportedYear !== null) {
        return {
          businessDaysCounted: counted,
          dueLocalDate: cursor,
          skippedHolidayDays,
          skippedWeekendDays,
          unsupportedYear,
        };
      }

      if (this.isBusinessDay(cursor, holidays, workingWeekdays)) {
        counted += 1;
        if (counted >= businessDays) {
          break;
        }
      } else if (holidays.has(cursor)) {
        skippedHolidayDays += 1;
      } else {
        skippedWeekendDays += 1;
      }

      cursor = addCalendarDays(cursor, 1);
    }

    return {
      businessDaysCounted: counted,
      dueLocalDate: cursor,
      skippedHolidayDays,
      skippedWeekendDays,
      unsupportedYear: this.getUnsupportedYear(cursor, calendar),
    };
  }

  public toZonedIso(localDate: string, hour: number, minute: number, timezone: string): string | null {
    if (!isValidDueTime(hour, minute) || !isIsoLocalDate(localDate) || !this.isSupportedTimezone(timezone)) {
      return null;
    }

    const parts = parseLocalDate(localDate);
    if (!parts) {
      return null;
    }

    let utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0, 0);
    for (let index = 0; index < 3; index += 1) {
      const offsetMinutes = getTimezoneOffsetMinutes(new Date(utcMs), timezone);
      utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0, 0) - offsetMinutes * 60_000;
    }

    return new Date(utcMs).toISOString();
  }

  private isBusinessDay(localDate: string, holidays: ReadonlySet<string>, workingWeekdays: ReadonlySet<number>): boolean {
    return workingWeekdays.has(getUtcWeekday(localDate)) && !holidays.has(localDate);
  }

  private getUnsupportedYear(localDate: string, calendar: BusinessCalendar): number | null {
    const parts = parseLocalDate(localDate);
    if (!parts) {
      return null;
    }

    return calendar.supportedYears.includes(parts.year) ? null : parts.year;
  }
}

export function addCalendarDays(localDate: string, days: number): string {
  const parts = parseLocalDate(localDate);
  if (!parts) {
    return localDate;
  }

  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return value.toISOString().slice(0, 10);
}

export function isIsoLocalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && parseLocalDate(value) !== null;
}

export function isValidDueTime(hour: number, minute: number): boolean {
  return Number.isSafeInteger(hour) && Number.isSafeInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function getUtcWeekday(localDate: string): number {
  const parts = parseLocalDate(localDate);
  if (!parts) {
    return -1;
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function parseLocalDate(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return { day, month, year };
}

function getTimezoneOffsetMinutes(instant: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));

  return Math.round((asUtc - instant.getTime()) / 60_000);
}
