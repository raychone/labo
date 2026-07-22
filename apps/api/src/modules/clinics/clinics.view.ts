import type { Prisma } from "@prisma/client";

export type ClinicRecord = Prisma.ClinicGetPayload<object>;

export interface ClinicOptionView {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface ClinicSummaryView extends ClinicOptionView {
  readonly city: string | null;
  readonly contactPersonName: string | null;
  readonly createdAt: string;
  readonly email: string | null;
  readonly isActive: boolean;
  readonly phone: string | null;
  readonly updatedAt: string;
}

export interface ClinicDetailView extends ClinicSummaryView {
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

export interface PaginatedClinicsView {
  readonly items: readonly ClinicSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toClinicOptionView(clinic: Pick<ClinicRecord, "code" | "id" | "name">): ClinicOptionView {
  return {
    code: clinic.code,
    id: clinic.id,
    name: clinic.name,
  };
}

export function toClinicSummaryView(clinic: ClinicRecord): ClinicSummaryView {
  return {
    ...toClinicOptionView(clinic),
    city: clinic.city,
    contactPersonName: clinic.contactPersonName,
    createdAt: clinic.createdAt.toISOString(),
    email: clinic.email,
    isActive: clinic.isActive,
    phone: clinic.phone,
    updatedAt: clinic.updatedAt.toISOString(),
  };
}

export function toClinicDetailView(clinic: ClinicRecord): ClinicDetailView {
  return {
    ...toClinicSummaryView(clinic),
    addressLine1: clinic.addressLine1,
    addressLine2: clinic.addressLine2,
    archivedAt: clinic.archivedAt?.toISOString() ?? null,
    archivedByUserId: clinic.archivedByUserId,
    billingAddressLine1: clinic.billingAddressLine1,
    billingAddressLine2: clinic.billingAddressLine2,
    billingCity: clinic.billingCity,
    billingCountryCode: clinic.billingCountryCode,
    billingCountyOrRegion: clinic.billingCountyOrRegion,
    billingName: clinic.billingName,
    billingPostalCode: clinic.billingPostalCode,
    billingRegistrationNumber: clinic.billingRegistrationNumber,
    billingTaxId: clinic.billingTaxId,
    contactPersonEmail: clinic.contactPersonEmail,
    contactPersonPhone: clinic.contactPersonPhone,
    contactPersonRole: clinic.contactPersonRole,
    countryCode: clinic.countryCode,
    countyOrRegion: clinic.countyOrRegion,
    createdByUserId: clinic.createdByUserId,
    internalNotes: clinic.internalNotes,
    legalName: clinic.legalName,
    postalCode: clinic.postalCode,
    registrationNumber: clinic.registrationNumber,
    taxId: clinic.taxId,
    updatedByUserId: clinic.updatedByUserId,
    version: clinic.version,
    website: clinic.website,
  };
}
