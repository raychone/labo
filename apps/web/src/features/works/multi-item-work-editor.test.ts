import { describe, expect, it } from "vitest";

import { filterDraftConnections, getDraftCompositionTeeth, toggleDraftConnection, type DraftWorkOrderItem } from "./multi-item-work-editor.js";

function item(scope: DraftWorkOrderItem["scope"], teeth: DraftWorkOrderItem["teeth"] = []): DraftWorkOrderItem {
  return {
    id: `${scope}-${teeth.join("-")}`,
    scope,
    teeth,
    workTypeId: "type-1",
    shade: null,
    implantPlatform: null,
    implantPlatformCustom: null,
    restorationType: null,
    technicalCodeNotes: null,
    notes: null,
  };
}

describe("multi-item work draft", () => {
  it("keeps a lower-arch component as one item while exposing its anatomical composition", () => {
    expect(getDraftCompositionTeeth([item("LOWER_ARCH")])).toEqual([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);
  });

  it("combines independent tooth, multi-tooth, and arch components without duplicating the case", () => {
    expect(getDraftCompositionTeeth([
      item("TOOTH", [11]),
      item("TEETH", [12, 21]),
      item("LOWER_ARCH"),
    ])).toEqual([12, 11, 21, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);
  });

  it("adds and removes canonical adjacent connections from the case draft", () => {
    const composition = getDraftCompositionTeeth([item("TOOTH", [11]), item("TOOTH", [12])]);
    const added = toggleDraftConnection([], { toothA: 12, toothB: 11 }, composition);
    expect(added).toEqual([{ toothA: 12, toothB: 11 }]);
    expect(toggleDraftConnection(added, { toothA: 11, toothB: 12 }, composition)).toEqual([]);
  });

  it("uses anatomical order for the lower midline and rejects unavailable pairs", () => {
    const composition = getDraftCompositionTeeth([item("TOOTH", [41]), item("TOOTH", [31])]);
    expect(toggleDraftConnection([], { toothA: 31, toothB: 41 }, composition)).toEqual([{ toothA: 41, toothB: 31 }]);
    expect(toggleDraftConnection([], { toothA: 11, toothB: 31 }, [11, 31])).toEqual([]);
  });

  it("includes the current unsaved editor selection in connection availability", () => {
    const saved = getDraftCompositionTeeth([item("TOOTH", [12])]);
    const current = getDraftCompositionTeeth([...([item("TOOTH", [12])] as const), { scope: "TOOTH", teeth: [11] }]);
    expect(toggleDraftConnection([], { toothA: 11, toothB: 12 }, current)).toEqual([{ toothA: 12, toothB: 11 }]);
    expect(toggleDraftConnection([], { toothA: 11, toothB: 12 }, saved)).toEqual([]);
  });

  it("keeps valid draft connections after adding an item and removes unsaved-only pairs before submit", () => {
    const saved = [item("TOOTH", [11])];
    const active = [{ toothA: 12 as const, toothB: 11 as const }];
    expect(filterDraftConnections(active, getDraftCompositionTeeth([...saved, item("TOOTH", [12])]))).toEqual(active);
    expect(filterDraftConnections(active, getDraftCompositionTeeth(saved))).toEqual([]);
  });
});
