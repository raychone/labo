import { describe, expect, it } from "vitest";

import { REAL_PRICING_CATALOG } from "./real-pricing-catalog.js";

describe("canonical work-type pricing catalog", () => {
  it("contains the 43 selectable Excel work types with unique symbols and names", () => {
    expect(REAL_PRICING_CATALOG).toHaveLength(43);
    expect(new Set(REAL_PRICING_CATALOG.map((entry) => entry.symbol)).size).toBe(43);
    expect(new Set(REAL_PRICING_CATALOG.map((entry) => entry.workTypeCode)).size).toBe(43);
    expect(REAL_PRICING_CATALOG.some((entry) => entry.displayName.includes("Coroane adiacente"))).toBe(false);
    expect(REAL_PRICING_CATALOG.some((entry) => entry.displayName.includes("Reproducere țesut gingival"))).toBe(false);
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "EX-01")).toMatchObject({ displayName: "Coroană/fațetă integral ceramică" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "EX-10")).toMatchObject({ displayName: "Coroană zirconia multistrat pe implant integral anatomică" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "EX-11")).toMatchObject({ displayName: "Coroană metalo-ceramică total fizionomică" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "EX-26")).toMatchObject({ displayName: "Proteză flexibilă Biocetal/Acron (culoare Vita)" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "EX-45")).toMatchObject({ displayName: "Rebazare" });
  });

  it("keeps approved prices in integer minor RON units and leaves ambiguous prices neutral", () => {
    const prices = new Map(REAL_PRICING_CATALOG.map((entry) => [entry.symbol, entry.priceMinor]));
    const approvedPrices: Record<string, number> = {
      "EX-01": 50000,
      "EX-04": 70000,
      "EX-06": 45000,
      "EX-10": 39000,
      "EX-11": 32000,
      "EX-16": 200000,
      "EX-21": 10000,
      "EX-25": 200000,
      "EX-26": 90000,
      "EX-27": 45000,
      "EX-28": 42000,
      "EX-38": 19000,
      "EX-40": 4000,
      "EX-44": 6000,
      "EX-45": 10000,
    };
    for (const [symbol, expectedPrice] of Object.entries(approvedPrices)) {
      expect(prices.get(symbol), symbol).toBe(expectedPrice);
    }
    expect(REAL_PRICING_CATALOG.every((entry) => Number.isInteger(entry.priceMinor) && entry.priceMinor >= 0)).toBe(true);
  });
});
