import {
  ANATOMICAL_SCOPE_LABELS_RO,
  ADULT_FDI_TEETH,
  isAdjacentAdultFdiPair,
  normalizeConnectionPair,
  type AdultFdiTooth,
  type AnatomicalScopeType,
  type WorkTypeFormOption,
} from "@dental-lab/shared";
import { Button, FormGrid, FormGridFull, RadioGroup, Select, TextInput, Textarea } from "@dental-lab/ui";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { SearchablePickerField } from "./work-form.js";
import { IMPLANT_PLATFORM_OPTIONS, RESTORATION_TYPE_OPTIONS, WORK_SHADE_OPTIONS } from "./works-page.schema.js";
import { ToothDiagram } from "../../components/dental/tooth-diagram.js";

export interface DraftWorkOrderItem {
  readonly id: string;
  readonly scope: AnatomicalScopeType;
  readonly teeth: readonly AdultFdiTooth[];
  readonly workTypeId: string;
  readonly shade: string | null;
  readonly implantPlatform: string | null;
  readonly implantPlatformCustom: string | null;
  readonly restorationType: string | null;
  readonly technicalCodeNotes: string | null;
  readonly notes: string | null;
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

function formatWorkTypeUnit(unit: WorkTypeFormOption["unit"]): string {
  return unit === "ELEMENT" ? "Element" : unit === "UNIT" ? "Bucată" : unit === "ARCH" ? "Arcadă" : unit === "CASE" ? "Lucrare" : unit;
}

export function MultiItemWorkEditor({
  disabled,
  items,
  onChange,
  workTypeOptions,
  connections,
}: {
  readonly disabled: boolean;
  readonly items: readonly DraftWorkOrderItem[];
  readonly onChange: (items: readonly DraftWorkOrderItem[], connections: readonly DraftToothConnection[]) => void;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
  readonly connections: readonly DraftToothConnection[];
}): ReactNode {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scope, setScope] = useState<AnatomicalScopeType>("TOOTH");
  const [selectedTeeth, setSelectedTeeth] = useState<AdultFdiTooth[]>([]);
  const [workTypeId, setWorkTypeId] = useState("");
  const [workTypeSearch, setWorkTypeSearch] = useState("");
  const [shade, setShade] = useState<string | null>(null);
  const [implantPlatform, setImplantPlatform] = useState<string | null>(null);
  const [implantPlatformCustom, setImplantPlatformCustom] = useState<string | null>(null);
  const [restorationType, setRestorationType] = useState<string | null>(null);
  const [technicalCodeNotes, setTechnicalCodeNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compositionTeeth = useMemo(() => getDraftCompositionTeeth(items), [items]);
  const effectiveConnectionComposition = useMemo(
    () => getDraftCompositionTeeth([...items, { scope, teeth: selectedTeeth }]),
    [items, scope, selectedTeeth],
  );
  const workTypeSearchOptions = useMemo(() => workTypeOptions.map((option) => ({
    label: option.name,
    secondary: `${option.symbol} · ${formatWorkTypeUnit(option.unit)}`,
    value: option.id,
  })), [workTypeOptions]);
  const visibleWorkTypeOptions = useMemo(() => {
    const normalized = workTypeSearch.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    return normalized === "" ? workTypeSearchOptions.slice(0, 3) : workTypeSearchOptions.filter((option) => option.label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(normalized));
  }, [workTypeSearch, workTypeSearchOptions]);

  function resetDraft(): void {
    setEditingId(null);
    setScope("TOOTH");
    setSelectedTeeth([]);
    setWorkTypeId("");
    setWorkTypeSearch("");
    setShade(null);
    setImplantPlatform(null);
    setImplantPlatformCustom(null);
    setRestorationType(null);
    setTechnicalCodeNotes(null);
    setNotes(null);
    setError(null);
  }

  function selectShortcut(teeth: readonly AdultFdiTooth[]): void {
    setSelectedTeeth([...teeth]);
    setError(null);
  }

  function toggleTooth(tooth: AdultFdiTooth): void {
    setSelectedTeeth((current) => current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth]);
    setError(null);
  }

  function saveItem(): void {
    const requiredCount = scope === "TOOTH" ? 1 : scope === "TEETH" ? 2 : 0;
    if (workTypeId === "") {
      setError("Alege tipul de lucrare pentru componentă.");
      return;
    }
    if (selectedTeeth.length < requiredCount) {
      setError(scope === "TOOTH" ? "Selectează un dinte." : "Selectează cel puțin doi dinți.");
      return;
    }
    const item: DraftWorkOrderItem = {
      id: editingId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scope,
      teeth: [...selectedTeeth].sort((a, b) => ADULT_FDI_TEETH.indexOf(a) - ADULT_FDI_TEETH.indexOf(b)),
      workTypeId,
      shade,
      implantPlatform,
      implantPlatformCustom: implantPlatform === "Alt tip" ? implantPlatformCustom : null,
      restorationType,
      technicalCodeNotes,
      notes,
    };
    const nextItems = editingId ? items.map((current) => current.id === editingId ? item : current) : [...items, item];
    const nextConnections = filterDraftConnections(connections, getDraftCompositionTeeth(nextItems));
    onChange(nextItems, nextConnections);
    resetDraft();
  }

  function editItem(item: DraftWorkOrderItem): void {
    setEditingId(item.id);
    setScope(item.scope);
    setSelectedTeeth([...item.teeth]);
    setWorkTypeId(item.workTypeId);
    setWorkTypeSearch(workTypeOptions.find((option) => option.id === item.workTypeId)?.name ?? "");
    setShade(item.shade);
    setImplantPlatform(item.implantPlatform);
    setImplantPlatformCustom(item.implantPlatformCustom);
    setRestorationType(item.restorationType);
    setTechnicalCodeNotes(item.technicalCodeNotes);
    setNotes(item.notes);
    setError(null);
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
        />
      </div>
      <div className="multi-item-work-editor__fields">
        <FormGrid>
          <Select label="Domeniu anatomic" options={Object.entries(ANATOMICAL_SCOPE_LABELS_RO).map(([value, label]) => ({ label, value }))} value={scope} onChange={(event) => { setScope(event.target.value as AnatomicalScopeType); setSelectedTeeth([]); }} />
          <SearchablePickerField
            disabled={disabled}
            emptyMessage="Nu există tipuri de lucrări potrivite."
            error={workTypeId === "" && error ? "Tipul lucrării este obligatoriu." : undefined}
            id="draft-work-type"
            label="Tip lucrare"
            onSearchChange={setWorkTypeSearch}
            onSelect={(value) => setWorkTypeId(value)}
            options={visibleWorkTypeOptions}
            placeholder="Caută tipul lucrării"
            required
            searchValue={workTypeSearch}
            selectedValue={workTypeId}
          />
          <Select label="Culoare" options={[{ label: "Fără culoare", value: "" }, ...WORK_SHADE_OPTIONS.map((value) => ({ label: value, value }))]} value={shade ?? ""} onChange={(event) => setShade(event.target.value || null)} />
          <Select label="Platformă implant" options={[{ label: "Fără platformă", value: "" }, ...IMPLANT_PLATFORM_OPTIONS.map((value) => ({ label: value, value }))]} value={implantPlatform ?? ""} onChange={(event) => setImplantPlatform(event.target.value || null)} />
          {implantPlatform === "Alt tip" ? <TextInput label="Alt tip platformă" value={implantPlatformCustom ?? ""} onChange={(event) => setImplantPlatformCustom(event.target.value || null)} /> : null}
          <RadioGroup label="Tip restaurare" name="draft-restoration-type" options={RESTORATION_TYPE_OPTIONS} value={restorationType ?? ""} onValueChange={(value) => setRestorationType(value || null)} />
          <TextInput label="Cod tehnic" value={technicalCodeNotes ?? ""} onChange={(event) => setTechnicalCodeNotes(event.target.value || null)} />
          <FormGridFull><Textarea label="Note componentă" rows={2} value={notes ?? ""} onChange={(event) => setNotes(event.target.value || null)} /></FormGridFull>
        </FormGrid>
      </div>
      {error ? <p className="multi-item-work-editor__error" role="alert">{error}</p> : null}
      <div className="multi-item-work-editor__actions">
        <Button disabled={disabled} onClick={saveItem} type="button" variant="secondary">{editingId ? "Salvează componenta" : "Adaugă componentă"}</Button>
        {editingId ? <Button disabled={disabled} onClick={resetDraft} type="button" variant="outline">Anulează editarea</Button> : null}
      </div>
      {items.length > 0 ? <div className="multi-item-work-editor__list" aria-label="Componentele lucrării">
        {items.map((item, index) => (
          <div className="multi-item-work-editor__item" key={item.id}>
            <div><strong>{index + 1}. {workTypeOptions.find((option) => option.id === item.workTypeId)?.name ?? "Tip lucrare"}</strong><span>{ANATOMICAL_SCOPE_LABELS_RO[item.scope]}{item.teeth.length > 0 ? ` · ${item.teeth.join(", ")}` : ""}</span></div>
            <div><Button disabled={disabled} onClick={() => editItem(item)} type="button" variant="outline">Editează</Button><Button disabled={disabled} onClick={() => removeItem(item.id)} type="button" variant="outline">Elimină</Button></div>
          </div>
        ))}
      </div> : <p className="multi-item-work-editor__empty">Adaugă cel puțin o componentă.</p>}
    </div>
  );
}
