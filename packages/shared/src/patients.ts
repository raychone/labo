import type { SortDirection } from "./clinics.js";

export const PATIENT_SEX_VALUES = ["FEMALE", "MALE", "UNSPECIFIED"] as const;
export const PATIENT_SORT_FIELDS = ["createdAt", "firstName", "lastName", "lastWorkDate", "totalWorks"] as const;

export type PatientSex = (typeof PATIENT_SEX_VALUES)[number];
export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number];

export interface PatientNameView {
  readonly firstName: string;
  readonly fullName: string;
  readonly id: string;
  readonly lastName: string;
}

export interface PatientOption extends PatientNameView {
  readonly birthDate: string | null;
  readonly workCount: number;
}

export interface PatientSummary extends PatientNameView {
  readonly activeWorks: number;
  readonly birthDate: string | null;
  readonly createdAt: string;
  readonly isArchived: boolean;
  readonly lastClinic: { readonly id: string; readonly name: string } | null;
  readonly lastDoctor: { readonly displayName: string; readonly id: string } | null;
  readonly lastWorkDate: string | null;
  readonly sex: PatientSex;
  readonly totalWorks: number;
}

export interface PatientOverview extends PatientSummary {
  readonly archivedAt: string | null;
  readonly clinic: { readonly id: string; readonly name: string } | null;
  readonly doctor: { readonly displayName: string; readonly id: string } | null;
  readonly notes: string | null;
  readonly updatedAt: string;
}

export interface PatientWorkRecord {
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

export interface PatientRelationship {
  readonly activeWorks: number;
  readonly clinic: { readonly id: string; readonly name: string };
  readonly doctors: readonly { readonly displayName: string; readonly id: string; readonly workCount: number }[];
  readonly firstWorkDate: string;
  readonly lastWorkDate: string;
  readonly totalWorks: number;
}

export interface PatientDocumentRecord {
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

export interface PatientTimelineEvent {
  readonly createdAt: string;
  readonly description: string;
  readonly id: string;
  readonly title: string;
  readonly type: "patient_created" | "patient_updated" | "work_created" | "workflow_event" | "delivery_event" | "billing_document" | "payment";
}

export interface PatientDetail {
  readonly actions: {
    readonly canArchive: boolean;
    readonly canCreateWork: boolean;
    readonly canReadDocuments: boolean;
    readonly canRestore: boolean;
    readonly canUpdate: boolean;
  };
  readonly documents: readonly PatientDocumentRecord[];
  readonly overview: PatientOverview;
  readonly relationships: readonly PatientRelationship[];
  readonly timeline: readonly PatientTimelineEvent[];
  readonly works: readonly PatientWorkRecord[];
}

export interface PatientsListParams {
  readonly activeOnly: boolean | undefined;
  readonly clinicId: string | undefined;
  readonly dateFrom: string | undefined;
  readonly dateTo: string | undefined;
  readonly doctorId: string | undefined;
  readonly hasActiveWorks: boolean | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | undefined;
  readonly sortBy: PatientSortField;
  readonly sortDirection: SortDirection;
}

export interface PatientWorksListParams {
  readonly clinicId: string | undefined;
  readonly dateFrom: string | undefined;
  readonly dateTo: string | undefined;
  readonly doctorId: string | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly status: string | undefined;
  readonly workTypeId: string | undefined;
}

export interface PaginatedPatientsResponse {
  readonly items: readonly PatientSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PaginatedPatientWorksResponse {
  readonly items: readonly PatientWorkRecord[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CreatePatientInput {
  readonly birthDate?: string | null;
  readonly clinicId?: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly doctorId?: string | null;
  readonly notes?: string | null;
  readonly sex?: PatientSex;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;

export function formatPatientName(patient: Pick<PatientNameView, "firstName" | "lastName">): string {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

export function formatPatientSex(sex: PatientSex): string {
  switch (sex) {
    case "FEMALE":
      return "Feminin";
    case "MALE":
      return "Masculin";
    case "UNSPECIFIED":
      return "Nespecificat";
  }
}
