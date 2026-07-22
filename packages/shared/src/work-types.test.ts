import { describe, expect, it } from "vitest";

import { decimalStringToMinor, minorToDecimalString } from "./work-types.js";

describe("work type money helpers", () => {
  it("converts minor units to a deterministic decimal string", () => {
    expect(minorToDecimalString(35000)).toBe("350.00");
    expect(minorToDecimalString(12550)).toBe("125.50");
  });

  it("converts decimal strings to minor units without floating point parsing", () => {
    expect(decimalStringToMinor("350.00")).toStrictEqual({ ok: true, value: 35000 });
    expect(decimalStringToMinor("350")).toStrictEqual({ ok: true, value: 35000 });
    expect(decimalStringToMinor("350.5")).toStrictEqual({ ok: true, value: 35050 });
    expect(decimalStringToMinor("350,50")).toStrictEqual({ ok: true, value: 35050 });
  });

  it("rejects invalid, negative, or over-precise values", () => {
    expect(decimalStringToMinor("-1").ok).toBe(false);
    expect(decimalStringToMinor("12.345").ok).toBe(false);
    expect(decimalStringToMinor("abc").ok).toBe(false);
  });
});
