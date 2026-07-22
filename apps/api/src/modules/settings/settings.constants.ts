export const SETTINGS_SINGLETON_KEY = "default";

export const SETTINGS_SUPPORTED_LOCALES = ["ro-RO", "en-US", "fr-FR"] as const;
export const SETTINGS_SUPPORTED_CURRENCIES = ["RON", "EUR"] as const;
export const SETTINGS_SUPPORTED_TIMEZONES = ["Europe/Bucharest", "Europe/Paris", "UTC"] as const;

export const DEFAULT_LABORATORY_SETTINGS = {
  countryCode: "RO",
  currency: "RON",
  documentFooter: "Multumim pentru colaborare.",
  laboratoryName: "Dental Lab Management",
  locale: "ro-RO",
  primaryColor: "#0f766e",
  timezone: "Europe/Bucharest",
} as const;

export const SETTINGS_AUDIT_ACTIONS = {
  updated: "settings.updated",
} as const;

export const SETTINGS_RESOURCE_TYPE = "laboratory_settings";
