import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider, createMemoryRouter } from "react-router";

import { PricingPage } from "./pricing-page.js";

const mocks = vi.hoisted(() => ({
  archiveAgreement: vi.fn(),
  archiveOperation: vi.fn(),
  createOperation: vi.fn(),
  createProbeType: vi.fn(),
  hasPermission: vi.fn(),
  restoreCatalog: vi.fn(),
  restoreOperation: vi.fn(),
  updateOperation: vi.fn(),
  updateProbeType: vi.fn(),
}));

const activeCatalogItem = {
  category: "Ceramică",
  displayName: "Coroană zirconiu",
  executionTimeRules: [],
  id: "catalog-active",
  isActive: true,
  notes: null,
  sortOrder: 1,
  standardPriceMinor: 12000,
  unit: "ELEMENT",
  updatedAt: "2026-09-12T10:00:00.000Z",
  workType: { code: "ZR", description: null, id: "work-type-active", name: "Coroană zirconiu", symbol: "ZR" },
};

const archivedCatalogItem = {
  ...activeCatalogItem,
  displayName: "Lucrare arhivată",
  id: "catalog-archived",
  isActive: false,
  workType: { ...activeCatalogItem.workType, id: "work-type-archived", name: "Lucrare arhivată" },
};

const activeOperation = {
  category: "Digital",
  code: "DESIGN",
  createdAt: "2026-09-12T10:00:00.000Z",
  description: "Design CAD",
  id: "operation-active",
  isActive: true,
  name: "Design",
  sortOrder: 1,
  updatedAt: "2026-09-12T10:00:00.000Z",
};

const archivedOperation = { ...activeOperation, code: "SCAN", id: "operation-archived", isActive: false, name: "Scanare" };

vi.mock("../auth/auth-api.js", () => ({
  fetchPermissions: vi.fn().mockResolvedValue({ permissions: [] }),
}));

vi.mock("../users/users-api.js", () => ({
  hasPermission: (...args: unknown[]) => mocks.hasPermission(...args),
}));

vi.mock("../settings/settings-api.js", () => ({
  useSettings: () => ({ data: { currency: "RON", legalEntityDisplayName: "Creative Dental", locale: "ro-RO" }, isLoading: false }),
}));

vi.mock("../clinics/clinics-api.js", () => ({
  fetchClinicOptions: vi.fn().mockResolvedValue([]),
  fetchDoctorOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../work-types/work-types-api.js", () => ({
  useCreateWorkType: () => ({ isPending: false, mutate: vi.fn() }),
  useUpdateWorkType: () => ({ isPending: false, mutate: vi.fn() }),
  useWorkType: () => ({ data: null, isLoading: false }),
  useWorkTypeOptions: () => ({ data: [], isLoading: false }),
}));

vi.mock("../works/works-api.js", () => ({
  useAllProbeTypes: () => ({ data: [{ id: "probe-active", isArchived: false, name: "Lingură", sortOrder: 1 }], isLoading: false }),
  useCreateProbeType: () => ({ isPending: false, mutate: mocks.createProbeType }),
  useUpdateProbeType: () => ({ isPending: false, mutate: mocks.updateProbeType }),
}));

vi.mock("./pricing-api.js", () => ({
  useArchivePricingAgreement: () => ({ isPending: false, mutate: mocks.archiveAgreement }),
  useArchivePricingCatalogItem: () => ({ isPending: false, mutate: vi.fn() }),
  useCreatePricingAgreement: () => ({ isPending: false, mutate: vi.fn() }),
  useCreatePricingCatalogItem: () => ({ isPending: false, mutate: vi.fn() }),
  usePricingAgreement: () => ({ data: null, isLoading: false }),
  usePricingAgreements: () => ({ data: { items: [{ clinic: { id: "clinic-1", name: "Clinica Unu" }, doctor: null, id: "agreement-1", isActive: true, name: "Acord test", ruleCount: 1, subjectType: "CLINIC", updatedAt: "2026-09-12T10:00:00.000Z", validFrom: "2026-09-01", validUntil: null }], total: 1 }, isError: false, isLoading: false }),
  usePricingCatalog: (params: { active?: boolean }) => ({ data: { items: params.active === false ? [archivedCatalogItem] : [activeCatalogItem], total: 1 }, isError: false, isLoading: false }),
  usePricingCatalogItem: () => ({ data: null, isLoading: false }),
  useReplaceExecutionRules: () => ({ isPending: false, mutate: vi.fn() }),
  useReplacePricingAgreementRules: () => ({ isPending: false, mutate: vi.fn() }),
  useResolvePricingPreview: () => ({ data: null, isError: false, isPending: false, mutate: vi.fn() }),
  useRestorePricingAgreement: () => ({ isPending: false, mutate: vi.fn() }),
  useRestorePricingCatalogItem: () => ({ isPending: false, mutate: mocks.restoreCatalog }),
  useUpdatePricingAgreement: () => ({ isPending: false, mutate: vi.fn() }),
  useUpdatePricingCatalogItem: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("./technician-operations-api.js", () => ({
  useArchiveTechnicianOperation: () => ({ isPending: false, mutate: mocks.archiveOperation }),
  useCreateTechnicianOperation: () => ({ isPending: false, mutate: mocks.createOperation }),
  useRestoreTechnicianOperation: () => ({ isPending: false, mutate: mocks.restoreOperation }),
  useTechnicianOperations: (params: { isActive?: boolean }) => ({ data: { items: params.isActive === false ? [archivedOperation] : [activeOperation], total: 1 }, isError: false, isLoading: false }),
  useUpdateTechnicianOperation: () => ({ isPending: false, mutate: mocks.updateOperation }),
}));

function renderPage(entry = "/pricing") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/pricing", element: <ToastProvider><PricingPage /></ToastProvider> }], { initialEntries: [entry] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
}

function panelFor(tabName: string): HTMLElement {
  const tab = screen.getByRole("tab", { name: tabName });
  return document.getElementById(tab.getAttribute("aria-controls") ?? "") as HTMLElement;
}

describe("PricingPage consolidation", () => {
  beforeEach(() => {
    mocks.archiveAgreement.mockClear();
    mocks.archiveOperation.mockClear();
    mocks.createOperation.mockClear();
    mocks.restoreCatalog.mockClear();
    mocks.restoreOperation.mockClear();
    mocks.updateOperation.mockClear();
    mocks.hasPermission.mockReset();
    mocks.hasPermission.mockReturnValue(true);
    mocks.createOperation.mockImplementation((_input, options) => options?.onSuccess?.());
    mocks.updateOperation.mockImplementation((_input, options) => options?.onSuccess?.());
  });

  it("defaults to Catalog and exposes the global operation catalog without technician rates", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    expect(screen.getByRole("tab", { name: "Catalog" }).getAttribute("aria-selected")).toBe("true");
    expect(panelFor("Tipuri de probă").hidden).toBe(true);
    expect(screen.getByRole("tab", { name: "Manopere" })).toBeDefined();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Catalog", "Acorduri", "Tipuri de probă", "Manopere", "Arhivă"]);
    expect(screen.queryByText("Rate tehnicieni")).toBeNull();
    expect(screen.queryByText("Câștig")).toBeNull();
  });

  it("keeps global operation management read-only without the existing manage permission", async () => {
    mocks.hasPermission.mockImplementation((_permissions, key) => key !== "technician.rates.manage");
    renderPage("/pricing?tab=operations");
    await screen.findByRole("heading", { name: "Catalog global de manopere" });
    const operationsPanel = panelFor("Manopere");
    expect(screen.queryByRole("button", { name: "Adaugă manoperă" })).toBeNull();
    expect(within(operationsPanel).getByRole("button", { name: "Editează" }).hasAttribute("disabled")).toBe(true);
    expect(within(operationsPanel).getByRole("button", { name: "Arhivează" }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps Manopere in URL state and manages the global operation lifecycle", async () => {
    const router = renderPage("/pricing?tab=operations");
    await screen.findByRole("heading", { name: "Setări lucrări" });
    const operationsPanel = panelFor("Manopere");
    expect(screen.getByRole("tab", { name: "Manopere" }).getAttribute("aria-selected")).toBe("true");
    expect(router.state.location.search).toBe("?tab=operations");
    expect(within(operationsPanel).getByText("Design")).toBeDefined();

    fireEvent.click(within(operationsPanel).getByRole("button", { name: "Editează" }));
    const editDialog = screen.getByRole("dialog", { name: "Editează manoperă" });
    expect(within(editDialog).getByDisplayValue("DESIGN")).toBeDefined();
    fireEvent.click(within(editDialog).getByRole("button", { name: "Salvează modificarea" }));
    await waitFor(() => expect(mocks.updateOperation).toHaveBeenCalledWith(expect.objectContaining({ id: "operation-active" }), expect.anything()));

    fireEvent.click(within(operationsPanel).getByRole("button", { name: "Arhivează" }));
    expect(mocks.archiveOperation).toHaveBeenCalledWith("operation-active", expect.anything());

    fireEvent.click(within(operationsPanel).getByLabelText("Status"));
    fireEvent.click(within(operationsPanel).getByRole("option", { name: "Arhivate" }));
    await waitFor(() => expect(within(operationsPanel).getByText("Scanare")).toBeDefined());
    fireEvent.click(within(operationsPanel).getByRole("button", { name: "Reactivează" }));
    expect(mocks.restoreOperation).toHaveBeenCalledWith("operation-archived", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "Adaugă manoperă" }));
    const createDialog = screen.getByRole("dialog", { name: "Adaugă manoperă" });
    fireEvent.change(within(createDialog).getByLabelText("Cod"), { target: { value: "FREZ" } });
    fireEvent.change(within(createDialog).getByLabelText("Denumire"), { target: { value: "Frezare" } });
    fireEvent.click(within(createDialog).getByRole("button", { name: "Adaugă manoperă" }));
    await waitFor(() => expect(mocks.createOperation).toHaveBeenCalledWith(expect.objectContaining({ code: "FREZ", name: "Frezare" }), expect.anything()));
  });

  it("switches tabs through the URL and opens the probe modal", async () => {
    const router = renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(screen.getByRole("tab", { name: "Tipuri de probă" }));
    await waitFor(() => expect(router.state.location.search).toBe("?tab=probe-types"));
    expect(panelFor("Tipuri de probă").hidden).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip probă" }));
    expect(screen.getByRole("dialog", { name: "Adaugă tip probă" })).toBeDefined();
  });

  it("shows only archived catalog rows and keeps one action column", async () => {
    renderPage("/pricing?tab=archive");
    await screen.findByRole("heading", { name: "Setări lucrări" });
    const archivePanel = panelFor("Arhivă");
    const archiveTable = within(archivePanel).getByRole("table");
    expect(within(archiveTable).getByText("Lucrare arhivată")).toBeDefined();
    expect(within(archiveTable).queryByText("Coroană zirconiu")).toBeNull();
    expect(within(archiveTable).getAllByRole("columnheader", { name: "Acțiuni" })).toHaveLength(1);
    fireEvent.click(within(archiveTable).getByRole("button", { name: "Reactivează" }));
    expect(mocks.restoreCatalog).toHaveBeenCalledWith("catalog-archived", expect.anything());
  });

  it("preserves agreement edit/archive actions and the existing add-work flow", async () => {
    renderPage("/pricing?tab=agreements");
    await screen.findByRole("heading", { name: "Setări lucrări" });
    const agreementsPanel = panelFor("Acorduri");
    fireEvent.click(within(agreementsPanel).getByRole("button", { name: "Arhivează" }));
    expect(mocks.archiveAgreement).toHaveBeenCalledWith("agreement-1", expect.anything());
    fireEvent.click(within(agreementsPanel).getByRole("button", { name: "Editează" }));
    expect(screen.getByRole("dialog", { name: "Editează acord comercial" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Închide dialogul" }));
    fireEvent.click(screen.getByRole("tab", { name: "Catalog" }));
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip lucrare" }));
    expect(screen.getByRole("dialog", { name: "Adaugă tip lucrare" })).toBeDefined();
  });
});
