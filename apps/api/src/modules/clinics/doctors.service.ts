import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { DOCTOR_RESOURCE_TYPE, DOCTORS_AUDIT_ACTIONS } from "./clinics.constants.js";
import { resolveCanonicalLegalEntity } from "./legal-entity.js";
import type { CreateDoctorDto, ListDoctorOptionsQueryDto, ListDoctorsQueryDto, UpdateDoctorDto } from "./dto/doctors.dto.js";
import {
  type DoctorDetailView,
  type DoctorOptionView,
  type PaginatedDoctorsView,
  toDoctorDetailView,
  toDoctorOptionView,
  toDoctorSummaryView,
} from "./doctors.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

const DOCTOR_MUTATION_FIELDS = [
  "clinicId",
  "email",
  "firstName",
  "internalNotes",
  "lastName",
  "phone",
  "professionalCode",
] as const satisfies readonly (keyof UpdateDoctorDto)[];

@Injectable()
export class DoctorsService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async listDoctors(query: ListDoctorsQueryDto): Promise<PaginatedDoctorsView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const where: Prisma.DoctorWhereInput = {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { professionalCode: { contains: search, mode: "insensitive" } },
              { clinic: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, doctors] = await this.prisma.$transaction([
      this.prisma.doctor.count({ where }),
      this.prisma.doctor.findMany({
        include: {
          clinic: true,
          legalEntity: true,
        },
        orderBy: {
          [query.sortBy]: query.sortDirection,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: doctors.map(toDoctorSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async listDoctorOptions(query: ListDoctorOptionsQueryDto): Promise<readonly DoctorOptionView[]> {
    const doctors = await this.prisma.doctor.findMany({
      include: {
        clinic: true,
        legalEntity: true,
      },
      orderBy: [
        {
          lastName: "asc",
        },
        {
          firstName: "asc",
        },
      ],
      where: {
        ...(query.clinicId ? { clinicId: query.clinicId } : {}),
        clinic: {
          isActive: true,
        },
        isActive: true,
      },
    });

    return doctors.map(toDoctorOptionView);
  }

  public async getDoctor(doctorId: string): Promise<DoctorDetailView> {
    const doctor = await this.findDoctorOrThrow(doctorId);
    return toDoctorDetailView(doctor);
  }

  public async createDoctor(context: ActorContext, dto: CreateDoctorDto): Promise<DoctorDetailView> {
    const clinic = await this.getActiveClinic(dto.clinicId);
    // The clinic is the source of truth. A doctor must inherit its collaboration
    // and cannot select a different CDT/NG entity independently.
    const legalEntity = clinic.legalEntity;
    const displayName = this.buildDisplayName(dto.firstName, dto.lastName);

    const doctor = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.DoctorUncheckedCreateInput = {
        clinicId: dto.clinicId,
        ...(legalEntity ? { legalEntityId: legalEntity.id } : {}),
        displayName,
        firstName: dto.firstName,
        lastName: dto.lastName,
      };

      this.assignOptionalCreateValue(data, "email", dto.email);
      this.assignOptionalCreateValue(data, "internalNotes", dto.internalNotes);
      this.assignOptionalCreateValue(data, "phone", dto.phone);
      this.assignOptionalCreateValue(data, "professionalCode", dto.professionalCode);

      const createdDoctor = await tx.doctor.create({
        data,
        include: {
          clinic: true,
          legalEntity: true,
        },
      });

      await this.recordAudit(tx, {
        action: DOCTORS_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: { clinicId: dto.clinicId, displayName },
        requestMetadata: context.requestMetadata,
        resourceId: createdDoctor.id,
      });

      return createdDoctor;
    });

    return toDoctorDetailView(doctor);
  }

  public async updateDoctor(context: ActorContext, doctorId: string, dto: UpdateDoctorDto): Promise<DoctorDetailView> {
    const before = await this.findDoctorOrThrow(doctorId);

    if (!before.isActive) {
      throw new BadRequestException("Archived doctors must be restored before editing.");
    }

    const targetClinic = await this.getActiveClinic(dto.clinicId ?? before.clinicId);
    const requestedEntity = await resolveCanonicalLegalEntity(this.prisma, dto.legalEntityCode);
    if (requestedEntity && targetClinic.legalEntity && requestedEntity.code !== targetClinic.legalEntity.code) {
      throw new BadRequestException("Firma medicului trebuie să fie aceeași cu firma clinicii.");
    }

    const data = this.toUpdateData(dto, before);
    if (dto.clinicId !== undefined || dto.legalEntityCode !== undefined) {
      const resolvedEntityId = (requestedEntity ?? targetClinic.legalEntity)?.id;
      if (resolvedEntityId) data.legalEntityId = resolvedEntityId;
    }
    if (Object.keys(data).length <= 1) {
      throw new BadRequestException("No doctor fields were provided.");
    }

    const after = await this.prisma.$transaction(async (tx) => {
      const updatedDoctor = await tx.doctor.update({
        data,
        include: {
          clinic: true,
          legalEntity: true,
        },
        where: {
          id: doctorId,
        },
      });
      const changedFields = this.getChangedFields(before, updatedDoctor);

      if (changedFields.length > 0) {
        await this.recordAudit(tx, {
          action: DOCTORS_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: { fieldsChanged: changedFields },
          requestMetadata: context.requestMetadata,
          resourceId: doctorId,
        });
      }

      return updatedDoctor;
    });

    return toDoctorDetailView(after);
  }

  public async archiveDoctor(context: ActorContext, doctorId: string): Promise<DoctorDetailView> {
    const doctor = await this.findDoctorOrThrow(doctorId);

    if (!doctor.isActive) {
      return toDoctorDetailView(doctor);
    }

    const archivedDoctor = await this.prisma.$transaction(async (tx) => {
      const updatedDoctor = await tx.doctor.update({
        data: {
          archivedAt: new Date(),
          isActive: false,
          version: {
            increment: 1,
          },
        },
        include: {
          clinic: true,
          legalEntity: true,
        },
        where: {
          id: doctorId,
        },
      });

      await this.recordAudit(tx, {
        action: DOCTORS_AUDIT_ACTIONS.archived,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: doctorId,
      });

      return updatedDoctor;
    });

    return toDoctorDetailView(archivedDoctor);
  }

  public async restoreDoctor(context: ActorContext, doctorId: string): Promise<DoctorDetailView> {
    const doctor = await this.findDoctorOrThrow(doctorId);

    if (doctor.isActive) {
      return toDoctorDetailView(doctor);
    }

    await this.getActiveClinic(doctor.clinicId);

    const restoredDoctor = await this.prisma.$transaction(async (tx) => {
      const updatedDoctor = await tx.doctor.update({
        data: {
          archivedAt: null,
          isActive: true,
          version: {
            increment: 1,
          },
        },
        include: {
          clinic: true,
          legalEntity: true,
        },
        where: {
          id: doctorId,
        },
      });

      await this.recordAudit(tx, {
        action: DOCTORS_AUDIT_ACTIONS.restored,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: doctorId,
      });

      return updatedDoctor;
    });

    return toDoctorDetailView(restoredDoctor);
  }

  private async findDoctorOrThrow(doctorId: string): Promise<Prisma.DoctorGetPayload<{ include: { clinic: true; legalEntity: true } }>> {
    const doctor = await this.prisma.doctor.findUnique({
      include: {
        clinic: true,
        legalEntity: true,
      },
      where: {
        id: doctorId,
      },
    });

    if (!doctor) {
      throw new NotFoundException("Doctor was not found.");
    }

    return doctor;
  }

  private async getActiveClinic(clinicId: string): Promise<Prisma.ClinicGetPayload<{ include: { legalEntity: true } }>> {
    const clinic = await this.prisma.clinic.findUnique({
      include: { legalEntity: true },
      where: {
        id: clinicId,
      },
    });

    if (!clinic) {
      throw new NotFoundException("Clinic was not found.");
    }

    if (!clinic.isActive) {
      throw new BadRequestException("Doctors cannot be created or restored for archived clinics.");
    }

    return clinic;
  }

  private buildDisplayName(firstName: string, lastName: string): string {
    return `Dr. ${firstName.trim()} ${lastName.trim()}`;
  }

  private toUpdateData(
    dto: UpdateDoctorDto,
    before: Prisma.DoctorGetPayload<{ include: { clinic: true; legalEntity: true } }>,
  ): Prisma.DoctorUncheckedUpdateInput {
    const firstName = dto.firstName ?? before.firstName;
    const lastName = dto.lastName ?? before.lastName;
    const data: Prisma.DoctorUncheckedUpdateInput = {
      version: {
        increment: 1,
      },
    };

    for (const field of DOCTOR_MUTATION_FIELDS) {
      if (!(field in dto)) {
        continue;
      }

      const value = dto[field];
      if (value === undefined) {
        continue;
      }

      this.assignUpdateValue(data, field, value);
    }

    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      data.displayName = this.buildDisplayName(firstName, lastName);
    }

    return data;
  }

  private assignOptionalCreateValue(
    data: Prisma.DoctorUncheckedCreateInput,
    field: "email" | "internalNotes" | "phone" | "professionalCode",
    value: string | null | undefined,
  ): void {
    if (value === undefined) {
      return;
    }

    data[field] = value;
  }

  private assignUpdateValue(
    data: Prisma.DoctorUncheckedUpdateInput,
    field: (typeof DOCTOR_MUTATION_FIELDS)[number],
    value: string | null,
  ): void {
    switch (field) {
      case "clinicId":
        if (value !== null) {
          data.clinicId = value;
        }
        return;
      case "email":
        data.email = value;
        return;
      case "firstName":
        if (value !== null) {
          data.firstName = value;
        }
        return;
      case "internalNotes":
        data.internalNotes = value;
        return;
      case "lastName":
        if (value !== null) {
          data.lastName = value;
        }
        return;
      case "phone":
        data.phone = value;
        return;
      case "professionalCode":
        data.professionalCode = value;
        return;
    }
  }

  private getChangedFields(
    before: Prisma.DoctorGetPayload<{ include: { clinic: true; legalEntity: true } }>,
    after: Prisma.DoctorGetPayload<{ include: { clinic: true; legalEntity: true } }>,
  ): readonly (typeof DOCTOR_MUTATION_FIELDS)[number][] {
    return DOCTOR_MUTATION_FIELDS.filter((field) => before[field] !== after[field]);
  }

  private async recordAudit(
    client: AuditClient,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly metadata?: Prisma.InputJsonValue;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
    },
  ): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: input.action,
      actorUserId: input.actorUserId,
      resourceId: input.resourceId,
      resourceType: DOCTOR_RESOURCE_TYPE,
    };

    if (input.metadata !== undefined) {
      data.metadata = input.metadata;
    }

    if (input.requestMetadata.ipAddress) {
      data.ipAddress = input.requestMetadata.ipAddress;
    }

    if (input.requestMetadata.userAgent) {
      data.userAgent = input.requestMetadata.userAgent;
    }

    await client.auditLog.create({ data });
  }
}
