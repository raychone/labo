import type { LegalEntity, LegalEntitySettings as PrismaLegalEntitySettings } from "@prisma/client";
import type { LegalEntityCode } from "../organization-context/dto/organization-context.dto.js";

export interface LegalEntitySettingsView {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly bankName: string | null;
  readonly city: string | null;
  readonly companyRegistrationNumber: string | null;
  readonly countryCode: string;
  readonly countyOrRegion: string | null;
  readonly createdAt: string;
  readonly currency: string;
  readonly documentFooter: string | null;
  readonly email: string | null;
  readonly iban: string | null;
  readonly laboratoryName: string;
  readonly legalName: string | null;
  readonly locale: string;
  readonly logoFileKey: string | null;
  readonly phone: string | null;
  readonly postalCode: string | null;
  readonly primaryColor: string;
  readonly taxId: string | null;
  readonly timezone: string;
  readonly updatedAt: string;
  readonly website: string | null;
}

export interface ContextualSettingsView extends LegalEntitySettingsView {
  readonly legalEntity: {
    readonly code: LegalEntityCode;
    readonly displayName: string;
  };
  readonly legalEntityCode: LegalEntityCode;
  readonly legalEntityDisplayName: string;
}

export type LegalEntitySettingsRecord = PrismaLegalEntitySettings & {
  readonly legalEntity: Pick<LegalEntity, "code" | "displayName">;
};

export function toContextualSettingsView(settings: LegalEntitySettingsRecord): ContextualSettingsView {
  const code = settings.legalEntity.code as LegalEntityCode;

  return {
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    bankName: settings.bankName,
    city: settings.city,
    companyRegistrationNumber: settings.companyRegistrationNumber,
    countryCode: settings.countryCode,
    countyOrRegion: settings.countyOrRegion,
    createdAt: settings.createdAt.toISOString(),
    currency: settings.currency,
    documentFooter: settings.documentFooter,
    email: settings.email,
    iban: settings.iban,
    laboratoryName: settings.legalEntity.displayName,
    legalEntity: {
      code,
      displayName: settings.legalEntity.displayName,
    },
    legalEntityCode: code,
    legalEntityDisplayName: settings.legalEntity.displayName,
    legalName: settings.legalName,
    locale: settings.locale,
    logoFileKey: settings.logoFileKey,
    phone: settings.phone,
    postalCode: settings.postalCode,
    primaryColor: settings.primaryColor,
    taxId: settings.taxId,
    timezone: settings.timezone,
    updatedAt: settings.updatedAt.toISOString(),
    website: settings.website,
  };
}
