import { describe, expect, it } from "vitest";

import { formatLegalEntityOption, getLegalEntityDisplayName, isLegalEntityCode } from "./organization-context.js";

describe("organization context helpers", () => {
  it("recognizes supported public legal entity codes", () => {
    expect(isLegalEntityCode("NC")).toBe(true);
    expect(isLegalEntityCode("NG")).toBe(true);
    expect(isLegalEntityCode("tenant_1")).toBe(false);
  });

  it("formats legal entity labels without internal ids", () => {
    expect(getLegalEntityDisplayName("NC")).toBe("Nicolaie Cristina");
    expect(formatLegalEntityOption({ code: "NG", displayName: "Nicolaie Gabriel" })).toBe("NG - Nicolaie Gabriel");
  });
});
