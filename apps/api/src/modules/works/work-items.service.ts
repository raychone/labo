import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import {
  ANATOMICAL_SCOPE_LABELS_RO,
  getCanonicalWorkOrderCompositionTeeth,
  isAdjacentAdultFdiPair,
  normalizeConnectionPair,
  POSTMEETING_AUDIT_ACTIONS,
  normalizeWorkOrderItemTeeth,
  validateWorkOrderItemScope,
  type WorkOrderItemInput,
  type WorkOrderItemView,
  type ToothConnectionView,
} from "@dental-lab/shared";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { CreateWorkOrderItemDto, UpdateWorkOrderItemDto } from "./dto/work-order-items.dto.js";
import { getVisibleWorkWhere } from "./work-readability.js";
import { ToothConnectionsService } from "./tooth-connections.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

export const WORK_ORDER_ITEM_INCLUDE = {
  teeth: { orderBy: [{ sortOrder: "asc" as const }, { fdiTooth: "asc" as const }] },
  workType: { select: { code: true, colorHex: true, id: true, name: true, symbol: true, unit: true, probeFamily: true, probeTypeCodes: true } },
} satisfies PrismaTypes.WorkOrderItemInclude;

export type WorkOrderItemRecord = PrismaTypes.WorkOrderItemGetPayload<{ include: typeof WORK_ORDER_ITEM_INCLUDE }>;

@Injectable()
export class WorkItemsService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ToothConnectionsService) private readonly toothConnectionsService: ToothConnectionsService,
    @Inject(NotificationsService) private readonly notificationsService?: NotificationsService,
  ) {}

  public async list(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<readonly WorkOrderItemView[]> {
    await this.findReadableWorkOrder(actorUserId, workOrderId, legalEntity);
    const pricingPermission = await this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId: actorUserId });
    const items = await this.prisma.workOrderItem.findMany({ include: WORK_ORDER_ITEM_INCLUDE, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], where: { workOrderId, archivedAt: null } });
    return items.map((item) => toWorkOrderItemView(item, pricingPermission.allowed));
  }

  public async create(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly dto: CreateWorkOrderItemDto;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<WorkOrderItemView> {
    const workOrder = await this.requireWorkOrder(input.workOrderId, input.legalEntity);
    await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.item.create");
    const normalized = this.validateInput(input.dto);
    await this.requireCustomValuePermissions(input.actorUserId, normalized);
    const config = await this.validateWorkType(normalized.workTypeId);
    this.validateCatalogComposition([normalized], [config]);
    const nextSortOrder = await this.nextSortOrder(input.workOrderId);
    const item = await this.prisma.workOrderItem.create({
      data: this.toCreateData(input.workOrderId, normalized, nextSortOrder),
      include: WORK_ORDER_ITEM_INCLUDE,
    });
    const platform = snapshotValue(normalized.customImplantPlatformSnapshot);
    if (platform) await this.notificationsService?.publishNewImplantPlatform(platform);
    await this.auditService.record({
      action: POSTMEETING_AUDIT_ACTIONS.workOrderItemAdded,
      actorUserId: input.actorUserId,
      metadata: auditMetadata(workOrder.code, item, "adăugată"),
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
      resourceId: item.id,
      resourceType: "work_order_item",
    });
    const pricingPermission = await this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId: input.actorUserId });
    return toWorkOrderItemView(item, pricingPermission.allowed);
  }

  public async update(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly itemId: string;
    readonly dto: UpdateWorkOrderItemDto;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<WorkOrderItemView> {
    const workOrder = await this.requireWorkOrder(input.workOrderId, input.legalEntity);
    await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.item.update");
    const existing = await this.requireItem(input.workOrderId, input.itemId);
    if (existing.archivedAt) throw new ConflictException("Componenta tehnică este arhivată și nu mai poate fi modificată.");
    const scopeChanged = input.dto.scope !== undefined && input.dto.scope !== existing.scope;
    const nextScope = input.dto.scope ?? existing.scope;
    const scopeRequiresFreshSelection = nextScope === "CASE" || (scopeChanged && ["UPPER_ARCH", "LOWER_ARCH", "BOTH_ARCHES"].includes(nextScope));
    const nextTeeth = nextScope === "CASE"
      ? (input.dto.teeth ?? [])
      : (scopeRequiresFreshSelection && input.dto.teeth === undefined ? [] : input.dto.teeth ?? existing.teeth.map((tooth) => tooth.fdiTooth));
    const validation = validateWorkOrderItemScope({ scope: nextScope, teeth: nextTeeth });
    if (!validation.valid) throw new BadRequestException(validation.message);
    if (scopeChanged) {
      await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.scope.update");
    }
    const effectiveWorkTypeId = input.dto.workTypeId === undefined ? existing.workTypeId : input.dto.workTypeId;
    const effectiveCustomWorkTypeSnapshot = input.dto.customWorkTypeSnapshot === undefined
      ? existing.customWorkTypeSnapshot
      : input.dto.customWorkTypeSnapshot;
    if (!effectiveWorkTypeId && !effectiveCustomWorkTypeSnapshot) throw new BadRequestException("Componenta tehnică necesită un tip de lucrare din catalog sau un snapshot personalizat.");
    if (effectiveWorkTypeId && effectiveCustomWorkTypeSnapshot) throw new BadRequestException("Alegeți tipul de lucrare din catalog sau valoarea personalizată, nu ambele.");
    const config = await this.validateWorkType(effectiveWorkTypeId);
    this.validateCatalogComposition([{ ...input.dto, scope: nextScope, teeth: validation.teeth, workTypeId: effectiveWorkTypeId, customWorkTypeSnapshot: asRecord(effectiveCustomWorkTypeSnapshot as PrismaTypes.JsonValue) ?? null } as WorkOrderItemInput], [config]);
    const canonicalAddOns = canonicalSelectedAddOns(config?.allowedAddOns ?? null, input.dto.selectedAddOns);
    await this.requireCustomValuePermissions(input.actorUserId, {
      customWorkTypeSnapshot: effectiveCustomWorkTypeSnapshot as Readonly<Record<string, unknown>> | null,
      customImplantPlatformSnapshot: input.dto.customImplantPlatformSnapshot === undefined ? asRecord(existing.customImplantPlatformSnapshot) : input.dto.customImplantPlatformSnapshot,
    });
    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrderItem.update({
        data: {
        ...(input.dto.scope !== undefined ? { scope: input.dto.scope } : {}),
        ...(input.dto.workTypeId !== undefined ? { workTypeId: input.dto.workTypeId ?? null } : {}),
        ...(input.dto.customWorkTypeSnapshot !== undefined ? { customWorkTypeSnapshot: jsonOrNull(input.dto.customWorkTypeSnapshot) } : {}),
        ...(input.dto.shade !== undefined ? { shade: input.dto.shade ?? null } : {}),
        ...(input.dto.implantPlatform !== undefined ? { implantPlatform: input.dto.implantPlatform ?? null } : {}),
        ...(input.dto.customImplantPlatformSnapshot !== undefined ? { customImplantPlatformSnapshot: jsonOrNull(input.dto.customImplantPlatformSnapshot) } : {}),
        ...(input.dto.restorationType !== undefined ? { restorationType: input.dto.restorationType ?? null } : {}),
        ...(input.dto.technicalCodeNotes !== undefined ? { technicalCodeNotes: input.dto.technicalCodeNotes ?? null } : {}),
        ...(input.dto.notes !== undefined ? { notes: input.dto.notes ?? null } : {}),
        ...(input.dto.baseUnitPriceMinor !== undefined ? { baseUnitPriceMinor: input.dto.baseUnitPriceMinor } : {}),
        ...(input.dto.totalPriceMinor !== undefined ? { totalPriceMinor: input.dto.totalPriceMinor } : {}),
        ...(input.dto.currency !== undefined ? { currency: input.dto.currency ?? null } : {}),
        ...(input.dto.commercialSnapshot !== undefined ? { commercialSnapshot: jsonOrNull(input.dto.commercialSnapshot) } : {}),
        ...(input.dto.selectedAddOns !== undefined ? { selectedAddOns: jsonOrNull(canonicalAddOns) } : {}),
        ...(scopeChanged || input.dto.teeth !== undefined ? { teeth: { deleteMany: {}, create: validation.teeth.map((fdiTooth, sortOrder) => ({ fdiTooth, sortOrder })) } } : {}),
          version: { increment: 1 },
        },
        include: WORK_ORDER_ITEM_INCLUDE,
        where: { id: input.itemId },
      });
      await this.toothConnectionsService.cleanupOrphanedConnections(tx, input.workOrderId);
      return updated;
    });
    const action = scopeChanged
      ? POSTMEETING_AUDIT_ACTIONS.anatomicalScopeModified
      : POSTMEETING_AUDIT_ACTIONS.workOrderItemModified;
    await this.auditService.record({
      action,
      actorUserId: input.actorUserId,
      metadata: auditMetadata(workOrder.code, item, "modificată"),
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
      resourceId: item.id,
      resourceType: "work_order_item",
    });
    const pricingPermission = await this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId: input.actorUserId });
    return toWorkOrderItemView(item, pricingPermission.allowed);
  }

  public async archive(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly itemId: string;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<{ readonly archived: true }> {
    const workOrder = await this.requireWorkOrder(input.workOrderId, input.legalEntity);
    await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.item.remove");
    const existing = await this.requireItem(input.workOrderId, input.itemId);
    if (existing.archivedAt) throw new ConflictException("Componenta tehnică este deja arhivată.");
    await this.prisma.$transaction(async (tx) => {
      await tx.workOrderItem.update({ data: { archivedAt: new Date(), archivedByUserId: input.actorUserId, version: { increment: 1 } }, where: { id: input.itemId } });
      await this.toothConnectionsService.cleanupOrphanedConnections(tx, input.workOrderId);
    });
    await this.auditService.record({
      action: POSTMEETING_AUDIT_ACTIONS.workOrderItemRemoved,
      actorUserId: input.actorUserId,
      metadata: auditMetadata(workOrder.code, existing, "arhivată"),
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
      resourceId: input.itemId,
      resourceType: "work_order_item",
    });
    return { archived: true };
  }

  /**
   * Reconciles the complete active composition in one transaction. Connection
   * identity is deliberately not part of the input: normalized tooth pairs
   * are the canonical business identity and survive item cleanup safely.
   */
  public async updateComposition(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly dto: { readonly items: readonly (WorkOrderItemInput & { readonly id?: string })[]; readonly toothConnections: readonly { readonly toothA: number; readonly toothB: number }[] };
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<{ readonly items: readonly WorkOrderItemView[]; readonly toothConnections: readonly ToothConnectionView[] }> {
    // Assigned technicians must be able to edit the work even when the UI is
    // currently switched to the other legal-entity context. The clinic is the
    // source of truth for CDT/NG; filtering this mutation by the UI context
    // incorrectly returned 404 for an otherwise visible assigned work.
    const workOrder = await this.prisma.workOrder.findUnique({ select: { code: true, id: true }, where: { id: input.workOrderId } });
    if (!workOrder) throw new NotFoundException("Lucrarea nu a fost găsită.");
    await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.update");
    const activeItems = await this.prisma.workOrderItem.findMany({ include: WORK_ORDER_ITEM_INCLUDE, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], where: { archivedAt: null, workOrderId: input.workOrderId } });
    if (input.dto.items.length === 0) throw new BadRequestException("Lucrarea trebuie să conțină cel puțin o componentă.");
    const existingById = new Map(activeItems.map((item) => [item.id, item]));
    const desiredIds = new Set<string>();
    const normalizedItems = input.dto.items.map((item) => {
      if (item.id) {
        if (desiredIds.has(item.id)) throw new BadRequestException("O componentă tehnică nu poate fi trimisă de două ori.");
        desiredIds.add(item.id);
        const existing = existingById.get(item.id);
        if (!existing) throw new BadRequestException("Identitatea componentei tehnice nu este validă pentru această lucrare.");
      }
      const existing = item.id ? existingById.get(item.id) : undefined;
      const normalized = this.validateInput(existing ? mergeExistingItemInput(existing, item) : item);
      return { ...normalized, id: item.id };
    });
    await Promise.all(normalizedItems.map((item) => this.requireCustomValuePermissions(input.actorUserId, item)));
    const catalogConfigs = await Promise.all(normalizedItems.map((item) => this.validateWorkType(item.workTypeId)));
    this.validateCatalogComposition(normalizedItems, catalogConfigs);

    const finalTeeth = getCanonicalWorkOrderCompositionTeeth(normalizedItems.map((item) => ({ archivedAt: null, scope: item.scope, teeth: item.teeth ?? [] })));
    const desiredConnections = new Map<string, { readonly toothA: number; readonly toothB: number }>();
    for (const connection of input.dto.toothConnections) {
      const pair = normalizeConnectionPair(connection.toothA, connection.toothB);
      if (!pair || !isAdjacentAdultFdiPair(connection.toothA, connection.toothB)) {
        throw new BadRequestException("Conexiunea este permisă doar între doi dinți adulți FDI adiacenți din aceeași arcadă.");
      }
      if (!finalTeeth.includes(pair.toothA) || !finalTeeth.includes(pair.toothB)) {
        throw new BadRequestException("Ambii dinți ai conexiunii trebuie să existe în compoziția finală a lucrării.");
      }
      const key = `${pair.toothA}-${pair.toothB}`;
      if (desiredConnections.has(key)) throw new BadRequestException("Aceeași conexiune nu poate apărea de două ori.");
      desiredConnections.set(key, pair);
    }

    const removedItems = activeItems.filter((item) => !desiredIds.has(item.id));
    const changedItems = normalizedItems.filter((item) => {
      const existing = item.id ? existingById.get(item.id) : undefined;
      return !existing || itemChangedRecord(existing, item);
    });
    const scopeChanged = changedItems.some((item) => item.id && existingById.get(item.id)?.scope !== item.scope);
    const currentConnections = await this.prisma.workOrderToothConnection.findMany({ orderBy: [{ toothA: "asc" }, { toothB: "asc" }], where: { workOrderId: input.workOrderId } });
    const currentConnectionByKey = new Map(currentConnections.map((connection) => [`${connection.toothA}-${connection.toothB}`, connection]));
    const removedConnections = currentConnections.filter((connection) => !desiredConnections.has(`${connection.toothA}-${connection.toothB}`));
    const addedConnections = [...desiredConnections.entries()].filter(([key]) => !currentConnectionByKey.has(key));

    if (normalizedItems.some((item) => !item.id)) await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.item.create");
    if (changedItems.some((item) => item.id)) await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.item.update");
    if (changedItems.some((item) => item.id && existingById.get(item.id)?.technicalCodeNotes !== (item.technicalCodeNotes ?? null))) {
      await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.technical_code.edit");
    }
    if (removedItems.length > 0) await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.item.remove");
    if (scopeChanged) await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.scope.update");
    if (removedConnections.length > 0 || addedConnections.length > 0) await this.ensureOwnWorkPermission(input.actorUserId, input.workOrderId, "works.connections.manage");

    const result = await this.prisma.$transaction(async (tx) => {
      const nextSortOrder = Math.max(-1, ...activeItems.map((item) => item.sortOrder)) + 1;
      let newItemOffset = 0;
      for (const item of normalizedItems) {
        if (!item.id) {
          await tx.workOrderItem.create({ data: this.toCreateData(input.workOrderId, item, nextSortOrder + newItemOffset) });
          newItemOffset += 1;
          continue;
        }
        const existing = existingById.get(item.id)!;
        if (!itemChangedRecord(existing, item)) continue;
        await tx.workOrderItem.update({
          data: {
            scope: item.scope,
            workTypeId: item.workTypeId ?? null,
            customWorkTypeSnapshot: jsonOrNull(item.customWorkTypeSnapshot),
            shade: item.shade ?? null,
            implantPlatform: item.implantPlatform ?? null,
            customImplantPlatformSnapshot: jsonOrNull(item.customImplantPlatformSnapshot),
            restorationType: item.restorationType ?? null,
            technicalCodeNotes: item.technicalCodeNotes ?? null,
            notes: item.notes ?? null,
            selectedAddOns: jsonOrNull(canonicalSelectedAddOns(catalogConfigs[normalizedItems.indexOf(item)]?.allowedAddOns ?? null, item.selectedAddOns)),
            teeth: { deleteMany: {}, create: normalizeWorkOrderItemTeeth(item.teeth).map((fdiTooth, sortOrder) => ({ fdiTooth, sortOrder })) },
            version: { increment: 1 },
          },
          where: { id: item.id },
        });
      }
      if (removedItems.length > 0) {
        await tx.workOrderItem.updateMany({ data: { archivedAt: new Date(), archivedByUserId: input.actorUserId, version: { increment: 1 } }, where: { id: { in: removedItems.map((item) => item.id) }, workOrderId: input.workOrderId, archivedAt: null } });
      }
      if (removedConnections.length > 0) await tx.workOrderToothConnection.deleteMany({ where: { id: { in: removedConnections.map((connection) => connection.id) }, workOrderId: input.workOrderId } });
      for (const [, pair] of addedConnections) {
        await tx.workOrderToothConnection.create({ data: { workOrderId: input.workOrderId, toothA: pair.toothA, toothB: pair.toothB } });
      }
      const finalItems = await tx.workOrderItem.findMany({ include: WORK_ORDER_ITEM_INCLUDE, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], where: { archivedAt: null, workOrderId: input.workOrderId } });
      if (typeof tx.workOrder.update === "function") {
        await tx.workOrder.update({ data: { quantity: finalItems.reduce((total, item) => total + (item.workType?.unit === "ELEMENT" ? Math.max(1, item.teeth.length) : 1), 0), version: { increment: 1 }, updatedByUserId: input.actorUserId }, where: { id: input.workOrderId } });
      }
      const finalConnections = await tx.workOrderToothConnection.findMany({ orderBy: [{ toothA: "asc" }, { toothB: "asc" }], where: { workOrderId: input.workOrderId } });
      return { finalConnections, finalItems };
    });

    const auditEvents = [
      ...normalizedItems.filter((item) => !item.id).map((item) => ({ action: POSTMEETING_AUDIT_ACTIONS.workOrderItemAdded, metadata: auditMetadata(workOrder.code, { scope: item.scope, workType: null, teeth: normalizeWorkOrderItemTeeth(item.teeth).map((fdiTooth, sortOrder) => ({ fdiTooth, sortOrder })) }, "adăugată"), resourceId: undefined })),
      ...changedItems.filter((item) => item.id).map((item) => ({ action: item.scope !== existingById.get(item.id!)?.scope ? POSTMEETING_AUDIT_ACTIONS.anatomicalScopeModified : POSTMEETING_AUDIT_ACTIONS.workOrderItemModified, metadata: auditMetadata(workOrder.code, { scope: item.scope, workType: null, teeth: normalizeWorkOrderItemTeeth(item.teeth).map((fdiTooth, sortOrder) => ({ fdiTooth, sortOrder })) }, "modificată"), resourceId: item.id })),
      ...removedItems.map((item) => ({ action: POSTMEETING_AUDIT_ACTIONS.workOrderItemRemoved, metadata: auditMetadata(workOrder.code, item, "arhivată"), resourceId: item.id })),
      ...removedConnections.map((connection) => ({ action: POSTMEETING_AUDIT_ACTIONS.toothConnectionRemoved, metadata: { toothNumbers: [connection.toothA, connection.toothB], workOrderLabel: workOrder.code }, resourceId: connection.id })),
      ...addedConnections.map(([, pair]) => ({ action: POSTMEETING_AUDIT_ACTIONS.toothConnectionAdded, metadata: { toothNumbers: [pair.toothA, pair.toothB], workOrderLabel: workOrder.code }, resourceId: undefined })),
    ];
    await Promise.all(auditEvents.map((event) => this.auditService.record({ action: event.action, actorUserId: input.actorUserId, metadata: event.metadata, ...(event.resourceId ? { resourceId: event.resourceId } : {}), resourceType: event.action.includes("tooth_connection") ? "work_order_tooth_connection" : "work_order_item", ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}) })));
    const pricingPermission = typeof this.authorizationService.hasPermission === "function"
      ? await this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId: input.actorUserId })
      : { allowed: false };
    return { items: result.finalItems.map((item) => toWorkOrderItemView(item, pricingPermission.allowed)), toothConnections: result.finalConnections.map((connection) => ({ createdAt: connection.createdAt.toISOString(), id: connection.id, toothA: connection.toothA as ToothConnectionView["toothA"], toothB: connection.toothB as ToothConnectionView["toothB"], workOrderId: connection.workOrderId })) };
  }

  private async findReadableWorkOrder(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<{ readonly id: string }> {
    const visibleWhere = await getVisibleWorkWhere(this.authorizationService, actorUserId);
    const workOrder = await this.prisma.workOrder.findFirst({
      select: { id: true },
      where: { AND: [{ id: workOrderId }, visibleWhere, ...(legalEntity ? [{ executionLegalEntityId: legalEntity.id }] : [])] },
    });
    if (!workOrder) throw new NotFoundException("Lucrarea nu a fost găsită.");
    return workOrder;
  }

  private async requireWorkOrder(workOrderId: string, legalEntity?: LegalEntityContext): Promise<{ readonly id: string; readonly code: string }> {
    const workOrder = await this.prisma.workOrder.findFirst({
      select: { code: true, id: true },
      where: { id: workOrderId, ...(legalEntity ? { executionLegalEntityId: legalEntity.id } : {}) },
    });
    if (!workOrder) throw new NotFoundException("Lucrarea nu a fost găsită.");
    return workOrder;
  }

  private async ensureOwnWorkPermission(
    actorUserId: string,
    workOrderId: string,
    permission: "works.connections.manage" | "works.item.create" | "works.item.remove" | "works.item.update" | "works.scope.update" | "works.technical_code.edit" | "works.update",
  ): Promise<void> {
    // `works.update: ALL` is the umbrella grant for operational managers
    // (Manager/Logistica). Do not require every newer composition sub-grant
    // to have been reseeded before an existing role can save the work.
    if (permission !== "works.update") {
      const broadGrant = await this.authorizationService.hasPermission({ permission: "works.update", userId: actorUserId });
      if (broadGrant.allowed && broadGrant.effectiveScopes?.includes("ALL")) return;
    }
    const grant = await this.authorizationService.hasPermission({ permission, userId: actorUserId });
    if (!grant.allowed) throw new ForbiddenException("Nu ai permisiunea necesară pentru această lucrare.");
    if (!grant.effectiveScopes || grant.effectiveScopes.includes("ALL")) return;
    const workOrder = await this.prisma.workOrder.findUnique({ select: { assignedTechnicianId: true, claimedByUserId: true }, where: { id: workOrderId } });
    if (workOrder?.assignedTechnicianId === actorUserId || workOrder?.claimedByUserId === actorUserId) return;
    throw new ForbiddenException("Poți modifica doar lucrările proprii.");
  }

  private async requireItem(workOrderId: string, itemId: string): Promise<WorkOrderItemRecord> {
    const item = await this.prisma.workOrderItem.findFirst({ include: WORK_ORDER_ITEM_INCLUDE, where: { id: itemId, workOrderId } });
    if (!item) throw new NotFoundException("Componenta tehnică nu a fost găsită în această lucrare.");
    return item;
  }

  private async nextSortOrder(workOrderId: string): Promise<number> {
    const last = await this.prisma.workOrderItem.findFirst({ orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }], select: { sortOrder: true }, where: { workOrderId } });
    return (last?.sortOrder ?? -1) + 1;
  }

  private validateInput(dto: WorkOrderItemInput): WorkOrderItemInput {
    const validation = validateWorkOrderItemScope(dto);
    if (!validation.valid) throw new BadRequestException(validation.message);
    if (!dto.workTypeId && !dto.customWorkTypeSnapshot) throw new BadRequestException("Componenta tehnică necesită un tip de lucrare din catalog sau un snapshot personalizat.");
    if (dto.workTypeId && dto.customWorkTypeSnapshot) throw new BadRequestException("Alegeți tipul de lucrare din catalog sau valoarea personalizată, nu ambele.");
    return { ...dto, scope: dto.scope, teeth: validation.teeth };
  }

  private async requireCustomValuePermissions(actorUserId: string, input: Pick<WorkOrderItemInput, "customWorkTypeSnapshot" | "customImplantPlatformSnapshot">): Promise<void> {
    if (input.customWorkTypeSnapshot) await this.authorizationService.requirePermission({ permission: "works.custom_type.use", requiredScope: "ASSIGNED", userId: actorUserId });
    if (input.customImplantPlatformSnapshot) await this.authorizationService.requirePermission({ permission: "works.custom_platform.use", requiredScope: "ASSIGNED", userId: actorUserId });
  }

  private async validateWorkType(workTypeId: string | null | undefined): Promise<{ readonly id: string; readonly unit: string; readonly exclusiveGroup: string | null; readonly allowedAddOns: PrismaTypes.JsonValue | null } | null> {
    if (!workTypeId) return null;
    const workType = await this.prisma.workType.findUnique({ select: { allowedAddOns: true, exclusiveGroup: true, id: true, unit: true }, where: { id: workTypeId } });
    if (!workType) throw new BadRequestException("Tipul de lucrare selectat nu există.");
    return workType;
  }

  private validateCatalogComposition(
    items: readonly WorkOrderItemInput[],
    configs: readonly ({ readonly id: string; readonly unit: string; readonly exclusiveGroup: string | null; readonly allowedAddOns: PrismaTypes.JsonValue | null } | null)[],
  ): void {
    const workTypeCounts = new Map<string, number>();
    const groupCounts = new Map<string, number>();
    items.forEach((item, index) => {
      const config = configs[index];
      if (!config) return;
      const count = (workTypeCounts.get(config.id) ?? 0) + 1;
      workTypeCounts.set(config.id, count);
      if (config.unit === "UNIT" && count > 1) throw new BadRequestException("O lucrare de tip bucată poate fi adăugată o singură dată în aceeași lucrare.");
      if (config.exclusiveGroup) {
        const groupCount = (groupCounts.get(config.exclusiveGroup) ?? 0) + 1;
        groupCounts.set(config.exclusiveGroup, groupCount);
        if (groupCount > 1) throw new BadRequestException(`Lucrările din grupul ${config.exclusiveGroup} nu pot fi combinate în aceeași lucrare.`);
      }
      const allowed = new Set(addOnCodes(config.allowedAddOns));
      const selectedCodes = new Set<string>();
      for (const selected of item.selectedAddOns ?? []) {
        if (selectedCodes.has(selected.code)) throw new BadRequestException("Același adaos nu poate fi selectat de două ori pentru aceeași componentă.");
        selectedCodes.add(selected.code);
        if (!allowed.has(selected.code)) throw new BadRequestException("Adaosul selectat nu este permis pentru această lucrare.");
      }
    });
  }

  private toCreateData(workOrderId: string, input: WorkOrderItemInput, sortOrder: number): PrismaTypes.WorkOrderItemCreateInput {
    return {
      workOrder: { connect: { id: workOrderId } },
      sortOrder,
      scope: input.scope,
      ...(input.workTypeId ? { workType: { connect: { id: input.workTypeId } } } : {}),
      customWorkTypeSnapshot: jsonOrNull(input.customWorkTypeSnapshot),
      shade: input.shade ?? null,
      implantPlatform: input.implantPlatform ?? null,
      customImplantPlatformSnapshot: jsonOrNull(input.customImplantPlatformSnapshot),
      restorationType: input.restorationType ?? null,
      technicalCodeNotes: input.technicalCodeNotes ?? null,
      notes: input.notes ?? null,
      selectedAddOns: jsonOrNull(input.selectedAddOns),
      baseUnitPriceMinor: input.baseUnitPriceMinor ?? null,
      totalPriceMinor: input.totalPriceMinor ?? null,
      currency: input.currency ?? null,
      commercialSnapshot: jsonOrNull(input.commercialSnapshot),
      teeth: { create: normalizeWorkOrderItemTeeth(input.teeth).map((fdiTooth, toothSortOrder) => ({ fdiTooth, sortOrder: toothSortOrder })) },
    };
  }
}

function jsonOrNull(value: unknown): PrismaTypes.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined || value === null ? Prisma.JsonNull : value as PrismaTypes.InputJsonValue;
}

function jsonStringArray(value: PrismaTypes.JsonValue | null): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function canonicalSelectedAddOns(allowedAddOns: PrismaTypes.JsonValue | null, selectedAddOns: WorkOrderItemInput["selectedAddOns"]): readonly { readonly code: string; readonly amountMinor: number | null }[] {
  const amounts = new Map<string, number>();
  if (Array.isArray(allowedAddOns)) {
    for (const entry of allowedAddOns) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
      if (typeof entry.code === "string" && typeof entry.amountMinor === "number") amounts.set(entry.code, entry.amountMinor);
    }
  }
  return (selectedAddOns ?? []).map((selected) => ({ code: selected.code, amountMinor: amounts.get(selected.code) ?? null }));
}

export function toWorkOrderItemView(item: WorkOrderItemRecord, includePricing = true): WorkOrderItemView {
  return {
    id: item.id,
    workOrderId: item.workOrderId,
    sortOrder: item.sortOrder,
    scope: item.scope,
    teeth: item.teeth.map((tooth) => ({ fdiTooth: tooth.fdiTooth as WorkOrderItemView["teeth"][number]["fdiTooth"], sortOrder: tooth.sortOrder })),
    workType: item.workType ? { ...item.workType, probeFamily: item.workType.probeFamily, probeTypeCodes: jsonStringArray(item.workType.probeTypeCodes) } : null,
    workTypeId: item.workTypeId,
    customWorkTypeSnapshot: asRecord(item.customWorkTypeSnapshot),
    shade: item.shade,
    implantPlatform: item.implantPlatform,
    customImplantPlatformSnapshot: asRecord(item.customImplantPlatformSnapshot),
    restorationType: item.restorationType,
    technicalCodeNotes: item.technicalCodeNotes,
    notes: item.notes,
    baseUnitPriceMinor: includePricing ? item.baseUnitPriceMinor : null,
    totalPriceMinor: includePricing ? item.totalPriceMinor : null,
    currency: includePricing ? item.currency : null,
    commercialSnapshot: includePricing ? asRecord(item.commercialSnapshot) : null,
    selectedAddOns: jsonSelectedAddOns(item.selectedAddOns),
    archivedAt: item.archivedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function asRecord(value: PrismaTypes.JsonValue | null): Readonly<Record<string, unknown>> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : null;
}

function snapshotValue(value: Readonly<Record<string, unknown>> | null | undefined): string | null {
  if (!value) return null;
  const candidate = value.value ?? value.name;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function auditMetadata(code: string, item: { readonly scope: WorkOrderItemRecord["scope"]; readonly workType: { readonly name: string } | null; readonly teeth: readonly { readonly fdiTooth: number }[] }, state: string): PrismaTypes.InputJsonObject {
  return {
    workOrderLabel: code,
    componentDescription: `Componentă ${ANATOMICAL_SCOPE_LABELS_RO[item.scope]}`,
    scopeLabel: ANATOMICAL_SCOPE_LABELS_RO[item.scope],
    state,
    toothNumbers: item.teeth.map((tooth) => tooth.fdiTooth),
    workTypeName: item.workType?.name ?? null,
  };
}

function itemChangedRecord(existing: WorkOrderItemRecord, next: WorkOrderItemInput): boolean {
  return existing.scope !== next.scope
    || existing.workTypeId !== (next.workTypeId ?? null)
    || JSON.stringify(existing.customWorkTypeSnapshot ?? null) !== JSON.stringify(next.customWorkTypeSnapshot ?? null)
    || JSON.stringify(existing.customImplantPlatformSnapshot ?? null) !== JSON.stringify(next.customImplantPlatformSnapshot ?? null)
    || existing.shade !== (next.shade ?? null)
    || existing.implantPlatform !== (next.implantPlatform ?? null)
    || existing.restorationType !== (next.restorationType ?? null)
    || existing.technicalCodeNotes !== (next.technicalCodeNotes ?? null)
    || existing.notes !== (next.notes ?? null)
    || JSON.stringify(existing.selectedAddOns ?? null) !== JSON.stringify(next.selectedAddOns ?? null)
    || existing.teeth.map((tooth) => tooth.fdiTooth).join(",") !== normalizeWorkOrderItemTeeth(next.teeth).join(",");
}

function mergeExistingItemInput(existing: WorkOrderItemRecord, next: WorkOrderItemInput): WorkOrderItemInput {
  const effectiveWorkTypeId = next.workTypeId === undefined ? existing.workTypeId : next.workTypeId;
  const customWorkTypeSnapshot = next.customWorkTypeSnapshot !== undefined
    ? next.customWorkTypeSnapshot
    : effectiveWorkTypeId === null ? asRecord(existing.customWorkTypeSnapshot) : null;
  const customImplantPlatformSnapshot = next.customImplantPlatformSnapshot !== undefined
    ? next.customImplantPlatformSnapshot
    : asRecord(existing.customImplantPlatformSnapshot);
  return {
    ...next,
    workTypeId: effectiveWorkTypeId,
    customWorkTypeSnapshot,
    customImplantPlatformSnapshot,
    ...(next.selectedAddOns === undefined && existing.selectedAddOns ? { selectedAddOns: jsonSelectedAddOns(existing.selectedAddOns) } : {}),
    teeth: next.teeth ?? existing.teeth.map((tooth) => tooth.fdiTooth),
  };
}

function addOnCodes(value: PrismaTypes.JsonValue | null): readonly string[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && typeof entry.code === "string" ? [entry.code] : [])
    : [];
}

function jsonSelectedAddOns(value: PrismaTypes.JsonValue | null): readonly { readonly code: string; readonly amountMinor: number | null }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && typeof entry.code === "string"
    ? [{ code: entry.code, amountMinor: typeof entry.amountMinor === "number" ? entry.amountMinor : null }]
    : []);
}
