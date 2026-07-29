import type { LegalEntity, Prisma } from "@prisma/client";

import type { LegalEntityCode } from "./dto/organization-context.dto.js";

export interface LegalEntityOption {
  readonly code: LegalEntityCode;
  readonly displayName: string;
}

export interface OrganizationContextView {
  readonly active: LegalEntityOption | null;
  readonly available: readonly LegalEntityOption[];
  readonly canSwitch: boolean;
}

export interface LegalEntityContext {
  readonly code: LegalEntityCode;
  readonly displayName: string;
  readonly id: string;
}

export function toLegalEntityOption(entity: Pick<LegalEntity, "code" | "displayName">): LegalEntityOption {
  return {
    code: entity.code as LegalEntityCode,
    displayName: entity.displayName,
  };
}

export function toLegalEntityContext(entity: Pick<LegalEntity, "code" | "displayName" | "id">): LegalEntityContext {
  return {
    code: entity.code as LegalEntityCode,
    displayName: entity.displayName,
    id: entity.id,
  };
}

export function toOrganizationContextView(input: {
  readonly active: LegalEntityContext | null;
  readonly available: readonly Pick<LegalEntity, "code" | "displayName">[];
  readonly canSwitch: boolean;
}): OrganizationContextView {
  return {
    active: input.active ? toLegalEntityOption(input.active) : null,
    available: input.available.map(toLegalEntityOption),
    canSwitch: input.canSwitch,
  };
}

export function buildLegalEntityAuditMetadata(context: LegalEntityContext | null): Prisma.InputJsonObject {
  return context === null ? {} : { legalEntityCode: context.code };
}
