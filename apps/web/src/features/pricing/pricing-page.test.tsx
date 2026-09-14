import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider, createMemoryRouter } from "react-router";

import { PricingPage } from "./pricing-page.js";

const mocks = vi.hoisted(() => ({
  archiveAgreement: vi.fn(),
  archiveOperation: vi.fn(),
  catalogPageCount: 1,
  createCatalog: vi.fn(),
  createOperation: vi.fn(),
  createProbeType: vi.fn(),
  createWorkType: vi.fn(),
  hasPermission: vi.fn(),
  includeInternalSymbolRow: false,
  operationCatalogError: null as Error | null,
  probeCatalogError: null as Error | null,
  pricingCatalogParams: [] as { active?: boolean; page?: number }[],
  refetchOperationCatalog: vi.fn(),
  refetchProbeCatalog: vi.fn(),
  refetchWorkTypeCatalog: vi.fn(),
  restoreCatalog: vi.fn(),
  restoreOperation: vi.fn(),
  updateOperation: vi.fn(),
  updateProbeType: vi.fn(),
  updateWorkType: vi.fn(),
  workTypeCatalogError: null as Error | null,
  workTypeDetail: null as Record<string, unknown> | null,
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

const internalSymbolCatalogItem = {
  ...activeCatalogItem,
  displayName: "Lucrare fără simbol comercial",
  id: "catalog-internal-symbol",
  workType: { ...activeCatalogItem.workType, id: "work-type-internal-symbol", name: "Lucrare fără simbol comercial", symbol: "PRICE-EX-03" },
};

const activeOperation = {
  category: "Coroană zirconiu",
  code: "DESIGN",
  createdAt: "2026-09-12T10:00:00.000Z",
  description: "Design CAD",
  id: "operation-active",
  isActive: true,
  name: "Design",
  quantityRule: "PER_ELEMENT",
  sortOrder: 1,
  updatedAt: "2026-09-12T10:00:00.000Z",
  workTypeIds: [],
};

const archivedOperation = { ...activeOperation, code: "SCAN", id: "operation-archived", isActive: false, name: "Scanare" };
const activeOperations = [
  activeOperation,
  { ...activeOperation, category: "Coroană ceramică", code: "FREZ", id: "operation-frez", name: "Frezare" },
  { ...activeOperation, category: "Altele", code: "FIN", id: "operation-fin", name: "Finisare", quantityRule: "PER_WORK" },
];
const activeProbeTypes = [
  { code: "LINGURA", id: "probe-lingura", isArchived: false, name: "Lingură", sortOrder: 1, workTypeIds: [] },
  { code: "ZR", id: "probe-zr", isArchived: false, name: "ZR", sortOrder: 2, workTypeIds: [] },
  { code: "MIYO", id: "probe-miyo", isArchived: false, name: "Miyo", sortOrder: 3, workTypeIds: [] },
];
const archivedProbeType = { code: "BISCUIT", id: "probe-archived", isArchived: true, name: "Biscuit", sortOrder: 4, workTypeIds: ["work-type-active"] };
const activeWorkTypes = [
  { code: "ZR", id: "work-type-active", isActive: true, name: "Coroană zirconiu", probeFamily: "ZR", symbol: "ZR", unit: "ELEMENT" },
  { code: "MC", id: "work-type-mc", isActive: true, name: "Coroană ceramică", probeFamily: "MC", symbol: "MC", unit: "ELEMENT" },
  { code: "PRO", id: "work-type-pro", isActive: true, name: "Proteză", probeFamily: "PRO", symbol: "PRO", unit: "UNIT" },
];

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
  useCreateWorkType: () => ({ isPending: false, mutate: mocks.createWorkType }),
  useUpdateWorkType: () => ({ isPending: false, mutate: mocks.updateWorkType }),
  useWorkType: () => ({ data: mocks.workTypeDetail, isLoading: false }),
  useWorkTypeOptions: () => ({ data: mocks.workTypeCatalogError ? undefined : activeWorkTypes, error: mocks.workTypeCatalogError, isError: Boolean(mocks.workTypeCatalogError), isLoading: false, refetch: mocks.refetchWorkTypeCatalog }),
}));

vi.mock("../works/works-api.js", () => ({
  useAllProbeTypes: () => ({ data: mocks.probeCatalogError ? undefined : [...activeProbeTypes, archivedProbeType], error: mocks.probeCatalogError, isError: Boolean(mocks.probeCatalogError), isLoading: false, refetch: mocks.refetchProbeCatalog }),
  useCreateProbeType: () => ({ isPending: false, mutate: mocks.createProbeType }),
  useUpdateProbeType: () => ({ isPending: false, mutate: mocks.updateProbeType }),
}));

vi.mock("./pricing-api.js", () => ({
  useArchivePricingAgreement: () => ({ isPending: false, mutate: mocks.archiveAgreement }),
  useArchivePricingCatalogItem: () => ({ isPending: false, mutate: vi.fn() }),
  useCreatePricingAgreement: () => ({ isPending: false, mutate: vi.fn() }),
  useCreatePricingCatalogItem: () => ({ isPending: false, mutate: mocks.createCatalog }),
  usePricingAgreement: () => ({ data: null, isLoading: false }),
  usePricingAgreements: () => ({ data: { items: [{ clinic: { id: "clinic-1", name: "Clinica Unu" }, doctor: null, id: "agreement-1", isActive: true, name: "Acord test", ruleCount: 1, subjectType: "CLINIC", updatedAt: "2026-09-12T10:00:00.000Z", validFrom: "2026-09-01", validUntil: null }], total: 1 }, isError: false, isLoading: false }),
  usePricingCatalog: (params: { active?: boolean; page?: number }) => {
    mocks.pricingCatalogParams.push(params);
    return { data: { items: params.active === false ? [archivedCatalogItem] : mocks.includeInternalSymbolRow ? [activeCatalogItem, internalSymbolCatalogItem] : [activeCatalogItem], page: params.page ?? 1, pageCount: mocks.catalogPageCount, pageSize: 20, total: mocks.catalogPageCount * 20 }, isError: false, isLoading: false };
  },
  usePricingCatalogItem: (id: string | null) => ({ data: id ? activeCatalogItem : null, isLoading: false }),
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
  useTechnicianOperationCatalog: () => ({ data: mocks.operationCatalogError ? undefined : [...activeOperations, archivedOperation], error: mocks.operationCatalogError, isError: Boolean(mocks.operationCatalogError), isLoading: false, refetch: mocks.refetchOperationCatalog }),
  useTechnicianOperations: (params: { isActive?: boolean; page?: number }) => ({ data: { items: params.isActive === false ? [archivedOperation] : [activeOperation], page: params.page ?? 1, pageCount: 1, pageSize: 20, total: 1 }, isError: false, isLoading: false }),
  useUpdateTechnicianOperation: () => ({ isPending: false, mutate: mocks.updateOperation }),
}));

function renderPage(entry = "/pricing") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/pricing", element: <ToastProvider><PricingPage /></ToastProvider> }], { initialEntries: [entry] });
  const view = render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return Object.assign(router, { unmount: view.unmount });
}

function panelFor(tabName: string): HTMLElement {
  const tab = screen.getByRole("tab", { name: tabName });
  return document.getElementById(tab.getAttribute("aria-controls") ?? "") as HTMLElement;
}

describe("PricingPage consolidation", () => {
  beforeEach(() => {
    mocks.archiveAgreement.mockClear();
    mocks.archiveOperation.mockClear();
    mocks.catalogPageCount = 1;
    mocks.createCatalog.mockClear();
    mocks.createOperation.mockClear();
    mocks.createWorkType.mockClear();
    mocks.includeInternalSymbolRow = false;
    mocks.operationCatalogError = null;
    mocks.probeCatalogError = null;
    mocks.pricingCatalogParams.length = 0;
    mocks.workTypeCatalogError = null;
    mocks.refetchOperationCatalog.mockReset();
    mocks.refetchProbeCatalog.mockReset();
    mocks.refetchWorkTypeCatalog.mockReset();
    mocks.restoreCatalog.mockClear();
    mocks.restoreOperation.mockClear();
    mocks.updateOperation.mockClear();
    mocks.updateWorkType.mockClear();
    mocks.workTypeDetail = null;
    mocks.hasPermission.mockReset();
    mocks.hasPermission.mockReturnValue(true);
    mocks.createOperation.mockImplementation((_input, options) => options?.onSuccess?.());
    mocks.updateOperation.mockImplementation((_input, options) => options?.onSuccess?.());
    mocks.createWorkType.mockImplementation((_input, options) => options?.onSuccess?.({ id: "work-type-created" }));
    mocks.createCatalog.mockImplementation((_input, options) => options?.onSuccess?.({ id: "catalog-created" }));
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
    expect(within(operationsPanel).queryByText("DESIGN")).toBeNull();

    fireEvent.click(within(operationsPanel).getByRole("button", { name: "Editează" }));
    const editDialog = screen.getByRole("dialog", { name: "Editează manoperă" });
    expect(within(editDialog).getByDisplayValue("Design")).toBeDefined();
    expect(within(editDialog).queryByLabelText("Cod")).toBeNull();
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
    for (const workTypeName of ["Coroană zirconiu", "Coroană ceramică", "Proteză"]) {
      expect(within(createDialog).getByRole("button", { name: new RegExp(`^${workTypeName}`) })).toBeDefined();
    }
    expect(within(createDialog).getByRole("heading", { name: "Calculul plății" })).toBeDefined();
    expect(within(createDialog).getByRole("heading", { name: "Detalii suplimentare" })).toBeDefined();
    fireEvent.change(within(createDialog).getByLabelText("Denumire"), { target: { value: "Frezare" } });
    fireEvent.click(within(createDialog).getByRole("button", { name: "Adaugă manoperă" }));
    await waitFor(() => expect(mocks.createOperation).toHaveBeenCalledWith(expect.objectContaining({ name: "Frezare" }), expect.anything()));
    expect(mocks.createOperation.mock.calls[0]?.[0]).not.toHaveProperty("code");
  });

  it("switches tabs through the URL and opens the probe modal", async () => {
    const router = renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(screen.getByRole("tab", { name: "Tipuri de probă" }));
    await waitFor(() => expect(router.state.location.search).toBe("?tab=probe-types"));
    expect(panelFor("Tipuri de probă").hidden).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip probă" }));
    const dialog = screen.getByRole("dialog", { name: "Adaugă tip probă" });
    expect(dialog.classList.contains("pricing-page__probe-type-modal")).toBe(true);
    expect(within(dialog).getByLabelText("Ordine implicită în flux")).toBeDefined();
    for (const workTypeName of ["Coroană zirconiu", "Coroană ceramică", "Proteză"]) {
      expect(within(dialog).getByRole("button", { name: new RegExp(`^${workTypeName}`) })).toBeDefined();
    }
    expect(within(dialog).queryByText(/TECH-CR-/)).toBeNull();
    const search = within(dialog).getByLabelText("Caută tip lucrare");
    fireEvent.change(search, { target: { value: "PRO" } });
    expect(within(dialog).getByRole("button", { name: /^Proteză/ })).toBeDefined();
    expect(within(dialog).queryByRole("button", { name: /^Coroană zirconiu/ })).toBeNull();
  });

  it("shows catalog failures as errors, never as empty results, and exposes retry actions", async () => {
    mocks.operationCatalogError = new Error("operations unavailable");
    mocks.probeCatalogError = new Error("probes unavailable");
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip lucrare" }));
    const workTypeDialog = screen.getByRole("dialog", { name: "Adaugă tip lucrare" });

    expect(within(workTypeDialog).getByText("Catalogul de manopere nu a putut fi încărcat")).toBeDefined();
    expect(within(workTypeDialog).getByText("Catalogul de probe nu a putut fi încărcat")).toBeDefined();
    expect(within(workTypeDialog).queryByText("Nu există manopere pentru căutarea curentă.")).toBeNull();
    expect(within(workTypeDialog).queryByText("Nu există tipuri de probă pentru căutarea curentă.")).toBeNull();
    const retryButtons = within(workTypeDialog).getAllByRole("button", { name: "Reîncearcă" });
    fireEvent.click(retryButtons[0]!);
    fireEvent.click(retryButtons[1]!);
    expect(mocks.refetchOperationCatalog).toHaveBeenCalledTimes(1);
    expect(mocks.refetchProbeCatalog).toHaveBeenCalledTimes(1);
  });

  it("does not replace a failed work-type catalog with a false empty state", async () => {
    mocks.workTypeCatalogError = new Error("work types unavailable");
    renderPage("/pricing?tab=operations");
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(screen.getByRole("button", { name: "Adaugă manoperă" }));
    const dialog = screen.getByRole("dialog", { name: "Adaugă manoperă" });
    expect(within(dialog).getByText("Catalogul tipurilor de lucrare nu a putut fi încărcat")).toBeDefined();
    expect(within(dialog).queryByText("Nu există tipuri de lucrări pentru căutarea curentă.")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reîncearcă" }));
    expect(mocks.refetchWorkTypeCatalog).toHaveBeenCalledTimes(1);
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

  it("navigates every catalog page instead of silently rendering only the first page", async () => {
    mocks.catalogPageCount = 3;
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    const catalogPanel = panelFor("Catalog");
    expect(within(catalogPanel).getByText("Pagina 1 din 3")).toBeDefined();
    fireEvent.click(within(catalogPanel).getByRole("button", { name: "Următor" }));
    await waitFor(() => expect(mocks.pricingCatalogParams.some((params) => params.active === true && params.page === 2)).toBe(true));
    expect(within(catalogPanel).getByText("Pagina 2 din 3")).toBeDefined();
    fireEvent.click(within(catalogPanel).getByRole("button", { name: "Anterior" }));
    await waitFor(() => expect(within(catalogPanel).getByText("Pagina 1 din 3")).toBeDefined());
    fireEvent.click(within(catalogPanel).getByRole("button", { name: "Următor" }));
    fireEvent.change(within(catalogPanel).getByLabelText("Căutare"), { target: { value: "zirconiu" } });
    await waitFor(() => expect(mocks.pricingCatalogParams.some((params) => params.page === 1 && (params as { search?: string }).search === "zirconiu")).toBe(true));
  });

  it("shows real laboratory symbols and replaces internal generated symbols with a neutral value", async () => {
    mocks.includeInternalSymbolRow = true;
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    const table = within(panelFor("Catalog")).getByRole("table");
    expect(within(table).getByText("ZR")).toBeDefined();
    expect(within(table).queryByText("PRICE-EX-03")).toBeNull();
    expect(within(table).getByText("—")).toBeDefined();
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
    const workTypeDialog = screen.getByRole("dialog", { name: "Adaugă tip lucrare" });
    expect(within(workTypeDialog).getByRole("heading", { name: "Preț și calcul" })).toBeDefined();
    expect(within(workTypeDialog).getByRole("heading", { name: "Unde se aplică lucrarea" })).toBeDefined();
    expect(within(workTypeDialog).getByRole("heading", { name: "Manopere disponibile" })).toBeDefined();
    expect(within(workTypeDialog).getByRole("heading", { name: "Probe disponibile și ordine" })).toBeDefined();
    expect(within(workTypeDialog).getByRole("heading", { name: "Adaosuri permise" })).toBeDefined();
    expect(within(workTypeDialog).getByRole("heading", { name: "Date comerciale" })).toBeDefined();
    expect(within(workTypeDialog).getByRole("heading", { name: "Opțiuni avansate" })).toBeDefined();
    expect(within(workTypeDialog).getByLabelText("Poziție în listă")).toBeDefined();
    expect(within(workTypeDialog).queryByLabelText("Termen implicit")).toBeNull();
    expect(within(workTypeDialog).queryByText("Metadate catalog")).toBeNull();
  });

  it("uses the active global catalogs while creating a work type and submits only the selected mappings in probe order", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip lucrare" }));
    const dialog = screen.getByRole("dialog", { name: "Adaugă tip lucrare" });

    for (const operationName of ["Design", "Frezare", "Finisare"]) {
      expect(within(dialog).getByRole("button", { name: new RegExp(`^${operationName}`) })).toBeDefined();
    }
    expect(within(dialog).queryByRole("button", { name: /^Scanare/ })).toBeNull();
    const operationSearch = within(dialog).getByLabelText("Caută manoperă");
    fireEvent.change(operationSearch, { target: { value: "Frezare" } });
    expect(within(dialog).getByRole("button", { name: /^Frezare/ })).toBeDefined();
    expect(within(dialog).queryByRole("button", { name: /^Design/ })).toBeNull();
    fireEvent.change(operationSearch, { target: { value: "inexistent" } });
    expect(within(dialog).getByText("Nu există manopere pentru căutarea curentă.")).toBeDefined();
    fireEvent.change(operationSearch, { target: { value: "" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Design/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Finisare/ }));

    for (const probeName of ["Lingură", "ZR", "Miyo"]) {
      expect(within(dialog).getByRole("button", { name: new RegExp(`^${probeName}`) })).toBeDefined();
    }
    expect(within(dialog).queryByRole("button", { name: /^Biscuit/ })).toBeNull();
    expect(within(dialog).queryByText("Fără probe configurate.")).toBeNull();
    const probeSearch = within(dialog).getByLabelText("Caută tip de probă");
    fireEvent.change(probeSearch, { target: { value: "inexistent" } });
    expect(within(dialog).getByText("Nu există tipuri de probă pentru căutarea curentă.")).toBeDefined();
    fireEvent.change(probeSearch, { target: { value: "" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Lingură/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Miyo/ }));
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Sus" })[1]!);

    fireEvent.change(within(dialog).getByLabelText("Denumire tip lucrare"), { target: { value: "Lucrare UAT" } });
    fireEvent.change(within(dialog).getByLabelText("Simbol"), { target: { value: "UAT" } });
    fireEvent.change(within(dialog).getByLabelText("Preț standard RON"), { target: { value: "300" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvează" }));

    await waitFor(() => expect(mocks.createWorkType).toHaveBeenCalledWith(expect.objectContaining({
      probeTypeIds: ["probe-miyo", "probe-lingura"],
      technicianOperationIds: ["operation-active", "operation-fin"],
    }), expect.anything()));
  });

  it("lets the manager assign, toggle off, or clear a palette/custom color for one work type", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(screen.getByRole("button", { name: "Adaugă tip lucrare" }));
    const workTypeDialog = screen.getByRole("dialog", { name: "Adaugă tip lucrare" });

    fireEvent.click(within(workTypeDialog).getByRole("button", { name: "Alege culoarea" }));
    const colorDialog = screen.getByRole("dialog", { name: "Alege culoarea" });
    const blue = within(colorDialog).getByRole("button", { name: "Alege #2563EB" });
    fireEvent.click(blue);
    expect(within(workTypeDialog).getByRole("button", { name: "Culoare activă" })).toBeDefined();

    fireEvent.click(within(workTypeDialog).getByRole("button", { name: "Culoare activă" }));
    const selectedColorDialog = screen.getByRole("dialog", { name: "Alege culoarea" });
    expect(within(selectedColorDialog).getByRole("button", { name: "Dezactivează #2563EB" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(selectedColorDialog).getByRole("button", { name: "Dezactivează #2563EB" }));
    expect(within(workTypeDialog).getByRole("button", { name: "Alege culoarea" })).toBeDefined();

    fireEvent.click(within(workTypeDialog).getByRole("button", { name: "Alege culoarea" }));
    const customColorDialog = screen.getByRole("dialog", { name: "Alege culoarea" });
    fireEvent.change(within(customColorDialog).getByLabelText("Culoare personalizată"), { target: { value: "#123456" } });
    expect(within(workTypeDialog).getByRole("button", { name: "Culoare activă" })).toBeDefined();
    fireEvent.click(within(workTypeDialog).getByRole("button", { name: "Culoare activă" }));
    fireEvent.click(screen.getByRole("button", { name: "Fără culoare" }));
    expect(within(workTypeDialog).getByRole("button", { name: "Alege culoarea" })).toBeDefined();
  });

  it("preselects saved mappings in edit, keeps the active catalog available and reloads the changed configuration", async () => {
    const initialDetail = {
      allowedAddOns: [],
      allowedAnatomicalScopes: ["TOOTH"],
      colorHex: null,
      description: null,
      id: "work-type-active",
      name: "Coroană zirconiu",
      probeTypeIds: ["probe-lingura", "probe-archived"],
      symbol: "ZR",
      technicianOperationIds: ["operation-active", "operation-archived"],
      unit: "ELEMENT",
    };
    mocks.workTypeDetail = initialDetail;
    mocks.updateWorkType.mockImplementation(({ input }, options) => {
      mocks.workTypeDetail = { ...initialDetail, ...input };
      options?.onSuccess?.(mocks.workTypeDetail);
    });
    const firstView = renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(within(panelFor("Catalog")).getByRole("button", { name: "Deschide" }));
    let dialog = await screen.findByRole("dialog", { name: "Editează tip lucrare" });

    expect(within(dialog).getByRole("button", { name: /^Design/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(dialog).getByRole("button", { name: /^Scanare/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(dialog).getByRole("button", { name: /^Frezare/ }).getAttribute("aria-pressed")).toBe("false");
    expect(within(dialog).getByRole("button", { name: /^Lingură/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(dialog).getByRole("button", { name: /^Biscuit/ }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(dialog).getByRole("button", { name: /^Design/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Frezare/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Lingură/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ZR/ }));
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Sus" })[1]!);
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvează configurația tipului" }));

    await waitFor(() => expect(mocks.updateWorkType).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        probeTypeIds: ["probe-zr", "probe-archived"],
        technicianOperationIds: ["operation-archived", "operation-frez"],
      }),
      workTypeId: "work-type-active",
    }), expect.anything()));

    firstView.unmount();
    renderPage();
    await screen.findByRole("heading", { name: "Setări lucrări" });
    fireEvent.click(within(panelFor("Catalog")).getByRole("button", { name: "Deschide" }));
    dialog = await screen.findByRole("dialog", { name: "Editează tip lucrare" });
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /^Frezare/ }).getAttribute("aria-pressed")).toBe("true"));
    expect(within(dialog).getByRole("button", { name: /^Design/ }).getAttribute("aria-pressed")).toBe("false");
    expect(within(dialog).getByRole("button", { name: /^ZR/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(dialog).getByRole("button", { name: /^Lingură/ }).getAttribute("aria-pressed")).toBe("false");
  });
});
