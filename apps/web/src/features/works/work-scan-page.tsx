import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorState, LoadingState, Modal, Select, StatusBadge, useToast } from "@dental-lab/ui";
import {
  formatScanProgress,
  getWorkStageExecutionStatusLabel,
  isDuplicateScan,
  LOGISTICS_LOCATION_LABELS,
  LOGISTICS_STATUS_LABELS,
  type ScanActionAvailability,
  type ScanActionType,
  type ScanContextView,
  type ScanSource,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { useTechnicianOptions, useAssignWorkflowStage } from "../technician-workbench/technician-workbench-api.js";
import { hasPermission } from "../users/users-api.js";
import { CameraScanner } from "./camera-scanner.js";
import { ManualScanForm } from "./manual-scan-form.js";
import { useRecordScanWorkOpened, useResolveOperationalScan } from "./scan-api.js";
import { useCompleteWorkflowStage, useStartWorkflowStage } from "./works-api.js";
import "./work-scan-page.css";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Acțiunea a eșuat.";
}

export function WorkScanPage(): ReactNode {
  const navigate = useNavigate();
  const toast = useToast();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canScan = hasPermission(permissionsQuery.data, "scan.use");
  const resolveMutation = useResolveOperationalScan();
  const startMutation = useStartWorkflowStage();
  const completeMutation = useCompleteWorkflowStage();
  const assignMutation = useAssignWorkflowStage();
  const openedMutation = useRecordScanWorkOpened();
  const [scanContext, setScanContext] = useState<ScanContextView | null>(null);
  const [pendingAction, setPendingAction] = useState<ScanActionType | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const lastScanRef = useRef<{ readonly payload: string; readonly scannedAt: number; readonly source: ScanSource } | null>(null);
  const technicianOptionsQuery = useTechnicianOptions(
    (pendingAction === "ASSIGN_STAGE" || pendingAction === "REASSIGN_STAGE") && hasPermission(permissionsQuery.data, "technician.workload.read"),
  );

  function resolvePayload(payload: string, source: ScanSource): void {
    if (resolveMutation.isPending) {
      return;
    }
    const now = Date.now();
    if (isDuplicateScan({ lastPayload: lastScanRef.current?.payload ?? null, nextPayload: payload, now, scannedAt: lastScanRef.current?.scannedAt ?? null })) {
      return;
    }
    lastScanRef.current = { payload, scannedAt: now, source };

    resolveMutation.mutate({ payload, source }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost găsită", variant: "error" }),
      onSuccess: (result) => {
        setScanContext(result);
        toast.showToast({ durationMs: 3500, message: `Lucrare ${result.work.code} găsită.`, variant: "success" });
      },
    });
  }

  async function refreshScanContext(): Promise<void> {
    const lastScan = lastScanRef.current;
    if (!lastScan) {
      return;
    }
    const nextContext = await resolveMutation.mutateAsync({ payload: lastScan.payload, source: lastScan.source });
    setScanContext(nextContext);
  }

  async function executePendingAction(): Promise<void> {
    const workflow = scanContext?.workflow;
    const stage = workflow?.currentStage;
    if (!scanContext || !workflow || !stage || pendingAction === null) {
      return;
    }
    try {
      if (pendingAction === "START_STAGE") {
        await startMutation.mutateAsync({
          input: { expectedStageVersion: stage.version, expectedWorkflowVersion: workflow.version, source: "scan" },
          stageExecutionId: stage.id,
          workOrderId: scanContext.work.id,
        });
      }
      if (pendingAction === "COMPLETE_STAGE") {
        await completeMutation.mutateAsync({
          input: { expectedStageVersion: stage.version, expectedWorkflowVersion: workflow.version, source: "scan" },
          stageExecutionId: stage.id,
          workOrderId: scanContext.work.id,
        });
      }
      if (pendingAction === "ASSIGN_STAGE" || pendingAction === "REASSIGN_STAGE") {
        await assignMutation.mutateAsync({
          input: {
            confirmInProgress: stage.status === "IN_PROGRESS",
            expectedVersion: stage.version,
            source: "scan",
            userId: selectedTechnicianId,
          },
          stageExecutionId: stage.id,
          workOrderId: scanContext.work.id,
        });
      }
      setPendingAction(null);
      setSelectedTechnicianId("");
      await refreshScanContext();
      toast.showToast({ message: "Contextul scanării a fost actualizat.", variant: "success" });
    } catch (error) {
      await refreshScanContext().catch(() => undefined);
      toast.showToast({
        message: getErrorMessage(error),
        title: "Acțiunea nu a putut fi finalizată",
        variant: "error",
      });
    }
  }

  async function openWork(): Promise<void> {
    if (!scanContext) {
      return;
    }
    await openedMutation.mutateAsync(scanContext.work.id).catch(() => undefined);
    navigate(`/works?workId=${scanContext.work.id}`);
  }

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Se încarcă scannerul" /></PageState>;
  }

  if (!canScan) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea scan.use." /></PageState>;
  }

  return (
    <main className="work-scan-page">
      <section className="dl-container work-scan-page__layout" aria-labelledby="scan-title">
        <header className="work-scan-page__header">
          <div>
            <h1 id="scan-title">Scanează lucrare</h1>
            <p>Rezolvă QR-ul în context operațional și execută doar acțiunile permise de server.</p>
          </div>
          <Link className="dl-button dl-button--outline dl-button--medium" to="/works">
            <span className="dl-button__content">
              <span>Înapoi la lucrări</span>
            </span>
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Camera</CardTitle>
            <CardDescription>Scanează un QR de lucrare cu browser compatibil.</CardDescription>
          </CardHeader>
          <CardContent>
            <CameraScanner onDetected={(payload) => resolvePayload(payload, "camera")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Căutare manuală</CardTitle>
            <CardDescription>Fallback pentru desktop, cameră refuzată sau QR deteriorat.</CardDescription>
          </CardHeader>
          <CardContent>
            <ManualScanForm isLoading={resolveMutation.isPending} onSubmit={(payload) => resolvePayload(payload, "manual")} />
          </CardContent>
        </Card>

        {scanContext ? (
          <ScanResult
            context={scanContext}
            isOpening={openedMutation.isPending}
            onAction={setPendingAction}
            onOpenWork={() => void openWork()}
          />
        ) : null}
        <ActionModal
          actionType={pendingAction}
          context={scanContext}
          isLoading={startMutation.isPending || completeMutation.isPending || assignMutation.isPending || resolveMutation.isPending}
          onConfirm={() => void executePendingAction()}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setPendingAction(null);
              setSelectedTechnicianId("");
            }
          }}
          selectedTechnicianId={selectedTechnicianId}
          technicianOptions={technicianOptionsQuery.data ?? []}
          onTechnicianChange={setSelectedTechnicianId}
        />
      </section>
    </main>
  );
}

function ScanResult({
  context,
  isOpening,
  onAction,
  onOpenWork,
}: {
  readonly context: ScanContextView;
  readonly isOpening: boolean;
  readonly onAction: (actionType: ScanActionType) => void;
  readonly onOpenWork: () => void;
}): ReactNode {
  const stage = context.workflow?.currentStage ?? null;
  const openAction = context.actions.find((action) => action.type === "OPEN_WORK");
  const workflowActions = context.actions.filter((action) => action.type !== "OPEN_WORK");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lucrare găsită</CardTitle>
        <CardDescription>{context.work.code}</CardDescription>
      </CardHeader>
      <CardContent className="work-scan-page__result">
        <div className="work-scan-page__result-summary">
          <StatusBadge label="Înregistrată" variant="registered" />
          <div>
            <strong>{context.work.patientName ?? context.work.code}</strong>
            <p>{context.work.clinicName} · {context.work.doctorName}</p>
            <p>{context.work.workTypeName}</p>
          </div>
        </div>
        {context.workflow ? (
          <div className="work-scan-page__workflow">
            <div>
              <span>Flux</span>
              <strong>{context.workflow.workflowName}</strong>
              <p>{formatScanProgress(context.workflow.progress)}</p>
            </div>
            <div>
              <span>Etapa curentă</span>
              <strong>{stage?.name ?? "Fără etapă curentă"}</strong>
              <p>{stage ? getWorkStageExecutionStatusLabel(stage.status) : "Flux finalizat"}</p>
            </div>
            <div>
              <span>Responsabil</span>
              <strong>{stage?.assignedUser?.displayName ?? "Neasignat"}</strong>
              <p>{stage?.allowedRoleLabels.join(", ") ?? "Nu există roluri active"}</p>
            </div>
          </div>
        ) : (
          <p>Lucrarea nu are flux operațional activ.</p>
        )}
        <div className="work-scan-page__workflow">
          {context.delivery ? (
            <div>
              <span>Livrare</span>
              <strong>{context.delivery.code}</strong>
              <p>{context.delivery.statusLabel}</p>
            </div>
          ) : null}
          <div>
            <span>Logistică</span>
            <strong>{LOGISTICS_STATUS_LABELS[context.logistics.status]}</strong>
            <p>{context.logistics.locationCode ? LOGISTICS_LOCATION_LABELS[context.logistics.locationCode] : "Locație necompletată"}</p>
          </div>
          <div>
            <span>Grup pregătire</span>
            <strong>{context.logistics.activeGroup?.code ?? "Fără grup"}</strong>
            <p>{context.logistics.activeGroup?.status ?? "Pregătirea internă nu este începută"}</p>
          </div>
          <div>
            <span>Blocare</span>
            <strong>{context.logistics.blockedReason ?? "Fără blocare"}</strong>
            <p>Acțiunile logistice se confirmă separat.</p>
          </div>
        </div>
        <div className="work-scan-page__actions">
          <Button disabled={!openAction?.enabled} isLoading={isOpening} onClick={onOpenWork} variant="outline">
            Deschide lucrarea
          </Button>
          {context.delivery ? (
            <Button onClick={() => window.location.assign(`/deliveries?deliveryId=${encodeURIComponent(context.delivery?.id ?? "")}`)} variant="outline">
              Deschide livrarea
            </Button>
          ) : null}
          {workflowActions.map((action) => (
            <Button disabled={!action.enabled} key={action.type} onClick={() => onAction(action.type)} variant={action.enabled ? "primary" : "secondary"}>
              {getActionLabel(action.type)}
            </Button>
          ))}
        </div>
        <ActionReasons actions={context.actions} />
      </CardContent>
    </Card>
  );
}

function ActionReasons({ actions }: { readonly actions: readonly ScanActionAvailability[] }): ReactNode {
  const disabledActions = actions.filter((action) => !action.enabled && action.reason);
  if (disabledActions.length === 0) {
    return null;
  }

  return (
    <ul className="work-scan-page__reasons">
      {disabledActions.map((action) => (
        <li key={action.type}>{getActionLabel(action.type)}: {action.reason}</li>
      ))}
    </ul>
  );
}

function ActionModal({
  actionType,
  context,
  isLoading,
  onConfirm,
  onOpenChange,
  onTechnicianChange,
  selectedTechnicianId,
  technicianOptions,
}: {
  readonly actionType: ScanActionType | null;
  readonly context: ScanContextView | null;
  readonly isLoading: boolean;
  readonly onConfirm: () => void;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onTechnicianChange: (technicianId: string) => void;
  readonly selectedTechnicianId: string;
  readonly technicianOptions: readonly { readonly displayName: string; readonly id: string }[];
}): ReactNode {
  const requiresTechnician = actionType === "ASSIGN_STAGE" || actionType === "REASSIGN_STAGE";
  const stage = context?.workflow?.currentStage ?? null;
  const canConfirm = actionType !== null && (!requiresTechnician || selectedTechnicianId.length > 0);

  return (
    <Modal
      footer={(
        <>
          <Button onClick={() => onOpenChange(false)} variant="secondary">Renunță</Button>
          <Button disabled={!canConfirm} isLoading={isLoading} onClick={onConfirm}>Confirmă</Button>
        </>
      )}
      isOpen={actionType !== null}
      onOpenChange={onOpenChange}
      title={actionType ? getActionLabel(actionType) : "Confirmare"}
    >
      <div className="work-scan-page__modal-body">
        <p>Lucrare {context?.work.code}. Etapa curentă: {stage?.name ?? "fără etapă"}.</p>
        {requiresTechnician ? (
          <Select
            disabled={isLoading}
            label="Tehnician responsabil"
            onChange={(event) => onTechnicianChange(event.target.value)}
            options={technicianOptions.map((technician) => ({ label: technician.displayName, value: technician.id }))}
            placeholder="Alege tehnician"
            required
            value={selectedTechnicianId}
          />
        ) : null}
      </div>
    </Modal>
  );
}

function getActionLabel(actionType: ScanActionType): string {
  const labels: Record<ScanActionType, string> = {
    ASSIGN_STAGE: "Asignează etapa",
    COMPLETE_STAGE: "Finalizează etapa",
    OPEN_WORK: "Deschide lucrarea",
    REASSIGN_STAGE: "Schimbă responsabilul",
    START_STAGE: "Începe etapa",
  };

  return labels[actionType];
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="work-scan-page">
      <section className="dl-container work-scan-page__layout">{children}</section>
    </main>
  );
}
