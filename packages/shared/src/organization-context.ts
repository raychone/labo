export const LEGAL_ENTITY_CODES = ["NC", "NG"] as const;

export type LegalEntityCode = (typeof LEGAL_ENTITY_CODES)[number];

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
  NC: "Nicolaie Cristina",
  NG: "Nicolaie Gabriel",
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
