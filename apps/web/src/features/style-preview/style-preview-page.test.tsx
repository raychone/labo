import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StylePreviewPage } from "./style-preview-page.js";

describe("StylePreviewPage", () => {
  it("renders the internal core UI components preview", () => {
    render(<StylePreviewPage />);

    expect(screen.getByRole("heading", { name: /Core UI Components/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Previzualizare diagramă dentară" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Dinte 11" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Semantic Colors" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Buttons" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "File Upload and Data Table" })).toBeDefined();
  });
});
