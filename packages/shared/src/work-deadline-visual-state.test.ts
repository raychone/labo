import { describe, expect, it } from "vitest";

import { isDeadlineInFilter, resolveDeadlineVisualState } from "./work-deadline-visual-state.js";

const now = "2026-07-29T09:00:00.000Z";

describe("deadline visual state resolver", () => {
  it("resolves manual and unresolved deadlines without using internal dates directly", () => {
    expect(resolveDeadlineVisualState({ effectiveDueAt: "2026-08-01T10:00:00.000Z", mode: "MANUAL", now })).toMatchObject({
      color: "blue",
      countdown: "termen manual",
      state: "MANUAL",
    });
    expect(resolveDeadlineVisualState({ effectiveDueAt: null, mode: "UNRESOLVED", now })).toMatchObject({
      color: "dark-gray",
      countdown: "fără termen",
      state: "UNRESOLVED",
    });
    expect(resolveDeadlineVisualState({ effectiveDueAt: null, mode: null, now })).toMatchObject({
      color: "gray",
      state: "UNKNOWN",
    });
  });

  it("resolves today, tomorrow and late labels in Europe/Bucharest", () => {
    expect(resolveDeadlineVisualState({ effectiveDueAt: "2026-07-29T14:00:00.000Z", mode: "CALCULATED", now })).toMatchObject({
      color: "strong-orange",
      countdown: "astăzi",
      state: "DUE_TODAY",
    });
    expect(resolveDeadlineVisualState({ effectiveDueAt: "2026-07-30T14:00:00.000Z", mode: "CALCULATED", now })).toMatchObject({
      color: "yellow",
      countdown: "mâine",
      state: "DUE_TOMORROW",
    });
    expect(resolveDeadlineVisualState({ effectiveDueAt: "2026-07-26T14:00:00.000Z", mode: "CALCULATED", now })).toMatchObject({
      color: "red",
      countdown: "întârziată cu 3 zile",
      state: "LATE",
    });
  });

  it("uses configurable default warning thresholds before on-time state", () => {
    expect(resolveDeadlineVisualState({ effectiveDueAt: "2026-08-02T14:00:00.000Z", mode: "CALCULATED", now: "2026-07-31T09:00:00.000Z" })).toMatchObject({
      color: "strong-orange",
      countdown: "2 zile",
      state: "WARNING",
    });
    expect(resolveDeadlineVisualState({ effectiveDueAt: "2026-08-04T14:00:00.000Z", mode: "CALCULATED", now })).toMatchObject({
      color: "green",
      countdown: "6 zile",
      state: "ON_TIME",
    });
  });

  it("keeps local day resolution stable across Romanian DST changes", () => {
    const beforeDstChange = "2026-03-28T22:30:00.000Z";
    const afterDstChange = "2026-03-29T21:00:00.000Z";

    expect(resolveDeadlineVisualState({ effectiveDueAt: afterDstChange, mode: "CALCULATED", now: beforeDstChange })).toMatchObject({
      countdown: "mâine",
      state: "DUE_TOMORROW",
    });
  });

  it("matches operational filters from the same resolver", () => {
    expect(isDeadlineInFilter({ effectiveDueAt: "2026-07-29T14:00:00.000Z", mode: "CALCULATED", now }, "TODAY")).toBe(true);
    expect(isDeadlineInFilter({ effectiveDueAt: "2026-07-26T14:00:00.000Z", mode: "CALCULATED", now }, "LATE")).toBe(true);
    expect(isDeadlineInFilter({ effectiveDueAt: null, mode: "UNRESOLVED", now }, "WITHOUT_DEADLINE")).toBe(true);
    expect(isDeadlineInFilter({ effectiveDueAt: "2026-08-04T14:00:00.000Z", mode: "CALCULATED", now }, "NEXT_7_DAYS")).toBe(true);
  });
});
