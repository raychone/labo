import { describe, expect, it } from "vitest";

import { normalizeWorkOrderItemTeeth, validateWorkOrderItemScope } from "./work-order-items.js";

describe("WorkOrderItem scope contract", () => {
  it("validates tooth and multi-tooth scopes without inferring semantic scope", () => {
    expect(validateWorkOrderItemScope({ scope: "TOOTH", teeth: [11] }).valid).toBe(true);
    expect(validateWorkOrderItemScope({ scope: "TEETH", teeth: [11, 12, 21] }).valid).toBe(true);
    expect(validateWorkOrderItemScope({ scope: "LOWER_ARCH", teeth: [] }).valid).toBe(true);
    expect(validateWorkOrderItemScope({ scope: "LOWER_ARCH", teeth: [41] }).valid).toBe(true);
    expect(validateWorkOrderItemScope({ scope: "CASE", teeth: [] }).valid).toBe(true);
  });

  it("rejects invalid cardinality, invalid FDI, and duplicate teeth", () => {
    expect(validateWorkOrderItemScope({ scope: "TOOTH", teeth: [] }).reason).toBe("TOOTH_COUNT");
    expect(validateWorkOrderItemScope({ scope: "TEETH", teeth: [11] }).reason).toBe("TOOTH_COUNT");
    expect(validateWorkOrderItemScope({ scope: "TOOTH", teeth: [19] }).reason).toBe("INVALID_TOOTH");
    expect(validateWorkOrderItemScope({ scope: "TEETH", teeth: [11, 11] }).reason).toBe("DUPLICATE_TOOTH");
  });

  it("orders teeth deterministically using canonical adult FDI order", () => {
    expect(normalizeWorkOrderItemTeeth([21, 11, 48, 12])).toEqual([12, 11, 21, 48]);
  });
});
