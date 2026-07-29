import type { Prisma } from "@prisma/client";

import { toWorkflowExecutionView, toWorkflowSummaryView } from "../workflow-execution/workflow-execution.view.js";

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
  readonly templateName: string;
  readonly templateVersion: number;
  readonly updatedAt: string;
  readonly values: WorkFormValues;
}

export type WorkOrderRecord = Prisma.WorkOrderGetPayload<{
  include: {
    clinic: true;
    doctor: true;
    patient: true;
    workFormSubmission: true;
    workType: true;
    workflowExecution: {
      include: {
        events: {
          include: {
            actor: {
              select: {
                displayName: true;
                id: true;
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
              };
            };
            startedBy: {
              select: {
                displayName: true;
                id: true;
              };
            };
            assignedBy: {
              select: {
                displayName: true;
                id: true;
              };
            };
            assignedUser: {
              select: {
                displayName: true;
                email: true;
                id: true;
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
}>;

export interface WorkTypeFormOptionView {
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly unit: string;
}

export interface WorkSummaryView {
  readonly clinic: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
  readonly code: string;
  readonly createdAt: string;
  readonly currency: string | null;
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
    readonly fullName: string;
    readonly id: string;
    readonly lastName: string;
  } | null;
  readonly priority: string;
  readonly quantity: number;
  readonly requestedDeliveryDate: string;
  readonly status: string;
  readonly totalPriceMinor: number | null;
  readonly updatedAt: string;
  readonly workflow: ReturnType<typeof toWorkflowSummaryView>;
  readonly workType: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
}

export interface WorkDetailView extends Omit<WorkSummaryView, "workflow"> {
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

export interface PaginatedWorksView {
  readonly items: readonly WorkSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toWorkTypeFormOptionView(workType: { readonly code: string; readonly id: string; readonly name: string; readonly unit: string }): WorkTypeFormOptionView {
  return {
    code: workType.code,
    id: workType.id,
    name: workType.name,
    unit: workType.unit,
  };
}

export function toWorkSummaryView(workOrder: WorkOrderRecord, includePricing: boolean): WorkSummaryView {
  return {
    clinic: {
      code: workOrder.clinic.code,
      id: workOrder.clinic.id,
      name: workOrder.clinic.name,
    },
    code: workOrder.code,
    createdAt: workOrder.createdAt.toISOString(),
    currency: includePricing ? workOrder.currency : null,
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
          fullName: `${workOrder.patient.firstName} ${workOrder.patient.lastName}`.trim(),
          id: workOrder.patient.id,
          lastName: workOrder.patient.lastName,
        }
      : null,
    priority: workOrder.priority,
    quantity: workOrder.quantity,
    requestedDeliveryDate: workOrder.requestedDeliveryDate.toISOString(),
    status: workOrder.status,
    totalPriceMinor: includePricing ? workOrder.totalPriceMinor : null,
    updatedAt: workOrder.updatedAt.toISOString(),
    workflow: toWorkflowSummaryView(workOrder.workflowExecution),
    workType: {
      code: workOrder.workType.code,
      id: workOrder.workType.id,
      name: workOrder.workType.name,
    },
  };
}

export function toWorkDetailView(workOrder: WorkOrderRecord, includePricing: boolean): WorkDetailView {
  return {
    ...toWorkSummaryView(workOrder, includePricing),
    baseUnitPriceMinor: includePricing ? workOrder.baseUnitPriceMinor : null,
    clinicalNotes: workOrder.clinicalNotes,
    createdByUserId: workOrder.createdByUserId,
    externalReference: workOrder.externalReference,
    internalNotes: workOrder.internalNotes,
    updatedByUserId: workOrder.updatedByUserId,
    version: workOrder.version,
    workflow: workOrder.workflowExecution
      ? toWorkflowExecutionView(workOrder.workflowExecution, {
          canCompleteCurrentStage: false,
          canStartCurrentStage: false,
          reason: "Acțiunile se verifică pe endpointul dedicat de workflow.",
        })
      : null,
    workForm: toWorkFormSubmissionView(workOrder.workFormSubmission),
  };
}

function toWorkFormSubmissionView(submission: WorkOrderRecord["workFormSubmission"]): WorkFormSubmissionView | null {
  if (!submission) {
    return null;
  }

  const snapshot = submission.schemaSnapshot as unknown as WorkFormSchemaSnapshot;
  const values = submission.values as unknown as WorkFormValues;

  return {
    fields: [...snapshot.fields].sort((left, right) => left.sortOrder - right.sortOrder),
    submittedAt: submission.submittedAt.toISOString(),
    templateId: submission.templateId,
    templateName: submission.templateNameSnapshot,
    templateVersion: submission.templateVersion,
    updatedAt: submission.updatedAt.toISOString(),
    values,
  };
}
