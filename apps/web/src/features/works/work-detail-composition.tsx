import {
  ADULT_FDI_TEETH,
  expandCanonicalWorkOrderItemTeeth,
  getCanonicalWorkOrderCompositionTeeth,
  type WorkDetail,
  type WorkOrderItemInput,
  type WorkOrderCompositionInput,
  type WorkOrderItemView,
  type WorkTypeFormOption,
} from "@dental-lab/shared";
import { Button, ErrorState, Textarea } from "@dental-lab/ui";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ToothDiagram } from "../../components/dental/tooth-diagram.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { saveOperationalWorkTypeName, useUpdateTechnicianWorkDetails, useWorkCompositionMutations } from "./works-api.js";
import { MultiItemWorkEditor, type DraftToothConnection, type DraftWorkOrderItem } from "./multi-item-work-editor.js";
import "./work-detail-composition.css";

function itemToDraft(item: WorkOrderItemView): DraftWorkOrderItem {
  return {
    id: item.id,
    scope: item.scope,
    teeth: item.teeth.map((tooth) => tooth.fdiTooth),
    workTypeId: item.workTypeId ?? "",
    customWorkTypeSnapshot: item.customWorkTypeSnapshot,
    shade: item.shade,
    implantPlatform: item.implantPlatform,
    implantPlatformCustom: snapshotValue(item.customImplantPlatformSnapshot),
    restorationType: item.restorationType,
    technicalCodeNotes: item.technicalCodeNotes,
    notes: item.notes,
    ...(item.selectedAddOns ? { selectedAddOns: item.selectedAddOns } : {}),
  };
}

function draftToInput(item: DraftWorkOrderItem, canEditTechnicalCode: boolean): WorkOrderItemInput {
  return {
    scope: item.scope,
    teeth: item.teeth,
    workTypeId: item.workTypeId || null,
    customWorkTypeSnapshot: item.workTypeId ? null : item.customWorkTypeSnapshot ?? null,
    shade: item.shade,
    implantPlatform: item.implantPlatform,
    customImplantPlatformSnapshot: item.implantPlatform === "Alt tip" && item.implantPlatformCustom ? { value: item.implantPlatformCustom } : null,
    restorationType: item.restorationType,
    ...(canEditTechnicalCode ? { technicalCodeNotes: item.technicalCodeNotes } : {}),
    notes: item.notes,
    ...(item.selectedAddOns ? { selectedAddOns: item.selectedAddOns } : {}),
  };
}

function snapshotValue(snapshot: Readonly<Record<string, unknown>> | null): string | null {
  if (!snapshot) return null;
  for (const key of ["value", "name", "label", "displayName", "text"]) {
    const value = snapshot[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

const WORK_TYPE_COLORS = ["#2563eb", "#eab308", "#dc2626", "#7c3aed", "#f97316", "#0891b2", "#db2777", "#65a30d", "#92400e", "#475569"] as const;

export function WorkDetailComposition({
  canEdit,
  canEditNotes = false,
  canEditTechnicalCode = false,
  isOpen,
  work,
  workTypeOptions,
}: {
  readonly canEdit: boolean;
  readonly canEditNotes?: boolean;
  readonly canEditTechnicalCode?: boolean;
  readonly isOpen: boolean;
  readonly work: WorkDetail;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
}): ReactNode {
  const items = work.items ?? [];
  const effectiveWorkTypeOptions = useMemo(() => {
    const options = [...workTypeOptions];
    for (const item of items) {
      if (item.workType && !options.some((option) => option.id === item.workType!.id)) options.push({ ...item.workType, unit: "UNIT" });
    }
    return options;
  }, [items, workTypeOptions]);
  const [editingItem, setEditingItem] = useState(false);
  const [compositionDirty, setCompositionDirty] = useState(false);
  const [draftItems, setDraftItems] = useState<readonly DraftWorkOrderItem[]>(() => items.map(itemToDraft));
  const [draftConnections, setDraftConnections] = useState<readonly DraftToothConnection[]>(() => (work.toothConnections ?? []).map(({ toothA, toothB }) => ({ toothA, toothB })));
  const mutations = useWorkCompositionMutations();
  const compositionTeeth = useMemo(() => getCanonicalWorkOrderCompositionTeeth(draftItems), [draftItems]);
  const workTypeVisualization = useMemo(() => {
    const colorByWorkType = new Map<string, string>();
    const toothColors = new Map<number, string[]>();
    for (const item of items) {
      if (item.scope === "CASE" || !item.workType) continue;
      const workType = item.workType;
      const key = workType.id;
      const configuredOption = effectiveWorkTypeOptions.find((option) => option.id === key);
      let color = colorByWorkType.get(key);
      if (!color) {
        color = workType.colorHex?.trim() || configuredOption?.colorHex?.trim() || WORK_TYPE_COLORS[colorByWorkType.size % WORK_TYPE_COLORS.length]!;
        colorByWorkType.set(key, color);
      }
      // A UNIT work can still cover a whole arch (for example "All on X").
      // The unit is the billing quantity, not a restriction to one tooth.
      for (const tooth of item.teeth) {
        const colors = toothColors.get(tooth.fdiTooth) ?? [];
        if (!colors.includes(color)) colors.push(color);
        toothColors.set(tooth.fdiTooth, colors);
      }
    }
    const resolvedToothColors: Record<number, string> = {};
    for (const [tooth, colors] of toothColors.entries()) {
      resolvedToothColors[tooth] = colors.length === 1 ? colors[0]! : `linear-gradient(90deg, ${colors.join(", ")})`;
    }
    return { toothColors: resolvedToothColors };
  }, [effectiveWorkTypeOptions, items]);
  const savePending = mutations.updateComposition.isPending;
  const saveError = mutations.updateComposition.error;

  async function saveComposition(): Promise<void> {
    if (savePending) return;
    const input: WorkOrderCompositionInput = {
      items: draftItems.map((draft) => ({
        ...(draft.id.startsWith("draft-") ? {} : { id: draft.id }),
        ...draftToInput(draft, canEditTechnicalCode),
      })),
      toothConnections: draftConnections,
    };
    try {
      await mutations.updateComposition.mutateAsync({ workOrderId: work.id, input });
      setCompositionDirty(false);
    } catch {
      // Keep the draft and edit mode visible so the Romanian ErrorState can explain the failure.
    }
  }

  return (
    <div className="works-page__composition-stack">
      <section className="works-page__detail-section" aria-labelledby="work-composition-title">
        <div className="works-page__detail-section-header works-page__composition-header">
          <div><h2 id="work-composition-title">Lucrare</h2></div>
        </div>
        {!canEdit ? <WorkRows items={items} /> : null}
        {canEdit ? (
          <div className="works-page__inline-composition-editor">
            <MultiItemWorkEditor canEditTechnicalCode={canEditTechnicalCode} canSaveCustomWorkType onEditingChange={setEditingItem} onSaveCustomWorkType={saveOperationalWorkTypeName} disabled={savePending} items={draftItems} connections={draftConnections} workTypeOptions={effectiveWorkTypeOptions} onChange={(items, connections) => { setCompositionDirty(true); setDraftItems(items); setDraftConnections(connections); }} />
            {saveError ? <ErrorState title="Lucrările nu au fost salvate" description={getErrorMessage(saveError)} /> : null}
            {!editingItem && compositionDirty ? <div className="works-page__actions"><Button disabled={savePending} isLoading={savePending} onClick={() => void saveComposition()} type="button">Salvează editarea</Button><Button disabled={savePending} onClick={() => { setDraftItems(items.map(itemToDraft)); setDraftConnections((work.toothConnections ?? []).map(({ toothA, toothB }) => ({ toothA, toothB }))); setCompositionDirty(false); }} type="button" variant="outline">Anulează</Button></div> : null}
          </div>
        ) : (
          <>
            <ToothDiagram availableTeeth={ADULT_FDI_TEETH} configuredTeeth={compositionTeeth} connectionTeeth={compositionTeeth} connections={work.toothConnections ?? []} mode="readOnly" showShortcuts={false} toothColors={workTypeVisualization.toothColors} />
            {items.length === 0 ? <p className="works-page__muted">Nu există lucrări active. Datele istorice rămân afișate separat.</p> : null}
          </>
        )}
      </section>
      <CompatibilitySection canEditNotes={canEditNotes} work={work} isOpen={isOpen} />
    </div>
  );
}

function WorkRows({ items }: { readonly items: readonly WorkOrderItemView[] }): ReactNode {
  return <div aria-label="Lucrări, dinți și culori" className="works-page__work-rows">
    {items.map((item) => {
      const teeth = expandCanonicalWorkOrderItemTeeth({ scope: item.scope, teeth: item.teeth.map((tooth) => tooth.fdiTooth) });
      const color = item.workType?.colorHex?.trim() || "#64748b";
      const symbol = item.workType?.symbol ?? snapshotValue(item.customWorkTypeSnapshot) ?? "—";
      return <div className="works-page__work-row" key={item.id}>
        <strong className="works-page__work-row-type"><i aria-hidden="true" style={{ background: color }} />{symbol}</strong>
        <span>Dinți: {teeth.join(", ") || "Fără dinți"}</span>
        <span>Culoare: {item.shade || "—"}</span>
      </div>;
    })}
  </div>;
}

function CompatibilitySection({ canEditNotes, isOpen, work }: { readonly canEditNotes: boolean; readonly isOpen: boolean; readonly work: WorkDetail }): ReactNode {
  void isOpen;
  const updateMutation = useUpdateTechnicianWorkDetails();
  const [notes, setNotes] = useState(work.clinicalNotes ?? "");
  useEffect(() => setNotes(work.clinicalNotes ?? ""), [work.clinicalNotes, work.id]);
  return <section aria-labelledby="work-notes-title" className="works-page__compatibility-note">
    <h2 id="work-notes-title">Note lucrare</h2>
    <Textarea aria-label="Note lucrare" disabled={!canEditNotes} label="Note" onChange={(event) => setNotes(event.target.value)} rows={4} value={notes} />
    {canEditNotes ? <div className="works-page__actions"><Button disabled={updateMutation.isPending} isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ input: { clinicalNotes: notes.trim() || null }, workOrderId: work.id })} type="button">Salvează nota</Button></div> : null}
    {updateMutation.isError ? <ErrorState title="Nota nu a fost salvată" description={getErrorMessage(updateMutation.error)} /> : null}
  </section>;
}
