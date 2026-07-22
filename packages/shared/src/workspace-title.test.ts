import { describe, expect, it } from "vitest";

import { APPLICATION_NAME } from "./workspace.constants.js";
import { formatApplicationTitle } from "./workspace-title.js";

describe("formatApplicationTitle", () => {
  it("returns the application name for an empty section", () => {
    expect(formatApplicationTitle(" ")).toBe(APPLICATION_NAME);
  });

  it("combines a section name with the application name", () => {
    expect(formatApplicationTitle("Dashboard")).toBe(
      `Dashboard | ${APPLICATION_NAME}`,
    );
  });
});
