import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { B17_LOGISTICS_NOTIFICATION_EVENTS, getB17LogisticsNotificationKey, POSTMEETING_AUDIT_ACTIONS, type ProbeCycleView } from "@dental-lab/shared";

import { AuditService } from "../auth/audit.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { getVisibleWorkWhere } from "./work-readability.js";
import { ProbeTypesService } from "./probe-types.service.js";
import type { SelectProbeTypeDto } from "./dto/probe-cycles.dto.js";

@Injectable()
export class ProbeCyclesService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProbeTypesService) private readonly probeTypesService: ProbeTypesService,
    @Optional() @Inject(NotificationsService) private readonly notificationsService?: NotificationsService,
  ) {}

  public async selectProbeType(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly cycleId: string;
    readonly dto: SelectProbeTypeDto;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<ProbeCycleView> {
    await this.authorizationService.requirePermission({ permission: "cycles.probe_type.select", requiredScope: "ASSIGNED", userId: input.actorUserId });
    const work = await this.findVisibleWork(input.actorUserId, input.workOrderId, input.legalEntity);
    const nextType = await this.probeTypesService.requireSelectable(input.dto.probeTypeId, this.prisma);
    const cycle = await this.prisma.probeCycle.findFirst({ include: { probeType: true }, where: { id: input.cycleId, workOrderId: input.workOrderId } });
    if (!cycle) throw new NotFoundException("Proba nu a fost găsită în această lucrare.");
    if (cycle.status !== "ACTIVE") throw new ConflictException("Tipul unei probe finalizate nu mai poate fi modificat.");
    if (cycle.probeTypeId === nextType.id) return toProbeCycleView(cycle);
    const updated = await this.prisma.probeCycle.update({ data: { probeTypeId: nextType.id, probeTypeNameSnapshot: nextType.name, version: { increment: 1 } }, include: { probeType: true }, where: { id: cycle.id } });
    await this.auditService.record({
      action: POSTMEETING_AUDIT_ACTIONS.probeTypeCorrected,
      actorUserId: input.actorUserId,
      metadata: { nextProbeTypeName: nextType.name, previousProbeTypeName: cycle.probeTypeNameSnapshot, probeNumber: cycle.sequence, workOrderLabel: work.code },
      ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}),
      resourceId: cycle.id,
      resourceType: "probe_cycle",
    });
    return toProbeCycleView(updated);
  }

  public async updateActiveDeadline(input: { readonly actorUserId: string; readonly workOrderId: string; readonly cycleId: string; readonly deadlineAt: string; readonly legalEntity?: LegalEntityContext; readonly requestMetadata?: RequestMetadata }): Promise<ProbeCycleView> {
    await this.authorizationService.requirePermission({ permission: "works.deadline.current.update", requiredScope: "ALL", userId: input.actorUserId });
    const work = await this.findVisibleWork(input.actorUserId, input.workOrderId, input.legalEntity);
    const deadlineAt = new Date(input.deadlineAt);
    if (!Number.isFinite(deadlineAt.getTime())) throw new BadRequestException("Termenul probei nu este valid.");
    const cycle = await this.prisma.probeCycle.findFirst({ include: { probeType: true }, where: { id: input.cycleId, workOrderId: input.workOrderId } });
    if (!cycle) throw new NotFoundException("Proba nu a fost găsită în această lucrare.");
    if (cycle.status !== "ACTIVE") throw new ConflictException("Termenul unei probe finalizate nu mai poate fi modificat.");
    const current = await this.prisma.workOrder.findUnique({ select: { status: true, activeProbeCycleId: true, deadlineRevision: true }, where: { id: work.id } });
    if (!current || current.activeProbeCycleId !== cycle.id) throw new ConflictException("Termenul poate fi modificat doar pentru proba activă.");
    if (current.status === "FINALIZATA") throw new ConflictException("Termenul nu mai poate fi modificat după finalizarea lucrării.");
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.probeCycle.update({ data: { deadlineAt, deadlineSnapshotJson: { mode: "MANUAL", effectiveDueAt: deadlineAt.toISOString() }, version: { increment: 1 } }, include: { probeType: true }, where: { id: cycle.id } });
      await tx.workOrder.update({ data: { deadlineMode: "MANUAL", effectiveDueAt: deadlineAt, manualDueAt: deadlineAt, deadlineRevision: { increment: 1 }, deadlineSource: "MANUAL_OVERRIDE", updatedByUserId: input.actorUserId, version: { increment: 1 } }, where: { id: work.id } });
      return next;
    });
    await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.probeDeadlineChanged, actorUserId: input.actorUserId, metadata: { from: cycle.deadlineAt.toISOString(), to: deadlineAt.toISOString(), probe: `Proba activă`, workOrderLabel: work.code }, ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}), resourceId: cycle.id, resourceType: "probe_cycle" });
    return toProbeCycleView(updated);
  }

  /**
   * B12-only domain primitive. The caller must have already validated the
   * canonical `Recepționată` transition; there is intentionally no public
   * POST endpoint for this method in B10.
   */
  public async createNextActiveAfterReception(input: {
    readonly actorUserId: string;
    readonly workOrderId: string;
    readonly probeTypeId: string;
    readonly deadlineAt: string;
    readonly returnedAfterCompletedCycle: true;
    readonly legalEntity?: LegalEntityContext;
    readonly requestMetadata?: RequestMetadata;
  }): Promise<ProbeCycleView> {
    if (input.returnedAfterCompletedCycle !== true) throw new ConflictException("O nouă probă poate fi deschisă numai după recepționarea explicită a lucrării.");
    await this.authorizationService.requirePermission({ permission: "cycles.create_next", requiredScope: "ALL", userId: input.actorUserId });
    const work = await this.findVisibleWork(input.actorUserId, input.workOrderId, input.legalEntity);
    const deadlineAt = new Date(input.deadlineAt);
    if (!Number.isFinite(deadlineAt.getTime())) throw new BadRequestException("Termenul probei nu este valid.");
    const nextType = await this.probeTypesService.requireSelectable(input.probeTypeId, this.prisma);
    const configuredProbeCodes = intersectConfiguredProbeCodes((work.items ?? []).map((item) => jsonStringArray(item.workType?.probeTypeCodes)));
    if (configuredProbeCodes.length > 0 && (!nextType.code || !configuredProbeCodes.includes(nextType.code))) {
      throw new BadRequestException("Tipul probei nu este compatibil cu tipurile de lucrări ale acestei reveniri.");
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const current = await tx.workOrder.findUnique({ select: { activeProbeCycleId: true, status: true, technicalReadiness: true }, where: { id: work.id } });
      if (!current) throw new NotFoundException("Lucrarea nu a fost găsită.");
      if (current.status === "FINALIZATA" || current.technicalReadiness === "FINAL_READY") throw new ConflictException("O lucrare finalizată nu poate fi recepționată pentru o probă nouă.");
      if (current.activeProbeCycleId) throw new ConflictException("Lucrarea are deja o probă activă.");
      const last = await tx.probeCycle.findFirst({ orderBy: { sequence: "desc" }, select: { completionOutcome: true, sequence: true, status: true }, where: { workOrderId: work.id } });
      if (!last || last.status !== "COMPLETED" || last.completionOutcome !== "PROBE_READY") throw new ConflictException("Următoarea probă poate fi creată doar după marcarea probei ca Probă gata.");
      const cycle = await tx.probeCycle.create({ data: { createdByUserId: input.actorUserId, deadlineAt, openedAt: new Date(), probeTypeId: nextType.id, probeTypeNameSnapshot: nextType.name, sequence: last.sequence + 1, status: "ACTIVE", workOrderId: work.id }, include: { probeType: true } });
      const updated = await tx.workOrder.updateMany({ data: { activeProbeCycleId: cycle.id, deadlineMode: "MANUAL", effectiveDueAt: deadlineAt, manualDueAt: deadlineAt, deadlineSource: "CREATION", deadlineRevision: { increment: 1 }, probeReceivedAt: new Date(), status: "RECEPTIE", statusChangedAt: new Date(), statusChangedByUserId: input.actorUserId, technicalReadiness: null, version: { increment: 1 }, updatedByUserId: input.actorUserId }, where: { id: work.id, activeProbeCycleId: null, technicalReadiness: "PROBE_READY" } });
      if (updated.count !== 1) throw new ConflictException("Lucrarea a fost modificată simultan. Reîncarcă lucrarea.");
      return cycle;
    });
    await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.caseReceived, actorUserId: input.actorUserId, metadata: { nextProbeTypeName: created.probeTypeNameSnapshot, probeNumber: created.sequence, workOrderLabel: work.code, deadlineAt: deadlineAt.toISOString() }, ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}), resourceId: work.id, resourceType: "work_order" });
    await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.activeProbeCycleStarted, actorUserId: input.actorUserId, metadata: { probeTypeName: created.probeTypeNameSnapshot, probeNumber: created.sequence, workOrderLabel: work.code }, ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}), resourceId: created.id, resourceType: "probe_cycle" });
    await this.notificationsService?.publishProbeAvailable({ workOrderId: work.id, probeCycleId: created.id, code: work.code, patientName: work.patientName, sequence: created.sequence, probeTypeName: created.probeTypeNameSnapshot, deadlineAt: created.deadlineAt.toISOString() });
    return toProbeCycleView(created);
  }

  public async markProbeReady(input: { readonly actorUserId: string; readonly workOrderId: string; readonly legalEntity?: LegalEntityContext; readonly requestMetadata?: RequestMetadata }): Promise<void> {
    await this.authorizationService.requirePermission({ permission: "works.change_status", requiredScope: "OWN_STAGE", userId: input.actorUserId });
    // Technician transitions are authorized by ownership, not by the currently
    // selected organization context. A technician may work on a clinic whose
    // CDT/NG collaboration differs from the context currently active in the UI.
    const work = await this.findTransitionWork(input.actorUserId, input.workOrderId);
    this.assertTechnicianOwnsWork(work, input.actorUserId);
    if (work.status === "FINALIZATA") throw new ConflictException("Lucrarea este deja finalizată.");
    if (!work.activeProbeCycleId) throw new ConflictException("Lucrarea nu are o probă activă.");
    const activeCycleId = work.activeProbeCycleId;
    const now = new Date();
    const completed = await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.probeCycle.findFirst({ select: { id: true, sequence: true, probeTypeNameSnapshot: true, deadlineAt: true }, where: { id: activeCycleId, status: "ACTIVE", workOrderId: input.workOrderId } });
      if (!cycle) throw new ConflictException("Proba activă a fost deja închisă sau modificată.");
      const cycleUpdate = await tx.probeCycle.updateMany({ data: { completedAt: now, completedByUserId: input.actorUserId, completionOutcome: "PROBE_READY", status: "COMPLETED", version: { increment: 1 } }, where: { id: cycle.id, status: "ACTIVE" } });
      if (cycleUpdate.count !== 1) throw new ConflictException("Proba activă a fost deja închisă de alt utilizator.");
      const workUpdate = await tx.workOrder.updateMany({ data: { activeProbeCycleId: null, claimStatus: "UNCLAIMED", claimedAt: null, claimedByUserId: null, assignedTechnicianId: null, releasedAt: now, releasedByUserId: input.actorUserId, releaseReason: "Probă gata.", status: "IN_ASTEPTARE", statusChangedAt: now, statusChangedByUserId: input.actorUserId, technicalReadiness: "PROBE_READY", probeReadyAt: now, deadlineMode: null, effectiveDueAt: null, manualDueAt: null, deadlineSource: null, waitingStartedAt: now, updatedByUserId: input.actorUserId, version: { increment: 1 } }, where: { id: input.workOrderId, activeProbeCycleId: activeCycleId, status: { not: "FINALIZATA" }, claimStatus: "CLAIMED" } });
      if (workUpdate.count !== 1) throw new ConflictException("Lucrarea a fost modificată simultan. Reîncarcă detaliile.");
      await tx.workAssignmentEvent.create({ data: { actorUserId: input.actorUserId, eventType: "RELEASED", previousLegalEntityId: work.executionLegalEntityId, previousTechnicianId: work.claimedByUserId, reason: "Probă gata.", revision: work.claimRevision + 1, workOrderId: input.workOrderId } });
      return cycle;
    });
    await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.probeReady, actorUserId: input.actorUserId, metadata: { probeNumber: completed.sequence, probeTypeName: completed.probeTypeNameSnapshot, deadlineAt: completed.deadlineAt.toISOString(), workOrderLabel: work.code, notificationEvent: B17_LOGISTICS_NOTIFICATION_EVENTS.probeReady, notificationKey: getB17LogisticsNotificationKey(B17_LOGISTICS_NOTIFICATION_EVENTS.probeReady, { workOrderId: input.workOrderId, probeCycleId: completed.id }) }, ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}), resourceId: completed.id, resourceType: "probe_cycle" });
    await this.notificationsService?.publishProbe({ workOrderId: input.workOrderId, probeCycleId: completed.id, code: work.code, patientName: work.patientName, sequence: completed.sequence, probeTypeName: completed.probeTypeNameSnapshot, deadlineAt: completed.deadlineAt.toISOString() });
  }

  public async finalizeWork(input: { readonly actorUserId: string; readonly workOrderId: string; readonly legalEntity?: LegalEntityContext; readonly requestMetadata?: RequestMetadata }): Promise<void> {
    await this.authorizationService.requirePermission({ permission: "works.change_status", requiredScope: "OWN_STAGE", userId: input.actorUserId });
    const work = await this.findTransitionWork(input.actorUserId, input.workOrderId);
    this.assertTechnicianOwnsWork(work, input.actorUserId);
    if (work.status === "FINALIZATA") throw new ConflictException("Lucrarea este deja finalizată.");
    if (!work.activeProbeCycleId) {
      const now = new Date();
      const updated = await this.prisma.$transaction(async (tx) => {
        const workUpdate = await tx.workOrder.updateMany({
          data: {
            claimStatus: "UNCLAIMED",
            claimedAt: null,
            claimedByUserId: null,
            completedAt: now,
            completedByUserId: input.actorUserId,
            finalizedAt: now,
            releaseReason: "Finalizată.",
            releasedAt: now,
            releasedByUserId: input.actorUserId,
            assignedTechnicianId: null,
            status: "FINALIZATA",
            statusChangedAt: now,
            statusChangedByUserId: input.actorUserId,
            technicalReadiness: "FINAL_READY",
            updatedByUserId: input.actorUserId,
            version: { increment: 1 },
            waitingStartedAt: null,
          },
          where: { claimStatus: "CLAIMED", id: input.workOrderId, status: { not: "FINALIZATA" } },
        });
        if (workUpdate.count !== 1) throw new ConflictException("Lucrarea a fost modificată simultan. Reîncarcă detaliile.");
        await tx.workAssignmentEvent.create({ data: { actorUserId: input.actorUserId, eventType: "RELEASED", previousLegalEntityId: work.executionLegalEntityId, previousTechnicianId: work.claimedByUserId, reason: "Finalizată.", revision: work.claimRevision + 1, workOrderId: input.workOrderId } });
        return true;
      });
      if (updated) {
        await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.workOrderFinalized, actorUserId: input.actorUserId, metadata: { workOrderLabel: work.code, notificationEvent: B17_LOGISTICS_NOTIFICATION_EVENTS.finalWorkReady, notificationKey: getB17LogisticsNotificationKey(B17_LOGISTICS_NOTIFICATION_EVENTS.finalWorkReady, { workOrderId: input.workOrderId }) }, ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}), resourceId: input.workOrderId, resourceType: "work_order" });
        await this.notificationsService?.publishFinal({ workOrderId: input.workOrderId, code: work.code, patientName: work.patientName });
      }
      return;
    }
    const activeCycleId = work.activeProbeCycleId;
    const now = new Date();
    const completed = await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.probeCycle.findFirst({ select: { id: true, sequence: true, probeTypeNameSnapshot: true }, where: { id: activeCycleId, status: "ACTIVE", workOrderId: input.workOrderId } });
      if (!cycle) throw new ConflictException("Contextul tehnic a fost deja închis sau modificat.");
      const cycleUpdate = await tx.probeCycle.updateMany({ data: { completedAt: now, completedByUserId: input.actorUserId, completionOutcome: "FINALIZED", status: "COMPLETED", version: { increment: 1 } }, where: { id: cycle.id, status: "ACTIVE" } });
      if (cycleUpdate.count !== 1) throw new ConflictException("Contextul tehnic a fost deja închis de alt utilizator.");
      const workUpdate = await tx.workOrder.updateMany({ data: { activeProbeCycleId: null, claimStatus: "UNCLAIMED", claimedAt: null, claimedByUserId: null, assignedTechnicianId: null, releasedAt: now, releasedByUserId: input.actorUserId, releaseReason: "Finalizată.", status: "FINALIZATA", statusChangedAt: now, statusChangedByUserId: input.actorUserId, technicalReadiness: "FINAL_READY", finalizedAt: now, completedAt: now, completedByUserId: input.actorUserId, deadlineLockedAt: now, deadlineLockedReason: "Lucrare finalizată.", waitingStartedAt: null, updatedByUserId: input.actorUserId, version: { increment: 1 } }, where: { id: input.workOrderId, activeProbeCycleId: activeCycleId, status: { not: "FINALIZATA" }, claimStatus: "CLAIMED" } });
      if (workUpdate.count !== 1) throw new ConflictException("Lucrarea a fost modificată simultan. Reîncarcă detaliile.");
      await tx.workAssignmentEvent.create({ data: { actorUserId: input.actorUserId, eventType: "RELEASED", previousLegalEntityId: work.executionLegalEntityId, previousTechnicianId: work.claimedByUserId, reason: "Finalizată.", revision: work.claimRevision + 1, workOrderId: input.workOrderId } });
      return cycle;
    });
    await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.workOrderFinalized, actorUserId: input.actorUserId, metadata: { probeTypeName: completed.probeTypeNameSnapshot, workOrderLabel: work.code, notificationEvent: B17_LOGISTICS_NOTIFICATION_EVENTS.finalWorkReady, notificationKey: getB17LogisticsNotificationKey(B17_LOGISTICS_NOTIFICATION_EVENTS.finalWorkReady, { workOrderId: input.workOrderId }) }, ...(input.requestMetadata ? { requestMetadata: input.requestMetadata } : {}), resourceId: input.workOrderId, resourceType: "work_order" });
    await this.notificationsService?.publishFinal({ workOrderId: input.workOrderId, code: work.code, patientName: work.patientName });
  }

  private async findVisibleWork(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<{ readonly id: string; readonly code: string; readonly patientName: string; readonly items: readonly { readonly workType: { readonly probeTypeCodes: unknown } | null }[] }> {
    const visibleWhere = await getVisibleWorkWhere(this.authorizationService, actorUserId);
    const work = await this.prisma.workOrder.findFirst({ select: { code: true, id: true, patientName: true, items: { select: { workType: { select: { probeTypeCodes: true } } }, where: { archivedAt: null } } }, where: { AND: [{ id: workOrderId }, visibleWhere, ...(legalEntity ? [{ executionLegalEntityId: legalEntity.id }] : [])] } });
    if (!work) throw new NotFoundException("Lucrarea nu a fost găsită.");
    return work;
  }

  private async findTransitionWork(actorUserId: string, workOrderId: string, legalEntity?: LegalEntityContext): Promise<{ readonly id: string; readonly code: string; readonly patientName: string; readonly status: string; readonly activeProbeCycleId: string | null; readonly claimStatus: string; readonly claimedByUserId: string | null; readonly executionLegalEntityId: string | null; readonly claimRevision: number }> {
    const visibleWhere = await getVisibleWorkWhere(this.authorizationService, actorUserId);
    const work = await this.prisma.workOrder.findFirst({ select: { activeProbeCycleId: true, claimRevision: true, claimStatus: true, claimedByUserId: true, code: true, executionLegalEntityId: true, id: true, patientName: true, status: true }, where: { AND: [{ id: workOrderId }, visibleWhere, ...(legalEntity ? [{ executionLegalEntityId: legalEntity.id }] : [])] } });
    if (!work) throw new NotFoundException("Lucrarea nu a fost găsită.");
    return work;
  }

  private assertTechnicianOwnsWork(work: { readonly claimStatus: string; readonly claimedByUserId: string | null }, actorUserId: string): void {
    if (work.claimStatus !== "CLAIMED" || work.claimedByUserId !== actorUserId) throw new ForbiddenException("Doar tehnicianul responsabil poate executa această acțiune.");
  }
}

function jsonStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function intersectConfiguredProbeCodes(codeSets: readonly (readonly string[])[]): readonly string[] {
  const configured = codeSets.filter((codes) => codes.length > 0);
  if (configured.length === 0) return [];
  return configured.slice(1).reduce((common, codes) => common.filter((code) => codes.includes(code)), [...configured[0]!]);
}

function toProbeCycleView(cycle: { id: string; sequence: number; status: "ACTIVE" | "COMPLETED"; probeType: { id: string; name: string; sortOrder: number; isArchived: boolean }; probeTypeNameSnapshot: string; openedAt: Date; completedAt: Date | null; deadlineAt: Date }): ProbeCycleView {
  return { id: cycle.id, sequence: cycle.sequence, status: cycle.status, probeType: { id: cycle.probeType.id, name: cycle.probeType.name, sortOrder: cycle.probeType.sortOrder, isArchived: cycle.probeType.isArchived }, probeTypeNameSnapshot: cycle.probeTypeNameSnapshot, openedAt: cycle.openedAt.toISOString(), completedAt: cycle.completedAt?.toISOString() ?? null, deadlineAt: cycle.deadlineAt.toISOString() };
}
