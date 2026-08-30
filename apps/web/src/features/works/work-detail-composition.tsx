import {
  ADULT_FDI_TEETH,
  ANATOMICAL_SCOPE_LABELS_RO,
  formatWorkTypeCategory,
  getCanonicalWorkOrderCompositionTeeth,
  type AnatomicalScopeType,
  type WorkDetail,
  type WorkOrderItemInput,
  type WorkOrderCompositionInput,
  type WorkOrderItemView,
  type WorkTypeFormOption,
} from "@dental-lab/shared";
import { Button, ErrorState, StatusBadge } from "@dental-lab/ui";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { ToothDiagram } from "../../components/dental/tooth-diagram.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { fetchWorkCompatibility, saveOperationalWorkTypeName, useWorkCompositionMutations } from "./works-api.js";
import { MultiItemWorkEditor, type DraftToothConnection, type DraftWorkOrderItem } from "./multi-item-work-editor.js";
import "./work-detail-composition.css";

function scopeLabel(scope: AnatomicalScopeType, teeth: readonly number[]): string {
  if (scope === "TOOTH") return `Dinte ${teeth[0] ?? "—"}`;
  if (scope === "TEETH") return `Dinți ${teeth.join(", ") || "—"}`;
  return ANATOMICAL_SCOPE_LABELS_RO[scope];
}

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

function itemDisplayValue(item: WorkOrderItemView, field: "workType" | "platform"): string | null {
  if (field === "workType") return item.workType?.name ? displayWorkTypeName(item.workType.name) : snapshotValue(item.customWorkTypeSnapshot);
  return item.implantPlatform ?? snapshotValue(item.customImplantPlatformSnapshot);
}

const WORK_TYPE_COLORS = ["#2563eb", "#eab308", "#dc2626", "#7c3aed", "#f97316", "#0891b2", "#db2777", "#65a30d", "#92400e", "#475569"] as const;

function displayWorkTypeName(name: string): string {
  return name.replace(/\s*-\s*(bucată|bucata|element|arcadă|arcada|lucrare)\s*$/iu, "").trim();
}

export function WorkDetailComposition({
  canEdit,
  canEditTechnicalCode = false,
  isOpen,
  work,
  workTypeOptions,
}: {
  readonly canEdit: boolean;
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
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<readonly DraftWorkOrderItem[]>(() => items.map(itemToDraft));
  const [draftConnections, setDraftConnections] = useState<readonly DraftToothConnection[]>(() => (work.toothConnections ?? []).map(({ toothA, toothB }) => ({ toothA, toothB })));
  const mutations = useWorkCompositionMutations();
  const compositionTeeth = useMemo(() => getCanonicalWorkOrderCompositionTeeth(draftItems), [draftItems]);
  const workTypeVisualization = useMemo(() => {
    const colorByWorkType = new Map<string, string>();
    const legend: { color: string; label: string; symbol: string }[] = [];
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
        legend.push({ color, label: displayWorkTypeName(workType.name), symbol: workType.symbol });
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
    return { legend, toothColors: resolvedToothColors };
  }, [effectiveWorkTypeOptions, items]);
  const savePending = mutations.updateComposition.isPending;
  const saveError = mutations.updateComposition.error;

  function beginEditing(): void {
    setDraftItems(items.map(itemToDraft));
    setDraftConnections((work.toothConnections ?? []).map(({ toothA, toothB }) => ({ toothA, toothB })));
    setEditing(true);
  }

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
      setEditing(false);
    } catch {
      // Keep the draft and edit mode visible so the Romanian ErrorState can explain the failure.
    }
  }

  return (
    <div className="works-page__composition-stack">
      <section className="works-page__detail-section" aria-labelledby="work-composition-title">
        <div className="works-page__detail-section-header works-page__composition-header">
          <div><h2 id="work-composition-title">Compoziția dentară</h2><p className="works-page__muted">O singură lucrare · {work.code} · {items.length} componente active</p></div>
          {canEdit && items.length > 0 && !editing ? <Button onClick={beginEditing} type="button" variant="outline">Editează lucrarea</Button> : null}
        </div>
        {editing ? (
          <div className="works-page__inline-composition-editor">
            <p className="works-page__muted">Editează dinții, tipurile de lucrări, culorile, adaosurile și opțiunile implantului direct în detalii.</p>
            <MultiItemWorkEditor canEditTechnicalCode={canEditTechnicalCode} canSaveCustomWorkType onSaveCustomWorkType={saveOperationalWorkTypeName} disabled={savePending} items={draftItems} connections={draftConnections} workTypeOptions={effectiveWorkTypeOptions} onChange={(items, connections) => { setDraftItems(items); setDraftConnections(connections); }} />
            {saveError ? <ErrorState title="Componentele nu au fost salvate" description={getErrorMessage(saveError)} /> : null}
            <div className="works-page__actions"><Button disabled={savePending} isLoading={savePending} onClick={() => void saveComposition()} type="button">Salvează editarea</Button><Button disabled={savePending} onClick={() => setEditing(false)} type="button" variant="outline">Anulează</Button></div>
          </div>
        ) : (
          <>
            <ToothDiagram availableTeeth={ADULT_FDI_TEETH} configuredTeeth={compositionTeeth} connectionTeeth={compositionTeeth} connections={work.toothConnections ?? []} mode="readOnly" showShortcuts={false} toothColors={workTypeVisualization.toothColors} />
            {workTypeVisualization.legend.length > 0 ? <div className="works-page__work-type-legend" aria-label="Legendă tipuri de lucrări">{workTypeVisualization.legend.map((entry) => <span key={entry.label}><i aria-hidden="true" style={{ background: entry.color }} />{entry.symbol} · {entry.label}</span>)}</div> : null}
            {items.length > 0 ? <div className="works-page__composition-items">{items.map((item, index) => <WorkItemCard item={item} index={index} key={item.id} />)}</div> : <p className="works-page__muted">Nu există componente canonice active. Datele istorice rămân afișate separat; conversia explicită a lucrărilor legacy nu este disponibilă în B09.</p>}
          </>
        )}
      </section>
      <CompatibilitySection work={work} isOpen={isOpen} />
    </div>
  );
}

function WorkItemCard({ item, index }: { readonly item: WorkOrderItemView; readonly index: number }): ReactNode {
  const unit = item.workType?.unit;
  const quantity = unit === "ELEMENT" ? Math.max(1, item.teeth.length) : unit === "UNIT" ? 1 : null;
  const isImplantWorkType = item.workType?.name?.toLocaleLowerCase("ro-RO").includes("implant") ?? false;
  const hasPlatformDetails = Boolean(item.implantPlatform || item.customImplantPlatformSnapshot);
  return <article className="works-page__composition-item"><div className="works-page__composition-item-title"><strong>Componenta {index + 1}</strong><StatusBadge label={ANATOMICAL_SCOPE_LABELS_RO[item.scope]} variant="registered" /></div><div className="works-page__detail-section-grid"><DetailValue label="Categorie" value={formatWorkTypeCategory(item.workType?.probeFamily)} /><DetailValue label="Tip lucrare" value={itemDisplayValue(item, "workType")} /><DetailValue label="Unitate / cantitate" value={quantity === null ? unit ?? null : `${unit === "ELEMENT" ? "Elemente" : "Bucată"}: ${quantity}`} /><DetailValue label="Domeniu" value={scopeLabel(item.scope, item.teeth.map((tooth) => tooth.fdiTooth))} /><DetailValue label="Culoare" value={item.shade} />{isImplantWorkType || hasPlatformDetails ? <><DetailValue label="Platformă implant" value={itemDisplayValue(item, "platform")} /><DetailValue label="Tip restaurare" value={item.restorationType} /></> : null}<DetailValue label="Cod / detalii tehnice" value={item.technicalCodeNotes} /><DetailValue label="Note componentă" value={item.notes} /></div></article>;
}

function DetailValue({ label, value }: { readonly label: string; readonly value: string | null | undefined }): ReactNode {
  return <div className="works-page__detail-field"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function CompatibilitySection({ work, isOpen }: { readonly work: WorkDetail; readonly isOpen: boolean }): ReactNode {
  const items = work.items ?? [];
  // Canonical compositions already contain the authoritative data. The legacy
  // compatibility endpoint is only relevant for old works without components;
  // skipping it prevents a noisy 404 for normal work details.
  const query = useQuery({ enabled: isOpen && items.length === 0, queryFn: () => fetchWorkCompatibility(work.id), queryKey: ["works", "compatibility", work.id], retry: false });
  return <div className="works-page__compatibility-note"><strong>{query.data?.compatibilityLabelRo ?? "Identitate păstrată"}</strong><span>{work.code} · același WorkOrder și aceeași identitate QR după editare.</span>{items.length === 0 ? <span>Datele istorice nu sunt transformate automat în componente canonice.</span> : null}{query.isError ? <span>Compatibilitatea istorică nu a putut fi încărcată.</span> : null}</div>;
}
