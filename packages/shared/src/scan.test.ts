import { describe, expect, it } from "vitest";

import {
  formatScanProgress,
  isDuplicateScan,
  normalizeScanPayload,
  sortScanActions,
  validateScanPayloadPrefix,
} from "./scan.js";

describe("scan helpers", () => {
  it("normalizes and validates scan payload prefixes", () => {
    expect(normalizeScanPayload("  dl-work:abc  ")).toBe("dl-work:abc");
    expect(validateScanPayloadPrefix("  dl-work:abc", "dl-work:")).toBe(true);
    expect(validateScanPayloadPrefix("WO-26-0001", "dl-work:")).toBe(false);
  });

  it("detects duplicate scans inside the configured window", () => {
    expect(isDuplicateScan({ lastPayload: "dl-work:abc", nextPayload: " dl-work:abc ", now: 2_500, scannedAt: 1_000 })).toBe(true);
    expect(isDuplicateScan({ lastPayload: "dl-work:abc", nextPayload: "dl-work:def", now: 2_500, scannedAt: 1_000 })).toBe(false);
    expect(isDuplicateScan({ lastPayload: "dl-work:abc", nextPayload: "dl-work:abc", now: 4_000, scannedAt: 1_000 })).toBe(false);
  });

  it("sorts scan actions and formats progress", () => {
    const actions = sortScanActions([
      { enabled: true, reason: null, type: "COMPLETE_STAGE" },
      { enabled: true, reason: null, type: "OPEN_WORK" },
      { enabled: false, reason: "Nu este permis.", type: "ASSIGN_STAGE" },
    ]);

    expect(actions.map((action) => action.type)).toStrictEqual(["OPEN_WORK", "COMPLETE_STAGE", "ASSIGN_STAGE"]);
    expect(formatScanProgress({ completed: 2, total: 5 })).toBe("2/5 etape");
  });
});
