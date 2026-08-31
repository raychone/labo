import {
  ADULT_FDI_TEETH,
  isAdjacentAdultFdiPair,
  normalizeConnectionPair,
  type AdultFdiTooth,
  type AnatomicalScopeType,
  type WorkTypeFormOption,
} from "@dental-lab/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, ConfirmActionModal, FormGrid, Modal, TextInput } from "@dental-lab/ui";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { SearchablePickerField } from "./work-form.js";
import { IMPLANT_PLATFORM_OPTIONS, RESTORATION_TYPE_OPTIONS, WORK_SHADE_OPTIONS } from "./works-page.schema.js";
import { ToothDiagram } from "../../components/dental/tooth-diagram.js";
import { displayWorkTypeSymbolOrName } from "./work-type-symbols.js";

const CUSTOM_WORK_TYPE_CATEGORY = "__CUSTOM__";

export interface DraftWorkOrderItem {
  readonly id: string;
  readonly scope: AnatomicalScopeType;
  readonly teeth: readonly AdultFdiTooth[];
  readonly workTypeId: string;
  readonly customWorkTypeSnapshot?: Readonly<Record<string, unknown>> | null;
  readonly shade: string | null;
  readonly implantPlatform: string | null;
  readonly implantPlatformCustom: string | null;
  readonly restorationType: string | null;
  readonly technicalCodeNotes: string | null;
  readonly notes: string | null;
  readonly selectedAddOns?: readonly { readonly code: string; readonly amountMinor: number | null }[];
}

export interface DraftToothConnection {
  readonly toothA: AdultFdiTooth;
  readonly toothB: AdultFdiTooth;
}

export function getDraftCompositionTeeth(items: readonly Pick<DraftWorkOrderItem, "scope" | "teeth">[]): readonly AdultFdiTooth[] {
  const teeth = new Set<AdultFdiTooth>();
  for (const item of items) {
    if (item.scope === "UPPER_ARCH" || item.scope === "BOTH_ARCHES") {
      for (const tooth of ADULT_FDI_TEETH.slice(0, 16)) teeth.add(tooth);
    }
    if (item.scope === "LOWER_ARCH" || item.scope === "BOTH_ARCHES") {
      for (const tooth of ADULT_FDI_TEETH.slice(16)) teeth.add(tooth);
    }
    for (const tooth of item.teeth) teeth.add(tooth);
  }
  return ADULT_FDI_TEETH.filter((tooth) => teeth.has(tooth));
}

export function filterDraftConnections(
  connections: readonly DraftToothConnection[],
  compositionTeeth: readonly AdultFdiTooth[],
): readonly DraftToothConnection[] {
  const allowed = new Set(compositionTeeth);
  return connections.filter((connection) => allowed.has(connection.toothA) && allowed.has(connection.toothB));
}

export function toggleDraftConnection(
  connections: readonly DraftToothConnection[],
  connection: DraftToothConnection,
  compositionTeeth: readonly AdultFdiTooth[],
): readonly DraftToothConnection[] {
  const normalized = normalizeConnectionPair(connection.toothA, connection.toothB);
  if (!normalized || !isAdjacentAdultFdiPair(normalized.toothA, normalized.toothB)) return connections;
  const available = new Set(compositionTeeth);
  if (!available.has(normalized.toothA) || !available.has(normalized.toothB)) return connections;
  const exists = connections.some((current) => current.toothA === normalized.toothA && current.toothB === normalized.toothB);
  return exists
    ? connections.filter((current) => current.toothA !== normalized.toothA || current.toothB !== normalized.toothB)
    : [...connections, normalized];
}

function displayWorkTypeName(name: string): string {
  return name.replace(/\s*-\s*(bucată|bucata|element|arcadă|arcada|lucrare)\s*$/iu, "").trim();
}

function inferAnatomicalScope(teeth: readonly AdultFdiTooth[]): AnatomicalScopeType {
  const selected = new Set(teeth);
  const upper = ADULT_FDI_TEETH.slice(0, 16).every((tooth) => selected.has(tooth));
  const lower = ADULT_FDI_TEETH.slice(16).every((tooth) => selected.has(tooth));
  if (upper && lower) return "BOTH_ARCHES";
  if (upper) return "UPPER_ARCH";
  if (lower) return "LOWER_ARCH";
  return teeth.length > 1 ? "TEETH" : "TOOTH";
}

function isWholeMouthWorkType(option: WorkTypeFormOption | null | undefined): boolean {
  return option?.name.toLocaleLowerCase("ro-RO").includes("gutieră albire (x2)") ?? false;
}

export function MultiItemWorkEditor({
  canSaveCustomWorkType = false,
  canEditTechnicalCode = false,
  disabled,
  items,
  onChange,
  workTypeOptions,
  onSaveCustomWorkType,
  onEditingChange,
  connections,
}: {
  readonly canSaveCustomWorkType?: boolean;
  readonly canEditTechnicalCode?: boolean;
  readonly disabled: boolean;
  readonly items: readonly DraftWorkOrderItem[];
  readonly onChange: (items: readonly DraftWorkOrderItem[], connections: readonly DraftToothConnection[]) => void;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
  readonly onSaveCustomWorkType?: (name: string) => Promise<WorkTypeFormOption>;
  readonly onEditingChange?: (editing: boolean) => void;
  readonly connections: readonly DraftToothConnection[];
}): ReactNode {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scope, setScope] = useState<AnatomicalScopeType>("TOOTH");
  const [selectedTeeth, setSelectedTeeth] = useState<AdultFdiTooth[]>([]);
  const [workTypeId, setWorkTypeId] = useState("");
  const [customWorkTypeName, setCustomWorkTypeName] = useState("");
  const [workTypeSearch, setWorkTypeSearch] = useState("");
  const [workTypeCategory, setWorkTypeCategory] = useState("");
  const [shadeSearch, setShadeSearch] = useState("");
  const [platformSearch, setPlatformSearch] = useState("");
  const [shade, setShade] = useState<string | null>(null);
  const [implantPlatform, setImplantPlatform] = useState<string | null>(null);
  const [implantPlatformCustom, setImplantPlatformCustom] = useState<string | null>(null);
  const [restorationType, setRestorationType] = useState<string | null>(null);
  const [technicalCodeNotes, setTechnicalCodeNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<readonly { readonly code: string; readonly amountMinor: number | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingCustomType, setSavingCustomType] = useState(false);
  const [workTypeModalOpen, setWorkTypeModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const compositionTeeth = useMemo(() => getDraftCompositionTeeth(items), [items]);
  const effectiveConnectionComposition = useMemo(
    () => getDraftCompositionTeeth([...items, { scope, teeth: selectedTeeth }]),
    [items, scope, selectedTeeth],
  );
  const workTypeSearchOptions = useMemo(() => {
    return [
      ...workTypeOptions.map((option) => ({
        label: displayWorkTypeName(option.name),
        secondary: undefined,
        value: option.id,
      })),
      { label: "Alt tip de lucrare", secondary: "Valoare personalizată", value: CUSTOM_WORK_TYPE_CATEGORY },
    ];
  }, [workTypeOptions]);
  const selectedWorkType = useMemo(() => workTypeOptions.find((option) => option.id === workTypeId) ?? null, [workTypeId, workTypeOptions]);
  const isImplantWorkType = selectedWorkType?.name.toLocaleLowerCase("ro-RO").includes("implant") ?? false;
  const visibleWorkTypeOptions = useMemo(() => {
    const normalized = workTypeSearch.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const matched = normalized === "" ? workTypeSearchOptions : workTypeSearchOptions.filter((option) => `${option.label} ${option.secondary}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(normalized));
    return matched;
  }, [workTypeSearch, workTypeSearchOptions]);
  const shadeOptions = useMemo(() => filterEditorOptions(WORK_SHADE_OPTIONS.map((value) => ({ label: value, secondary: undefined, value })), shadeSearch), [shadeSearch]);
  const platformOptions = useMemo(() => filterEditorOptions(IMPLANT_PLATFORM_OPTIONS.map((value) => ({ label: value, secondary: undefined, value })), platformSearch), [platformSearch]);
  const workTypeVisualization = useMemo(() => {
    const colors = ["#0057b8", "#7a1fa2", "#c2410c", "#00796b", "#b91c1c", "#a16207", "#0369a1", "#be185d", "#4d7c0f", "#4338ca", "#c026d3", "#0f766e"] as const;
    const colorByWorkType = new Map<string, string>();
    const legend: { readonly color: string; readonly label: string; readonly symbol: string }[] = [];
    const toothColors = new Map<number, string[]>();
    const addWorkType = (key: string, label: string, symbol: string, teeth: readonly AdultFdiTooth[], configuredColor?: string | null) => {
      let color = colorByWorkType.get(key);
      if (!color) {
        color = configuredColor?.trim() || colors[colorByWorkType.size % colors.length]!;
        colorByWorkType.set(key, color);
        legend.push({ color, label, symbol });
      }
      for (const tooth of teeth) {
        const current = toothColors.get(tooth) ?? [];
        if (!current.includes(color)) current.push(color);
        toothColors.set(tooth, current);
      }
    };
    for (const item of items) {
      const option = workTypeOptions.find((candidate) => candidate.id === item.workTypeId);
      addWorkType(item.workTypeId || `custom-${item.id}`, displayWorkTypeName(option?.name ?? (snapshotValue(item.customWorkTypeSnapshot) || "Alt tip de lucrare")), option ? displayWorkTypeSymbolOrName(option.name) : "ALT", item.teeth, option?.colorHex);
    }
    const activeOption = workTypeOptions.find((option) => option.id === workTypeId);
    if (selectedTeeth.length > 0 && (activeOption || customWorkTypeName.trim() !== "")) {
      addWorkType(workTypeId || "__CUSTOM_DRAFT__", displayWorkTypeName(activeOption?.name ?? (customWorkTypeName.trim() || "Alt tip de lucrare")), activeOption ? displayWorkTypeSymbolOrName(activeOption.name) : "ALT", selectedTeeth, activeOption?.colorHex);
    }
    const resolvedToothColors: Record<number, string> = {};
    for (const [tooth, current] of toothColors.entries()) resolvedToothColors[tooth] = current.length === 1 ? current[0]! : `linear-gradient(90deg, ${current.join(", ")})`;
    return { legend, toothColors: resolvedToothColors };
  }, [customWorkTypeName, items, selectedTeeth, workTypeId, workTypeOptions]);

  function resetDraft(): void {
    setEditingId(null);
    setScope("TOOTH");
    setSelectedTeeth([]);
    setWorkTypeId("");
    setCustomWorkTypeName("");
    setWorkTypeSearch("");
    setWorkTypeCategory("");
    setShadeSearch("");
    setPlatformSearch("");
    setShade(null);
    setImplantPlatform(null);
    setImplantPlatformCustom(null);
    setRestorationType(null);
    setTechnicalCodeNotes(null);
    setNotes(null);
    setSelectedAddOns([]);
    setError(null);
    setFormOpen(false);
    onEditingChange?.(false);
  }

  function startAdding(): void {
    resetDraft();
    setFormOpen(true);
  }

  useEffect(() => {
    if (!isImplantWorkType) {
      setImplantPlatform(null);
      setImplantPlatformCustom(null);
      setPlatformSearch("");
      setRestorationType(null);
    }
  }, [isImplantWorkType]);

  useEffect(() => {
    if (selectedTeeth.length > 0) setFormOpen(true);
  }, [selectedTeeth]);

  function selectShortcut(teeth: readonly AdultFdiTooth[]): void {
    setSelectedTeeth([...teeth]);
    setScope(inferAnatomicalScope(teeth));
    setError(null);
  }

  function toggleTooth(tooth: AdultFdiTooth): void {
    setSelectedTeeth((current) => {
      const next = current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth];
      setScope(inferAnatomicalScope(next));
      return next;
    });
    setError(null);
  }

  function saveItem(): void {
    const selectedWorkType = workTypeOptions.find((option) => option.id === workTypeId);
    const requiredCount = selectedWorkType?.unit === "UNIT" ? 1 : scope === "TOOTH" ? 1 : scope === "TEETH" ? 2 : 0;
    if (workTypeId === "" && customWorkTypeName.trim() === "") {
      setError("Alege tipul de lucrare.");
      return;
    }
    if (selectedTeeth.length < requiredCount) {
      setError(scope === "TOOTH" ? "Selectează un dinte." : "Selectează cel puțin doi dinți.");
      return;
    }
    const isUnit = selectedWorkType?.unit === "UNIT";
    const wholeMouth = isWholeMouthWorkType(selectedWorkType);
    const effectiveScope = wholeMouth ? "BOTH_ARCHES" : isUnit && scope === "TOOTH" ? "TOOTH" : scope;
    const effectiveTeeth = wholeMouth
      ? [...ADULT_FDI_TEETH]
      : selectedTeeth;
    const duplicatePiece = isUnit && items.some((item) => item.id !== editingId && item.workTypeId === workTypeId && item.scope === effectiveScope);
    if (duplicatePiece) {
      setError(wholeMouth ? "Gutiera de albire (x2) poate fi adăugată o singură dată." : "Această lucrare pe arcadă există deja pentru selecția curentă.");
      return;
    }
    const item: DraftWorkOrderItem = {
      id: editingId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scope: effectiveScope,
      teeth: [...effectiveTeeth].sort((a, b) => ADULT_FDI_TEETH.indexOf(a) - ADULT_FDI_TEETH.indexOf(b)),
      workTypeId,
      customWorkTypeSnapshot: workTypeId === "" ? { name: customWorkTypeName.trim() } : null,
      shade,
      implantPlatform,
      implantPlatformCustom: implantPlatform === "Alt tip" ? implantPlatformCustom : null,
      restorationType,
      technicalCodeNotes,
      notes,
      selectedAddOns,
    };
    const nextItems = editingId ? items.map((current) => current.id === editingId ? item : current) : [...items, item];
    const nextConnections = filterDraftConnections(connections, getDraftCompositionTeeth(nextItems));
    onChange(nextItems, nextConnections);
    resetDraft();
  }

  async function saveCustomWorkType(): Promise<void> {
    const name = customWorkTypeName.trim();
    if (!onSaveCustomWorkType || name.length < 2) {
      setError("Denumirea tipului personalizat trebuie să aibă cel puțin 2 caractere.");
      return;
    }
    setSavingCustomType(true);
    try {
      const option = await onSaveCustomWorkType(name);
      setWorkTypeId(option.id);
      setWorkTypeCategory(option.probeFamily ?? "");
      setWorkTypeSearch(option.name);
      setCustomWorkTypeName("");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tipul personalizat nu a putut fi salvat în catalog.");
    } finally {
      setSavingCustomType(false);
    }
  }

  function editItem(item: DraftWorkOrderItem): void {
    setFormOpen(true);
    setEditingId(item.id);
    setScope(item.scope);
    setSelectedTeeth([...item.teeth]);
    setWorkTypeId(item.workTypeId);
    setWorkTypeCategory(item.workTypeId === "" ? CUSTOM_WORK_TYPE_CATEGORY : workTypeOptions.find((option) => option.id === item.workTypeId)?.probeFamily ?? "");
    setCustomWorkTypeName(snapshotValue(item.customWorkTypeSnapshot));
    setWorkTypeSearch(item.workTypeId ? workTypeOptions.find((option) => option.id === item.workTypeId)?.name ?? "" : "Alt tip de lucrare");
    setShade(item.shade);
    setShadeSearch(item.shade ?? "");
    setImplantPlatform(item.implantPlatform);
    setPlatformSearch(item.implantPlatform ?? "");
    setImplantPlatformCustom(item.implantPlatformCustom);
    setRestorationType(item.restorationType);
    setTechnicalCodeNotes(item.technicalCodeNotes);
    setNotes(item.notes);
    setSelectedAddOns(item.selectedAddOns ?? []);
    setError(null);
    onEditingChange?.(true);
  }

  function removeItem(id: string): void {
    const nextItems = items.filter((item) => item.id !== id);
    onChange(nextItems, filterDraftConnections(connections, getDraftCompositionTeeth(nextItems)));
    if (editingId === id) resetDraft();
  }

  function toggleConnection(connection: DraftToothConnection): void {
    onChange(items, toggleDraftConnection(connections, connection, effectiveConnectionComposition));
  }

  useEffect(() => {
    const cleaned = filterDraftConnections(connections, effectiveConnectionComposition);
    if (cleaned.length !== connections.length) onChange(items, cleaned);
  }, [connections, effectiveConnectionComposition, items, onChange]);

  return (
    <div className="multi-item-work-editor">
      {items.length > 0 ? <div className="multi-item-work-editor__list" aria-label="Lucrările lucrării">
        {items.map((item, index) => {
          const option = workTypeOptions.find((candidate) => candidate.id === item.workTypeId);
          const color = option?.colorHex?.trim() || "#64748b";
          return <div className="multi-item-work-editor__item" key={item.id}>
            <div className="multi-item-work-editor__item-summary"><span className="multi-item-work-editor__item-type"><i aria-hidden="true" style={{ background: color }} />{option ? displayWorkTypeSymbolOrName(option.name) : snapshotValue(item.customWorkTypeSnapshot) || "—"}</span><span>Dinți: {item.teeth.join(", ") || "Fără dinți"}</span><span>Culoare: {item.shade || "—"}</span></div>
            <div className="multi-item-work-editor__item-actions">
              <Button aria-label={`Editează lucrarea ${index + 1}`} disabled={disabled} onClick={() => editItem(item)} type="button" variant="outline">✎</Button>
              <Button aria-label={`Șterge lucrarea ${index + 1}`} disabled={disabled} onClick={() => setDeleteItemId(item.id)} type="button" variant="outline">🗑</Button>
            </div>
          </div>;
        })}
      </div> : null}
      <div className="multi-item-work-editor__diagram">
        <ToothDiagram
          availableTeeth={ADULT_FDI_TEETH}
          configuredTeeth={compositionTeeth}
          connectionTeeth={effectiveConnectionComposition}
          connections={connections}
          mode="create"
          onConnectionToggle={toggleConnection}
          onShortcut={selectShortcut}
          onToothToggle={toggleTooth}
          selectedTeeth={selectedTeeth}
          semanticScope={scope === "UPPER_ARCH" || scope === "LOWER_ARCH" || scope === "BOTH_ARCHES" ? scope : null}
          shortcutsAction={<Button disabled={disabled} onClick={startAdding} type="button" variant="outline">Adaugă lucrare</Button>}
          toothColors={workTypeVisualization.toothColors}
        />
        {workTypeVisualization.legend.length > 0 ? <div className="multi-item-work-editor__legend" aria-label="Legendă tipuri de lucrări">
          {workTypeVisualization.legend.map((entry) => <span key={`${entry.symbol}-${entry.label}`}><i aria-hidden="true" style={{ background: entry.color }} />{entry.symbol} · {entry.label}</span>)}
        </div> : null}
      </div>
      {formOpen ? <div className="multi-item-work-editor__fields">
        <FormGrid className="multi-item-work-editor__selection-grid">
          <div className="multi-item-work-editor__work-type-field">
            <span className="multi-item-work-editor__field-label">Tip lucrare</span>
            <Button disabled={disabled} onClick={() => setWorkTypeModalOpen(true)} type="button" variant="outline">
              {selectedWorkType ? displayWorkTypeName(selectedWorkType.name) : workTypeCategory === CUSTOM_WORK_TYPE_CATEGORY ? "Alt tip de lucrare" : "Alege tipul lucrării"}
            </Button>
            {workTypeId === "" && error ? <small className="multi-item-work-editor__error">Tipul lucrării este obligatoriu.</small> : null}
          </div>
          {workTypeCategory === CUSTOM_WORK_TYPE_CATEGORY ? <div className="multi-item-work-editor__custom-type">
            <TextInput label="Denumire tip personalizat" required value={customWorkTypeName} onChange={(event) => setCustomWorkTypeName(event.target.value)} />
            {canSaveCustomWorkType ? <Button disabled={disabled || savingCustomType} isLoading={savingCustomType} onClick={() => void saveCustomWorkType()} type="button" variant="outline">Salvează în catalog</Button> : null}
          </div> : null}
          {(workTypeOptions.find((option) => option.id === workTypeId)?.allowedAddOns ?? []).length > 0 ? <div className="multi-item-work-editor__addons">
            {(workTypeOptions.find((option) => option.id === workTypeId)?.allowedAddOns ?? []).map((addOn) => (
              <Checkbox
                checked={selectedAddOns.some((selected) => selected.code === addOn.code)}
                key={addOn.code}
                label={addOn.label}
                onChange={(event) => setSelectedAddOns((current) => event.target.checked
                  ? [...current, { code: addOn.code, amountMinor: addOn.amountMinor }]
                  : current.filter((selected) => selected.code !== addOn.code))}
              />
            ))}
          </div> : null}
          <SearchablePickerField disabled={disabled} emptyMessage="Nu există culori potrivite." error={undefined} id="draft-shade" label="Culoare" onSearchChange={(value) => { setShadeSearch(value); if (value === "") setShade(null); }} onSelect={(value) => setShade(value || null)} options={shadeOptions} placeholder="Alege culoarea" required={false} searchValue={shadeSearch} selectedValue={shade ?? ""} />
          {isImplantWorkType ? <SearchablePickerField disabled={disabled} emptyMessage="Nu există platforme potrivite." error={undefined} id="draft-implant-platform" label="Platformă implant" onSearchChange={(value) => { setPlatformSearch(value); if (value === "") setImplantPlatform(null); }} onSelect={(value) => setImplantPlatform(value || null)} options={platformOptions} placeholder="Alege platforma" required={false} searchValue={platformSearch} selectedValue={implantPlatform ?? ""} /> : null}
          {isImplantWorkType && implantPlatform === "Alt tip" ? <TextInput label="Alt tip platformă" value={implantPlatformCustom ?? ""} onChange={(event) => setImplantPlatformCustom(event.target.value || null)} /> : null}
          {isImplantWorkType ? <fieldset className="multi-item-work-editor__restoration" aria-label="Tip restaurare">
            <legend className="multi-item-work-editor__field-label">Tip restaurare</legend>
            <div className="multi-item-work-editor__restoration-options">
              {RESTORATION_TYPE_OPTIONS.map((option) => {
                const selected = restorationType === option.value;
                return <button
                  aria-pressed={selected}
                  className={`multi-item-work-editor__restoration-option${selected ? " is-selected" : ""}`}
                  key={option.value}
                  onClick={() => setRestorationType((current) => current === option.value ? null : option.value)}
                  type="button"
                >
                  <span aria-hidden="true" className="multi-item-work-editor__restoration-dot" />
                  {option.label}
                </button>;
              })}
            </div>
          </fieldset> : null}
          {canEditTechnicalCode ? <TextInput label="Cod tehnic" value={technicalCodeNotes ?? ""} onChange={(event) => setTechnicalCodeNotes(event.target.value || null)} /> : null}
        </FormGrid>
      </div> : null}
      {formOpen && error ? <p className="multi-item-work-editor__error" role="alert">{error}</p> : null}
      {formOpen ? <div className="multi-item-work-editor__actions">
        <Button disabled={disabled} onClick={saveItem} type="button" variant="secondary">{editingId ? "Salvează" : "Adaugă"}</Button>
        <Button disabled={disabled} onClick={resetDraft} type="button" variant="outline">Anulează</Button>
      </div> : null}
      {items.length === 0 ? <p className="multi-item-work-editor__empty">Adaugă cel puțin o lucrare.</p> : null}
      <ConfirmActionModal confirmLabel="Șterge lucrarea" description="Lucrarea selectată va fi eliminată din această lucrare. Acțiunea va fi înregistrată în audit." isLoading={false} isOpen={deleteItemId !== null} onCancel={() => setDeleteItemId(null)} onConfirm={() => { if (deleteItemId) removeItem(deleteItemId); setDeleteItemId(null); }} title="Ștergi lucrarea?" />
      <Modal isOpen={workTypeModalOpen} onOpenChange={setWorkTypeModalOpen} size="lg" title="Alege tipul lucrării">
        <TextInput label="Caută tipul lucrării" value={workTypeSearch} onChange={(event) => setWorkTypeSearch(event.target.value)} />
        <div className="multi-item-work-editor__work-type-cards">
          {visibleWorkTypeOptions.map((option) => <Card className="multi-item-work-editor__work-type-card" key={option.value}>
            <button className="multi-item-work-editor__work-type-card-button" onClick={() => {
              if (option.value === CUSTOM_WORK_TYPE_CATEGORY) {
                setWorkTypeCategory(CUSTOM_WORK_TYPE_CATEGORY);
                setWorkTypeId("");
                setCustomWorkTypeName("");
              } else {
                setWorkTypeCategory("");
                setWorkTypeId(option.value);
                setCustomWorkTypeName("");
              }
              setWorkTypeModalOpen(false);
            }} type="button">
              <CardHeader><CardTitle>{option.value === CUSTOM_WORK_TYPE_CATEGORY ? option.label : displayWorkTypeSymbolOrName(option.label)}</CardTitle></CardHeader>
              {option.value === CUSTOM_WORK_TYPE_CATEGORY ? <CardContent>Denumire introdusă manual</CardContent> : null}
            </button>
          </Card>)}
        </div>
      </Modal>
    </div>
  );
}

function snapshotValue(snapshot: Readonly<Record<string, unknown>> | null | undefined): string {
  const value = snapshot?.name ?? snapshot?.value;
  return typeof value === "string" ? value : "";
}

function filterEditorOptions<T extends { readonly label: string; readonly secondary: string | undefined; readonly value: string }>(options: readonly T[], searchValue: string): readonly T[] {
  const normalized = searchValue.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const matched = normalized === "" ? options : options.filter((option) => `${option.label} ${option.secondary ?? ""}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(normalized));
  return normalized === "" ? matched.slice(0, 8) : matched;
}
