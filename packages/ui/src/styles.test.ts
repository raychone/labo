import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesPath = resolve(process.cwd(), "src/styles.css");

function readStylesheet(): string {
  return readFileSync(stylesPath, "utf8");
}

describe("design foundation stylesheet", () => {
  it("defines core semantic design tokens", () => {
    const stylesheet = readStylesheet();

    expect(stylesheet).toContain("--dl-color-background:");
    expect(stylesheet).toContain("--dl-color-accent:");
    expect(stylesheet).toContain("--dl-font-size-page-title:");
    expect(stylesheet).toContain("--dl-space-4:");
    expect(stylesheet).toContain("--dl-radius-md:");
    expect(stylesheet).toContain("--dl-shadow-focus:");
  });

  it("defines operational status tokens", () => {
    const stylesheet = readStylesheet();

    expect(stylesheet).toContain("--dl-status-draft-background:");
    expect(stylesheet).toContain("--dl-status-production-background:");
    expect(stylesheet).toContain("--dl-status-quality-background:");
    expect(stylesheet).toContain("--dl-status-cancelled-background:");
  });

  it("defines responsive and accessibility foundations", () => {
    const stylesheet = readStylesheet();

    expect(stylesheet).toContain("@media (min-width: 48rem)");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
    expect(stylesheet).toContain(".dl-visually-hidden");
    expect(stylesheet).toContain(":focus-visible");
    expect(stylesheet).toContain('input[aria-invalid="true"]');
    expect(stylesheet).toContain("select {");
    expect(stylesheet).toContain("appearance: none;");
  });
});
