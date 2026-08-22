import { describe, expect, it } from "vitest";

import { REAL_PRICING_CATALOG } from "./real-pricing-catalog.js";

describe("canonical work-type pricing catalog", () => {
  it("contains exactly 32 unique canonical symbols and names", () => {
    expect(REAL_PRICING_CATALOG).toHaveLength(32);
    expect(new Set(REAL_PRICING_CATALOG.map((entry) => entry.symbol)).size).toBe(32);
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "Zr")).toMatchObject({ displayName: "Zirconia FULL anatomic" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "Zr I")).toMatchObject({ displayName: "Zirconia pe implant" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "Emax")).toMatchObject({ displayName: "Integral Ceramică" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "TF / MC")).toMatchObject({ displayName: "Total fizionimic / Metalo Ceramică" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "SCH")).toMatchObject({ displayName: "Proteză Scheletată / Mobilizabilă" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "PTA")).toMatchObject({ displayName: "Proteză Totală Acrilică" });
    expect(REAL_PRICING_CATALOG.find((entry) => entry.symbol === "PPA")).toMatchObject({ displayName: "Proteză Parțială Acrilică" });
  });

  it("keeps approved prices in integer minor RON units and leaves ambiguous prices neutral", () => {
    const prices = new Map(REAL_PRICING_CATALOG.map((entry) => [entry.symbol, entry.priceMinor]));
    const approvedPrices: Record<string, number> = {
      Zr: 30000,
      "Zr I": 39000,
      "Zr E": 45000,
      "Zr SF": 40000,
      "Inlay / Table Top": 45000,
      Emax: 50000,
      "TF / MC": 32000,
      "I BAR": 200000,
      PMMA: 10000,
      "RCR/DCR": 7000,
      "RCR/DCR cu bila/claveta": 8000,
      SCH: 200000,
      PTA: 45000,
      PPA: 42000,
      KMY: 19000,
      "Wax-up": 4000,
      MP: 6000,
      MS: 6000,
      "Cimentare Zr I": 5000,
      "Cimentare PMMA I": 3000,
    };
    for (const [symbol, expectedPrice] of Object.entries(approvedPrices)) {
      expect(prices.get(symbol), symbol).toBe(expectedPrice);
    }
    expect(prices.get("CC")).toBe(0);
    expect(prices.get("REP PROT")).toBe(0);
    expect(prices.get("GB/GC/GA/Essix")).toBe(0);
    expect(prices.get("LI + SO")).toBe(0);
    expect(prices.get("PMMA I")).toBe(0);
    expect(REAL_PRICING_CATALOG.every((entry) => Number.isInteger(entry.priceMinor) && entry.priceMinor >= 0)).toBe(true);
  });
});
