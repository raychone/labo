import { IsIn } from "class-validator";

export const LEGAL_ENTITY_CODES = ["CDT", "NG"] as const;
export const LEGACY_LEGAL_ENTITY_CODES = ["NC"] as const;

export type LegalEntityCode = (typeof LEGAL_ENTITY_CODES | typeof LEGACY_LEGAL_ENTITY_CODES)[number];

export class SelectOrganizationContextDto {
  @IsIn(LEGAL_ENTITY_CODES)
  public readonly code!: LegalEntityCode;
}
