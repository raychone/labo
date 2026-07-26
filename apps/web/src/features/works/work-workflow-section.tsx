import { Button, ConfirmActionModal, ErrorState, LoadingState, StatusBadge, useToast } from "@dental-lab/ui";
import {
  formatTimelineDate,
  formatWorkflowDuration,
  getWorkflowExecutionStatusLabel,
  getWorkStageEventLabel,
  getWorkStageExecutionStatusLabel,
  type WorkWorkflowExecutionView,
} from "@dental-lab/shared";
import { useState, type ReactNode } from "react";

import { getErrorMessage } from "../../lib/form-utils.js";
import { useCompleteWorkflowStage, useStartWorkflowStage, useWorkWorkflow } from "./works-api.js";

export function WorkWorkflowSection({ isOpen, workId }: { readonly isOpen: boolean; readonly workId: string }): ReactNode {
  const toast = useToast();
  const workflowQuery = useWorkWorkflow(workId, isOpen);
  const startMutation = useStartWorkflowStage();
  const completeMutation = useCompleteWorkflowStage();
  const [pendingComplete, setPendingComplete] = useState<WorkWorkflowExecutionView | null>(null);
  const workflow = workflowQuery.data ?? null;
  const currentStage = workflow?.currentStage ?? null;

  function startCurrentStage(): void {
    if (!workflow || !currentStage) {
      return;
    }

    startMutation.mutate({
      input: {
        expectedStageVersion: currentStage.version,
        expectedWorkflowVersion: workflow.version,
      },
      stageExecutionId: currentStage.id,
      workOrderId: workId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Etapa nu a fost pornită", variant: "error" }),
      onSuccess: () => toast.showToast({ durationMs: 3000, message: "Etapa curentă a fost pornită.", variant: "success" }),
    });
  }

  function completeCurrentStage(targetWorkflow: WorkWorkflowExecutionView): void {
    const stage = targetWorkflow.currentStage;
    if (!stage) {
      return;
    }

    completeMutation.mutate({
      input: {
        expectedStageVersion: stage.version,
        expectedWorkflowVersion: targetWorkflow.version,
      },
      stageExecutionId: stage.id,
      workOrderId: workId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Etapa nu a fost finalizată", variant: "error" }),
      onSuccess: () => {
        setPendingComplete(null);
        toast.showToast({ durationMs: 3000, message: "Etapa curentă a fost finalizată.", variant: "success" });
      },
    });
  }

  if (workflowQuery.isLoading) {
    return <section className="works-page__workflow"><LoadingState text="Se încarcă fluxul lucrării" /></section>;
  }

  if (workflowQuery.isError) {
    return <section className="works-page__workflow"><ErrorState title="Fluxul nu a fost încărcat" description={getErrorMessage(workflowQuery.error)} /></section>;
  }

  if (!workflow) {
    return (
      <section className="works-page__workflow" aria-labelledby="work-workflow-title">
        <div>
          <h3 id="work-workflow-title">Flux producție</h3>
          <p className="works-page__muted">Acest tip de lucrare nu avea un flux activ la momentul înregistrării.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="works-page__workflow" aria-labelledby="work-workflow-title">
      <div className="works-page__workflow-header">
        <div>
          <h3 id="work-workflow-title">Flux producție</h3>
          <p className="works-page__muted">{workflow.workflowName} · versiunea {workflow.workflowVersion}</p>
        </div>
        <StatusBadge label={getWorkflowExecutionStatusLabel(workflow.status)} variant={workflow.status === "COMPLETED" ? "closed" : "production"} />
      </div>

      <div className="works-page__workflow-current">
        <div>
          <span className="works-page__label">Etapa curentă</span>
          <strong>{currentStage?.name ?? "Flux finalizat"}</strong>
          {currentStage ? <span>{getWorkStageExecutionStatusLabel(currentStage.status)} · {currentStage.allowedRoleLabels.join(", ")}</span> : null}
        </div>
        <div>
          <span className="works-page__label">Progres</span>
          <strong>{workflow.progress.completed}/{workflow.progress.total}</strong>
        </div>
      </div>

      {currentStage ? (
        <div className="works-page__actions">
          <Button
            disabled={!workflow.actions.canStartCurrentStage}
            isLoading={startMutation.isPending}
            onClick={startCurrentStage}
            variant="outline"
          >
            Pornește etapa
          </Button>
          <Button
            disabled={!workflow.actions.canCompleteCurrentStage}
            isLoading={completeMutation.isPending}
            onClick={() => setPendingComplete(workflow)}
          >
            Finalizează etapa
          </Button>
          {workflow.actions.reason ? <span className="works-page__muted">{workflow.actions.reason}</span> : null}
        </div>
      ) : null}

      <ol className="works-page__stage-list">
        {workflow.stages.map((stage) => (
          <li className="works-page__stage-item" data-current={stage.isCurrent ? "true" : undefined} key={stage.id}>
            <div>
              <strong>{stage.sortOrder}. {stage.name}</strong>
              <span>{getWorkStageExecutionStatusLabel(stage.status)}</span>
            </div>
            <div className="works-page__muted">
              {stage.estimatedDurationMinutes ? formatWorkflowDuration(stage.estimatedDurationMinutes) : "Fără durată estimată"}
            </div>
          </li>
        ))}
      </ol>

      <div className="works-page__timeline">
        <h4>Istoric flux</h4>
        {workflow.events.length === 0 ? <p className="works-page__muted">Nu există evenimente înregistrate.</p> : null}
        <ol>
          {workflow.events.map((event) => (
            <li key={event.id}>
              <strong>{getWorkStageEventLabel(event.type)}</strong>
              <span>{formatTimelineDate(event.occurredAt)}{event.actor ? ` · ${event.actor.displayName}` : ""}</span>
            </li>
          ))}
        </ol>
      </div>

      <ConfirmActionModal
        confirmLabel="Finalizează etapa"
        description={`Finalizezi etapa curentă${currentStage ? `: ${currentStage.name}` : ""}?`}
        isLoading={completeMutation.isPending}
        isOpen={pendingComplete !== null}
        onCancel={() => setPendingComplete(null)}
        onConfirm={() => {
          if (pendingComplete) {
            completeCurrentStage(pendingComplete);
          }
        }}
        title="Finalizezi etapa?"
      />
    </section>
  );
}
