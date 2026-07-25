import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmActionModal,
  EmptyState,
  ErrorState,
  LoadingState,
  NumberInput,
  StatusBadge,
  Textarea,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  WORKFLOW_STAGE_ROLE_CODES,
  formatWorkflowDuration,
  isWorkflowStageKey,
  normalizeWorkflowStagesOrder,
  validateWorkflowRoleCodes,
  type WorkflowStageDefinition,
  type WorkflowStageRoleCode,
  type WorkflowTemplateStatus,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage, UnsavedChangesPrompt, useBeforeUnloadPrompt } from "../../lib/form-utils.js";
import {
  useActivateWorkflowTemplate,
  useArchiveWorkflowTemplate,
  useCloneWorkflowTemplate,
  useCreateWorkflowTemplate,
  useReplaceWorkflowStages,
  useUpdateWorkflowTemplate,
  useWorkflowTemplate,
  useWorkflowTemplates,
} from "./workflow-templates-api.js";
import "./workflow-builder-page.css";

const roleLabels: Record<WorkflowStageRoleCode, string> = {
  CURIER: "Curier",
  LOGISTICA: "Logistică",
  MANAGER: "Manager",
  MEDIC: "Medic",
  RECEPTIE: "Recepție",
  TEHNICIAN: "Tehnician",
};

function createEmptyStage(sortOrder: number): WorkflowStageDefinition {
  return {
    allowedRoleCodes: ["TEHNICIAN"],
    description: null,
    estimatedDurationMinutes: null,
    isFinal: sortOrder === 1,
    isInitial: sortOrder === 1,
    key: `etapa_${sortOrder}`,
    name: "Etapă nouă",
    sortOrder,
  };
}

function cloneStages(stages: readonly WorkflowStageDefinition[]): readonly WorkflowStageDefinition[] {
  return stages.map((stage) => ({
    ...stage,
    allowedRoleCodes: [...stage.allowedRoleCodes],
  }));
}

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function statusLabel(status: WorkflowTemplateStatus | string): string {
  if (status === "ACTIVE") {
    return "Activ";
  }

  if (status === "ARCHIVED") {
    return "Arhivat";
  }

  return "Draft";
}

function durationToInput(value: number | null): string {
  return value === null ? "" : String(value);
}

function inputToDuration(value: string): number | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : Number(trimmed);
}

function validateStages(stages: readonly WorkflowStageDefinition[]): readonly string[] {
  const errors: string[] = [];
  const keys = new Set<string>();

  if (stages.length === 0) {
    errors.push("Fluxul trebuie să conțină cel puțin o etapă.");
  }

  for (const stage of stages) {
    if (!isWorkflowStageKey(stage.key)) {
      errors.push(`${stage.key || "etapă"}: cheia trebuie să înceapă cu literă mică și poate conține litere mici, cifre sau underscore.`);
    }

    if (keys.has(stage.key)) {
      errors.push(`${stage.key}: cheia este duplicată.`);
    }
    keys.add(stage.key);

    if (stage.name.trim().length < 2) {
      errors.push(`${stage.key}: numele etapei este obligatoriu.`);
    }

    if (stage.estimatedDurationMinutes !== null && (!Number.isInteger(stage.estimatedDurationMinutes) || stage.estimatedDurationMinutes < 1)) {
      errors.push(`${stage.key}: durata estimată trebuie să fie un număr întreg pozitiv.`);
    }

    errors.push(...validateWorkflowRoleCodes(stage.allowedRoleCodes).errors.map((error) => `${stage.key}: ${error}`));
  }

  return errors;
}

export function WorkflowBuilderPage(): ReactNode {
  const params = useParams();
  const workTypeId = params.workTypeId;
  const toast = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStages, setDraftStages] = useState<readonly WorkflowStageDefinition[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "workflow.read");
  const canCreate = hasPermission(permissionsQuery.data, "workflow.create");
  const canUpdate = hasPermission(permissionsQuery.data, "workflow.update");
  const canArchive = hasPermission(permissionsQuery.data, "workflow.archive");
  const listQuery = useWorkflowTemplates(workTypeId, Boolean(workTypeId && canRead));
  const selectedQuery = useWorkflowTemplate(selectedTemplateId, Boolean(selectedTemplateId && canRead));
  const createMutation = useCreateWorkflowTemplate();
  const updateMutation = useUpdateWorkflowTemplate();
  const replaceStagesMutation = useReplaceWorkflowStages();
  const activateMutation = useActivateWorkflowTemplate();
  const archiveMutation = useArchiveWorkflowTemplate();
  const cloneMutation = useCloneWorkflowTemplate();
  const selectedTemplate = selectedQuery.data;
  const isSaving = createMutation.isPending || updateMutation.isPending || replaceStagesMutation.isPending || activateMutation.isPending || archiveMutation.isPending || cloneMutation.isPending;
  const canEditSelected = Boolean(canUpdate && selectedTemplate?.status === "DRAFT" && selectedTemplate.workType.isActive);
  const canMutateWorkType = Boolean(listQuery.data?.workType.isActive);
  const validationErrors = useMemo(() => validateStages(draftStages), [draftStages]);

  useEffect(() => {
    if (!selectedTemplateId && listQuery.data?.templates[0]) {
      setSelectedTemplateId(listQuery.data.templates[0].id);
    }
  }, [listQuery.data, selectedTemplateId]);

  useEffect(() => {
    if (selectedTemplate) {
      setDraftName(selectedTemplate.name);
      setDraftDescription(selectedTemplate.description ?? "");
      setDraftStages(cloneStages(selectedTemplate.stages));
      setIsDirty(false);
    }
  }, [selectedTemplate]);

  useBeforeUnloadPrompt(isDirty && !isSaving);

  if (!workTypeId) {
    return <PageState><ErrorState title="Rută invalidă" description="Lipsește tipul de lucrare." /></PageState>;
  }

  if (permissionsQuery.isLoading || listQuery.isLoading) {
    return <PageState><LoadingState text="Se încarcă builderul de flux" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea workflow.read." /></PageState>;
  }

  if (listQuery.isError) {
    return <PageState><ErrorState title="Fluxurile nu pot fi încărcate" description={getErrorMessage(listQuery.error)} /></PageState>;
  }

  function selectTemplate(templateId: string): void {
    if (isDirty && !window.confirm("Ai modificări nesalvate. Schimbi versiunea fără salvare?")) {
      return;
    }

    setSelectedTemplateId(templateId);
  }

  function mutateStage(index: number, next: WorkflowStageDefinition): void {
    setDraftStages((current) => normalizeWorkflowStagesOrder(current.map((stage, currentIndex) => (currentIndex === index ? next : stage))));
    setIsDirty(true);
  }

  function saveDraft(): void {
    if (!selectedTemplate || validationErrors.length > 0) {
      return;
    }

    updateMutation.mutate({
      input: { description: normalizeText(draftDescription), name: draftName },
      templateId: selectedTemplate.id,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Fluxul nu a fost salvat", variant: "error" }),
      onSuccess: (template) => {
        replaceStagesMutation.mutate({
          input: { stages: draftStages },
          templateId: template.id,
        }, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Etapele nu au fost salvate", variant: "error" }),
          onSuccess: (saved) => {
            setSelectedTemplateId(saved.id);
            setIsDirty(false);
            toast.showToast({ message: "Draftul de flux a fost salvat.", variant: "success" });
          },
        });
      },
    });
  }

  return (
    <main className="workflow-builder-page">
      <UnsavedChangesPrompt when={isDirty && !isSaving} />
      <section className="dl-container workflow-builder-page__layout">
        <header className="workflow-builder-page__header">
          <div>
            <Link to="/work-types">Tipuri de lucrări</Link>
            <h1>{listQuery.data?.workType.code} · {listQuery.data?.workType.name}</h1>
            <p>Configurează etapele standard folosite pentru lucrările viitoare ale acestui tip.</p>
          </div>
          <div className="workflow-builder-page__header-actions">
            <StatusBadge label={listQuery.data?.workType.isActive ? "Tip activ" : "Tip arhivat"} variant={listQuery.data?.workType.isActive ? "registered" : "cancelled"} />
            <Button
              disabled={!canCreate || !canMutateWorkType || isSaving}
              onClick={() => createMutation.mutate({
                input: { description: null, name: "Flux draft" },
                workTypeId,
              }, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Draftul nu a fost creat", variant: "error" }),
                onSuccess: (template) => {
                  setSelectedTemplateId(template.id);
                  toast.showToast({ message: "Draftul de flux a fost creat.", variant: "success" });
                },
              })}
              type="button"
            >
              Creează draft
            </Button>
          </div>
        </header>

        {!canUpdate ? <p className="workflow-builder-page__readonly">Ai acces de citire. Poți vedea versiunile și etapele, dar nu poți modifica fluxul.</p> : null}
        {!canMutateWorkType ? <p className="workflow-builder-page__readonly">Tipul de lucrare este arhivat. Fluxurile rămân vizibile, dar managementul revine după reactivare.</p> : null}

        <div className="workflow-builder-page__grid">
          <Card>
            <CardHeader>
              <CardTitle>Versiuni</CardTitle>
              <CardDescription>Maximum o versiune activă per tip de lucrare.</CardDescription>
            </CardHeader>
            <CardContent>
              {listQuery.data?.templates.length === 0 ? (
                <EmptyState title="Nu există fluxuri" description="Creează primul draft pentru acest tip de lucrare." />
              ) : (
                <div className="workflow-builder-page__versions">
                  {listQuery.data?.templates.map((template) => (
                    <button
                      className={template.id === selectedTemplateId ? "workflow-builder-page__version workflow-builder-page__version--selected" : "workflow-builder-page__version"}
                      key={template.id}
                      onClick={() => selectTemplate(template.id)}
                      type="button"
                    >
                      <span>v{template.version} · {template.name}</span>
                      <span>{statusLabel(template.status)} · {template.stageCount} etape</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedTemplate ? `Builder v${selectedTemplate.version}` : "Builder"}</CardTitle>
              <CardDescription>{selectedTemplate ? statusLabel(selectedTemplate.status) : "Alege sau creează o versiune."}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedQuery.isLoading ? <LoadingState text="Se încarcă versiunea" /> : null}
              {selectedQuery.isError ? <ErrorState title="Versiunea nu poate fi încărcată" description={getErrorMessage(selectedQuery.error)} /> : null}
              {selectedTemplate ? (
                <div className="workflow-builder-page__editor">
                  <TextInput
                    disabled={!canEditSelected || isSaving}
                    label="Nume flux"
                    onChange={(event) => {
                      setDraftName(event.target.value);
                      setIsDirty(true);
                    }}
                    value={draftName}
                  />
                  <Textarea
                    disabled={!canEditSelected || isSaving}
                    label="Descriere"
                    onChange={(event) => {
                      setDraftDescription(event.target.value);
                      setIsDirty(true);
                    }}
                    value={draftDescription}
                  />

                  <div className="workflow-builder-page__stage-toolbar">
                    <h2>Etape</h2>
                    <Button
                      disabled={!canEditSelected || isSaving}
                      onClick={() => {
                        setDraftStages((current) => normalizeWorkflowStagesOrder([...current, createEmptyStage(current.length + 1)]));
                        setIsDirty(true);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Adaugă etapă
                    </Button>
                  </div>

                  {validationErrors.length > 0 ? (
                    <div className="workflow-builder-page__errors" role="alert">
                      <strong>Verifică fluxul:</strong>
                      <ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
                    </div>
                  ) : null}

                  {draftStages.map((stage, index) => (
                    <StageEditor
                      canEdit={canEditSelected && !isSaving}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === draftStages.length - 1}
                      key={`${stage.key}-${index}`}
                      onChange={(next) => mutateStage(index, next)}
                      onMoveDown={() => {
                        setDraftStages((current) => normalizeWorkflowStagesOrder(swap(current, index, index + 1)));
                        setIsDirty(true);
                      }}
                      onMoveUp={() => {
                        setDraftStages((current) => normalizeWorkflowStagesOrder(swap(current, index, index - 1)));
                        setIsDirty(true);
                      }}
                      onRemove={() => {
                        setDraftStages((current) => normalizeWorkflowStagesOrder(current.filter((_, currentIndex) => currentIndex !== index)));
                        setIsDirty(true);
                      }}
                      stage={stage}
                    />
                  ))}

                  <div className="workflow-builder-page__actions">
                    <Button disabled={!canEditSelected || isSaving || validationErrors.length > 0 || !isDirty} onClick={saveDraft} type="button">
                      Salvează fluxul
                    </Button>
                    <Button disabled={!canEditSelected || isSaving || validationErrors.length > 0 || draftStages.length < 2} onClick={() => setConfirmActivate(true)} type="button" variant="outline">
                      Activează
                    </Button>
                    <Button disabled={!canArchive || selectedTemplate.status === "ARCHIVED" || isSaving} onClick={() => setConfirmArchive(true)} type="button" variant="outline">
                      Arhivează
                    </Button>
                    <Button
                      disabled={!canCreate || !canMutateWorkType || isSaving}
                      onClick={() => cloneMutation.mutate(selectedTemplate.id, {
                        onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Versiunea nu a fost clonată", variant: "error" }),
                        onSuccess: (template) => {
                          setSelectedTemplateId(template.id);
                          toast.showToast({ message: "Versiunea a fost clonată în draft.", variant: "success" });
                        },
                      })}
                      type="button"
                      variant="outline"
                    >
                      Clonează
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Ordinea este liniară. Prima etapă este inițială, ultima este finală.</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowPreview stages={draftStages} />
            </CardContent>
          </Card>
        </div>
      </section>

      {selectedTemplate ? (
        <>
          <ConfirmActionModal
            confirmLabel="Activează fluxul"
            description="Această versiune va deveni fluxul activ pentru tipul de lucrare. Versiunea activă anterioară va fi arhivată."
            isLoading={activateMutation.isPending}
            isOpen={confirmActivate}
            onCancel={() => setConfirmActivate(false)}
            onConfirm={() => {
              setConfirmActivate(false);
              activateMutation.mutate(selectedTemplate.id, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Fluxul nu a fost activat", variant: "error" }),
                onSuccess: (template) => {
                  setSelectedTemplateId(template.id);
                  toast.showToast({ message: "Fluxul este activ.", variant: "success" });
                },
              });
            }}
            title="Activează fluxul"
            variant="primary"
          />
          <ConfirmActionModal
            confirmLabel="Arhivează"
            description="Fluxul arhivat devine read-only și rămâne disponibil în istoric."
            isLoading={archiveMutation.isPending}
            isOpen={confirmArchive}
            onCancel={() => setConfirmArchive(false)}
            onConfirm={() => {
              setConfirmArchive(false);
              archiveMutation.mutate(selectedTemplate.id, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Fluxul nu a fost arhivat", variant: "error" }),
                onSuccess: (template) => {
                  setSelectedTemplateId(template.id);
                  toast.showToast({ message: "Fluxul a fost arhivat.", variant: "success" });
                },
              });
            }}
            title="Arhivează fluxul"
          />
        </>
      ) : null}
    </main>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="workflow-builder-page"><section className="dl-container workflow-builder-page__layout">{children}</section></main>;
}

function StageEditor({
  canEdit,
  index,
  isFirst,
  isLast,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
  stage,
}: {
  readonly canEdit: boolean;
  readonly index: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onChange: (stage: WorkflowStageDefinition) => void;
  readonly onMoveDown: () => void;
  readonly onMoveUp: () => void;
  readonly onRemove: () => void;
  readonly stage: WorkflowStageDefinition;
}): ReactNode {
  return (
    <section className="workflow-builder-page__stage" aria-labelledby={`stage-${index}-title`}>
      <div className="workflow-builder-page__stage-header">
        <div>
          <h3 id={`stage-${index}-title`}>{stage.sortOrder}. {stage.name}</h3>
          <p>{stage.isInitial ? "Etapă inițială" : stage.isFinal ? "Etapă finală" : "Etapă intermediară"}</p>
        </div>
        <div className="workflow-builder-page__stage-actions">
          <Button disabled={!canEdit || isFirst} onClick={onMoveUp} type="button" variant="outline">Sus</Button>
          <Button disabled={!canEdit || isLast} onClick={onMoveDown} type="button" variant="outline">Jos</Button>
          <Button disabled={!canEdit} onClick={onRemove} type="button" variant="outline">Șterge</Button>
        </div>
      </div>
      <div className="workflow-builder-page__stage-grid">
        <TextInput disabled={!canEdit} label="Key etapă" onChange={(event) => onChange({ ...stage, key: event.target.value.trim() })} value={stage.key} />
        <TextInput disabled={!canEdit} label="Nume etapă" onChange={(event) => onChange({ ...stage, name: event.target.value })} value={stage.name} />
        <NumberInput
          disabled={!canEdit}
          inputMode="numeric"
          label="Durată estimată în minute"
          onChange={(event) => onChange({ ...stage, estimatedDurationMinutes: inputToDuration(event.target.value) })}
          value={durationToInput(stage.estimatedDurationMinutes)}
        />
        <Textarea disabled={!canEdit} label="Descriere" onChange={(event) => onChange({ ...stage, description: normalizeText(event.target.value) })} value={stage.description ?? ""} />
      </div>
      <div className="workflow-builder-page__roles">
        <span>Roluri permise</span>
        <div className="workflow-builder-page__role-grid">
          {WORKFLOW_STAGE_ROLE_CODES.map((roleCode) => (
            <Checkbox
              checked={stage.allowedRoleCodes.includes(roleCode)}
              disabled={!canEdit}
              key={roleCode}
              label={roleLabels[roleCode]}
              onChange={(event) => {
                const nextRoles = event.target.checked
                  ? [...stage.allowedRoleCodes, roleCode]
                  : stage.allowedRoleCodes.filter((current) => current !== roleCode);
                onChange({ ...stage, allowedRoleCodes: nextRoles });
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowPreview({ stages }: { readonly stages: readonly WorkflowStageDefinition[] }): ReactNode {
  if (stages.length === 0) {
    return <EmptyState title="Preview gol" description="Adaugă etape în draft pentru a vedea fluxul." />;
  }

  return (
    <ol className="workflow-builder-page__preview">
      {normalizeWorkflowStagesOrder(stages).map((stage) => (
        <li key={stage.key}>
          <div>
            <strong>{stage.name}</strong>
            <span>{stage.key}</span>
          </div>
          <p>{stage.allowedRoleCodes.map((roleCode) => roleLabels[roleCode]).join(", ")}</p>
          <small>{formatWorkflowDuration(stage.estimatedDurationMinutes)}</small>
        </li>
      ))}
    </ol>
  );
}

function swap<T>(items: readonly T[], from: number, to: number): readonly T[] {
  return items.map((item, index) => {
    if (index === from) {
      return items[to] ?? item;
    }
    if (index === to) {
      return items[from] ?? item;
    }
    return item;
  });
}
