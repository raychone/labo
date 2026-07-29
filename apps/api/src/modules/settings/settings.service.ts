import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import type { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import {
  DEFAULT_LABORATORY_SETTINGS,
  DEFAULT_LEGAL_ENTITY_SETTINGS,
  SETTINGS_AUDIT_ACTIONS,
  SETTINGS_RESOURCE_TYPE,
  SETTINGS_SINGLETON_KEY,
} from "./settings.constants.js";
import { toContextualSettingsView, type ContextualSettingsView, type LegalEntitySettingsRecord } from "./settings.view.js";

interface ActorContext {
  readonly actorUserId: string;
  readonly legalEntity: LegalEntityContext;
  readonly requestMetadata: RequestMetadata;
}

const EDITABLE_FIELDS = [
  "addressLine1",
  "addressLine2",
  "bankName",
  "city",
  "companyRegistrationNumber",
  "countryCode",
  "countyOrRegion",
  "currency",
  "documentFooter",
  "email",
  "iban",
  "legalName",
  "phone",
  "postalCode",
  "primaryColor",
  "taxId",
  "timezone",
  "locale",
  "website",
] as const satisfies readonly (keyof UpdateSettingsDto)[];

@Injectable()
export class SettingsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  public async getSettings(legalEntity: LegalEntityContext): Promise<ContextualSettingsView> {
    const settings = await this.findOrCreateSettings(this.prisma, legalEntity);

    return toContextualSettingsView(settings);
  }

  public async updateSettings(context: ActorContext, dto: UpdateSettingsDto): Promise<ContextualSettingsView> {
    this.rejectSpoofedContextFields(dto);

    if (this.getProvidedEditableFields(dto).length === 0) {
      throw new BadRequestException("No settings fields were provided.");
    }

    const updatedSettings = await this.prisma.$transaction(async (tx) => {
      const before = await this.findOrCreateSettings(tx, context.legalEntity);
      const after = await tx.legalEntitySettings.update({
        data: this.toUpdateData(dto, context.actorUserId),
        include: {
          legalEntity: {
            select: {
              code: true,
              displayName: true,
            },
          },
        },
        where: {
          legalEntityId: before.legalEntityId,
        },
      });
      const changedFields = this.getChangedFields(before, after);

      if (changedFields.length > 0) {
        const auditData: Prisma.AuditLogUncheckedCreateInput = {
          action: SETTINGS_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: {
            changedFields,
            legalEntityCode: context.legalEntity.code,
            previousUpdatedAt: before.updatedAt.toISOString(),
          },
          resourceId: context.legalEntity.code,
          resourceType: SETTINGS_RESOURCE_TYPE,
        };

        if (context.requestMetadata.ipAddress) {
          auditData.ipAddress = context.requestMetadata.ipAddress;
        }

        if (context.requestMetadata.userAgent) {
          auditData.userAgent = context.requestMetadata.userAgent;
        }

        await tx.auditLog.create({ data: auditData });
      }

      return after;
    });

    return toContextualSettingsView(updatedSettings);
  }

  private async findOrCreateSettings(
    client: Prisma.TransactionClient | PrismaService,
    legalEntityContext: LegalEntityContext,
  ): Promise<LegalEntitySettingsRecord> {
    const legalEntity = await client.legalEntity.findFirst({
      select: {
        code: true,
        displayName: true,
        id: true,
        isActive: true,
      },
      where: {
        code: legalEntityContext.code,
        isActive: true,
      },
    });

    if (!legalEntity) {
      throw new UnprocessableEntityException("Firma activă nu mai este disponibilă.");
    }

    const legacySettings = await client.laboratorySettings.findUnique({
      where: {
        key: SETTINGS_SINGLETON_KEY,
      },
    });

    return client.legalEntitySettings.upsert({
      create: {
        addressLine1: legacySettings?.addressLine1 ?? null,
        addressLine2: legacySettings?.addressLine2 ?? null,
        city: legacySettings?.city ?? null,
        companyRegistrationNumber: legacySettings?.companyRegistrationNumber ?? null,
        countryCode: "RO",
        countyOrRegion: legacySettings?.countyOrRegion ?? null,
        currency: "RON",
        documentFooter: legacySettings?.documentFooter ?? DEFAULT_LEGAL_ENTITY_SETTINGS.documentFooter,
        email: legacySettings?.email ?? null,
        legalEntityId: legalEntity.id,
        legalName: legacySettings?.legalName ?? legalEntity.displayName,
        locale: "ro-RO",
        logoFileKey: legacySettings?.logoFileKey ?? null,
        phone: legacySettings?.phone ?? null,
        postalCode: legacySettings?.postalCode ?? null,
        primaryColor: legacySettings?.primaryColor ?? DEFAULT_LABORATORY_SETTINGS.primaryColor,
        taxId: legacySettings?.taxId ?? null,
        timezone: "Europe/Bucharest",
        website: legacySettings?.website ?? null,
      },
      include: {
        legalEntity: {
          select: {
            code: true,
            displayName: true,
          },
        },
      },
      update: {},
      where: {
        legalEntityId: legalEntity.id,
      },
    });
  }

  private toUpdateData(dto: UpdateSettingsDto, actorUserId: string): Prisma.LegalEntitySettingsUncheckedUpdateInput {
    const data: Prisma.LegalEntitySettingsUncheckedUpdateInput = {
      updatedByUserId: actorUserId,
    };

    for (const field of EDITABLE_FIELDS) {
      if (!(field in dto)) {
        continue;
      }

      const value = dto[field];
      if (field === "legalName" && (value === null || value === "")) {
        throw new BadRequestException("Legal name is required.");
      }

      this.assignUpdateValue(data, field, value);
    }

    return data;
  }

  private getProvidedEditableFields(dto: UpdateSettingsDto): readonly (typeof EDITABLE_FIELDS)[number][] {
    return EDITABLE_FIELDS.filter((field) => field in dto);
  }

  private rejectSpoofedContextFields(dto: UpdateSettingsDto): void {
    for (const field of ["activeLegalEntityId", "code", "legalEntityCode", "legalEntityId"] as const) {
      if (dto[field] !== undefined) {
        throw new BadRequestException("Firma activă nu poate fi schimbată din payload-ul setărilor.");
      }
    }
  }

  private assignUpdateValue(
    data: Prisma.LegalEntitySettingsUncheckedUpdateInput,
    field: (typeof EDITABLE_FIELDS)[number],
    value: string | null | undefined,
  ): void {
    if (value === undefined) {
      return;
    }

    switch (field) {
      case "addressLine1":
        data.addressLine1 = value;
        return;
      case "addressLine2":
        data.addressLine2 = value;
        return;
      case "bankName":
        data.bankName = value;
        return;
      case "city":
        data.city = value;
        return;
      case "companyRegistrationNumber":
        data.companyRegistrationNumber = value;
        return;
      case "countryCode":
        if (value !== null) {
          data.countryCode = value;
        }
        return;
      case "countyOrRegion":
        data.countyOrRegion = value;
        return;
      case "currency":
        if (value !== null) {
          data.currency = value;
        }
        return;
      case "documentFooter":
        data.documentFooter = value;
        return;
      case "email":
        data.email = value;
        return;
      case "iban":
        data.iban = value;
        return;
      case "legalName":
        if (value !== null) {
          data.legalName = value;
        }
        return;
      case "locale":
        if (value !== null) {
          data.locale = value;
        }
        return;
      case "phone":
        data.phone = value;
        return;
      case "postalCode":
        data.postalCode = value;
        return;
      case "primaryColor":
        if (value !== null) {
          data.primaryColor = value;
        }
        return;
      case "taxId":
        data.taxId = value;
        return;
      case "timezone":
        if (value !== null) {
          data.timezone = value;
        }
        return;
      case "website":
        data.website = value;
        return;
    }
  }

  private getChangedFields(
    before: LegalEntitySettingsRecord,
    after: LegalEntitySettingsRecord,
  ): readonly (typeof EDITABLE_FIELDS)[number][] {
    return EDITABLE_FIELDS.filter((field) => before[field] !== after[field]);
  }
}
