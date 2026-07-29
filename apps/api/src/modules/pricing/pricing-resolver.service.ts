import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ExecutionTimeRule, PriceCatalogItem, PricingAdjustmentType, PricingAgreement, PricingAgreementRule, PricingRuleScope } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";

interface ResolvePricingInput {
  readonly clinicId: string;
  readonly doctorId: string;
  readonly evaluationDate: Date;
  readonly legalEntityId: string;
  readonly legalEntityCode: string;
  readonly quantity: number;
  readonly workTypeId: string;
}

type AgreementWithRules = PricingAgreement & {
  readonly rules: readonly PricingAgreementRule[];
};

type CatalogItemWithRules = PriceCatalogItem & {
  readonly executionTimeRules: readonly ExecutionTimeRule[];
};

type PricingResolverClient = Pick<PrismaService, "legalEntitySettings" | "priceCatalogItem" | "pricingAgreement">;

interface AppliedRule {
  readonly agreement: AgreementWithRules;
  readonly rule: PricingAgreementRule;
}

export interface PricingResolution {
  readonly appliedAgreementId: string | null;
  readonly appliedAgreementType: "CLINIC" | "DOCTOR" | null;
  readonly appliedRuleScope: PricingRuleScope | null;
  readonly catalogItemId: string;
  readonly currency: string;
  readonly executionTimeRule: ExecutionTimeRule | null;
  readonly executionTimeRules: readonly ExecutionTimeRule[];
  readonly explanation: string;
  readonly finalUnitPriceMinor: number;
  readonly legalEntityCode: string;
  readonly quantity: number;
  readonly resolutionTrace: readonly string[];
  readonly standardUnitPriceMinor: number;
  readonly totalPriceMinor: number;
  readonly workTypeId: string;
  readonly adjustment: {
    readonly basisPoints: number | null;
    readonly fixedAmountMinor: number | null;
    readonly overridePriceMinor: number | null;
    readonly type: PricingAdjustmentType | null;
  };
}

@Injectable()
export class PricingResolverService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async resolve(input: ResolvePricingInput, client: PricingResolverClient = this.prisma): Promise<PricingResolution> {
    const [catalogItem, settings] = await Promise.all([
      this.findCatalogItem(client, input.legalEntityId, input.workTypeId),
      client.legalEntitySettings.findUnique({
        select: { currency: true },
        where: { legalEntityId: input.legalEntityId },
      }),
    ]);

    const trace: string[] = [`Catalog ${input.legalEntityCode} găsit pentru tipul de lucrare.`];
    const [doctorAgreements, clinicAgreements] = await Promise.all([
      this.findActiveAgreements(client, {
        evaluationDate: input.evaluationDate,
        legalEntityId: input.legalEntityId,
        subjectId: input.doctorId,
        subjectType: "DOCTOR",
      }),
      this.findActiveAgreements(client, {
        evaluationDate: input.evaluationDate,
        legalEntityId: input.legalEntityId,
        subjectId: input.clinicId,
        subjectType: "CLINIC",
      }),
    ]);

    const doctorRule = findFirstApplicableAgreementRule(doctorAgreements, catalogItem);
    const clinicRule = doctorRule ? null : findFirstApplicableAgreementRule(clinicAgreements, catalogItem);
    const applied = doctorRule ?? clinicRule;
    const finalUnitPriceMinor = applied ? applyPricingAdjustment(catalogItem.standardPriceMinor, applied.rule) : catalogItem.standardPriceMinor;

    if (finalUnitPriceMinor < 0) {
      throw new BadRequestException("Regula de preț produce o valoare negativă.");
    }

    if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException("Cantitatea trebuie să fie un întreg pozitiv.");
    }

    const executionRule = selectExecutionTimeRule(catalogItem.executionTimeRules, input.quantity);
    const source = applied?.agreement.subjectType ?? null;

    if (doctorAgreements.length > 0 && !doctorRule) {
      trace.push("Acordul medicului nu are regulă aplicabilă; se verifică acordul clinicii.");
    }
    if (!applied) {
      trace.push("Nu s-a aplicat niciun acord; se folosește catalogul standard.");
    }

    return {
      adjustment: applied
        ? {
            basisPoints: applied.rule.adjustmentPercentageBasisPoints,
            fixedAmountMinor: applied.rule.adjustmentValueMinor,
            overridePriceMinor: applied.rule.overridePriceMinor,
            type: applied.rule.adjustmentType,
          }
        : {
            basisPoints: null,
            fixedAmountMinor: null,
            overridePriceMinor: null,
            type: null,
          },
      appliedAgreementId: applied?.agreement.id ?? null,
      appliedAgreementType: source,
      appliedRuleScope: applied?.rule.scope ?? null,
      catalogItemId: catalogItem.id,
      currency: settings?.currency ?? "RON",
      executionTimeRule: executionRule,
      executionTimeRules: catalogItem.executionTimeRules,
      explanation: createExplanation(source, applied?.rule.scope ?? null),
      finalUnitPriceMinor,
      legalEntityCode: input.legalEntityCode,
      quantity: input.quantity,
      resolutionTrace: trace,
      standardUnitPriceMinor: catalogItem.standardPriceMinor,
      totalPriceMinor: finalUnitPriceMinor * input.quantity,
      workTypeId: input.workTypeId,
    };
  }

  private async findCatalogItem(client: PricingResolverClient, legalEntityId: string, workTypeId: string): Promise<CatalogItemWithRules> {
    const catalogItem = await client.priceCatalogItem.findFirst({
      include: {
        executionTimeRules: {
          orderBy: [
            { minQuantity: "asc" },
            { priority: "asc" },
          ],
          where: { isActive: true },
        },
      },
      where: {
        archivedAt: null,
        isActive: true,
        legalEntityId,
        workTypeId,
      },
    });

    if (!catalogItem) {
      throw new NotFoundException("Nu există preț standard activ pentru firma activă și tipul de lucrare.");
    }

    return catalogItem;
  }

  private async findActiveAgreements(client: PricingResolverClient, input: {
    readonly evaluationDate: Date;
    readonly legalEntityId: string;
    readonly subjectId: string;
    readonly subjectType: "CLINIC" | "DOCTOR";
  }): Promise<readonly AgreementWithRules[]> {
    return client.pricingAgreement.findMany({
      include: {
        rules: true,
      },
      orderBy: [
        { validFrom: "desc" },
        { updatedAt: "desc" },
      ],
      where: {
        archivedAt: null,
        isActive: true,
        legalEntityId: input.legalEntityId,
        ...(input.subjectType === "DOCTOR" ? { doctorId: input.subjectId } : { clinicId: input.subjectId }),
        subjectType: input.subjectType,
        validFrom: { lte: input.evaluationDate },
        OR: [
          { validUntil: null },
          { validUntil: { gte: input.evaluationDate } },
        ],
      },
    });
  }
}

export function applyPricingAdjustment(standardPriceMinor: number, rule: Pick<PricingAgreementRule, "adjustmentPercentageBasisPoints" | "adjustmentType" | "adjustmentValueMinor" | "overridePriceMinor">): number {
  switch (rule.adjustmentType) {
    case "FIXED_AMOUNT":
      return standardPriceMinor - (rule.adjustmentValueMinor ?? 0);
    case "PERCENTAGE":
      return Math.round((standardPriceMinor * (10_000 - (rule.adjustmentPercentageBasisPoints ?? 0))) / 10_000);
    case "OVERRIDE_PRICE":
      return rule.overridePriceMinor ?? 0;
  }
}

export function selectExecutionTimeRule(rules: readonly Pick<ExecutionTimeRule, "executionDays" | "isActive" | "maxQuantity" | "minQuantity" | "priority" | "requiresManualDueDate">[], quantity: number): ExecutionTimeRule | null {
  const selected = [...rules]
    .filter((rule) => rule.isActive && quantity >= rule.minQuantity && (rule.maxQuantity === null || quantity <= rule.maxQuantity))
    .sort((left, right) => left.priority - right.priority || left.minQuantity - right.minQuantity)[0];

  return selected as ExecutionTimeRule | undefined ?? null;
}

export function findApplicableRule(rules: readonly PricingAgreementRule[], catalogItem: Pick<PriceCatalogItem, "category" | "id">): PricingAgreementRule | null {
  const itemRule = rules.find((rule) => rule.scope === "ITEM" && rule.priceCatalogItemId === catalogItem.id);
  if (itemRule) {
    return itemRule;
  }

  const categoryRule = rules.find((rule) => rule.scope === "CATEGORY" && normalizeCategory(rule.category ?? "") === normalizeCategory(catalogItem.category));
  if (categoryRule) {
    return categoryRule;
  }

  return rules.find((rule) => rule.scope === "ALL") ?? null;
}

export function findFirstApplicableAgreementRule(agreements: readonly AgreementWithRules[], catalogItem: Pick<PriceCatalogItem, "category" | "id">): AppliedRule | null {
  for (const agreement of agreements) {
    const rule = findApplicableRule(agreement.rules, catalogItem);
    if (rule) {
      return { agreement, rule };
    }
  }

  return null;
}

function normalizeCategory(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createExplanation(source: "CLINIC" | "DOCTOR" | null, scope: PricingRuleScope | null): string {
  if (source === "DOCTOR") {
    return `S-a aplicat acordul medicului${scope ? ` (${scope})` : ""}.`;
  }

  if (source === "CLINIC") {
    return `S-a aplicat acordul clinicii${scope ? ` (${scope})` : ""}.`;
  }

  return "Se folosește prețul standard al firmei active.";
}
