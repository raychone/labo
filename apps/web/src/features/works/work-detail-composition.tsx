import {
  ADULT_FDI_TEETH,
  ANATOMICAL_SCOPE_LABELS_RO,
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
import { fetchWorkCompatibility, useWorkCompositionMutations } from "./works-api.js";
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
    shade: item.shade,
    implantPlatform: item.implantPlatform,
    implantPlatformCustom: snapshotValue(item.customImplantPlatformSnapshot),
    restorationType: item.restorationType,
    technicalCodeNotes: item.technicalCodeNotes,
    notes: item.notes,
  };
}

function draftToInput(item: DraftWorkOrderItem): WorkOrderItemInput {
  return {
    scope: item.scope,
    teeth: item.teeth,
    workTypeId: item.workTypeId || null,
    shade: item.shade,
    implantPlatform: item.implantPlatform,
    customImplantPlatformSnapshot: item.implantPlatform === "Alt tip" && item.implantPlatformCustom ? { value: item.implantPlatformCustom } : null,
    restorationType: item.restorationType,
    technicalCodeNotes: item.technicalCodeNotes,
    notes: item.notes,
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
  if (field === "workType") return item.workType?.name ?? snapshotValue(item.customWorkTypeSnapshot);
  return item.implantPlatform ?? snapshotValue(item.customImplantPlatformSnapshot);
}

export function WorkDetailComposition({
  canEdit,
  isOpen,
  work,
  workTypeOptions,
}: {
  readonly canEdit: boolean;
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
        ...draftToInput(draft),
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
      <section className="works-page__detail-section" aria-labelledby="work-identity-title">
        <div className="works-page__detail-section-header"><h2 id="work-identity-title">Identitatea lucrării</h2></div>
        <div className="works-page__detail-section-grid">
          <DetailValue label="Cod lucrare" value={work.code} />
          <DetailValue label="Pacient" value={work.patient?.fullName ?? work.patientName} />
          <DetailValue label="Clinică" value={work.clinic ? `${work.clinic.code} · ${work.clinic.name}` : "Fără clinică"} />
          <DetailValue label="Medic" value={work.doctor?.displayName ?? "Fără medic"} />
          <DetailValue label="Entitate legală" value={work.executionSnapshot.summary.legalEntity?.displayName ?? work.claim.executionLegalEntity?.displayName ?? "Nerezolvată"} />
          <DetailValue label="Note generale" value={work.clinicalNotes ?? work.internalNotes} />
        </div>
      </section>
      <section className="works-page__detail-section" aria-labelledby="work-composition-title">
        <div className="works-page__detail-section-header works-page__composition-header">
          <div><h2 id="work-composition-title">Compoziția dentară</h2><p className="works-page__muted">O singură lucrare · {work.code} · {items.length} componente active</p></div>
          {canEdit && items.length > 0 && !editing ? <Button onClick={beginEditing} type="button" variant="outline">Editează componentele</Button> : null}
        </div>
        {editing ? (
          <>
            <MultiItemWorkEditor disabled={savePending} items={draftItems} connections={draftConnections} workTypeOptions={effectiveWorkTypeOptions} onChange={(items, connections) => { setDraftItems(items); setDraftConnections(connections); }} />
            {saveError ? <ErrorState title="Componentele nu au fost salvate" description={getErrorMessage(saveError)} /> : null}
            <div className="works-page__actions"><Button disabled={savePending} isLoading={savePending} onClick={() => void saveComposition()} type="button">Salvează componentele</Button><Button disabled={savePending} onClick={() => setEditing(false)} type="button" variant="outline">Anulează</Button></div>
          </>
        ) : (
          <>
            <ToothDiagram availableTeeth={ADULT_FDI_TEETH} configuredTeeth={compositionTeeth} connectionTeeth={compositionTeeth} connections={work.toothConnections ?? []} mode="readOnly" showShortcuts={false} />
            {items.length > 0 ? <div className="works-page__composition-items">{items.map((item, index) => <WorkItemCard item={item} index={index} key={item.id} />)}</div> : <p className="works-page__muted">Nu există componente canonice active. Datele istorice rămân afișate separat; conversia explicită a lucrărilor legacy nu este disponibilă în B09.</p>}
          </>
        )}
      </section>
      <CompatibilitySection work={work} isOpen={isOpen} />
    </div>
  );
}

function WorkItemCard({ item, index }: { readonly item: WorkOrderItemView; readonly index: number }): ReactNode {
  return <article className="works-page__composition-item"><div className="works-page__composition-item-title"><strong>Componenta {index + 1}</strong><StatusBadge label={ANATOMICAL_SCOPE_LABELS_RO[item.scope]} variant="registered" /></div><div className="works-page__detail-section-grid"><DetailValue label="Tip lucrare" value={itemDisplayValue(item, "workType")} /><DetailValue label="Domeniu" value={scopeLabel(item.scope, item.teeth.map((tooth) => tooth.fdiTooth))} /><DetailValue label="Culoare" value={item.shade} /><DetailValue label="Platformă implant" value={itemDisplayValue(item, "platform")} /><DetailValue label="Tip restaurare" value={item.restorationType} /><DetailValue label="Cod / detalii tehnice" value={item.technicalCodeNotes} /><DetailValue label="Note componentă" value={item.notes} /></div></article>;
}

function DetailValue({ label, value }: { readonly label: string; readonly value: string | null | undefined }): ReactNode {
  return <div className="works-page__detail-field"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function CompatibilitySection({ work, isOpen }: { readonly work: WorkDetail; readonly isOpen: boolean }): ReactNode {
  const query = useQuery({ enabled: isOpen, queryFn: () => fetchWorkCompatibility(work.id), queryKey: ["works", "compatibility", work.id], retry: false });
  const items = work.items ?? [];
  return <div className="works-page__compatibility-note"><strong>{query.data?.compatibilityLabelRo ?? "Identitate păstrată"}</strong><span>{work.code} · același WorkOrder și aceeași identitate QR după editare.</span>{items.length === 0 ? <span>Datele istorice nu sunt transformate automat în componente canonice.</span> : null}{query.isError ? <span>Compatibilitatea istorică nu a putut fi încărcată.</span> : null}</div>;
}
