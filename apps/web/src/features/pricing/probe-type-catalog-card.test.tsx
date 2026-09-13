import { ToastProvider } from "@dental-lab/ui";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProbeTypeCatalogCard } from "./pricing-page.js";

const mocks = vi.hoisted(() => ({
  createMutation: { isPending: false, mutate: vi.fn() },
  updateMutation: { isPending: false, mutate: vi.fn() },
}));

vi.mock("../works/works-api.js", () => ({
  useAllProbeTypes: () => ({ data: [{ id: "pt-1", isArchived: false, name: "Lingură", sortOrder: 0 }], isLoading: false }),
  useCreateProbeType: () => mocks.createMutation,
  useUpdateProbeType: () => mocks.updateMutation,
}));

describe("ProbeTypeCatalogCard / B10", () => {
  beforeEach(() => {
    mocks.createMutation.mutate.mockClear();
    mocks.updateMutation.mutate.mockClear();
  });

  it("opens a wide modal and exposes the complete active work-type catalog for a new probe", () => {
    const workTypes = [
      { basePriceMinor: 1000, code: "TECH-CR-001", id: "wt-1", name: "Coroană zirconiu", probeFamily: "ZR" as const, symbol: "ZR", unit: "ELEMENT" as const },
      { basePriceMinor: 1000, code: "TECH-CR-002", id: "wt-2", name: "Coroană ceramică", probeFamily: "MC" as const, symbol: "MC", unit: "ELEMENT" as const },
      { basePriceMinor: 1000, code: "TECH-CR-003", id: "wt-3", name: "Proteză", probeFamily: "PRO" as const, symbol: "PRO", unit: "UNIT" as const },
    ];
    render(<ToastProvider><ProbeTypeCatalogCard canManage isLoading={false} probeTypes={[{ id: "pt-1", isArchived: false, name: "Lingură", sortOrder: 0 }]} workTypes={workTypes} /></ToastProvider>);
    expect(screen.queryByLabelText("Denumire")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip probă" }));
    const dialog = screen.getByRole("dialog", { name: "Adaugă tip probă" });
    expect(dialog.className).toContain("pricing-page__probe-type-modal");
    for (const workType of workTypes) expect(within(dialog).getByRole("button", { name: new RegExp(`^${workType.name}`) })).toBeDefined();
    expect(within(dialog).queryByText("TECH-CR-001")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Coroană zirconiu/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Proteză/ }));
    fireEvent.change(within(dialog).getByLabelText("Denumire"), { target: { value: "Biscuit" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Adaugă tip probă" }));
    expect(mocks.createMutation.mutate).toHaveBeenCalledWith({ name: "Biscuit", sortOrder: 0, workTypeIds: ["wt-1", "wt-3"] }, expect.anything());
    expect(screen.getByRole("button", { name: "Editează" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Arhivează" })).toBeDefined();
  });

  it("does not expose catalog administration controls without probe_types.manage", () => {
    render(<ToastProvider><ProbeTypeCatalogCard canManage={false} isLoading={false} probeTypes={[{ id: "pt-1", isArchived: false, name: "Lingură", sortOrder: 0 }]} /></ToastProvider>);
    expect(screen.queryByRole("button", { name: "Adaugă tip probă" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editează" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Arhivează" })).toBeNull();
  });

  it("opens the edit flow in the same modal and filters rows", () => {
    render(<ToastProvider><ProbeTypeCatalogCard canManage isLoading={false} probeTypes={[{ id: "pt-1", isArchived: false, name: "Lingură", sortOrder: 2 }, { id: "pt-2", isArchived: true, name: "Machetă", sortOrder: 3 }]} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText("Căutare"), { target: { value: "machet" } });
    expect(screen.queryByText("Lingură")).toBeNull();
    expect(screen.getByText("Machetă")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Editează" }));
    expect(screen.getByRole("dialog", { name: "Editează tip probă" })).toBeDefined();
    expect((screen.getByLabelText("Denumire") as HTMLInputElement).value).toBe("Machetă");
  });
});
