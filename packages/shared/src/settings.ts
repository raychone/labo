export const SUPPORTED_LOCALES = ["ro-RO"] as const;
export const SUPPORTED_CURRENCIES = ["RON"] as const;
export const SUPPORTED_TIMEZONES = ["Europe/Bucharest"] as const;
export const SUPPORTED_COUNTRY_CODES = ["RO"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];
export type SupportedCountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

export interface LegalEntitySettingsView {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly bankName: string | null;
  readonly city: string | null;
  readonly companyRegistrationNumber: string | null;
  readonly countryCode: SupportedCountryCode;
  readonly countyOrRegion: string | null;
  readonly createdAt: string;
  readonly currency: SupportedCurrency;
  readonly documentFooter: string | null;
  readonly email: string | null;
  readonly iban: string | null;
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
  readonly website: string | null;
}

export interface ContextualSettingsView extends LegalEntitySettingsView {
  readonly legalEntity: {
    readonly code: "CDT" | "NG";
    readonly displayName: string;
  };
  readonly legalEntityCode: "CDT" | "NG";
  readonly legalEntityDisplayName: string;
}

export type LaboratorySettings = ContextualSettingsView;

export type LegalEntitySettingsInput = Partial<
  Pick<
    LegalEntitySettingsView,
    | "addressLine1"
    | "addressLine2"
    | "bankName"
    | "city"
    | "companyRegistrationNumber"
    | "countryCode"
    | "countyOrRegion"
    | "currency"
    | "documentFooter"
    | "email"
    | "iban"
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

export type UpdateLaboratorySettingsInput = LegalEntitySettingsInput;

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function isSupportedTimezone(value: string): value is SupportedTimezone {
  return (SUPPORTED_TIMEZONES as readonly string[]).includes(value);
}

export function isSupportedCountryCode(value: string): value is SupportedCountryCode {
  return (SUPPORTED_COUNTRY_CODES as readonly string[]).includes(value);
}

export function formatDateTime(
  value: Date | number | string,
  settings: Pick<LegalEntitySettingsView, "locale" | "timezone">,
): string {
  return new Intl.DateTimeFormat(settings.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: settings.timezone,
  }).format(new Date(value));
}

export function formatCurrency(
  amount: number,
  settings: Pick<LegalEntitySettingsView, "currency" | "locale">,
): string {
  return new Intl.NumberFormat(settings.locale, {
    currency: settings.currency,
    style: "currency",
  }).format(amount);
}

export function formatContextualSettingsLabel(settings: Pick<ContextualSettingsView, "legalEntityCode" | "legalEntityDisplayName">): string {
  return `${settings.legalEntityCode} — ${settings.legalEntityDisplayName}`;
}
