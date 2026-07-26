import type { ScanSource, WorkPriority, WorkStatus } from "./works.js";
import type { WorkStageExecutionStatus, WorkflowExecutionStatus, WorkflowUserSummary } from "./workflow-execution.js";
import type { DeliveryPreparationGroupStatus, LogisticsLocationCode, LogisticsStatus } from "./logistics.js";

export const SCAN_ACTION_TYPES = ["OPEN_WORK", "START_STAGE", "COMPLETE_STAGE", "ASSIGN_STAGE", "REASSIGN_STAGE"] as const;
export const SCAN_DUPLICATE_WINDOW_MS = 2_000;

export type ScanActionType = (typeof SCAN_ACTION_TYPES)[number];

export interface ResolveScanInput {
  readonly payload: string;
  readonly source: ScanSource;
}

export interface ScanWorkSummary {
  readonly clinicName: string;
  readonly code: string;
  readonly doctorName: string;
  readonly id: string;
  readonly patientName: string | null;
  readonly priority: WorkPriority;
  readonly requestedDeliveryDate: string;
  readonly status: WorkStatus;
  readonly workTypeName: string;
}

export interface ScanStageSummary {
  readonly assignedUser: WorkflowUserSummary | null;
  readonly allowedRoleLabels: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly status: WorkStageExecutionStatus;
  readonly version: number;
}

export interface ScanWorkflowSummary {
  readonly currentStage: ScanStageSummary | null;
  readonly id: string;
  readonly progress: {
    readonly completed: number;
    readonly total: number;
  };
  readonly status: WorkflowExecutionStatus;
  readonly version: number;
  readonly workflowName: string;
}

export interface ScanLogisticsSummary {
  readonly activeGroup: {
    readonly code: string;
    readonly id: string;
    readonly status: DeliveryPreparationGroupStatus;
  } | null;
  readonly blockedReason: string | null;
  readonly locationCode: LogisticsLocationCode | null;
  readonly status: LogisticsStatus;
}

export interface ScanActionAvailability {
  readonly enabled: boolean;
  readonly reason: string | null;
  readonly type: ScanActionType;
}

export interface ScanContextView {
  readonly actions: readonly ScanActionAvailability[];
  readonly delivery: {
    readonly code: string;
    readonly id: string;
    readonly plannedDate: string;
    readonly status: string;
    readonly statusLabel: string;
  } | null;
  readonly logistics: ScanLogisticsSummary;
  readonly resolvedAt: string;
  readonly work: ScanWorkSummary;
  readonly workflow: ScanWorkflowSummary | null;
}

export function normalizeScanPayload(payload: string): string {
  return payload.trim();
}

export function validateScanPayloadPrefix(payload: string, prefix: string): boolean {
  return normalizeScanPayload(payload).startsWith(prefix);
}

export function isDuplicateScan(input: {
  readonly lastPayload: string | null;
  readonly nextPayload: string;
  readonly now: number;
  readonly scannedAt: number | null;
  readonly windowMs?: number;
}): boolean {
  const normalizedNext = normalizeScanPayload(input.nextPayload);
  const normalizedLast = input.lastPayload === null ? null : normalizeScanPayload(input.lastPayload);
  const windowMs = input.windowMs ?? SCAN_DUPLICATE_WINDOW_MS;

  return normalizedLast === normalizedNext && input.scannedAt !== null && input.now - input.scannedAt < windowMs;
}

export function localizeScanActionReason(reason: string | null): string | null {
  return reason;
}

export function sortScanActions(actions: readonly ScanActionAvailability[]): readonly ScanActionAvailability[] {
  const order = new Map<ScanActionType, number>(SCAN_ACTION_TYPES.map((type, index) => [type, index]));

  return [...actions].sort((left, right) => (order.get(left.type) ?? 99) - (order.get(right.type) ?? 99));
}

export function formatScanProgress(progress: ScanWorkflowSummary["progress"]): string {
  return `${progress.completed}/${progress.total} etape`;
}
