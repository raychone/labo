import type { PatientSex, Prisma } from "@prisma/client";

import { ACTIVE_WORK_STATUSES } from "./patients.constants.js";

export const patientWorkInclude = {
  billingLines: {
    include: {
      billingDocument: true,
    },
  },
  clinic: {
    select: {
      id: true,
      name: true,
    },
  },
  deliveryPreparationItems: {
    include: {
      group: {
        include: {
          deliveries: {
            include: {
              proof: true,
            },
            where: {
              isActive: true,
            },
          },
        },
      },
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
  workType: {
    select: {
      id: true,
      name: true,
    },
  },
  activeCycle: {
    include: {
      workflowExecution: {
        include: {
          events: {
            orderBy: {
              occurredAt: "desc",
            },
            take: 20,
          },
          stages: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.WorkOrderInclude;

export type PatientWorkRecord = Prisma.WorkOrderGetPayload<{ include: typeof patientWorkInclude }>;

export interface PatientAggregate {
  readonly activeWorks: number;
  readonly lastClinic: { readonly id: string; readonly name: string } | null;
  readonly lastDoctor: { readonly displayName: string; readonly id: string } | null;
  readonly lastWorkDate: Date | null;
  readonly totalWorks: number;
}

export interface PatientRecord {
  readonly archivedAt: Date | null;
  readonly clinicId: string | null;
  readonly birthDate: Date | null;
  readonly createdAt: Date;
  readonly firstName: string;
  readonly id: string;
  readonly isArchived: boolean;
  readonly doctorId: string | null;
  readonly lastName: string;
  readonly notes: string | null;
  readonly sex: PatientSex;
  readonly updatedAt: Date;
}

export interface PatientAccessActions {
  readonly canArchive: boolean;
  readonly canCreateWork: boolean;
  readonly canReadDocuments: boolean;
  readonly canRestore: boolean;
  readonly canUpdate: boolean;
}

export interface PatientNameView {
  readonly firstName: string;
  readonly fullName: string;
  readonly id: string;
  readonly lastName: string;
}

export interface PatientSummaryView extends PatientNameView {
  readonly activeWorks: number;
  readonly birthDate: string | null;
  readonly createdAt: string;
  readonly clinic: { readonly id: string; readonly name: string } | null;
  readonly isArchived: boolean;
  readonly doctor: { readonly displayName: string; readonly id: string } | null;
  readonly lastClinic: { readonly id: string; readonly name: string } | null;
  readonly lastDoctor: { readonly displayName: string; readonly id: string } | null;
  readonly lastWorkDate: string | null;
  readonly sex: PatientSex;
  readonly totalWorks: number;
}

export interface PatientOptionView extends PatientNameView {
  readonly birthDate: string | null;
  readonly workCount: number;
}

export interface PatientWorkView {
  readonly billing: { readonly documentId: string; readonly documentNumber: string | null; readonly status: string } | null;
  readonly clinic: { readonly id: string; readonly name: string };
  readonly code: string;
  readonly createdAt: string;
  readonly currentStage: string | null;
  readonly doctor: { readonly displayName: string; readonly id: string };
  readonly id: string;
  readonly legalEntityCode: string | null;
  readonly patientNameSnapshot: string;
  readonly patientReference: string | null;
  readonly priority: string;
  readonly requestedDeliveryDate: string;
  readonly status: string;
  readonly toothPositionSummary: string | null;
  readonly workflowProgress: { readonly completed: number; readonly total: number };
  readonly workType: { readonly id: string; readonly name: string };
}

export interface PatientRelationshipView {
  readonly activeWorks: number;
  readonly clinic: { readonly id: string; readonly name: string };
  readonly doctors: readonly { readonly displayName: string; readonly id: string; readonly workCount: number }[];
  readonly firstWorkDate: string;
  readonly lastWorkDate: string;
  readonly totalWorks: number;
}

export interface PatientDocumentView {
  readonly canDownload: boolean;
  readonly canOpen: boolean;
  readonly canPrint: boolean;
  readonly createdAt: string;
  readonly documentNumber: string | null;
  readonly id: string;
  readonly label: string;
  readonly route: string | null;
  readonly type: "BILLING_DOCUMENT" | "DELIVERY_PROOF";
  readonly workCode: string | null;
}

export interface PatientTimelineEventView {
  readonly createdAt: string;
  readonly description: string;
  readonly id: string;
  readonly title: string;
  readonly type: "patient_created" | "patient_updated" | "work_created" | "workflow_event" | "delivery_event" | "billing_document" | "payment";
}

export interface PatientDetailView {
  readonly actions: PatientAccessActions;
  readonly documents: readonly PatientDocumentView[];
  readonly overview: PatientSummaryView & { readonly archivedAt: string | null; readonly notes: string | null; readonly updatedAt: string };
  readonly relationships: readonly PatientRelationshipView[];
  readonly timeline: readonly PatientTimelineEventView[];
  readonly works: readonly PatientWorkView[];
}

export interface PaginatedPatientsView {
  readonly items: readonly PatientSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PaginatedPatientWorksView {
  readonly items: readonly PatientWorkView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toPatientNameView(patient: Pick<PatientRecord, "firstName" | "id" | "lastName">): PatientNameView {
  return {
    firstName: patient.firstName,
    fullName: `${patient.firstName} ${patient.lastName}`.trim(),
    id: patient.id,
    lastName: patient.lastName,
  };
}

export function toPatientSummaryView(patient: PatientRecord, aggregate: PatientAggregate): PatientSummaryView {
  return {
    ...toPatientNameView(patient),
    activeWorks: aggregate.activeWorks,
    birthDate: patient.birthDate?.toISOString().slice(0, 10) ?? null,
    createdAt: patient.createdAt.toISOString(),
    clinic: null,
    isArchived: patient.isArchived,
    doctor: null,
    lastClinic: aggregate.lastClinic,
    lastDoctor: aggregate.lastDoctor,
    lastWorkDate: aggregate.lastWorkDate?.toISOString() ?? null,
    sex: patient.sex,
    totalWorks: aggregate.totalWorks,
  };
}

export function toPatientOptionView(
  patient: Pick<PatientRecord, "birthDate" | "firstName" | "id" | "lastName">,
  workCount: number,
): PatientOptionView {
  return {
    ...toPatientNameView(patient),
    birthDate: patient.birthDate?.toISOString().slice(0, 10) ?? null,
    workCount,
  };
}

export function toPatientDetailView(
  patient: PatientRecord & { readonly clinic: { readonly id: string; readonly name: string } | null; readonly doctor: { readonly displayName: string; readonly id: string } | null },
  aggregate: PatientAggregate,
  works: readonly PatientWorkRecord[],
  actions: PatientAccessActions,
): PatientDetailView {
  const workViews = works.map(toPatientWorkView);
  const documents = actions.canReadDocuments ? toPatientDocuments(works) : [];

  return {
    actions,
    documents,
    overview: {
      ...toPatientSummaryView(patient, aggregate),
      archivedAt: patient.archivedAt?.toISOString() ?? null,
      clinic: patient.clinic,
      doctor: patient.doctor,
      notes: patient.notes,
      updatedAt: patient.updatedAt.toISOString(),
    },
    relationships: toPatientRelationships(works),
    timeline: toPatientTimeline(patient, works, documents, actions.canReadDocuments),
    works: workViews,
  };
}

export function toPatientWorkView(work: PatientWorkRecord): PatientWorkView {
  const stages = work.activeCycle?.workflowExecution?.stages ?? [];
  const completed = stages.filter((stage) => stage.status === "COMPLETED").length;
  const currentStage = stages.find((stage) => stage.status === "IN_PROGRESS") ?? stages.find((stage) => stage.status === "PENDING") ?? null;
  const billingDocument = work.billingLines[0]?.billingDocument ?? null;

  return {
    billing: billingDocument
      ? {
          documentId: billingDocument.id,
          documentNumber: billingDocument.formattedNumber,
          status: billingDocument.status,
        }
      : null,
    clinic: work.clinic,
    code: work.code,
    createdAt: work.createdAt.toISOString(),
    currentStage: currentStage?.stageNameSnapshot ?? null,
    doctor: work.doctor,
    id: work.id,
    legalEntityCode: null,
    patientNameSnapshot: work.patientName,
    patientReference: work.patientReference,
    priority: work.priority,
    requestedDeliveryDate: work.requestedDeliveryDate.toISOString(),
    status: work.status,
    toothPositionSummary: work.patientReference,
    workflowProgress: {
      completed,
      total: stages.length,
    },
    workType: work.workType,
  };
}

function toPatientRelationships(works: readonly PatientWorkRecord[]): readonly PatientRelationshipView[] {
  const byClinic = new Map<string, { clinic: { readonly id: string; readonly name: string }; works: PatientWorkRecord[] }>();

  for (const work of works) {
    const existing = byClinic.get(work.clinic.id) ?? { clinic: work.clinic, works: [] };
    existing.works.push(work);
    byClinic.set(work.clinic.id, existing);
  }

  return [...byClinic.values()].map((entry) => {
    const doctors = new Map<string, { displayName: string; id: string; workCount: number }>();
    for (const work of entry.works) {
      const doctor = doctors.get(work.doctor.id) ?? { displayName: work.doctor.displayName, id: work.doctor.id, workCount: 0 };
      doctors.set(work.doctor.id, { ...doctor, workCount: doctor.workCount + 1 });
    }
    const sortedWorks = entry.works.slice().sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    const activeWorks = entry.works.filter((work) => ACTIVE_WORK_STATUSES.includes(work.status as (typeof ACTIVE_WORK_STATUSES)[number])).length;

    return {
      activeWorks,
      clinic: entry.clinic,
      doctors: [...doctors.values()].sort((left, right) => right.workCount - left.workCount || left.displayName.localeCompare(right.displayName)),
      firstWorkDate: sortedWorks[0]?.createdAt.toISOString() ?? new Date(0).toISOString(),
      lastWorkDate: sortedWorks[sortedWorks.length - 1]?.createdAt.toISOString() ?? new Date(0).toISOString(),
      totalWorks: entry.works.length,
    };
  });
}

function toPatientDocuments(works: readonly PatientWorkRecord[]): readonly PatientDocumentView[] {
  const documents = new Map<string, PatientDocumentView>();

  for (const work of works) {
    for (const line of work.billingLines) {
      const document = line.billingDocument;
      documents.set(`billing-${document.id}`, {
        canDownload: false,
        canOpen: true,
        canPrint: true,
        createdAt: document.createdAt.toISOString(),
        documentNumber: document.formattedNumber,
        id: `billing-${document.id}`,
        label: document.type === "INVOICE" ? "Factură" : "Proformă",
        route: `/billing/documents/${document.id}/print`,
        type: "BILLING_DOCUMENT",
        workCode: work.code,
      });
    }

    for (const item of work.deliveryPreparationItems) {
      for (const delivery of item.group.deliveries) {
        if (!delivery.proof) {
          continue;
        }
        documents.set(`proof-${delivery.proof.id}`, {
          canDownload: false,
          canOpen: true,
          canPrint: true,
          createdAt: delivery.proof.createdAt.toISOString(),
          documentNumber: delivery.code,
          id: `proof-${delivery.proof.id}`,
          label: "Dovadă predare",
          route: `/deliveries/${delivery.id}/proof/print`,
          type: "DELIVERY_PROOF",
          workCode: work.code,
        });
      }
    }
  }

  return [...documents.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function toPatientTimeline(
  patient: PatientRecord,
  works: readonly PatientWorkRecord[],
  documents: readonly PatientDocumentView[],
  includeFinancialEvents: boolean,
): readonly PatientTimelineEventView[] {
  const events: PatientTimelineEventView[] = [
    {
      createdAt: patient.createdAt.toISOString(),
      description: "Dosarul pacientului a fost creat.",
      id: `patient-created-${patient.id}`,
      title: "Pacient creat",
      type: "patient_created",
    },
  ];

  if (patient.updatedAt.getTime() !== patient.createdAt.getTime()) {
    events.push({
      createdAt: patient.updatedAt.toISOString(),
      description: "Datele curente ale pacientului au fost actualizate.",
      id: `patient-updated-${patient.id}`,
      title: "Date pacient actualizate",
      type: "patient_updated",
    });
  }

  for (const work of works) {
    events.push({
      createdAt: work.createdAt.toISOString(),
      description: `${work.code} - ${work.workType.name}`,
      id: `work-created-${work.id}`,
      title: "Lucrare creată",
      type: "work_created",
    });

    for (const event of work.activeCycle?.workflowExecution?.events ?? []) {
      events.push({
        createdAt: event.occurredAt.toISOString(),
        description: `${work.code} - ${event.type.toLowerCase().replaceAll("_", " ")}`,
        id: `workflow-${event.id}`,
        title: "Workflow lucrare",
        type: "workflow_event",
      });
    }
  }

  if (includeFinancialEvents) {
    for (const document of documents) {
      events.push({
        createdAt: document.createdAt,
        description: `${document.label}${document.documentNumber ? ` ${document.documentNumber}` : ""}`,
        id: `document-${document.id}`,
        title: "Document",
        type: "billing_document",
      });
    }
  }

  return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 80);
}
