import { describe, expect, it } from "vitest";

import { BusinessCalendarService } from "./business-calendar.service.js";
import { DeadlineEngineService } from "./deadline-engine.service.js";
import type { DeadlineExecutionRuleInput } from "./deadline.types.js";

function rule(input: Partial<DeadlineExecutionRuleInput> = {}): DeadlineExecutionRuleInput {
  return {
    executionDays: 4,
    isActive: true,
    maxQuantity: 7,
    minQuantity: 1,
    priority: 1,
    requiresManualDueDate: false,
    ...input,
  };
}

describe("DeadlineEngineService", () => {
  const calendarService = new BusinessCalendarService();
  const service = new DeadlineEngineService(calendarService);
  const calendar = calendarService.getRomanianBusinessCalendar();

  it("calculates Romanian business-day deadlines at 17:00 Europe/Bucharest", () => {
    const result = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 4,
      rules: [rule()],
      startAt: "2026-07-29T09:00:00.000+03:00",
      timezone: "Europe/Bucharest",
    });

    expect(result.mode).toBe("CALCULATED");
    expect(result.executionDays).toBe(4);
    expect(result.startLocalDate).toBe("2026-07-29");
    expect(result.dueLocalDate).toBe("2026-08-04");
    expect(result.calculatedDueAt).toBe("2026-08-04T14:00:00.000Z");
    expect(result.explanation).toContain("ziua de start nu este inclusă");
  });

  it("returns MANUAL when the matched rule requires a manual due date", () => {
    const result = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 10,
      rules: [rule({ executionDays: null, maxQuantity: null, minQuantity: 8, requiresManualDueDate: true })],
      startAt: "2026-07-29T09:00:00.000+03:00",
      timezone: "Europe/Bucharest",
    });

    expect(result.mode).toBe("MANUAL");
    expect(result.calculatedDueAt).toBeNull();
    expect(result.explanation).toBe("Regula aplicabilă cere stabilirea manuală a termenului.");
  });

  it("returns controlled unresolved reasons for missing and ambiguous rules", () => {
    const missing = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 20,
      rules: [rule({ maxQuantity: 5 })],
      startAt: "2026-07-29T09:00:00.000+03:00",
      timezone: "Europe/Bucharest",
    });
    const ambiguous = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 2,
      rules: [
        rule({ maxQuantity: 5, priority: 1 }),
        rule({ maxQuantity: 6, priority: 1 }),
      ],
      startAt: "2026-07-29T09:00:00.000+03:00",
      timezone: "Europe/Bucharest",
    });

    expect(missing.reason).toBe("NO_EXECUTION_RULE");
    expect(ambiguous.reason).toBe("AMBIGUOUS_EXECUTION_RULES");
  });

  it("returns a controlled unresolved reason for invalid start dates", () => {
    const result = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 2,
      rules: [rule()],
      startAt: "not-a-date",
      timezone: "Europe/Bucharest",
    });

    expect(result.mode).toBe("UNRESOLVED");
    expect(result.reason).toBe("INVALID_START_DATE");
  });

  it("refuses unsupported timezones and calendar years", () => {
    const invalidTimezone = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 2,
      rules: [rule()],
      startAt: "2026-07-29T09:00:00.000+03:00",
      timezone: "UTC",
    });
    const unsupportedYear = service.calculate({
      calendar,
      includeStartDay: false,
      quantity: 2,
      rules: [rule({ executionDays: 1 })],
      startAt: "2030-12-31T09:00:00.000+02:00",
      timezone: "Europe/Bucharest",
    });

    expect(invalidTimezone.reason).toBe("INVALID_TIMEZONE");
    expect(unsupportedYear.reason).toBe("UNSUPPORTED_CALENDAR_YEAR");
  });
});
