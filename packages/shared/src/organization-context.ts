export const LEGAL_ENTITY_CODES = ["CDT", "NG"] as const;
export const LEGACY_LEGAL_ENTITY_CODES = ["NC"] as const;

export type LegalEntityCode = (typeof LEGAL_ENTITY_CODES)[number] | (typeof LEGACY_LEGAL_ENTITY_CODES)[number];

export interface LegalEntityOption {
  readonly code: LegalEntityCode;
  readonly displayName: string;
}

export interface OrganizationContextView {
  readonly active: LegalEntityOption | null;
  readonly available: readonly LegalEntityOption[];
  readonly canSwitch: boolean;
}

export interface SelectOrganizationContextInput {
  readonly code: LegalEntityCode;
}

export const LEGAL_ENTITY_DISPLAY_NAMES: Readonly<Record<LegalEntityCode, string>> = {
  CDT: "Nicolaie Cristina",
  NG: "Nicolaie Gabriel",
  NC: "Nicolaie Cristina",
};

export function isLegalEntityCode(value: string): value is LegalEntityCode {
  return (LEGAL_ENTITY_CODES as readonly string[]).includes(value);
}

export function getLegalEntityDisplayName(code: LegalEntityCode): string {
  return LEGAL_ENTITY_DISPLAY_NAMES[code];
}

export function formatLegalEntityOption(option: LegalEntityOption): string {
  return `${option.code} - ${option.displayName}`;
}
