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

  it("opens a compact modal for Manager catalog create controls", () => {
    render(<ToastProvider><ProbeTypeCatalogCard canManage isLoading={false} probeTypes={[{ id: "pt-1", isArchived: false, name: "Lingură", sortOrder: 0 }]} /></ToastProvider>);
    expect(screen.queryByLabelText("Denumire")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip probă" }));
    const dialog = screen.getByRole("dialog", { name: "Adaugă tip probă" });
    fireEvent.change(within(dialog).getByLabelText("Denumire"), { target: { value: "Biscuit" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Adaugă tip probă" }));
    expect(mocks.createMutation.mutate).toHaveBeenCalledWith({ name: "Biscuit", sortOrder: 0 }, expect.anything());
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
