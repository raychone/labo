import type { PrismaClient } from "@prisma/client";

import { CREATIVE_PROBE_TYPES, CREATIVE_WORK_CATALOG } from "../catalog/creative-work-catalog.js";
import { REAL_PRICING_CATALOG } from "../catalog/real-pricing-catalog.js";

const operationSpecs = [
  ["Coroană zirconiu", "SCANARE", "Scanare"], ["Coroană zirconiu", "DESIGN", "Design"], ["Coroană zirconiu", "FREZARE", "Frezare"],
  ["Coroană zirconiu", "PRELUCRARE", "Prelucrare"], ["Coroană zirconiu", "MIYO", "Miyo"], ["Coroană zirconiu", "PLACARE_CERAMICA_ZR", "Placare ceramică"],
  ["Coroană ceramică", "METAL_TF", "TF"], ["Coroană ceramică", "METAL_SF", "SF"], ["Coroană ceramică", "MODELARE", "Modelare"],
  ["Coroană ceramică", "PRESARE", "Presare"], ["Coroană ceramică", "GLAZURA", "Glaze"], ["Coroană ceramică", "PLACARE_CERAMICA_CERAMICA", "Placare ceramică"],
  ["Altele", "PLACARE_CERAMICA_ALTELE", "Placare ceramică"], ["Altele", "COROANA_COMPOZIT_INLAY", "Coroană compozit / Inlay"],
  ["Altele", "PROTEZA", "Proteză"], ["Altele", "COROANE_ADIACENTE", "Coroane adiacente"], ["Altele", "GINGIE", "Gingie"],
] as const;

function defaultWorkTypeColor(name: string, probeFamily?: string | null): string | null {
  const value = name.toLocaleLowerCase("ro-RO");
  if (value.includes("emax") || value.includes("integral ceramic")) return "#7C3AED";
  if (value.includes("acrilic") || value.includes("capse")) return "#DC2626";
  if (value.includes("flexibil")) return "#FACC15";
  if (probeFamily === "MC" || value.includes("metalo") || value.includes("metaloceramic")) return "#2563EB";
  if (probeFamily === "ZR" || probeFamily === "ZRP" || value.includes("zircon") || value.includes("zirconia")) return "#F97316";
  return null;
}

export async function seedTechnicalCatalog(prisma: PrismaClient): Promise<{ readonly operations: number; readonly probeTypes: number; readonly workTypes: number }> {
  const manager = await prisma.user.findFirst({ select: { id: true }, where: { roles: { some: { role: { key: "MANAGER" } } } }, orderBy: { createdAt: "asc" } });
  if (!manager) throw new Error("Technical seed requires a manager created by prisma/seed.ts.");

  for (const [sortOrder, probe] of CREATIVE_PROBE_TYPES.entries()) {
    const technicalId = `technical_probe_${probe.code.toLowerCase()}`;
    const existing = await prisma.probeType.findUnique({ where: { id: technicalId } })
      ?? await prisma.probeType.findUnique({ where: { code: probe.code } })
      ?? await prisma.probeType.findUnique({ where: { name: probe.name } });
    if (existing) {
      const duplicateNames = await prisma.probeType.findMany({
        select: { id: true },
        where: { name: probe.name, NOT: { id: existing.id } },
      });
      for (const duplicate of duplicateNames) {
        await prisma.probeType.update({
          data: {
            isArchived: true,
            archivedByUserId: manager.id,
            name: `${probe.name} (legacy-${duplicate.id})`,
            updatedByUserId: manager.id,
          },
          where: { id: duplicate.id },
        });
      }
      await prisma.probeType.update({
        data: { code: probe.code, name: probe.name, sortOrder, symbol: probe.symbol, isArchived: false, updatedByUserId: manager.id },
        where: { id: existing.id },
      });
    } else {
      await prisma.probeType.create({
        data: { code: probe.code, createdByUserId: manager.id, id: technicalId, name: probe.name, sortOrder, symbol: probe.symbol, updatedByUserId: manager.id },
      });
    }
  }

  for (const [sortOrder, item] of CREATIVE_WORK_CATALOG.entries()) {
    const id = `technical_work_type_${item.key}`;
    const code = `TECH-CR-${String(sortOrder + 1).padStart(3, "0")}`;
    const existingWorkType = await prisma.workType.findUnique({ where: { id }, select: { colorHex: true } });
    await prisma.workType.upsert({
      create: {
        allowedAddOns: item.allowedAddOns.map((addOn) => ({ code: addOn, label: addOn === "GINGIE" ? "Gingie" : "Plăcată", amountMinor: addOn === "GINGIE" ? 20_000 : 5_000 })),
        basePriceMinor: item.priceMinor, code, createdByUserId: manager.id, exclusiveGroup: item.exclusiveGroup ?? null, id, isActive: true,
        name: item.displayName, probeFamily: item.probeFamily,
        colorHex: defaultWorkTypeColor(item.displayName, item.probeFamily),
        probeTypeCodes: item.probeFamily === "MC" ? ["MC_METAL", "MC_CERAMICA", "MC_GLAZE"] : item.probeFamily === "ZR" ? ["ZR_ZR", "ZR_MIYO"] : item.probeFamily === "ZRP" ? ["ZRP_METAL", "ZRP_CERAMICA", "ZRP_MIYO", "ZRP_GLAZE"] : item.probeFamily === "PRO" ? ["PRO_LG", "PRO_SO", "PRO_MACHETA", "PRO_GLAZE"] : [],
        symbol: `TECH-${item.symbol}`.slice(0, 40), unit: item.unit, updatedByUserId: manager.id,
      },
      update: { allowedAddOns: item.allowedAddOns.map((addOn) => ({ code: addOn, label: addOn === "GINGIE" ? "Gingie" : "Plăcată", amountMinor: addOn === "GINGIE" ? 20_000 : 5_000 })), basePriceMinor: item.priceMinor, colorHex: existingWorkType?.colorHex ?? defaultWorkTypeColor(item.displayName, item.probeFamily), isActive: true, name: item.displayName, probeFamily: item.probeFamily, unit: item.unit, updatedByUserId: manager.id },
      where: { id },
    });
  }

  for (const [index, [category, code, name]] of operationSpecs.entries()) {
    await prisma.technicianOperation.upsert({
      create: { category, code: `TECH-${code}`, createdByUserId: manager.id, description: "Manoperă din catalogul tehnic.", id: `technical_operation_${code.toLowerCase()}`, name, sortOrder: index + 1, updatedByUserId: manager.id },
      update: { category, description: "Manoperă din catalogul tehnic.", isActive: true, name, sortOrder: index + 1, updatedByUserId: manager.id },
      where: { id: `technical_operation_${code.toLowerCase()}` },
    });

    // Demo/legacy seeds used the bare operation code and created a second
    // active row next to the canonical technical operation. Keep the
    // canonical row and hide those duplicates from all selectors.
    await prisma.technicianOperation.updateMany({
      data: { isActive: false, updatedByUserId: manager.id },
      where: {
        code,
        NOT: { id: `technical_operation_${code.toLowerCase()}` },
      },
    });
  }

  // Older catalogs used different IDs/codes for these operations. Keep the
  // canonical technical rows above active and hide legacy duplicates so they
  // do not appear twice in the manager or technician selectors.
  await prisma.technicianOperation.updateMany({
    data: { isActive: false, updatedByUserId: manager.id },
    where: {
      OR: [
        { code: { in: ["GLAZURARE", "TECH-GLAZURARE"] } },
        { name: "Glazurare" },
      ],
      NOT: { id: "technical_operation_glazura" },
    },
  });

  const legalEntities = await prisma.legalEntity.findMany({ select: { code: true, id: true }, where: { code: { in: ["CDT", "NG"] } } });
  const canonicalPricingSymbols = REAL_PRICING_CATALOG.map((item) => `PRICE-${item.symbol}`.slice(0, 40));
  const legacyPricingWorkTypes = await prisma.workType.findMany({
    select: { id: true },
    where: { symbol: { startsWith: "PRICE-", notIn: canonicalPricingSymbols } },
  });
  if (legacyPricingWorkTypes.length > 0) {
    const legacyWorkTypeIds = legacyPricingWorkTypes.map((workType) => workType.id);
    await prisma.workType.updateMany({
      data: { archivedAt: new Date(), isActive: false, updatedByUserId: manager.id },
      where: { id: { in: legacyWorkTypeIds } },
    });
    await prisma.priceCatalogItem.updateMany({
      data: { isActive: false, updatedByUserId: manager.id },
      where: { legalEntityId: { in: legalEntities.map((legalEntity) => legalEntity.id) }, workTypeId: { in: legacyWorkTypeIds } },
    });
  }
  // These two Excel rows are add-ons, not selectable work types. Archive any
  // rows created by older technical/demo seeds so they disappear everywhere
  // after the technical catalog is refreshed, while preserving historical work
  // orders that reference them.
  const removedAddOnWorkTypeIds = [
    "technical_work_type_placata-4-plus",
    "technical_work_type_gingie-ceramica-compozit",
  ];
  await prisma.workType.updateMany({
    data: { archivedAt: new Date(), isActive: false, updatedByUserId: manager.id },
    where: { id: { in: removedAddOnWorkTypeIds } },
  });
  await prisma.priceCatalogItem.updateMany({
    data: { isActive: false, updatedByUserId: manager.id },
    where: { workTypeId: { in: removedAddOnWorkTypeIds } },
  });
  for (const legalEntity of legalEntities) {
    for (const [sortOrder, item] of REAL_PRICING_CATALOG.entries()) {
      const technicalWorkTypeId = `technical_pricing_work_type_${item.key}`;
      const allowedAddOns = item.symbol === "EX-11"
        ? [
          { code: "GINGIE", label: "Gingie", amountMinor: 20_000 },
          { code: "PLACATA", label: "Plăcată", amountMinor: 5_000 },
        ]
        : [];
      // WorkType.code is VARCHAR(20). Use the canonical Excel symbol, which
      // is short and unique (including for Reparație 1–4).
      const workTypeCode = `TECH-${item.symbol}`;
      const workTypeSymbol = `PRICE-${item.symbol}`.slice(0, 40);
      const existingWorkType = await prisma.workType.findUnique({ where: { code: workTypeCode } })
        ?? await prisma.workType.findUnique({ where: { id: technicalWorkTypeId } })
        ?? await prisma.workType.findUnique({ where: { symbol: workTypeSymbol } });
      const workType = existingWorkType
        ? await prisma.workType.update({
          data: { allowedAddOns, basePriceMinor: item.priceMinor, code: workTypeCode, colorHex: existingWorkType.colorHex ?? defaultWorkTypeColor(item.displayName), isActive: true, name: item.displayName, symbol: workTypeSymbol, unit: item.unit, updatedByUserId: manager.id },
          where: { id: existingWorkType.id },
        })
        : await prisma.workType.create({
          data: { allowedAddOns, basePriceMinor: item.priceMinor, code: workTypeCode, colorHex: defaultWorkTypeColor(item.displayName), createdByUserId: manager.id, id: technicalWorkTypeId, isActive: true, name: item.displayName, symbol: workTypeSymbol, unit: item.unit, updatedByUserId: manager.id },
      });
      const workTypeId = workType.id;
      const priceCatalogItemId = `technical_price_${legalEntity.code.toLowerCase()}_${item.key}`;
      const existingPrice = await prisma.priceCatalogItem.findFirst({
        where: { OR: [{ id: priceCatalogItemId }, { legalEntityId: legalEntity.id, workTypeId }] },
      });
      const priceCatalogItem = existingPrice
        ? await prisma.priceCatalogItem.update({
          data: { category: item.category, displayName: item.displayName, isActive: true, legalEntityId: legalEntity.id, notes: item.sourceNote || "Catalog tehnic", sortOrder, standardPriceMinor: item.priceMinor, unit: item.unit, updatedByUserId: manager.id, workTypeId },
          where: { id: existingPrice.id },
        })
        : await prisma.priceCatalogItem.create({
          data: { category: item.category, createdByUserId: manager.id, displayName: item.displayName, id: priceCatalogItemId, isActive: true, legalEntityId: legalEntity.id, notes: item.sourceNote || "Catalog tehnic", sortOrder, standardPriceMinor: item.priceMinor, unit: item.unit, updatedByUserId: manager.id, workTypeId },
        });
      const persistedPriceCatalogItemId = priceCatalogItem.id;
      await prisma.executionTimeRule.upsert({
        create: { createdByUserId: manager.id, executionDays: item.executionGroup === "PROVISIONAL_REPAIR" ? 3 : item.executionGroup === "MOBILE_PROSTHESIS" ? 7 : 5, id: `technical_execution_${legalEntity.code.toLowerCase()}_${item.key}`, isActive: true, maxQuantity: null, minQuantity: 1, priceCatalogItemId: persistedPriceCatalogItemId, priority: 1, requiresManualDueDate: false, updatedByUserId: manager.id },
        update: { executionDays: item.executionGroup === "PROVISIONAL_REPAIR" ? 3 : item.executionGroup === "MOBILE_PROSTHESIS" ? 7 : 5, isActive: true, priceCatalogItemId: persistedPriceCatalogItemId, updatedByUserId: manager.id },
        where: { id: `technical_execution_${legalEntity.code.toLowerCase()}_${item.key}` },
      });
    }
  }

  return { operations: operationSpecs.length, probeTypes: CREATIVE_PROBE_TYPES.length, workTypes: CREATIVE_WORK_CATALOG.length };
}
