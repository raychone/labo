import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getToothAssetPath, getToothAssetPresentation, isMirroredTooth, ToothDiagram } from "./tooth-diagram.js";

describe("ToothDiagram", () => {
  it("renders exactly 32 adult teeth in canonical upper and lower order", () => {
    render(<ToothDiagram />);
    const teeth = screen.getAllByRole("button", { name: /^Dinte \d+$/ });
    expect(teeth).toHaveLength(32);
    expect(teeth.slice(0, 16).map((button) => button.getAttribute("aria-label"))).toEqual([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((tooth) => `Dinte ${tooth}`));
    expect(teeth.slice(16).map((button) => button.getAttribute("aria-label"))).toEqual([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((tooth) => `Dinte ${tooth}`));
  });

  it("uses source assets for both normal and mirrored logical identities", () => {
    render(<ToothDiagram />);
    expect(screen.getByRole("button", { name: "Dinte 11" }).querySelector("img")?.getAttribute("src")).toBe("/dinti/11.png");
    expect(screen.getByRole("button", { name: "Dinte 21" }).querySelector("img")?.getAttribute("src")).toBe("/dinti/11.png");
    expect(screen.getByRole("button", { name: "Dinte 21" }).querySelector("img")?.className).toContain("mirrored");
    expect(screen.getByRole("button", { name: "Dinte 31" }).querySelector("img")?.getAttribute("src")).toBe("/dinti/41.png");
  });

  it.each([
    [18, 28], [17, 27], [16, 26], [15, 25], [14, 24], [13, 23], [12, 22], [11, 21],
    [48, 38], [47, 37], [46, 36], [45, 35], [44, 34], [43, 33], [42, 32], [41, 31],
  ] as const)("keeps contralateral geometry mapping deterministic for %s/%s", (source, mirrored) => {
    expect(getToothAssetPath(source)).toBe(getToothAssetPath(mirrored));
    expect(isMirroredTooth(source)).toBe(false);
    expect(isMirroredTooth(mirrored)).toBe(true);
  });

  it.each([[18, 28], [17, 27], [16, 26], [48, 38], [47, 37], [46, 36]] as const)("shares alpha-derived presentation normalization for %s/%s", (source, mirrored) => {
    expect(getToothAssetPresentation(source)).toEqual(getToothAssetPresentation(mirrored));
  });

  it("derives normalization from measured visible alpha height", () => {
    const presentation = getToothAssetPresentation(18);
    expect(presentation.visibleHeightRatio).toBeCloseTo(414 / 557, 10);
    expect(presentation.normalizationScale * presentation.visibleHeightRatio).toBeCloseTo(0.865, 10);
  });

  it("renders all 30 connection circles, including both midlines, without a central plus", () => {
    render(<ToothDiagram />);
    expect(screen.getAllByRole("button", { name: /Conexiune între dinții/ })).toHaveLength(30);
    expect(screen.getByRole("button", { name: "Conexiune între dinții 11 și 21" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Conexiune între dinții 41 și 31" })).not.toBeNull();
    expect(screen.queryByText("+")).toBeNull();
  });

  it("normalizes reversed connection input and emits a canonical pair", () => {
    const onConnectionToggle = vi.fn();
    render(<ToothDiagram connections={[{ toothA: 21, toothB: 11 }]} onConnectionToggle={onConnectionToggle} />);
    const connection = screen.getByRole("button", { name: "Conexiune între dinții 11 și 21" });
    expect(connection.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(connection);
    expect(onConnectionToggle).toHaveBeenCalledWith({ toothA: 11, toothB: 21 });
  });

  it("does not mutate unavailable or read-only connections", () => {
    const onConnectionToggle = vi.fn();
    const firstRender = render(<ToothDiagram availableTeeth={[11]} onConnectionToggle={onConnectionToggle} />);
    expect((screen.getByRole("button", { name: "Conexiune între dinții 11 și 21" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Conexiune între dinții 11 și 21" }));
    expect(onConnectionToggle).not.toHaveBeenCalled();

    firstRender.unmount();
    const onToothToggle = vi.fn();
    render(<ToothDiagram mode="readOnly" onToothToggle={onToothToggle} onConnectionToggle={onConnectionToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Dinte 21" }));
    fireEvent.click(screen.getByRole("button", { name: "Conexiune între dinții 11 și 21" }));
    expect(onToothToggle).not.toHaveBeenCalled();
    expect(onConnectionToggle).not.toHaveBeenCalled();
  });

  it("emits tooth toggles and keeps configured state independent", () => {
    const onToothToggle = vi.fn();
    render(<ToothDiagram configuredTeeth={[11]} selectedTeeth={[12]} onToothToggle={onToothToggle} />);
    expect(screen.getByRole("button", { name: "Dinte 11" }).classList.contains("tooth-diagram__tooth--configured")).toBe(true);
    expect(screen.getByRole("button", { name: "Dinte 12" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Dinte 21" }));
    expect(onToothToggle).toHaveBeenCalledWith(21);
  });

  it("applies shortcuts for upper, lower, both and clear selection", () => {
    const onShortcut = vi.fn();
    render(<ToothDiagram onShortcut={onShortcut} />);
    fireEvent.click(screen.getByRole("button", { name: "Arcada superioară" }));
    expect(onShortcut).toHaveBeenLastCalledWith([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]);
    fireEvent.click(screen.getByRole("button", { name: "Arcada inferioară" }));
    expect(onShortcut).toHaveBeenLastCalledWith([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);
    fireEvent.click(screen.getByRole("button", { name: "Ambele arcade" }));
    expect(onShortcut).toHaveBeenLastCalledWith(expect.arrayContaining([11, 21, 41, 31]));
    expect(onShortcut.mock.calls.at(-1)?.[0]).toHaveLength(32);
    fireEvent.click(screen.getByRole("button", { name: "Șterge selecția" }));
    expect(onShortcut).toHaveBeenLastCalledWith([]);
  });

  it("supports semantic arch highlighting and operation-selection mode", () => {
    render(<ToothDiagram mode="technician-operation-selection" semanticScope="LOWER_ARCH" />);
    expect(screen.getByRole("region", { name: "Compoziția dentară" }).querySelector('[data-arch="lower"]')?.classList.contains("tooth-diagram__arch--semantic")).toBe(true);
    expect(screen.getByRole("region", { name: "Compoziția dentară" }).getAttribute("data-mode")).toBe("technician-operation-selection");
  });
});
