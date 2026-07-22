import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  DEFAULT_LABORATORY_SETTINGS,
  SETTINGS_AUDIT_ACTIONS,
  SETTINGS_RESOURCE_TYPE,
  SETTINGS_SINGLETON_KEY,
} from "./settings.constants.js";
import type { UpdateSettingsDto } from "./dto/update-settings.dto.js";
import { toLaboratorySettingsView } from "./settings.view.js";

type SettingsView = ReturnType<typeof toLaboratorySettingsView>;

interface ActorContext {
  readonly actorUserId: string;
  readonly requestMetadata: RequestMetadata;
}

const EDITABLE_FIELDS = [
  "addressLine1",
  "addressLine2",
  "city",
  "companyRegistrationNumber",
  "countryCode",
  "countyOrRegion",
  "currency",
  "documentFooter",
  "email",
  "laboratoryName",
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
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async getSettings(): Promise<SettingsView> {
    const settings = await this.prisma.laboratorySettings.upsert({
      create: DEFAULT_LABORATORY_SETTINGS,
      update: {},
      where: {
        key: SETTINGS_SINGLETON_KEY,
      },
    });

    return toLaboratorySettingsView(settings);
  }

  public async updateSettings(context: ActorContext, dto: UpdateSettingsDto): Promise<SettingsView> {
    const data = this.toUpdateData(dto, context.actorUserId);

    if (this.getProvidedEditableFields(dto).length === 0) {
      throw new BadRequestException("No settings fields were provided.");
    }

    const updatedSettings = await this.prisma.$transaction(async (tx) => {
      const before = await tx.laboratorySettings.upsert({
        create: {
          ...DEFAULT_LABORATORY_SETTINGS,
          updatedByUserId: context.actorUserId,
        },
        update: {},
        where: {
          key: SETTINGS_SINGLETON_KEY,
        },
      });
      const after = await tx.laboratorySettings.update({
        data,
        where: {
          key: SETTINGS_SINGLETON_KEY,
        },
      });
      const changedFields = this.getChangedFields(before, after);

      if (changedFields.length > 0) {
        const auditData: Prisma.AuditLogUncheckedCreateInput = {
          action: SETTINGS_AUDIT_ACTIONS.updated,
          actorUserId: context.actorUserId,
          metadata: {
            after: this.pickFields(after, changedFields),
            before: this.pickFields(before, changedFields),
            fieldsChanged: changedFields,
          },
          resourceId: after.id,
          resourceType: SETTINGS_RESOURCE_TYPE,
        };

        if (context.requestMetadata.ipAddress) {
          auditData.ipAddress = context.requestMetadata.ipAddress;
        }

        if (context.requestMetadata.userAgent) {
          auditData.userAgent = context.requestMetadata.userAgent;
        }

        await tx.auditLog.create({
          data: auditData,
        });
      }

      return after;
    });

    return toLaboratorySettingsView(updatedSettings);
  }

  private toUpdateData(dto: UpdateSettingsDto, actorUserId: string): Prisma.LaboratorySettingsUncheckedUpdateInput {
    const data: Prisma.LaboratorySettingsUncheckedUpdateInput = {
      updatedByUserId: actorUserId,
    };

    for (const field of EDITABLE_FIELDS) {
      if (!(field in dto)) {
        continue;
      }

      const value = dto[field];
      if (field === "laboratoryName" && (value === null || value === "")) {
        throw new BadRequestException("Laboratory name is required.");
      }

      this.assignUpdateValue(data, field, value);
    }

    return data;
  }

  private getProvidedEditableFields(dto: UpdateSettingsDto): readonly (typeof EDITABLE_FIELDS)[number][] {
    return EDITABLE_FIELDS.filter((field) => field in dto);
  }

  private assignUpdateValue(
    data: Prisma.LaboratorySettingsUncheckedUpdateInput,
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
      case "city":
        data.city = value;
        return;
      case "companyRegistrationNumber":
        data.companyRegistrationNumber = value;
        return;
      case "countryCode":
        if (value === null) {
          return;
        }
        data.countryCode = value;
        return;
      case "countyOrRegion":
        data.countyOrRegion = value;
        return;
      case "currency":
        if (value === null) {
          return;
        }
        data.currency = value;
        return;
      case "documentFooter":
        data.documentFooter = value;
        return;
      case "email":
        data.email = value;
        return;
      case "laboratoryName":
        if (value === null) {
          return;
        }
        data.laboratoryName = value;
        return;
      case "legalName":
        data.legalName = value;
        return;
      case "locale":
        if (value === null) {
          return;
        }
        data.locale = value;
        return;
      case "phone":
        data.phone = value;
        return;
      case "postalCode":
        data.postalCode = value;
        return;
      case "primaryColor":
        if (value === null) {
          return;
        }
        data.primaryColor = value;
        return;
      case "taxId":
        data.taxId = value;
        return;
      case "timezone":
        if (value === null) {
          return;
        }
        data.timezone = value;
        return;
      case "website":
        data.website = value;
        return;
    }
  }

  private getChangedFields(
    before: Prisma.LaboratorySettingsGetPayload<object>,
    after: Prisma.LaboratorySettingsGetPayload<object>,
  ): readonly (typeof EDITABLE_FIELDS)[number][] {
    return EDITABLE_FIELDS.filter((field) => before[field] !== after[field]);
  }

  private pickFields(
    settings: Prisma.LaboratorySettingsGetPayload<object>,
    fields: readonly (typeof EDITABLE_FIELDS)[number][],
  ): Record<string, string | null> {
    return Object.fromEntries(fields.map((field) => [field, settings[field]]));
  }
}
