import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WorkDetail } from "@dental-lab/shared";
import { WorkDetailComposition } from "./work-detail-composition.js";

const work = {
  id: "work-1",
  code: "WO-26-0001",
  patientName: "Ion Pop",
  patient: { id: "patient-1", firstName: "Ion", lastName: "Pop", fullName: "Ion Pop", birthDate: null, sex: null },
  clinic: { id: "clinic-1", code: "CL-1", name: "Clinica Test" },
  doctor: { id: "doctor-1", displayName: "Dr. Ana Popescu" },
  claim: { executionLegalEntity: { code: "CDT", displayName: "CDT" } },
  executionSnapshot: { summary: { legalEntity: null } },
  clinicalNotes: "Observație generală",
  internalNotes: null,
  items: [
    { id: "item-11", scope: "TOOTH", teeth: [{ fdiTooth: 11, sortOrder: 0 }], workTypeId: "wt-a", workType: { id: "wt-a", code: "A", name: "Coroană A", symbol: "A" }, shade: "A2", implantPlatform: "Alpha Bio", restorationType: null, technicalCodeNotes: "detalii", notes: "notă", archivedAt: null },
    { id: "item-arch", scope: "LOWER_ARCH", teeth: [], workTypeId: "wt-b", workType: { id: "wt-b", code: "B", name: "Gutieră", symbol: "B" }, shade: null, implantPlatform: null, restorationType: null, technicalCodeNotes: null, notes: null, archivedAt: null },
  ],
  toothConnections: [
    { id: "connection-11-12", workOrderId: "work-1", toothA: 11, toothB: 12, createdAt: "2026-08-01T00:00:00.000Z" },
    { id: "connection-11-21", workOrderId: "work-1", toothA: 11, toothB: 21, createdAt: "2026-08-01T00:00:00.000Z" },
  ],
} as unknown as WorkDetail;

function renderSubject(canEdit = false): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ compatibilityLabelRo: "Date canonice", csrfToken: "csrf" }) }));
  render(<QueryClientProvider client={new QueryClient()}><WorkDetailComposition canEdit={canEdit} isOpen work={work} workTypeOptions={[]} /></QueryClientProvider>);
}

describe("WorkDetailComposition", () => {
  it("renders one case with semantic component scopes and persisted active connections", () => {
    renderSubject();
    expect(screen.getByText("Dinte 11")).toBeDefined();
    expect(screen.getAllByText("Arcada inferioară").length).toBeGreaterThan(0);
    expect(screen.getByText("Identitatea lucrării")).toBeDefined();
    expect(screen.getByRole("button", { name: "Conexiune între dinții 12 și 11" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Conexiune între dinții 11 și 21" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("loads existing components into the reused edit flow only after intent", () => {
    renderSubject(true);
    expect(screen.queryByRole("button", { name: "Salvează componenta" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Editează componentele" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Editează" })[0]!);
    expect(screen.getByRole("button", { name: "Salvează componenta" })).toBeDefined();
    expect(screen.getByLabelText("Componentele lucrării")).toBeDefined();
  });

  it("does not expose component edit controls without permission", () => {
    renderSubject(false);
    expect(screen.queryByRole("button", { name: "Editează componentele" })).toBeNull();
  });

  it("sends one aggregate composition request for one save click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ compatibilityLabelRo: "Date canonice", csrfToken: "csrf", items: work.items, toothConnections: work.toothConnections }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<QueryClientProvider client={new QueryClient()}><WorkDetailComposition canEdit work={work} isOpen workTypeOptions={[]} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Editează componentele" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvează componentele" }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/composition")).length).toBe(1));
  });

  it("renders human-readable custom WorkType and platform snapshots", () => {
    const customWork = { ...work, items: [{ ...work.items[0], workType: null, workTypeId: null, customWorkTypeSnapshot: { value: "Zirconiu personalizat" }, implantPlatform: null, customImplantPlatformSnapshot: { value: "Platformă custom" } }] } as unknown as WorkDetail;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ compatibilityLabelRo: "Date canonice" }) }));
    render(<QueryClientProvider client={new QueryClient()}><WorkDetailComposition canEdit={false} isOpen work={customWork} workTypeOptions={[]} /></QueryClientProvider>);
    expect(screen.getByText("Zirconiu personalizat")).toBeDefined();
    expect(screen.getByText("Platformă custom")).toBeDefined();
  });

  it("keeps legacy-only composition read-only without auto-creating components", () => {
    const legacyWork = { ...work, items: [], toothConnections: [] } as unknown as WorkDetail;
    render(<QueryClientProvider client={new QueryClient()}><WorkDetailComposition canEdit={true} work={legacyWork} isOpen workTypeOptions={[]} /></QueryClientProvider>);
    expect(screen.getByText(/conversia explicită a lucrărilor legacy nu este disponibilă/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Editează componentele" })).toBeNull();
  });
});
