import { describe, expect, it } from "vitest";

import {
  getCanonicalWorkOrderCompositionTeeth,
  isAdjacentAdultFdiPair,
  normalizeConnectionPair,
} from "./tooth-connections.js";

describe("tooth connection contract", () => {
  it("normalizes reversed pairs and accepts both midlines", () => {
    expect(normalizeConnectionPair(12, 11)).toEqual({ toothA: 12, toothB: 11 });
    expect(isAdjacentAdultFdiPair(11, 21)).toBe(true);
    expect(isAdjacentAdultFdiPair(41, 31)).toBe(true);
  });

  it("rejects non-neighbors, invalid teeth, and cross-arch pairs", () => {
    expect(isAdjacentAdultFdiPair(11, 13)).toBe(false);
    expect(isAdjacentAdultFdiPair(11, 31)).toBe(false);
    expect(isAdjacentAdultFdiPair(11, 99)).toBe(false);
  });

  it("expands semantic arch scopes without fabricating item tooth rows", () => {
    expect(getCanonicalWorkOrderCompositionTeeth([{ scope: "LOWER_ARCH", teeth: [] }])).toHaveLength(16);
    expect(getCanonicalWorkOrderCompositionTeeth([{ scope: "CASE", teeth: [] }])).toEqual([]);
    expect(getCanonicalWorkOrderCompositionTeeth([
      { scope: "TOOTH", teeth: [11] },
      { scope: "TOOTH", teeth: [21] },
    ])).toEqual([11, 21]);
  });
});
