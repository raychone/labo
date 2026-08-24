import { ToastProvider } from "@dental-lab/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  it("allows Manager catalog create/edit/archive controls", () => {
    render(<ToastProvider><ProbeTypeCatalogCard canManage isLoading={false} probeTypes={[{ id: "pt-1", isArchived: false, name: "Lingură", sortOrder: 0 }]} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText("Denumire"), { target: { value: "Biscuit" } });
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip probă" }));
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
});
