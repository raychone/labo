import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  classifyLegacyComposition,
  extractLegacyFdiTeeth,
  type AdultFdiTooth,
  type LegacyCompatibilityItemView,
  type LegacyCycleCompatibilityView,
  type WorkOrderCompatibilityView,
} from "@dental-lab/shared";

import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { getVisibleWorkWhere } from "./work-readability.js";
import { toWorkOrderItemView, WORK_ORDER_ITEM_INCLUDE } from "./work-items.service.js";

const LEGACY_COMPATIBILITY_SELECT = {
  id: true,
  code: true,
  shade: true,
  implantPlatform: true,
  technicalCodeNotes: true,
  clinicalNotes: true,
  internalNotes: true,
  quantity: true,
  baseUnitPriceMinor: true,
  totalPriceMinor: true,
  currency: true,
  workType: { select: { code: true, id: true, name: true, symbol: true } },
  workFormSubmissions: {
    where: { templateKind: "GENERIC" },
    orderBy: { createdAt: "desc" },
    select: { values: true },
    take: 1,
  },
  items: {
    include: WORK_ORDER_ITEM_INCLUDE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  cycles: {
    select: { closedAt: true, cycleNumber: true, id: true, openedAt: true, status: true },
    orderBy: { cycleNumber: "asc" },
  },
} satisfies Prisma.WorkOrderSelect;

type LegacyCompatibilityRecord = Prisma.WorkOrderGetPayload<{ select: typeof LEGACY_COMPATIBILITY_SELECT }>;

@Injectable()
export class LegacyCompatibilityService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async getComposition(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<WorkOrderCompatibilityView> {
    const visibleWhere = await getVisibleWorkWhere(this.authorizationService, actorUserId);
    const workOrder = await this.prisma.workOrder.findFirst({
      select: LEGACY_COMPATIBILITY_SELECT,
      where: { AND: [{ id: workOrderId }, visibleWhere, ...(legalEntity ? [{ executionLegalEntityId: legalEntity.id }] : [])] },
    });
    if (!workOrder) throw new NotFoundException("Lucrarea nu a fost găsită.");

    const legacyTeeth = extractLegacyFdiTeeth(readFormValue(workOrder.workFormSubmissions[0]?.values, "teeth"));
    const activeItems = workOrder.items.filter((item) => item.archivedAt === null);
    const archivedItems = workOrder.items.filter((item) => item.archivedAt !== null);
    const classification = classifyLegacyComposition({
      activeCanonicalItemCount: activeItems.length,
      archivedCanonicalItemCount: archivedItems.length,
      legacyToothCount: legacyTeeth.length,
    });

    const legacyItem = classification.legacyProjectionAllowed
      ? toLegacyItem(workOrder, legacyTeeth, classification.compatibilityLabelRo)
      : null;
    const canonicalItems = activeItems.map((item) => toWorkOrderItemView(item));
    const cycles = workOrder.cycles.map(toLegacyCycleView);

    return {
      workOrderId: workOrder.id,
      workCode: workOrder.code,
      source: classification.source,
      classification: classification.classification,
      compatibilityLabelRo: classification.compatibilityLabelRo,
      canonicalItemsAuthoritative: classification.canonicalItemsAuthoritative,
      legacyProjectionAllowed: classification.legacyProjectionAllowed,
      canonicalItems,
      legacyItem,
      archivedCanonicalItemCount: archivedItems.length,
      cycles,
      identity: { singleWorkOrder: true, code: workOrder.code, qrIdentityPreserved: true },
      editing: { requiresExplicitCanonicalConversion: legacyItem !== null, legacyFieldsRemainHistorical: true },
      commercial: classification.canonicalItemsAuthoritative
        ? { source: "CANONICAL_ITEMS", quantity: workOrder.quantity, baseUnitPriceMinor: null, totalPriceMinor: null, currency: workOrder.currency }
        : { source: "LEGACY_WORK_ORDER", quantity: workOrder.quantity, baseUnitPriceMinor: workOrder.baseUnitPriceMinor, totalPriceMinor: workOrder.totalPriceMinor, currency: workOrder.currency },
    };
  }
}

function readFormValue(values: Prisma.JsonValue | undefined, key: string): unknown {
  if (!values || typeof values !== "object" || Array.isArray(values)) return undefined;
  return (values as Record<string, unknown>)[key];
}

function toLegacyItem(record: LegacyCompatibilityRecord, teeth: readonly AdultFdiTooth[], label: string): LegacyCompatibilityItemView {
  const values = record.workFormSubmissions[0]?.values;
  const restorationType = readFormValue(values, "restoration_type") ?? readFormValue(values, "restorationType");
  const shade = record.shade ?? asString(readFormValue(values, "shade"));
  return {
    id: `legacy:${record.id}`,
    source: "LEGACY",
    legacy: true,
    exactSemanticScope: false,
    compatibilityLabelRo: label as LegacyCompatibilityItemView["compatibilityLabelRo"],
    workType: record.workType,
    teeth,
    shade,
    implantPlatform: record.implantPlatform,
    restorationType: asString(restorationType),
    technicalCodeNotes: record.technicalCodeNotes,
    notes: record.clinicalNotes ?? record.internalNotes,
    quantity: record.quantity,
    baseUnitPriceMinor: record.baseUnitPriceMinor,
    totalPriceMinor: record.totalPriceMinor,
    currency: record.currency,
  };
}

function toLegacyCycleView(cycle: LegacyCompatibilityRecord["cycles"][number]): LegacyCycleCompatibilityView {
  return {
    id: cycle.id,
    cycleNumber: cycle.cycleNumber,
    source: "LEGACY",
    exactProbeInterpretation: false,
    compatibilityLabelRo: "Istoric ciclu",
    status: cycle.status,
    openedAt: cycle.openedAt.toISOString(),
    closedAt: cycle.closedAt?.toISOString() ?? null,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
