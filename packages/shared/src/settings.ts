export const SUPPORTED_LOCALES = ["ro-RO", "en-US", "fr-FR"] as const;
export const SUPPORTED_CURRENCIES = ["RON", "EUR"] as const;
export const SUPPORTED_TIMEZONES = ["Europe/Bucharest", "Europe/Paris", "UTC"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];

export interface LaboratorySettings {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly companyRegistrationNumber: string | null;
  readonly countryCode: string;
  readonly countyOrRegion: string | null;
  readonly createdAt: string;
  readonly currency: SupportedCurrency;
  readonly documentFooter: string | null;
  readonly email: string | null;
  readonly id: string;
  readonly laboratoryName: string;
  readonly legalName: string | null;
  readonly locale: SupportedLocale;
  readonly logoFileKey: string | null;
  readonly phone: string | null;
  readonly postalCode: string | null;
  readonly primaryColor: string;
  readonly taxId: string | null;
  readonly timezone: SupportedTimezone;
  readonly updatedAt: string;
  readonly updatedByUserId: string | null;
  readonly website: string | null;
}

export type UpdateLaboratorySettingsInput = Partial<
  Pick<
    LaboratorySettings,
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "companyRegistrationNumber"
    | "countryCode"
    | "countyOrRegion"
    | "currency"
    | "documentFooter"
    | "email"
    | "laboratoryName"
    | "legalName"
    | "locale"
    | "phone"
    | "postalCode"
    | "primaryColor"
    | "taxId"
    | "timezone"
    | "website"
  >
>;

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function isSupportedTimezone(value: string): value is SupportedTimezone {
  return (SUPPORTED_TIMEZONES as readonly string[]).includes(value);
}

export function formatDateTime(
  value: Date | number | string,
  settings: Pick<LaboratorySettings, "locale" | "timezone">,
): string {
  return new Intl.DateTimeFormat(settings.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: settings.timezone,
  }).format(new Date(value));
}

export function formatCurrency(
  amount: number,
  settings: Pick<LaboratorySettings, "currency" | "locale">,
): string {
  return new Intl.NumberFormat(settings.locale, {
    currency: settings.currency,
    style: "currency",
  }).format(amount);
}
