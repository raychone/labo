import { Button, ConfirmActionModal, ErrorState, LoadingState, Select, StatusBadge, useToast } from "@dental-lab/ui";
import {
  formatTimelineDate,
  formatWorkflowDuration,
  getAssignmentStatusLabel,
  getWorkflowExecutionStatusLabel,
  getWorkStageEventLabel,
  getWorkStageExecutionStatusLabel,
  type WorkWorkflowExecutionView,
} from "@dental-lab/shared";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { useAssignWorkflowStage, useTechnicianOptions, useUnassignWorkflowStage } from "../technician-workbench/technician-workbench-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useCompleteWorkflowStage, useStartWorkflowStage, useWorkWorkflow } from "./works-api.js";

type PendingAssignmentAction = "assign" | "unassign";
const emptyAssignment = {
  assignedAt: null,
  assignedBy: null,
  assignedUser: null,
};

export function WorkWorkflowSection({ isOpen, workId }: { readonly isOpen: boolean; readonly workId: string }): ReactNode {
  const toast = useToast();
  const workflowQuery = useWorkWorkflow(workId, isOpen);
  const permissionsResult = useQuery({ enabled: isOpen, queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const startMutation = useStartWorkflowStage();
  const completeMutation = useCompleteWorkflowStage();
  const assignMutation = useAssignWorkflowStage();
  const unassignMutation = useUnassignWorkflowStage();
  const [pendingComplete, setPendingComplete] = useState<WorkWorkflowExecutionView | null>(null);
  const [pendingAssignmentAction, setPendingAssignmentAction] = useState<PendingAssignmentAction | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const workflow = workflowQuery.data ?? null;
  const currentStage = workflow?.currentStage ?? null;
  const currentAssignment = currentStage?.assignment ?? emptyAssignment;
  const canAssignStage = hasPermission(permissionsResult.data, "workflow.assign_stage");
  const canReassignStage = hasPermission(permissionsResult.data, "workflow.reassign_stage");
  const techniciansQuery = useTechnicianOptions(isOpen && canAssignStage);

  useEffect(() => {
    setSelectedTechnicianId(currentAssignment.assignedUser?.id ?? "");
  }, [currentAssignment.assignedUser?.id, currentStage?.id]);

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

  function assignCurrentStage(confirmInProgress = false): void {
    if (!workflow || !currentStage || selectedTechnicianId.length === 0) {
      return;
    }

    assignMutation.mutate({
      input: {
        confirmInProgress: confirmInProgress || undefined,
        expectedVersion: currentStage.version,
        userId: selectedTechnicianId,
      },
      stageExecutionId: currentStage.id,
      workOrderId: workId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Responsabilul nu a fost actualizat", variant: "error" }),
      onSuccess: () => {
        setPendingAssignmentAction(null);
        toast.showToast({ durationMs: 3000, message: "Responsabilul etapei a fost actualizat.", variant: "success" });
      },
    });
  }

  function unassignCurrentStage(confirmInProgress = false): void {
    if (!workflow || !currentStage) {
      return;
    }

    unassignMutation.mutate({
      input: {
        confirmInProgress: confirmInProgress || undefined,
        expectedVersion: currentStage.version,
      },
      stageExecutionId: currentStage.id,
      workOrderId: workId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Asignarea nu a fost eliminată", variant: "error" }),
      onSuccess: () => {
        setPendingAssignmentAction(null);
        toast.showToast({ durationMs: 3000, message: "Asignarea etapei a fost eliminată.", variant: "success" });
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

      {currentStage && canAssignStage ? (
        <div className="works-page__assignment">
          <div>
            <span className="works-page__label">Responsabil</span>
            <strong>{getAssignmentStatusLabel(currentAssignment)}</strong>
            {currentAssignment.assignedBy ? (
              <span className="works-page__muted">Asignat de {currentAssignment.assignedBy.displayName}</span>
            ) : null}
          </div>
          <Select
            label="Tehnician"
            onChange={(event) => setSelectedTechnicianId(event.target.value)}
            options={[
              { label: "Alege tehnician", value: "" },
              ...(techniciansQuery.data ?? []).map((technician) => ({
                label: `${technician.displayName} (${technician.activeAssignedStages} active)`,
                value: technician.id,
              })),
            ]}
            value={selectedTechnicianId}
          />
          <div className="works-page__actions">
            <Button
              disabled={
                selectedTechnicianId.length === 0
                || selectedTechnicianId === currentAssignment.assignedUser?.id
                || assignMutation.isPending
                || (currentStage.status === "IN_PROGRESS" && !canReassignStage)
              }
              isLoading={assignMutation.isPending}
              onClick={() => {
                if (currentStage.status === "IN_PROGRESS") {
                  setPendingAssignmentAction("assign");
                  return;
                }
                assignCurrentStage();
              }}
              variant="outline"
            >
              {currentAssignment.assignedUser ? "Reasignează" : "Asignează"}
            </Button>
            <Button
              disabled={!currentAssignment.assignedUser || unassignMutation.isPending || !canReassignStage}
              isLoading={unassignMutation.isPending}
              onClick={() => {
                if (currentStage.status === "IN_PROGRESS") {
                  setPendingAssignmentAction("unassign");
                  return;
                }
                unassignCurrentStage();
              }}
              variant="secondary"
            >
              Elimină asignarea
            </Button>
          </div>
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
      <ConfirmActionModal
        confirmLabel={pendingAssignmentAction === "assign" ? "Confirmă reasignarea" : "Elimină asignarea"}
        description="Etapa este deja în lucru. Istoricul de pornire rămâne păstrat, iar schimbarea va fi înregistrată în audit."
        isLoading={assignMutation.isPending || unassignMutation.isPending}
        isOpen={pendingAssignmentAction !== null}
        onCancel={() => setPendingAssignmentAction(null)}
        onConfirm={() => {
          if (pendingAssignmentAction === "assign") {
            assignCurrentStage(true);
          }
          if (pendingAssignmentAction === "unassign") {
            unassignCurrentStage(true);
          }
        }}
        title="Confirmi schimbarea responsabilului?"
        variant="primary"
      />
    </section>
  );
}
