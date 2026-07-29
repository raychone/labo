import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatContextualSettingsLabel,
  formatDateTime,
  isSupportedCurrency,
  isSupportedCountryCode,
  isSupportedLocale,
  isSupportedTimezone,
} from "./settings.js";

describe("settings contracts", () => {
  it("guards supported localization values", () => {
    expect(isSupportedLocale("ro-RO")).toBe(true);
    expect(isSupportedCurrency("RON")).toBe(true);
    expect(isSupportedCountryCode("RO")).toBe(true);
    expect(isSupportedTimezone("Europe/Bucharest")).toBe(true);
    expect(isSupportedLocale("zz-ZZ")).toBe(false);
    expect(isSupportedCurrency("ABC")).toBe(false);
    expect(isSupportedCountryCode("DE")).toBe(false);
    expect(isSupportedTimezone("GMT+2")).toBe(false);
  });

  it("formats dates and money from settings", () => {
    const settings = {
      currency: "RON",
      locale: "ro-RO",
      timezone: "Europe/Bucharest",
    } as const;

    expect(formatCurrency(1234.5, settings)).toContain("RON");
    expect(formatDateTime("2026-01-01T10:00:00.000Z", settings)).toContain("2026");
  });

  it("formats contextual settings labels without internal IDs", () => {
    expect(formatContextualSettingsLabel({
      legalEntityCode: "NC",
      legalEntityDisplayName: "Nicolaie Cristina",
    })).toBe("NC — Nicolaie Cristina");
  });
});
