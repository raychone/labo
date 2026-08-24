import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

export type CanonicalLegalEntityCode = "CDT" | "NG";
export type LegalEntityClient = Pick<Prisma.TransactionClient, "legalEntity">;

export interface LegalEntityContextInput {
  readonly clinicLegalEntityCode?: CanonicalLegalEntityCode | null;
  readonly doctorLegalEntityCode?: CanonicalLegalEntityCode | null;
}

export async function resolveCanonicalLegalEntity(
  client: LegalEntityClient,
  code: CanonicalLegalEntityCode | undefined,
): Promise<{ readonly id: string; readonly code: CanonicalLegalEntityCode; readonly displayName: string } | null> {
  if (!code) return null;
  const entity = await client.legalEntity.findFirst({ where: { code, isActive: true } });
  if (!entity) throw new NotFoundException(`Firma ${code} nu există sau nu este activă.`);
  return { id: entity.id, code: entity.code as CanonicalLegalEntityCode, displayName: entity.displayName };
}

export function assertCompatibleLegalEntities(
  clinicCode: CanonicalLegalEntityCode | null | undefined,
  doctorCode: CanonicalLegalEntityCode | null | undefined,
): CanonicalLegalEntityCode | null {
  if (clinicCode && doctorCode && clinicCode !== doctorCode) {
    throw new BadRequestException("Clinica și medicul aparțin unor firme incompatibile (CDT/NG).");
  }
  return clinicCode ?? doctorCode ?? null;
}

/** Canonical WorkOrder-facing contract. It deliberately has no current-user fallback. */
export function deriveLegalEntityCode(context: LegalEntityContextInput): CanonicalLegalEntityCode | null {
  return assertCompatibleLegalEntities(context.clinicLegalEntityCode, context.doctorLegalEntityCode);
}
