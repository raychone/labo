import { describe, expect, it } from "vitest";

import { classifyLegacyComposition, extractLegacyFdiTeeth } from "./legacy-compatibility.js";

describe("legacy compatibility contract", () => {
  it("gives active canonical items precedence", () => {
    expect(classifyLegacyComposition({ activeCanonicalItemCount: 2, archivedCanonicalItemCount: 0, legacyToothCount: 3 })).toMatchObject({
      classification: "MIXED",
      source: "CANONICAL",
      canonicalItemsAuthoritative: true,
      legacyProjectionAllowed: false,
    });
  });

  it("does not resurrect legacy composition after canonical items are archived", () => {
    expect(classifyLegacyComposition({ activeCanonicalItemCount: 0, archivedCanonicalItemCount: 2, legacyToothCount: 3 })).toMatchObject({
      classification: "CANONICAL_ARCHIVED",
      legacyProjectionAllowed: false,
    });
  });

  it("classifies grouped historical teeth as ambiguous without splitting them", () => {
    expect(classifyLegacyComposition({ activeCanonicalItemCount: 0, archivedCanonicalItemCount: 0, legacyToothCount: 3 }).classification).toBe("LEGACY_AMBIGUOUS");
    expect(extractLegacyFdiTeeth(["21", "11", "11", "51", "bad"])).toEqual([11, 21]);
  });
});
