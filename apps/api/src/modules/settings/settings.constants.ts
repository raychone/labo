export const SETTINGS_SINGLETON_KEY = "default";

export const SETTINGS_SUPPORTED_LOCALES = ["ro-RO"] as const;
export const SETTINGS_SUPPORTED_CURRENCIES = ["RON"] as const;
export const SETTINGS_SUPPORTED_TIMEZONES = ["Europe/Bucharest"] as const;
export const SETTINGS_SUPPORTED_COUNTRY_CODES = ["RO"] as const;

export const DEFAULT_LABORATORY_SETTINGS = {
  countryCode: "RO",
  currency: "RON",
  documentFooter: "Mulțumim pentru colaborare.",
  laboratoryName: "Dental Lab Management",
  locale: "ro-RO",
  primaryColor: "#0f766e",
  timezone: "Europe/Bucharest",
} as const;

export const DEFAULT_LEGAL_ENTITY_SETTINGS = {
  countryCode: "RO",
  currency: "RON",
  documentFooter: "Document demonstrativ. Datele juridice trebuie validate cu clientul.",
  locale: "ro-RO",
  primaryColor: "#0f766e",
  timezone: "Europe/Bucharest",
} as const;

export const SETTINGS_AUDIT_ACTIONS = {
  updated: "settings.updated",
} as const;

export const SETTINGS_RESOURCE_TYPE = "legal_entity_settings";
