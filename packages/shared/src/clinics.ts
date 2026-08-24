export const CLINIC_SORT_FIELDS = ["createdAt", "name", "code", "city", "updatedAt"] as const;
export const DOCTOR_SORT_FIELDS = ["createdAt", "lastName", "displayName", "updatedAt"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type ClinicSortField = (typeof CLINIC_SORT_FIELDS)[number];
export type DoctorSortField = (typeof DOCTOR_SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export type LegalEntityCode = "CDT" | "NG";

export interface LegalEntitySummary {
  readonly code: LegalEntityCode;
  readonly displayName: string;
}

export interface ClinicOption {
  readonly code: string;
  readonly id: string;
  readonly name: string;
  readonly legalEntity?: LegalEntitySummary | null;
}

export interface ClinicSummary extends ClinicOption {
  readonly city: string | null;
  readonly contactPersonName: string | null;
  readonly createdAt: string;
  readonly email: string | null;
  readonly isActive: boolean;
  readonly phone: string | null;
  readonly updatedAt: string;
}

export interface ClinicDetail extends ClinicSummary {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly archivedAt: string | null;
  readonly archivedByUserId: string | null;
  readonly billingAddressLine1: string | null;
  readonly billingAddressLine2: string | null;
  readonly billingCity: string | null;
  readonly billingCountryCode: string;
  readonly billingCountyOrRegion: string | null;
  readonly billingName: string | null;
  readonly billingPostalCode: string | null;
  readonly billingRegistrationNumber: string | null;
  readonly billingTaxId: string | null;
  readonly contactPersonEmail: string | null;
  readonly contactPersonPhone: string | null;
  readonly contactPersonRole: string | null;
  readonly countryCode: string;
  readonly countyOrRegion: string | null;
  readonly createdByUserId: string | null;
  readonly internalNotes: string | null;
  readonly legalName: string | null;
  readonly postalCode: string | null;
  readonly registrationNumber: string | null;
  readonly taxId: string | null;
  readonly updatedByUserId: string | null;
  readonly version: number;
  readonly website: string | null;
}

export interface CreateClinicInput {
  readonly legalEntityCode?: LegalEntityCode | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly billingAddressLine1?: string | null;
  readonly billingAddressLine2?: string | null;
  readonly billingCity?: string | null;
  readonly billingCountryCode?: string | null;
  readonly billingCountyOrRegion?: string | null;
  readonly billingName?: string | null;
  readonly billingPostalCode?: string | null;
  readonly billingRegistrationNumber?: string | null;
  readonly billingTaxId?: string | null;
  readonly city?: string | null;
  readonly contactPersonEmail?: string | null;
  readonly contactPersonName?: string | null;
  readonly contactPersonPhone?: string | null;
  readonly contactPersonRole?: string | null;
  readonly countryCode?: string | null;
  readonly countyOrRegion?: string | null;
  readonly email?: string | null;
  readonly internalNotes?: string | null;
  readonly legalName?: string | null;
  readonly name: string;
  readonly phone?: string | null;
  readonly postalCode?: string | null;
  readonly registrationNumber?: string | null;
  readonly taxId?: string | null;
  readonly website?: string | null;
}

export type UpdateClinicInput = Partial<CreateClinicInput>;

export interface DoctorOption {
  readonly clinicId: string;
  readonly displayName: string;
  readonly id: string;
  readonly legalEntity?: LegalEntitySummary | null;
}

export interface DoctorClinicSummary {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface DoctorSummary extends DoctorOption {
  readonly clinic: DoctorClinicSummary;
  readonly createdAt: string;
  readonly email: string | null;
  readonly firstName: string;
  readonly isActive: boolean;
  readonly lastName: string;
  readonly phone: string | null;
  readonly professionalCode: string | null;
  readonly updatedAt: string;
}

export interface DoctorDetail extends DoctorSummary {
  readonly archivedAt: string | null;
  readonly internalNotes: string | null;
  readonly version: number;
}

export interface CreateDoctorInput {
  readonly clinicId: string;
  readonly legalEntityCode?: LegalEntityCode | null;
  readonly email?: string | null;
  readonly firstName: string;
  readonly internalNotes?: string | null;
  readonly lastName: string;
  readonly phone?: string | null;
  readonly professionalCode?: string | null;
}

export type UpdateDoctorInput = Partial<CreateDoctorInput>;

export interface ClinicsListParams {
  readonly city: string | undefined;
  readonly isActive: boolean | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | undefined;
  readonly sortBy: ClinicSortField;
  readonly sortDirection: SortDirection;
}

export interface DoctorsListParams {
  readonly clinicId: string | undefined;
  readonly isActive: boolean | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly search: string | undefined;
  readonly sortBy: DoctorSortField;
  readonly sortDirection: SortDirection;
}

export interface PaginatedResponse<TItem> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export type ClinicsListResponse = PaginatedResponse<ClinicSummary>;
export type DoctorsListResponse = PaginatedResponse<DoctorSummary>;
