import { describe, expect, it } from "vitest";

import { isStylePreviewEnabled } from "./deployment-policy.js";

describe("isStylePreviewEnabled", () => {
  it("keeps the design preview available during development", () => {
    expect(isStylePreviewEnabled({ isDevelopment: true })).toBe(true);
  });

  it("requires an explicit opt-in outside development", () => {
    expect(isStylePreviewEnabled({ configuredValue: "false", isDevelopment: false })).toBe(false);
    expect(isStylePreviewEnabled({ configuredValue: "true", isDevelopment: false })).toBe(true);
  });
});
