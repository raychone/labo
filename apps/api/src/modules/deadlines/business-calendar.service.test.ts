import { describe, expect, it } from "vitest";

import { BusinessCalendarService } from "./business-calendar.service.js";

describe("BusinessCalendarService", () => {
  const service = new BusinessCalendarService();
  const calendar = service.getRomanianBusinessCalendar();

  it("builds a deterministic Romanian calendar for 2026-2030 and deduplicates holidays", () => {
    const dates = calendar.holidays.map((holiday) => holiday.date);

    expect(calendar.countryCode).toBe("RO");
    expect(calendar.supportedYears).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(calendar.workingWeekdays).toEqual([1, 2, 3, 4, 5]);
    expect(dates).toContain("2026-04-10");
    expect(dates).toContain("2026-06-01");
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("adds business days excluding weekends and Romanian legal holidays", () => {
    const result = service.addBusinessDays("2026-04-09", 1, calendar, false);

    expect(result.dueLocalDate).toBe("2026-04-14");
    expect(result.businessDaysCounted).toBe(1);
    expect(result.skippedHolidayDays).toBe(3);
    expect(result.skippedWeekendDays).toBe(1);
  });

  it("honors includeStartDay for a working start date", () => {
    const excluded = service.addBusinessDays("2026-07-29", 3, calendar, false);
    const included = service.addBusinessDays("2026-07-29", 3, calendar, true);

    expect(excluded.dueLocalDate).toBe("2026-08-03");
    expect(included.dueLocalDate).toBe("2026-07-31");
  });

  it("keeps due hour stable across Bucharest DST", () => {
    const beforeDst = service.toZonedIso("2026-03-27", 17, 0, "Europe/Bucharest");
    const afterDst = service.toZonedIso("2026-03-30", 17, 0, "Europe/Bucharest");

    expect(beforeDst).toBe("2026-03-27T15:00:00.000Z");
    expect(afterDst).toBe("2026-03-30T14:00:00.000Z");
  });

  it("reports unsupported years instead of walking past the deterministic range", () => {
    const result = service.addBusinessDays("2030-12-31", 1, calendar, false);

    expect(result.unsupportedYear).toBe(2031);
  });
});
