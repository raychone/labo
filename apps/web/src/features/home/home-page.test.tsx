import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomePage } from "./home-page.js";

describe("HomePage", () => {
  it("renders the foundation page", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /MVP Foundation/i })).toBeDefined();
    expect(screen.getByRole("button", { name: "Continua" })).toBeDefined();
  });
});
