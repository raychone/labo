import type { Prisma } from "@prisma/client";

export type DoctorRecord = Prisma.DoctorGetPayload<{
  include: {
    clinic: true;
  };
}>;

export interface DoctorOptionView {
  readonly clinicId: string;
  readonly displayName: string;
  readonly id: string;
}

export interface DoctorClinicSummaryView {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface DoctorSummaryView extends DoctorOptionView {
  readonly clinic: DoctorClinicSummaryView;
  readonly createdAt: string;
  readonly email: string | null;
  readonly firstName: string;
  readonly isActive: boolean;
  readonly lastName: string;
  readonly phone: string | null;
  readonly professionalCode: string | null;
  readonly updatedAt: string;
}

export interface DoctorDetailView extends DoctorSummaryView {
  readonly archivedAt: string | null;
  readonly internalNotes: string | null;
  readonly version: number;
}

export interface PaginatedDoctorsView {
  readonly items: readonly DoctorSummaryView[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export function toDoctorOptionView(doctor: Pick<DoctorRecord, "clinicId" | "displayName" | "id">): DoctorOptionView {
  return {
    clinicId: doctor.clinicId,
    displayName: doctor.displayName,
    id: doctor.id,
  };
}

export function toDoctorSummaryView(doctor: DoctorRecord): DoctorSummaryView {
  return {
    ...toDoctorOptionView(doctor),
    clinic: {
      code: doctor.clinic.code,
      id: doctor.clinic.id,
      name: doctor.clinic.name,
    },
    createdAt: doctor.createdAt.toISOString(),
    email: doctor.email,
    firstName: doctor.firstName,
    isActive: doctor.isActive,
    lastName: doctor.lastName,
    phone: doctor.phone,
    professionalCode: doctor.professionalCode,
    updatedAt: doctor.updatedAt.toISOString(),
  };
}

export function toDoctorDetailView(doctor: DoctorRecord): DoctorDetailView {
  return {
    ...toDoctorSummaryView(doctor),
    archivedAt: doctor.archivedAt?.toISOString() ?? null,
    internalNotes: doctor.internalNotes,
    version: doctor.version,
  };
}
