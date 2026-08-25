import type { PrismaClient } from "@prisma/client";

import { CREATIVE_PROBE_TYPES, CREATIVE_WORK_CATALOG } from "../catalog/creative-work-catalog.js";
import { REAL_PRICING_CATALOG } from "../catalog/real-pricing-catalog.js";

const operationSpecs = [
  ["Coroană zirconiu", "SCANARE", "Scanare"], ["Coroană zirconiu", "DESIGN", "Design"], ["Coroană zirconiu", "FREZARE", "Frezare"],
  ["Coroană zirconiu", "PRELUCRARE", "Prelucrare"], ["Coroană zirconiu", "MIYO", "Miyo"], ["Coroană zirconiu", "PLACARE_CERAMICA_ZR", "Placare ceramică"],
  ["Coroană ceramică", "METAL_TF", "Metal TF"], ["Coroană ceramică", "METAL_SF", "Metal SF"], ["Coroană ceramică", "MODELARE", "Modelare"],
  ["Coroană ceramică", "PRESARE", "Presare"], ["Coroană ceramică", "GLAZURA", "Glazură"], ["Coroană ceramică", "PLACARE_CERAMICA_CERAMICA", "Placare ceramică"],
  ["Altele", "PLACARE_CERAMICA_ALTELE", "Placare ceramică"], ["Altele", "COROANA_COMPOZIT_INLAY", "Coroană compozit / Inlay"],
  ["Altele", "PROTEZA", "Proteză"], ["Altele", "COROANE_ADIACENTE", "Coroane adiacente"], ["Altele", "GINGIE", "Gingie"],
] as const;

export async function seedTechnicalCatalog(prisma: PrismaClient): Promise<{ readonly operations: number; readonly probeTypes: number; readonly workTypes: number }> {
  const manager = await prisma.user.findFirst({ select: { id: true }, where: { roles: { some: { role: { key: "MANAGER" } } } }, orderBy: { createdAt: "asc" } });
  if (!manager) throw new Error("Technical seed requires a manager created by prisma/seed.ts.");

  for (const [sortOrder, probe] of CREATIVE_PROBE_TYPES.entries()) {
    await prisma.probeType.upsert({
      create: { code: probe.code, createdByUserId: manager.id, id: `technical_probe_${probe.code.toLowerCase()}`, name: probe.name, sortOrder, symbol: probe.symbol },
      update: { name: probe.name, sortOrder, symbol: probe.symbol, isArchived: false, updatedByUserId: manager.id },
      where: { id: `technical_probe_${probe.code.toLowerCase()}` },
    });
  }

  for (const [sortOrder, item] of CREATIVE_WORK_CATALOG.entries()) {
    const id = `technical_work_type_${item.key}`;
    const code = `TECH-${item.key.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 12)}-${String(sortOrder + 1).padStart(2, "0")}`;
    await prisma.workType.upsert({
      create: {
        allowedAddOns: item.allowedAddOns.map((addOn) => ({ code: addOn, label: addOn === "GINGIE" ? "Gingie" : "Plăcată", amountMinor: addOn === "GINGIE" ? 20_000 : 5_000 })),
        basePriceMinor: item.priceMinor, code, createdByUserId: manager.id, exclusiveGroup: item.exclusiveGroup ?? null, id, isActive: true,
        name: item.displayName, probeFamily: item.probeFamily,
        probeTypeCodes: item.probeFamily === "MC" ? ["MC_METAL", "MC_CERAMICA", "MC_GLAZE"] : item.probeFamily === "ZR" ? ["ZR_ZR", "ZR_MIYO"] : item.probeFamily === "ZRP" ? ["ZRP_METAL", "ZRP_CERAMICA", "ZRP_MIYO", "ZRP_GLAZE"] : item.probeFamily === "PRO" ? ["PRO_LG", "PRO_SO", "PRO_MACHETA", "PRO_GLAZE"] : [],
        symbol: `TECH-${item.symbol}`, unit: item.unit, updatedByUserId: manager.id,
      },
      update: { allowedAddOns: item.allowedAddOns.map((addOn) => ({ code: addOn, label: addOn === "GINGIE" ? "Gingie" : "Plăcată", amountMinor: addOn === "GINGIE" ? 20_000 : 5_000 })), basePriceMinor: item.priceMinor, isActive: true, name: item.displayName, probeFamily: item.probeFamily, unit: item.unit, updatedByUserId: manager.id },
      where: { id },
    });
  }

  for (const [index, [category, code, name]] of operationSpecs.entries()) {
    await prisma.technicianOperation.upsert({
      create: { category, code: `TECH-${code}`, createdByUserId: manager.id, description: "Manoperă din catalogul tehnic.", id: `technical_operation_${code.toLowerCase()}`, name, sortOrder: index + 1, updatedByUserId: manager.id },
      update: { category, description: "Manoperă din catalogul tehnic.", isActive: true, name, sortOrder: index + 1, updatedByUserId: manager.id },
      where: { id: `technical_operation_${code.toLowerCase()}` },
    });
  }

  const legalEntities = await prisma.legalEntity.findMany({ select: { code: true, id: true }, where: { code: { in: ["CDT", "NG"] } } });
  for (const legalEntity of legalEntities) {
    for (const [sortOrder, item] of REAL_PRICING_CATALOG.entries()) {
      const workTypeId = `technical_pricing_work_type_${item.key}`;
      await prisma.workType.upsert({
        create: { basePriceMinor: item.priceMinor, code: `TECH-${item.workTypeCode}`.slice(0, 20), createdByUserId: manager.id, id: workTypeId, isActive: true, name: item.displayName, symbol: `PRICE-${item.symbol}`.slice(0, 40), unit: item.unit, updatedByUserId: manager.id },
        update: { basePriceMinor: item.priceMinor, isActive: true, name: item.displayName, unit: item.unit, updatedByUserId: manager.id },
        where: { id: workTypeId },
      });
      await prisma.priceCatalogItem.upsert({
        create: { category: item.category, createdByUserId: manager.id, displayName: item.displayName, id: `technical_price_${legalEntity.code.toLowerCase()}_${item.key}`, isActive: true, legalEntityId: legalEntity.id, notes: item.sourceNote || "Catalog tehnic", sortOrder, standardPriceMinor: item.priceMinor, unit: item.unit, updatedByUserId: manager.id, workTypeId },
        update: { category: item.category, displayName: item.displayName, isActive: true, notes: item.sourceNote || "Catalog tehnic", sortOrder, standardPriceMinor: item.priceMinor, unit: item.unit, updatedByUserId: manager.id },
        where: { id: `technical_price_${legalEntity.code.toLowerCase()}_${item.key}` },
      });
      await prisma.executionTimeRule.upsert({
        create: { createdByUserId: manager.id, executionDays: item.executionGroup === "PROVISIONAL_REPAIR" ? 3 : item.executionGroup === "MOBILE_PROSTHESIS" ? 7 : 5, id: `technical_execution_${legalEntity.code.toLowerCase()}_${item.key}`, isActive: true, maxQuantity: null, minQuantity: 1, priceCatalogItemId: `technical_price_${legalEntity.code.toLowerCase()}_${item.key}`, priority: 1, requiresManualDueDate: false, updatedByUserId: manager.id },
        update: { executionDays: item.executionGroup === "PROVISIONAL_REPAIR" ? 3 : item.executionGroup === "MOBILE_PROSTHESIS" ? 7 : 5, isActive: true, priceCatalogItemId: `technical_price_${legalEntity.code.toLowerCase()}_${item.key}`, updatedByUserId: manager.id },
        where: { id: `technical_execution_${legalEntity.code.toLowerCase()}_${item.key}` },
      });
    }
  }

  return { operations: operationSpecs.length, probeTypes: CREATIVE_PROBE_TYPES.length, workTypes: CREATIVE_WORK_CATALOG.length };
}
