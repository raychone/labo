import type { LaboratorySettings as PrismaLaboratorySettings } from "@prisma/client";

export interface LaboratorySettingsView {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly companyRegistrationNumber: string | null;
  readonly countryCode: string;
  readonly countyOrRegion: string | null;
  readonly createdAt: string;
  readonly currency: string;
  readonly documentFooter: string | null;
  readonly email: string | null;
  readonly id: string;
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
  readonly updatedByUserId: string | null;
  readonly website: string | null;
}

export function toLaboratorySettingsView(settings: PrismaLaboratorySettings): LaboratorySettingsView {
  return {
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    city: settings.city,
    companyRegistrationNumber: settings.companyRegistrationNumber,
    countryCode: settings.countryCode,
    countyOrRegion: settings.countyOrRegion,
    createdAt: settings.createdAt.toISOString(),
    currency: settings.currency,
    documentFooter: settings.documentFooter,
    email: settings.email,
    id: settings.id,
    laboratoryName: settings.laboratoryName,
    legalName: settings.legalName,
    locale: settings.locale,
    logoFileKey: settings.logoFileKey,
    phone: settings.phone,
    postalCode: settings.postalCode,
    primaryColor: settings.primaryColor,
    taxId: settings.taxId,
    timezone: settings.timezone,
    updatedAt: settings.updatedAt.toISOString(),
    updatedByUserId: settings.updatedByUserId,
    website: settings.website,
  };
}
