import { describe, expect, it } from "vitest";

import { calculateWorkTypeQuantity, decimalStringToMinor, minorToDecimalString } from "./work-types.js";

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

  it("prices 12 zirconia elements at 300 RON per element", () => {
    const quantity = calculateWorkTypeQuantity("ELEMENT", { selectedTeeth: [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26] });
    expect(quantity).toBe(12);
    expect(quantity * 30_000).toBe(360_000);
  });

  it("keeps a full-work product at quantity one regardless of selected teeth", () => {
    const quantity = calculateWorkTypeQuantity("UNIT", { scope: "CASE", selectedTeeth: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44] });
    expect(quantity).toBe(1);
    expect(quantity * 50_000).toBe(50_000);
  });

  it("distinguishes one arch from both arches", () => {
    expect(calculateWorkTypeQuantity("ARCH", { scope: "UPPER_ARCH" })).toBe(1);
    expect(calculateWorkTypeQuantity("ARCH", { scope: "BOTH_ARCHES" })).toBe(2);
    expect(calculateWorkTypeQuantity("ARCH", { scope: "BOTH_ARCHES" }) * 10_000).toBe(20_000);
  });
});
