import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PatientSex, Prisma, WorkStatus } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { ACTIVE_WORK_STATUSES, PATIENT_AUDIT_ACTIONS, PATIENT_RESOURCE_TYPE } from "./patients.constants.js";
import type { CreatePatientDto, ListPatientsQueryDto, PatientOptionsQueryDto, PatientWorksQueryDto, UpdatePatientDto } from "./dto/patients.dto.js";
import {
  type PaginatedPatientsView,
  type PaginatedPatientWorksView,
  type PatientAccessActions,
  type PatientAggregate,
  type PatientDetailView,
  type PatientOptionView,
  type PatientRecord,
  patientWorkInclude,
  type PatientWorkRecord,
  toPatientDetailView,
  toPatientOptionView,
  toPatientSummaryView,
  toPatientWorkView,
} from "./patients.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

const PATIENT_MUTATION_FIELDS = ["birthDate", "clinicId", "doctorId", "firstName", "lastName", "notes", "sex"] as const satisfies readonly (keyof UpdatePatientDto)[];
const DEFAULT_PATIENT_PAGE = 1;
const DEFAULT_PATIENT_PAGE_SIZE = 20;
const DEFAULT_PATIENT_OPTION_LIMIT = 10;

@Injectable()
export class PatientsService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async listPatients(query: ListPatientsQueryDto): Promise<PaginatedPatientsView> {
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PATIENT_PAGE_SIZE, 100);
    const page = Math.max(query.page ?? DEFAULT_PATIENT_PAGE, 1);
    const where = this.toPatientWhere(query);
    const orderBy = query.sortBy === "lastWorkDate" || query.sortBy === "totalWorks"
      ? { createdAt: query.sortDirection }
      : { [query.sortBy]: query.sortDirection };

    const [total, patients] = await this.prisma.$transaction([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    const aggregates = await this.getAggregates(patients.map((patient) => patient.id));

    return {
      items: patients.map((patient) => toPatientSummaryView(patient, aggregates.get(patient.id) ?? emptyAggregate())),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async listPatientOptions(query: PatientOptionsQueryDto): Promise<readonly PatientOptionView[]> {
    const search = query.search?.trim();
    const where: Prisma.PatientWhereInput = {
      isArchived: false,
      ...(search ? this.toPatientSearchWhere(search) : {}),
    };

    const patients = await this.prisma.patient.findMany({
      orderBy: [
        { normalizedLastName: "asc" },
        { normalizedFirstName: "asc" },
        { createdAt: "desc" },
      ],
      take: Math.min(query.limit ?? DEFAULT_PATIENT_OPTION_LIMIT, 50),
      where,
    });
    const counts = await this.prisma.workOrder.groupBy({
      _count: {
        _all: true,
      },
      by: ["patientId"],
      where: {
        patientId: {
          in: patients.map((patient) => patient.id),
        },
      },
    });
    const countsByPatient = new Map(counts.map((count) => [count.patientId, count._count._all]));

    return patients.map((patient) => toPatientOptionView(patient, countsByPatient.get(patient.id) ?? 0));
  }

  public async getPatient(patientId: string, actions: PatientAccessActions): Promise<PatientDetailView> {
    const patient = await this.findPatientDetailOrThrow(patientId);
    const works = await this.findPatientWorks(patientId, {});
    const aggregate = (await this.getAggregates([patientId])).get(patientId) ?? emptyAggregate();

    return toPatientDetailView(patient, aggregate, works, actions);
  }

  public async listPatientWorks(patientId: string, query: PatientWorksQueryDto): Promise<PaginatedPatientWorksView> {
    await this.findPatientOrThrow(patientId);
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PATIENT_PAGE_SIZE, 100);
    const page = Math.max(query.page ?? DEFAULT_PATIENT_PAGE, 1);
    const where = this.toPatientWorkWhere(patientId, query);
    const [total, works] = await this.prisma.$transaction([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        include: patientWorkInclude,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: works.map(toPatientWorkView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async createPatient(context: ActorContext, dto: CreatePatientDto): Promise<PatientDetailView> {
    const normalized = normalizePatientName(dto.firstName, dto.lastName);
    const patient = await this.prisma.$transaction(async (tx) => {
      await this.validateReferral(tx, dto.clinicId ?? null, dto.doctorId ?? null);
      const created = await tx.patient.create({
        data: {
          birthDate: dto.birthDate ? parseDateOnly(dto.birthDate) : null,
          createdByUserId: context.actorUserId,
          clinicId: dto.clinicId ?? null,
          firstName: dto.firstName,
          doctorId: dto.doctorId ?? null,
          lastName: dto.lastName,
          normalizedFirstName: normalized.firstName,
          normalizedLastName: normalized.lastName,
          notes: dto.notes ?? null,
          sex: dto.sex ?? "UNSPECIFIED",
          updatedByUserId: context.actorUserId,
        },
      });

      await this.recordAudit(tx, {
        action: PATIENT_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: { hasBirthDate: dto.birthDate !== undefined && dto.birthDate !== null, hasNotes: dto.notes !== undefined && dto.notes !== null },
        requestMetadata: context.requestMetadata,
        resourceId: created.id,
      });

      return created;
    });

    return this.getPatient(patient.id, defaultActions());
  }

  public async updatePatient(context: ActorContext, patientId: string, dto: UpdatePatientDto): Promise<PatientDetailView> {
    const before = await this.findPatientOrThrow(patientId);
    if (before.isArchived) {
      throw new BadRequestException("Pacientul arhivat trebuie restaurat înainte de editare.");
    }
    const nextClinicId = dto.clinicId !== undefined ? dto.clinicId : before.clinicId;
    const nextDoctorId = dto.doctorId !== undefined ? dto.doctorId : before.doctorId;

    const data = this.toUpdateData(dto, context.actorUserId, before);
    if (Object.keys(data).length <= 2) {
      throw new BadRequestException("Nu ai trimis câmpuri de pacient pentru actualizare.");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.validateReferral(tx, nextClinicId, nextDoctorId);
      const after = await tx.patient.update({
        data,
        where: {
          id: patientId,
        },
      });

      await tx.workOrder.updateMany({
        data: {
          patientName: `${after.firstName} ${after.lastName}`.trim(),
          updatedByUserId: context.actorUserId,
          version: {
            increment: 1,
          },
        },
        where: {
          patientId,
        },
      });

      await this.recordAudit(tx, {
        action: PATIENT_AUDIT_ACTIONS.updated,
        actorUserId: context.actorUserId,
        metadata: { changedFields: this.getChangedFields(before, after) },
        requestMetadata: context.requestMetadata,
        resourceId: patientId,
      });
    });

    return this.getPatient(patientId, defaultActions());
  }

  public async archivePatient(context: ActorContext, patientId: string): Promise<PatientDetailView> {
    const patient = await this.findPatientOrThrow(patientId);
    if (!patient.isArchived) {
      await this.prisma.$transaction(async (tx) => {
        await tx.patient.update({
          data: {
            archivedAt: new Date(),
            archivedByUserId: context.actorUserId,
            isArchived: true,
            updatedByUserId: context.actorUserId,
            version: {
              increment: 1,
            },
          },
          where: {
            id: patientId,
          },
        });
        await this.recordAudit(tx, {
          action: PATIENT_AUDIT_ACTIONS.archived,
          actorUserId: context.actorUserId,
          requestMetadata: context.requestMetadata,
          resourceId: patientId,
        });
      });
    }

    return this.getPatient(patientId, defaultActions());
  }

  public async restorePatient(context: ActorContext, patientId: string): Promise<PatientDetailView> {
    const patient = await this.findPatientOrThrow(patientId);
    if (patient.isArchived) {
      await this.prisma.$transaction(async (tx) => {
        await tx.patient.update({
          data: {
            archivedAt: null,
            archivedByUserId: null,
            isArchived: false,
            updatedByUserId: context.actorUserId,
            version: {
              increment: 1,
            },
          },
          where: {
            id: patientId,
          },
        });
        await this.recordAudit(tx, {
          action: PATIENT_AUDIT_ACTIONS.restored,
          actorUserId: context.actorUserId,
          requestMetadata: context.requestMetadata,
          resourceId: patientId,
        });
      });
    }

    return this.getPatient(patientId, defaultActions());
  }

  public async findActivePatientOrThrow(client: Prisma.TransactionClient | PrismaService, patientId: string): Promise<PatientRecord> {
    const patient = await client.patient.findUnique({
      where: {
        id: patientId,
      },
    });

    if (!patient) {
      throw new BadRequestException("Pacientul nu a fost găsit.");
    }

    if (patient.isArchived) {
      throw new BadRequestException("Pacientul arhivat nu poate fi folosit pentru lucrări noi.");
    }

    return patient;
  }

  private async findPatientOrThrow(patientId: string): Promise<PatientRecord> {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id: patientId,
      },
    });

    if (!patient) {
      throw new NotFoundException("Pacientul nu a fost găsit.");
    }

    return patient;
  }

  private async findPatientDetailOrThrow(patientId: string): Promise<PatientRecord & { readonly clinic: { readonly id: string; readonly name: string } | null; readonly doctor: { readonly displayName: string; readonly id: string } | null }> {
    const patient = await this.prisma.patient.findUnique({
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        doctor: {
          select: {
            displayName: true,
            id: true,
          },
        },
      },
      where: {
        id: patientId,
      },
    });

    if (!patient) {
      throw new NotFoundException("Pacientul nu a fost găsit.");
    }

    return patient;
  }

  private async findPatientWorks(patientId: string, query: Partial<PatientWorksQueryDto>): Promise<readonly PatientWorkRecord[]> {
    return this.prisma.workOrder.findMany({
      include: patientWorkInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      where: this.toPatientWorkWhere(patientId, query),
    });
  }

  private toPatientWhere(query: ListPatientsQueryDto): Prisma.PatientWhereInput {
    const search = query.search?.trim();
    const workFilter = this.toWorkFilter(query);
    const andFilters: Prisma.PatientWhereInput[] = [];

    if (workFilter) {
      andFilters.push({ workOrders: { some: workFilter } });
    }

    if (query.hasActiveWorks !== undefined) {
      andFilters.push(query.hasActiveWorks
        ? { workOrders: { some: { status: { in: [...ACTIVE_WORK_STATUSES] } } } }
        : { workOrders: { none: { status: { in: [...ACTIVE_WORK_STATUSES] } } } });
    }

    return {
      ...(query.activeOnly === false ? {} : { isArchived: false }),
      ...(search ? this.toPatientSearchWhere(search) : {}),
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };
  }

  private toPatientSearchWhere(search: string): Prisma.PatientWhereInput {
    const normalized = normalizeSearch(search);

    return {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { normalizedFirstName: { contains: normalized } },
        { normalizedLastName: { contains: normalized } },
        { workOrders: { some: { code: { contains: search, mode: "insensitive" } } } },
        { workOrders: { some: { patientName: { contains: search, mode: "insensitive" } } } },
      ],
    };
  }

  private toWorkFilter(query: Pick<ListPatientsQueryDto, "clinicId" | "dateFrom" | "dateTo" | "doctorId">): Prisma.WorkOrderWhereInput | null {
    const filter: Prisma.WorkOrderWhereInput = {
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: parseDateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: parseDateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    return Object.keys(filter).length > 0 ? filter : null;
  }

  private toPatientWorkWhere(patientId: string, query: Partial<PatientWorksQueryDto>): Prisma.WorkOrderWhereInput {
    return {
      patientId,
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
      ...(query.status ? { status: query.status as WorkStatus } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: parseDateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: parseDateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
    };
  }

  private async getAggregates(patientIds: readonly string[]): Promise<Map<string, PatientAggregate>> {
    if (patientIds.length === 0) {
      return new Map();
    }

    const works = await this.prisma.workOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        doctor: {
          select: {
            displayName: true,
            id: true,
          },
        },
        patientId: true,
        status: true,
        createdAt: true,
      },
      where: {
        patientId: {
          in: [...patientIds],
        },
      },
    });

    const aggregates = new Map<string, PatientAggregate>();
    for (const patientId of patientIds) {
      aggregates.set(patientId, emptyAggregate());
    }

    for (const work of works) {
      if (!work.patientId) {
        continue;
      }
      const current = aggregates.get(work.patientId) ?? emptyAggregate();
      aggregates.set(work.patientId, {
        activeWorks: current.activeWorks + (ACTIVE_WORK_STATUSES.includes(work.status as (typeof ACTIVE_WORK_STATUSES)[number]) ? 1 : 0),
        lastClinic: current.lastClinic ?? work.clinic,
        lastDoctor: current.lastDoctor ?? work.doctor,
        lastWorkDate: current.lastWorkDate ?? work.createdAt,
        totalWorks: current.totalWorks + 1,
      });
    }

    return aggregates;
  }

  private toUpdateData(dto: UpdatePatientDto, actorUserId: string, before: PatientRecord): Prisma.PatientUncheckedUpdateInput {
    const data: Prisma.PatientUncheckedUpdateInput = {
      updatedByUserId: actorUserId,
      version: {
        increment: 1,
      },
    };
    const firstName = dto.firstName ?? before.firstName;
    const lastName = dto.lastName ?? before.lastName;
    const normalized = normalizePatientName(firstName, lastName);

    for (const field of PATIENT_MUTATION_FIELDS) {
      if (!(field in dto)) {
        continue;
      }
      const value = dto[field];
      if (value === undefined) {
        continue;
      }

      switch (field) {
        case "birthDate":
          data.birthDate = value === null ? null : parseDateOnly(value);
          break;
        case "clinicId":
          data.clinicId = value ?? null;
          break;
        case "firstName":
          if (typeof value === "string") {
            data.firstName = value;
            data.normalizedFirstName = normalized.firstName;
          }
          break;
        case "lastName":
          if (typeof value === "string") {
            data.lastName = value;
            data.normalizedLastName = normalized.lastName;
          }
          break;
        case "doctorId":
          data.doctorId = value ?? null;
          break;
        case "notes":
          data.notes = value;
          break;
        case "sex":
          data.sex = value as PatientSex;
          break;
      }
    }

    return data;
  }

  private async validateReferral(client: Prisma.TransactionClient | PrismaService, clinicId: string | null | undefined, doctorId: string | null | undefined): Promise<void> {
    if (clinicId !== undefined && clinicId !== null) {
      const clinic = await client.clinic.findFirst({ select: { id: true }, where: { id: clinicId, isActive: true } });
      if (!clinic) {
        throw new BadRequestException("Clinica selectată nu este activă.");
      }
    }

    if (doctorId !== undefined && doctorId !== null) {
      const doctor = await client.doctor.findFirst({
        select: { clinicId: true, id: true },
        where: { id: doctorId, isActive: true },
      });
      if (!doctor) {
        throw new BadRequestException("Medicul selectat nu este activ.");
      }
      if (clinicId !== undefined && clinicId !== null && doctor.clinicId !== clinicId) {
        throw new BadRequestException("Medicul selectat nu aparține clinicii alese.");
      }
    }
  }

  private getChangedFields(before: PatientRecord, after: PatientRecord): readonly string[] {
    return PATIENT_MUTATION_FIELDS.filter((field) => {
      if (field === "birthDate") {
        return before.birthDate?.getTime() !== after.birthDate?.getTime();
      }

      return before[field] !== after[field];
    });
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
      resourceType: PATIENT_RESOURCE_TYPE,
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

export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizePatientName(firstName: string, lastName: string): { readonly firstName: string; readonly lastName: string } {
  return {
    firstName: normalizeSearch(firstName).slice(0, 80),
    lastName: normalizeSearch(lastName).slice(0, 80),
  };
}

function parseDateOnly(value: string): Date {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Data pacientului nu este validă.");
  }

  return date;
}

function emptyAggregate(): PatientAggregate {
  return {
    activeWorks: 0,
    lastClinic: null,
    lastDoctor: null,
    lastWorkDate: null,
    totalWorks: 0,
  };
}

function defaultActions(): PatientAccessActions {
  return {
    canArchive: false,
    canCreateWork: false,
    canReadDocuments: false,
    canRestore: false,
    canUpdate: false,
  };
}
