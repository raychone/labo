import type { Prisma } from "@prisma/client";

import { toWorkflowExecutionView, toWorkflowSummaryView } from "../workflow-execution/workflow-execution.view.js";
import { resolveDeadlineVisualState, type DeadlineDashboardSummary } from "./work-deadline-visual.js";

type WorkFormValue = boolean | number | readonly string[] | string | null;
type WorkFormValues = Readonly<Record<string, WorkFormValue>>;

interface WorkFormSnapshotField {
  readonly key: string;
  readonly label: string;
  readonly helpText: string | null;
  readonly type: string;
  readonly required: boolean;
  readonly sortOrder: number;
  readonly placeholder: string | null;
  readonly defaultValue: WorkFormValue;
  readonly options: readonly { readonly label: string; readonly value: string }[];
  readonly validation: Readonly<Record<string, number | string>>;
}

interface WorkFormSchemaSnapshot {
  readonly fields: readonly WorkFormSnapshotField[];
}

export interface WorkFormSubmissionView {
  readonly fields: readonly WorkFormSnapshotField[];
  readonly submittedAt: string;
  readonly templateId: string | null;
  readonly templateKind?: string;
  readonly templateName: string;
  readonly templateVersion: number;
  readonly updatedAt: string;
  readonly values: WorkFormValues;
}

export type WorkOrderRecord = Prisma.WorkOrderGetPayload<{
  include: {
    assignedTechnician: {
      select: {
        displayName: true;
        id: true;
        preferredColor: true;
      };
    };
    assignmentEvents: {
      include: {
        actor: {
          select: {
            displayName: true;
            id: true;
            preferredColor: true;
          };
        };
        newLegalEntity: {
          select: {
            code: true;
            displayName: true;
          };
        };
        newTechnician: {
          select: {
            displayName: true;
            id: true;
            preferredColor: true;
          };
        };
        previousLegalEntity: {
          select: {
            code: true;
            displayName: true;
          };
        };
        previousTechnician: {
          select: {
            displayName: true;
            id: true;
            preferredColor: true;
          };
        };
      };
      orderBy: {
        createdAt: "desc";
      };
      take: 20;
    };
    clinic: true;
    doctor: true;
    executionLegalEntity: {
      select: {
        code: true;
        displayName: true;
      };
    };
    activeCycle: {
      include: {
        executionSnapshot: {
          include: {
            executionLegalEntity: {
              select: {
                code: true;
                displayName: true;
                id: true;
              };
            };
            technician: {
              select: {
                displayName: true;
                id: true;
                preferredColor: true;
              };
            };
          };
        };
        logisticsState: {
          select: {
            status: true;
          };
        };
        workflowExecution: {
          include: {
            events: {
              include: {
                actor: {
                  select: {
                    displayName: true;
                    id: true;
                    preferredColor: true;
                  };
                };
              };
            };
            stages: {
              include: {
                completedBy: {
                  select: {
                    displayName: true;
                    id: true;
                    preferredColor: true;
                  };
                };
                startedBy: {
                  select: {
                    displayName: true;
                    id: true;
                    preferredColor: true;
                  };
                };
                assignedBy: {
                  select: {
                    displayName: true;
                    id: true;
                    preferredColor: true;
                  };
                };
                assignedUser: {
                  select: {
                    displayName: true;
                    email: true;
                    id: true;
                    preferredColor: true;
                  };
                };
              };
              orderBy: {
                sortOrder: "asc";
              };
            };
          };
        };
      };
    };
    patient: true;
    workFormSubmissions: {
      where: {
        templateKind: "GENERIC";
      };
      take: 1;
      orderBy: {
        createdAt: "desc";
      };
    };
    workType: true;
  };
}>;

export interface WorkClaimAccessViewInput {
  readonly canClaim: boolean;
  readonly canReassign: boolean;
  readonly canReleaseAny: boolean;
  readonly canReleaseOwn: boolean;
  readonly userId: string;
}

export interface WorkTypeFormOptionView {
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly unit: string;
}

export interface WorkSummaryView {
  readonly clinic: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
  readonly code: string;
  readonly claim: WorkClaimView;
  readonly createdAt: string;
  readonly currency: string | null;
  readonly deadline: WorkDeadlineView;
  readonly doctor: {
    readonly displayName: string;
    readonly id: string;
  };
  readonly id: string;
  readonly invoicedDocumentId: string | null;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly patient: {
    readonly firstName: string;
    readonly birthDate: string | null;
    readonly fullName: string;
    readonly id: string;
    readonly lastName: string;
    readonly sex: import("@prisma/client").PatientSex | null;
  } | null;
  readonly priority: string;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: string;
  readonly totalPriceMinor: number | null;
  readonly executionSnapshot: ExecutionSnapshotView;
  readonly updatedAt: string;
  readonly workflow: ReturnType<typeof toWorkflowSummaryView>;
  readonly workType: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
    readonly symbol: string;
  };
}

export interface WorkClaimView {
  readonly canCurrentUserClaim: boolean;
  readonly canCurrentUserReassign: boolean;
  readonly canCurrentUserRelease: boolean;
  readonly claimedAt: string | null;
  readonly executionLegalEntity: { readonly code: string; readonly displayName: string } | null;
  readonly releasedAt: string | null;
  readonly releaseReason: string | null;
  readonly revision: number;
  readonly source: string | null;
  readonly status: string;
  readonly technician: { readonly displayName: string; readonly preferredColor: string | null; readonly publicId: string } | null;
}

export interface WorkAssignmentEventView {
  readonly actor: { readonly displayName: string; readonly preferredColor: string | null; readonly publicId: string };
  readonly createdAt: string;
  readonly eventType: string;
  readonly id: string;
  readonly newLegalEntity: { readonly code: string; readonly displayName: string } | null;
  readonly newTechnician: { readonly displayName: string; readonly preferredColor: string | null; readonly publicId: string } | null;
  readonly previousLegalEntity: { readonly code: string; readonly displayName: string } | null;
  readonly previousTechnician: { readonly displayName: string; readonly preferredColor: string | null; readonly publicId: string } | null;
  readonly reason: string | null;
  readonly revision: number;
  readonly executionSnapshot: {
    readonly status: string | null;
    readonly version: number | null;
  };
}

export interface WorkDeadlineView {
  readonly badge: string;
  readonly calculatedAt: string | null;
  readonly calculatedDueAt: string | null;
  readonly color: string;
  readonly countdown: string;
  readonly effectiveDueAt: string | null;
  readonly executionDays: number | null;
  readonly explanation: string | null;
  readonly includeStartDay: boolean | null;
  readonly isLocked: boolean;
  readonly manualDueAt: string | null;
  readonly mode: string | null;
  readonly reasonCode: string | null;
  readonly revision: number;
  readonly source: string | null;
  readonly status: string;
  readonly startAt: string | null;
  readonly tooltip: string;
  readonly timezone: string | null;
}

export interface WorkDetailView extends Omit<WorkSummaryView, "workflow"> {
  readonly assignmentHistory: readonly WorkAssignmentEventView[];
  readonly baseUnitPriceMinor: number | null;
  readonly clinicalNotes: string | null;
  readonly createdByUserId: string | null;
  readonly externalReference: string | null;
  readonly internalNotes: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
  readonly workflow: ReturnType<typeof toWorkflowExecutionView> | null;
  readonly workForm: WorkFormSubmissionView | null;
}

export interface WorkCycleView {
  readonly id: string;
  readonly cycleNumber: number;
  readonly reason: string;
  readonly reasonNotes: string | null;
  readonly status: string;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly createdBy: { readonly displayName: string; readonly publicId: string } | null;
  readonly clinic: { readonly code: string; readonly id: string; readonly name: string };
  readonly doctor: { readonly displayName: string; readonly id: string } | null;
  readonly executionCompany: { readonly code: string; readonly displayName: string } | null;
  readonly workflow: { readonly id: string | null; readonly status: string | null };
  readonly logistics: { readonly id: string | null; readonly status: string | null };
  readonly delivery: { readonly activePreparationItemCount: number };
  readonly deadline: { readonly effectiveDueAt: string | null; readonly mode: string | null; readonly snapshot: unknown | null };
  readonly executionSnapshot: { readonly snapshot: unknown | null; readonly status: string | null; readonly version: number | null };
  readonly pricingSnapshot: unknown | null;
}

export interface WorkCyclesHistoryView {
  readonly activeCycleId: string | null;
  readonly cycles: readonly WorkCycleView[];
  readonly work: {
    readonly clinicId: string;
    readonly code: string;
    readonly doctorId: string;
    readonly id: string;
    readonly patientId: string | null;
    readonly patientName: string;
  };
}

export const workCycleHistoryInclude = {
  activeCycle: {
    select: {
      id: true,
    },
  },
  cycles: {
    include: {
      createdBy: {
        select: {
          displayName: true,
          id: true,
        },
      },
      clinic: {
        select: {
          code: true,
          id: true,
          name: true,
        },
      },
      deliveryPreparationItems: {
        select: {
          id: true,
        },
        where: {
          isActive: true,
        },
      },
      doctor: {
        select: {
          displayName: true,
          id: true,
        },
      },
      executionSnapshot: {
        select: {
          status: true,
          version: true,
        },
      },
      logisticsState: {
        select: {
          id: true,
          status: true,
        },
      },
      workflowExecution: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      cycleNumber: "asc",
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

export type WorkCycleHistoryRecord = Prisma.WorkOrderGetPayload<{ include: typeof workCycleHistoryInclude }>;

export interface ExecutionSnapshotSummaryView {
  readonly createdAt: string | null;
  readonly exists: boolean;
  readonly legalEntity: { readonly code: string; readonly displayName: string; readonly publicId: string } | null;
  readonly lockedAt: string | null;
  readonly status: "INVALID" | "LOCKED" | "NOT_CREATED";
  readonly version: number | null;
}

export interface ExecutionPricingSnapshotView {
  readonly currency: string;
  readonly explanation: string | null;
  readonly quantity: number | string | null;
  readonly sourceLabel: string | null;
  readonly sourceType: string | null;
  readonly totalMinor: number | null;
  readonly unit: string | null;
  readonly unitPriceMinor: number | null;
}

export interface ExecutionDeadlineSnapshotView {
  readonly effectiveDueAt: string | null;
  readonly executionDays: number | null;
  readonly explanation: string | null;
  readonly mode: string;
  readonly startAt: string | null;
  readonly timezone: string | null;
}

export interface ExecutionSnapshotView {
  readonly currentTechnician: { readonly displayName: string; readonly preferredColor: string | null; readonly publicId: string } | null;
  readonly deadline: ExecutionDeadlineSnapshotView | null;
  readonly originalTechnician: { readonly displayName: string; readonly preferredColor: string | null; readonly publicId: string } | null;
  readonly pricing: ExecutionPricingSnapshotView | null;
  readonly summary: ExecutionSnapshotSummaryView;
}

export function createWorkClaimAccess(input: Partial<WorkClaimAccessViewInput> & { readonly userId: string }): WorkClaimAccessViewInput {
  return {
    canClaim: input.canClaim ?? false,
    canReassign: input.canReassign ?? false,
    canReleaseAny: input.canReleaseAny ?? false,
    canReleaseOwn: input.canReleaseOwn ?? false,
    userId: input.userId,
  };
}

export interface PaginatedWorksView {
  readonly deadlineDashboard: DeadlineDashboardSummary;
  readonly items: readonly WorkSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toWorkTypeFormOptionView(workType: { readonly code: string; readonly id: string; readonly name: string; readonly symbol: string; readonly unit: string }): WorkTypeFormOptionView {
  return {
    code: workType.code,
    id: workType.id,
    name: workType.name,
    symbol: workType.symbol,
    unit: workType.unit,
  };
}

export function toWorkSummaryView(workOrder: WorkOrderRecord, includePricing: boolean, access: WorkClaimAccessViewInput): WorkSummaryView {
  return {
    clinic: {
      code: workOrder.clinic.code,
      id: workOrder.clinic.id,
      name: workOrder.clinic.name,
    },
    code: workOrder.code,
    claim: toWorkClaimView(workOrder, access),
    createdAt: workOrder.createdAt.toISOString(),
    currency: includePricing ? workOrder.currency : null,
    deadline: toWorkDeadlineView(workOrder),
    doctor: {
      displayName: workOrder.doctor.displayName,
      id: workOrder.doctor.id,
    },
    id: workOrder.id,
    invoicedDocumentId: workOrder.invoicedDocumentId,
    patientName: workOrder.patientName,
    patientReference: workOrder.patientReference,
    patient: workOrder.patient
      ? {
          firstName: workOrder.patient.firstName,
          birthDate: workOrder.patient.birthDate?.toISOString() ?? null,
          fullName: `${workOrder.patient.firstName} ${workOrder.patient.lastName}`.trim(),
          id: workOrder.patient.id,
          lastName: workOrder.patient.lastName,
          sex: workOrder.patient.sex,
        }
      : null,
    priority: workOrder.priority,
    quantity: workOrder.quantity,
    requestedDeliveryDate: workOrder.requestedDeliveryDate.toISOString(),
    status: workOrder.status,
    totalPriceMinor: includePricing ? workOrder.totalPriceMinor : null,
    executionSnapshot: toExecutionSnapshotView(workOrder, includePricing),
    updatedAt: workOrder.updatedAt.toISOString(),
    workflow: toWorkflowSummaryView(workOrder.activeCycle?.workflowExecution ?? null),
    workType: {
      code: workOrder.workType.code,
      id: workOrder.workType.id,
      name: workOrder.workType.name,
      symbol: workOrder.workType.symbol,
    },
  };
}

function toWorkClaimView(workOrder: WorkOrderRecord, access: WorkClaimAccessViewInput): WorkClaimView {
  const isOwnClaim = workOrder.assignedTechnicianId === access.userId;

  return {
    canCurrentUserClaim: access.canClaim && workOrder.claimStatus === "UNCLAIMED",
    canCurrentUserReassign: access.canReassign,
    canCurrentUserRelease: workOrder.claimStatus === "CLAIMED" && (access.canReleaseAny || (access.canReleaseOwn && isOwnClaim)),
    claimedAt: workOrder.claimedAt?.toISOString() ?? null,
    executionLegalEntity: workOrder.executionLegalEntity
      ? {
          code: workOrder.executionLegalEntity.code,
          displayName: workOrder.executionLegalEntity.displayName,
        }
      : null,
    releasedAt: workOrder.releasedAt?.toISOString() ?? null,
    releaseReason: workOrder.releaseReason,
    revision: workOrder.claimRevision,
    source: workOrder.claimSource,
    status: workOrder.claimStatus,
    technician: workOrder.assignedTechnician
      ? {
          displayName: workOrder.assignedTechnician.displayName,
          preferredColor: workOrder.assignedTechnician.preferredColor,
          publicId: workOrder.assignedTechnician.id,
        }
      : null,
  };
}

export function toWorkAssignmentEventView(event: WorkOrderRecord["assignmentEvents"][number]): WorkAssignmentEventView {
  return {
    actor: {
      displayName: event.actor.displayName,
      preferredColor: event.actor.preferredColor,
      publicId: event.actor.id,
    },
    createdAt: event.createdAt.toISOString(),
    eventType: event.eventType,
    id: event.id,
    newLegalEntity: event.newLegalEntity ? { code: event.newLegalEntity.code, displayName: event.newLegalEntity.displayName } : null,
    newTechnician: event.newTechnician ? { displayName: event.newTechnician.displayName, preferredColor: event.newTechnician.preferredColor, publicId: event.newTechnician.id } : null,
    previousLegalEntity: event.previousLegalEntity ? { code: event.previousLegalEntity.code, displayName: event.previousLegalEntity.displayName } : null,
    previousTechnician: event.previousTechnician ? { displayName: event.previousTechnician.displayName, preferredColor: event.previousTechnician.preferredColor, publicId: event.previousTechnician.id } : null,
    reason: event.reason,
    revision: event.revision,
    executionSnapshot: {
      status: event.executionSnapshotStatus,
      version: event.executionSnapshotVersion,
    },
  };
}

function toWorkDeadlineView(workOrder: WorkOrderRecord): WorkDeadlineView {
  const effectiveDueAt = workOrder.effectiveDueAt?.toISOString() ?? null;
  const visual = resolveDeadlineVisualState({
    effectiveDueAt,
    mode: workOrder.deadlineMode,
    now: new Date().toISOString(),
  });

  return {
    badge: visual.badge,
    calculatedAt: workOrder.deadlineCalculatedAt?.toISOString() ?? null,
    calculatedDueAt: workOrder.calculatedDueAt?.toISOString() ?? null,
    color: visual.color,
    countdown: visual.countdown,
    effectiveDueAt: workOrder.effectiveDueAt?.toISOString() ?? null,
    executionDays: workOrder.deadlineExecutionDays,
    explanation: workOrder.deadlineExplanation,
    includeStartDay: workOrder.deadlineIncludeStartDay,
    isLocked: workOrder.deadlineLockedAt !== null,
    manualDueAt: workOrder.manualDueAt?.toISOString() ?? null,
    mode: workOrder.deadlineMode,
    reasonCode: workOrder.deadlineReasonCode,
    revision: workOrder.deadlineRevision,
    source: workOrder.deadlineSource,
    status: visual.state,
    startAt: workOrder.deadlineStartAt?.toISOString() ?? null,
    tooltip: visual.tooltip,
    timezone: workOrder.deadlineTimezone,
  };
}

function toExecutionSnapshotView(workOrder: WorkOrderRecord, includePricing: boolean): ExecutionSnapshotView {
  const snapshot = workOrder.activeCycle?.executionSnapshot ?? null;

  if (!snapshot) {
    return {
      currentTechnician: workOrder.assignedTechnician
        ? { displayName: workOrder.assignedTechnician.displayName, preferredColor: workOrder.assignedTechnician.preferredColor, publicId: workOrder.assignedTechnician.id }
        : null,
      deadline: null,
      originalTechnician: null,
      pricing: null,
      summary: {
        createdAt: null,
        exists: false,
        legalEntity: null,
        lockedAt: null,
        status: "NOT_CREATED",
        version: null,
      },
    };
  }

  return {
    currentTechnician: workOrder.assignedTechnician
      ? { displayName: workOrder.assignedTechnician.displayName, preferredColor: workOrder.assignedTechnician.preferredColor, publicId: workOrder.assignedTechnician.id }
      : null,
    deadline: {
      effectiveDueAt: snapshot.deadlineEffectiveDueAt?.toISOString() ?? null,
      executionDays: snapshot.deadlineExecutionDays,
      explanation: snapshot.deadlineExplanation,
      mode: snapshot.deadlineMode,
      startAt: snapshot.deadlineStartAt?.toISOString() ?? null,
      timezone: snapshot.deadlineTimezone,
    },
    originalTechnician: {
      displayName: snapshot.technician.displayName,
      preferredColor: null,
      publicId: snapshot.technician.id,
    },
    pricing: includePricing
      ? {
          currency: snapshot.pricingCurrency,
          explanation: getPricingSnapshotExplanation(snapshot.pricingSnapshotJson),
          quantity: snapshot.pricingQuantity?.toString() ?? null,
          sourceLabel: snapshot.pricingSourceLabel,
          sourceType: snapshot.pricingSourceType,
          totalMinor: snapshot.pricingTotalMinor,
          unit: snapshot.pricingUnit,
          unitPriceMinor: snapshot.pricingUnitPriceMinor,
        }
      : null,
    summary: {
      createdAt: snapshot.snapshotCreatedAt.toISOString(),
      exists: true,
      legalEntity: {
        code: snapshot.executionLegalEntity.code,
        displayName: snapshot.executionLegalEntity.displayName,
        publicId: snapshot.executionLegalEntity.id,
      },
      lockedAt: snapshot.snapshotLockedAt?.toISOString() ?? null,
      status: snapshot.status,
      version: snapshot.version,
    },
  };
}

function getPricingSnapshotExplanation(value: Prisma.JsonValue): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const explanation = value.explanation;
  return typeof explanation === "string" ? explanation : null;
}

export function toWorkDetailView(workOrder: WorkOrderRecord, includePricing: boolean, access: WorkClaimAccessViewInput): WorkDetailView {
  return {
    ...toWorkSummaryView(workOrder, includePricing, access),
    assignmentHistory: workOrder.assignmentEvents.map(toWorkAssignmentEventView),
    baseUnitPriceMinor: includePricing ? workOrder.baseUnitPriceMinor : null,
    clinicalNotes: workOrder.clinicalNotes,
    createdByUserId: workOrder.createdByUserId,
    externalReference: workOrder.externalReference,
    internalNotes: workOrder.internalNotes,
    updatedByUserId: workOrder.updatedByUserId,
    version: workOrder.version,
    workflow: workOrder.activeCycle?.workflowExecution
      ? toWorkflowExecutionView(workOrder.activeCycle.workflowExecution, {
          canCompleteCurrentStage: false,
          canStartCurrentStage: false,
          reason: "Acțiunile se verifică pe endpointul dedicat de workflow.",
        })
      : null,
    workForm: toWorkFormSubmissionView(workOrder.workFormSubmissions?.[0] ?? null),
  };
}

export function toWorkCyclesHistoryView(workOrder: WorkCycleHistoryRecord, includePricing: boolean): WorkCyclesHistoryView {
  return {
    activeCycleId: workOrder.activeCycle?.id ?? null,
    cycles: workOrder.cycles.map((cycle) => ({
      closedAt: cycle.closedAt?.toISOString() ?? null,
      createdBy: cycle.createdBy ? { displayName: cycle.createdBy.displayName, publicId: cycle.createdBy.id } : null,
      cycleNumber: cycle.cycleNumber,
      clinic: {
        code: cycle.clinic.code,
        id: cycle.clinic.id,
        name: cycle.clinic.name,
      },
      deadline: {
        effectiveDueAt: cycle.deadlineEffectiveDueAtSnapshot?.toISOString() ?? null,
        mode: cycle.deadlineModeSnapshot,
        snapshot: includePricing ? cycle.deadlineSnapshotJson : null,
      },
      delivery: {
        activePreparationItemCount: cycle.deliveryPreparationItems.length,
      },
      doctor: cycle.doctor ? { displayName: cycle.doctor.displayName, id: cycle.doctor.id } : null,
      executionCompany: cycle.executionLegalEntityCodeSnapshot && cycle.executionLegalEntityNameSnapshot
        ? { code: cycle.executionLegalEntityCodeSnapshot, displayName: cycle.executionLegalEntityNameSnapshot }
        : null,
      executionSnapshot: {
        snapshot: includePricing ? cycle.executionSnapshotJson : null,
        status: cycle.executionSnapshot?.status ?? null,
        version: cycle.executionSnapshot?.version ?? cycle.executionSnapshotVersion,
      },
      id: cycle.id,
      logistics: {
        id: cycle.logisticsState?.id ?? null,
        status: cycle.logisticsState?.status ?? null,
      },
      openedAt: cycle.openedAt.toISOString(),
      pricingSnapshot: includePricing ? cycle.pricingSnapshotJson : null,
      reason: cycle.reason,
      reasonNotes: cycle.reasonNotes,
      status: cycle.status,
      workflow: {
        id: cycle.workflowExecution?.id ?? null,
        status: cycle.workflowExecution?.status ?? null,
      },
    })),
    work: {
      clinicId: workOrder.clinicId,
      code: workOrder.code,
      doctorId: workOrder.doctorId,
      id: workOrder.id,
      patientId: workOrder.patientId,
      patientName: workOrder.patientName,
    },
  };
}

function toWorkFormSubmissionView(submission: WorkOrderRecord["workFormSubmissions"][number] | null): WorkFormSubmissionView | null {
  if (!submission) {
    return null;
  }

  const snapshot = submission.schemaSnapshot as unknown as WorkFormSchemaSnapshot;
  const values = submission.values as unknown as WorkFormValues;

  return {
    fields: [...snapshot.fields].sort((left, right) => left.sortOrder - right.sortOrder),
    submittedAt: submission.submittedAt.toISOString(),
    templateId: submission.templateId,
    templateKind: submission.templateKind,
    templateName: submission.templateNameSnapshot,
    templateVersion: submission.templateVersion,
    updatedAt: submission.updatedAt.toISOString(),
    values,
  };
}
