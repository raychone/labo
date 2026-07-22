import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StylePreviewPage } from "./style-preview-page.js";

describe("StylePreviewPage", () => {
  it("renders the internal design foundation preview", () => {
    render(<StylePreviewPage />);

    expect(screen.getByRole("heading", { name: /Design Foundation/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Semantic Colors" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Native Control States" })).toBeDefined();
  });
});
