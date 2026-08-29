import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { CLINIC_RESOURCE_TYPE, CLINICS_AUDIT_ACTIONS } from "./clinics.constants.js";
import { resolveCanonicalLegalEntity } from "./legal-entity.js";
import type { CreateClinicDto, ListClinicsQueryDto, UpdateClinicDto } from "./dto/clinics.dto.js";
import {
  type ClinicDetailView,
  type ClinicOptionView,
  type PaginatedClinicsView,
  toClinicDetailView,
  toClinicOptionView,
  toClinicSummaryView,
} from "./clinics.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

type AuditClient = Pick<Prisma.TransactionClient, "auditLog"> | Pick<PrismaService, "auditLog">;

const CLINIC_MUTATION_FIELDS = [
  "addressLine1",
  "addressLine2",
  "billingAddressLine1",
  "billingAddressLine2",
  "billingCity",
  "billingCountryCode",
  "billingCountyOrRegion",
  "billingName",
  "billingPostalCode",
  "billingRegistrationNumber",
  "billingTaxId",
  "city",
  "contactPersonEmail",
  "contactPersonName",
  "contactPersonPhone",
  "contactPersonRole",
  "countryCode",
  "countyOrRegion",
  "email",
  "internalNotes",
  "legalEntityCode",
  "legalName",
  "name",
  "phone",
  "postalCode",
  "registrationNumber",
  "taxId",
  "website",
] as const satisfies readonly (keyof UpdateClinicDto)[];

@Injectable()
export class ClinicsService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async listClinics(query: ListClinicsQueryDto): Promise<PaginatedClinicsView> {
    const pageSize = Math.min(query.pageSize, 100);
    const page = Math.max(query.page, 1);
    const search = query.search?.trim();
    const city = query.city?.trim();
    const where: Prisma.ClinicWhereInput = {
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { legalName: { contains: search, mode: "insensitive" } },
              { taxId: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, clinics] = await this.prisma.$transaction([
      this.prisma.clinic.count({ where }),
      this.prisma.clinic.findMany({
        include: { legalEntity: true },
        orderBy: {
          [query.sortBy]: query.sortDirection,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
    ]);

    return {
      items: clinics.map(toClinicSummaryView),
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      total,
    };
  }

  public async listClinicOptions(): Promise<readonly ClinicOptionView[]> {
    const clinics = await this.prisma.clinic.findMany({
      include: { legalEntity: true },
      orderBy: {
        name: "asc",
      },
      where: {
        isActive: true,
      },
    });

    return clinics.map(toClinicOptionView);
  }

  public async getClinic(clinicId: string): Promise<ClinicDetailView> {
    const clinic = await this.findClinicOrThrow(clinicId);
    return toClinicDetailView(clinic);
  }

  public async createClinic(context: ActorContext, dto: CreateClinicDto): Promise<ClinicDetailView> {
    const clinic = await this.prisma.$transaction(async (tx) => {
      const code = await this.generateClinicCode(tx);
      const legalEntity = await resolveCanonicalLegalEntity(tx, dto.legalEntityCode);
      const createdClinic = await tx.clinic.create({
        data: {
          ...this.toCreateData(dto, context.actorUserId, code),
          ...(legalEntity ? { legalEntityId: legalEntity.id } : {}),
        },
        include: { legalEntity: true },
      });

      await this.recordAudit(tx, {
        action: CLINICS_AUDIT_ACTIONS.created,
        actorUserId: context.actorUserId,
        metadata: { code, name: createdClinic.name },
        requestMetadata: context.requestMetadata,
        resourceId: createdClinic.id,
      });

      return createdClinic;
    });

    return toClinicDetailView(clinic);
  }

  public async updateClinic(context: ActorContext, clinicId: string, dto: UpdateClinicDto): Promise<ClinicDetailView> {
    const before = await this.findClinicOrThrow(clinicId);

    if (!before.isActive) {
      throw new BadRequestException("Archived clinics must be restored before editing.");
    }

    const legalEntity = dto.legalEntityCode ? await resolveCanonicalLegalEntity(this.prisma, dto.legalEntityCode) : null;
    const data = this.toUpdateData(dto, context.actorUserId);
    if (dto.legalEntityCode && legalEntity) data.legalEntityId = legalEntity.id;
    if (Object.keys(data).length <= 1) {
      throw new BadRequestException("No clinic fields were provided.");
    }

    const after = await this.prisma.$transaction(async (tx) => {
      const updatedClinic = await tx.clinic.update({
        data,
        where: {
          id: clinicId,
        },
        include: { legalEntity: true },
      });
      const changedFields = this.getChangedFields(before, updatedClinic);

      if (changedFields.length > 0) {
        await this.recordAudit(tx, {
          action: CLINICS_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: { fieldsChanged: changedFields },
          requestMetadata: context.requestMetadata,
          resourceId: clinicId,
        });
      }

      return updatedClinic;
    });

    return toClinicDetailView(after);
  }

  public async archiveClinic(context: ActorContext, clinicId: string): Promise<ClinicDetailView> {
    const clinic = await this.findClinicOrThrow(clinicId);

    if (!clinic.isActive) {
      return toClinicDetailView(clinic);
    }

    const archivedClinic = await this.prisma.$transaction(async (tx) => {
      const updatedClinic = await tx.clinic.update({
        data: {
          archivedAt: new Date(),
          archivedByUserId: context.actorUserId,
          isActive: false,
          updatedByUserId: context.actorUserId,
          version: {
            increment: 1,
          },
        },
        where: {
          id: clinicId,
        },
        include: { legalEntity: true },
      });

      await this.recordAudit(tx, {
        action: CLINICS_AUDIT_ACTIONS.archived,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: clinicId,
      });

      return updatedClinic;
    });

    return toClinicDetailView(archivedClinic);
  }

  public async restoreClinic(context: ActorContext, clinicId: string): Promise<ClinicDetailView> {
    const clinic = await this.findClinicOrThrow(clinicId);

    if (clinic.isActive) {
      return toClinicDetailView(clinic);
    }

    const restoredClinic = await this.prisma.$transaction(async (tx) => {
      const updatedClinic = await tx.clinic.update({
        data: {
          archivedAt: null,
          archivedByUserId: null,
          isActive: true,
          updatedByUserId: context.actorUserId,
          version: {
            increment: 1,
          },
        },
        where: {
          id: clinicId,
        },
      });

      await this.recordAudit(tx, {
        action: CLINICS_AUDIT_ACTIONS.restored,
        actorUserId: context.actorUserId,
        requestMetadata: context.requestMetadata,
        resourceId: clinicId,
      });

      return updatedClinic;
    });

    return toClinicDetailView(restoredClinic);
  }

  private async findClinicOrThrow(clinicId: string): Promise<Prisma.ClinicGetPayload<{ include: { legalEntity: true } }>> {
    const clinic = await this.prisma.clinic.findUnique({
      include: { legalEntity: true },
      where: {
        id: clinicId,
      },
    });

    if (!clinic) {
      throw new NotFoundException("Clinic was not found.");
    }

    return clinic;
  }

  private async generateClinicCode(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<readonly { readonly nextval: bigint }[]>`SELECT nextval('clinic_code_seq')::bigint AS nextval`;
    const nextValue = rows[0]?.nextval;

    if (nextValue === undefined) {
      throw new BadRequestException("Clinic code could not be generated.");
    }

    return `CL-${nextValue.toString().padStart(4, "0")}`;
  }

  private toCreateData(dto: CreateClinicDto, actorUserId: string, code: string): Prisma.ClinicUncheckedCreateInput {
    const mutationData = this.toMutationData(dto);
    const data: Prisma.ClinicUncheckedCreateInput = {
      code,
      createdByUserId: actorUserId,
      name: dto.name,
      updatedByUserId: actorUserId,
    };

    return Object.assign(data, mutationData);
  }

  private toUpdateData(dto: UpdateClinicDto, actorUserId: string): Prisma.ClinicUncheckedUpdateInput {
    const mutationData = this.toMutationData(dto);
    const data: Prisma.ClinicUncheckedUpdateInput = {
      updatedByUserId: actorUserId,
      version: {
        increment: 1,
      },
    };

    return Object.assign(data, mutationData);
  }

  private toMutationData(dto: UpdateClinicDto): Prisma.ClinicUncheckedUpdateInput {
    const data: Prisma.ClinicUncheckedUpdateInput = {};

    for (const field of CLINIC_MUTATION_FIELDS) {
      if (!(field in dto)) {
        continue;
      }

      const value = dto[field];
      if (field === "name") {
        if (value === undefined || value === null || value === "") {
          continue;
        }
        data.name = value;
        continue;
      }

      if (value === undefined) {
        continue;
      }

      this.assignMutationValue(data, field, value);
    }

    return data;
  }

  private assignMutationValue(
    data: Prisma.ClinicUncheckedUpdateInput,
    field: Exclude<(typeof CLINIC_MUTATION_FIELDS)[number], "name">,
    value: string | null,
  ): void {
    switch (field) {
      case "addressLine1":
        data.addressLine1 = value;
        return;
      case "addressLine2":
        data.addressLine2 = value;
        return;
      case "billingAddressLine1":
        data.billingAddressLine1 = value;
        return;
      case "billingAddressLine2":
        data.billingAddressLine2 = value;
        return;
      case "billingCity":
        data.billingCity = value;
        return;
      case "billingCountryCode":
        if (value !== null) {
          data.billingCountryCode = value;
        }
        return;
      case "billingCountyOrRegion":
        data.billingCountyOrRegion = value;
        return;
      case "billingName":
        data.billingName = value;
        return;
      case "billingPostalCode":
        data.billingPostalCode = value;
        return;
      case "billingRegistrationNumber":
        data.billingRegistrationNumber = value;
        return;
      case "billingTaxId":
        data.billingTaxId = value;
        return;
      case "city":
        data.city = value;
        return;
      case "contactPersonEmail":
        data.contactPersonEmail = value;
        return;
      case "contactPersonName":
        data.contactPersonName = value;
        return;
      case "contactPersonPhone":
        data.contactPersonPhone = value;
        return;
      case "contactPersonRole":
        data.contactPersonRole = value;
        return;
      case "countryCode":
        if (value !== null) {
          data.countryCode = value;
        }
        return;
      case "countyOrRegion":
        data.countyOrRegion = value;
        return;
      case "email":
        data.email = value;
        return;
      case "internalNotes":
        data.internalNotes = value;
        return;
      case "legalName":
        data.legalName = value;
        return;
      case "phone":
        data.phone = value;
        return;
      case "postalCode":
        data.postalCode = value;
        return;
      case "registrationNumber":
        data.registrationNumber = value;
        return;
      case "taxId":
        data.taxId = value;
        return;
      case "website":
        data.website = value;
        return;
    }
  }

  private getChangedFields(
    before: Prisma.ClinicGetPayload<object>,
    after: Prisma.ClinicGetPayload<object>,
  ): readonly (typeof CLINIC_MUTATION_FIELDS)[number][] {
    return CLINIC_MUTATION_FIELDS.filter((field) => field === "legalEntityCode"
      ? before.legalEntityId !== after.legalEntityId
      : before[field] !== after[field]);
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
      resourceType: CLINIC_RESOURCE_TYPE,
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
