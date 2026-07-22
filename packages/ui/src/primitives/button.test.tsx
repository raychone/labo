import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button.js";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("disables the button while loading", () => {
    render(<Button isLoading>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
