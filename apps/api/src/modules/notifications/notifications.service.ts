import { Inject, Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { B16_NOTIFICATION_EVENTS, B18_NOTIFICATION_LABELS_RO, B17_LOGISTICS_NOTIFICATION_EVENTS, type B18NotificationType } from "@dental-lab/shared";

import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { type NotificationSeverity } from "./notifications.constants.js";
import { toNotificationView, type NotificationView, type PaginatedNotificationsView } from "./notifications.view.js";

export interface PublishInput {
  readonly dedupeKey: string;
  readonly deepLink: string;
  readonly message: string;
  readonly metadata?: Prisma.InputJsonValue;
  readonly recipientPermission: "manager" | "logistics" | "technician";
  readonly resourceId: string | null;
  readonly resourceType: string;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly type: B18NotificationType;
}
type NotificationDb = Pick<PrismaService, "notification" | "user">;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private deadlineTimer: ReturnType<typeof setInterval> | null = null;
  private readonly logger = new Logger(NotificationsService.name);

  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public onModuleInit(): void {
    this.deadlineTimer = setInterval(() => { void this.evaluateDeadlinesSafely(); }, 5 * 60 * 1000);
    if (typeof this.deadlineTimer === "object" && "unref" in this.deadlineTimer) this.deadlineTimer.unref();
  }

  public onModuleDestroy(): void {
    if (this.deadlineTimer) clearInterval(this.deadlineTimer);
    this.deadlineTimer = null;
  }

  public async list(userId: string, page = 1, pageSize = 25): Promise<PaginatedNotificationsView> {
    await this.authorizationService.requirePermission({ permission: "notifications.read_own", userId });
    const boundedPage = Math.max(1, page);
    const boundedSize = Math.min(100, Math.max(1, pageSize));
    const where = { recipientUserId: userId, resolvedAt: null };
    const [total, unreadCount, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
      this.prisma.notification.findMany({ orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }, { id: "desc" }], skip: (boundedPage - 1) * boundedSize, take: boundedSize, where }),
    ]);
    return { items: rows.map(toNotificationView), page: boundedPage, pageCount: Math.max(1, Math.ceil(total / boundedSize)), pageSize: boundedSize, total, unreadCount };
  }

  public async unreadCount(userId: string): Promise<number> {
    await this.authorizationService.requirePermission({ permission: "notifications.read_own", userId });
    return this.prisma.notification.count({ where: { recipientUserId: userId, readAt: null, resolvedAt: null } });
  }

  public async markRead(userId: string, notificationId: string): Promise<NotificationView> {
    await this.authorizationService.requirePermission({ permission: "notifications.mark_read_own", userId });
    const existing = await this.prisma.notification.findFirst({ where: { id: notificationId, recipientUserId: userId } });
    if (!existing) throw new NotFoundException("Notificarea nu a fost găsită pentru utilizatorul curent.");
    const row = await this.prisma.notification.update({ data: { readAt: existing.readAt ?? new Date() }, where: { id: notificationId } });
    return toNotificationView(row);
  }

  public async markAllRead(userId: string): Promise<{ readonly updated: number }> {
    await this.authorizationService.requirePermission({ permission: "notifications.mark_read_own", userId });
    const result = await this.prisma.notification.updateMany({ data: { readAt: new Date() }, where: { recipientUserId: userId, readAt: null } });
    return { updated: result.count };
  }

  public async dismiss(userId: string, notificationId: string): Promise<NotificationView> {
    await this.authorizationService.requirePermission({ permission: "notifications.dismiss_own", userId });
    const existing = await this.prisma.notification.findFirst({ where: { id: notificationId, recipientUserId: userId } });
    if (!existing) throw new NotFoundException("Notificarea nu a fost găsită pentru utilizatorul curent.");
    const row = await this.prisma.notification.update({
      data: { readAt: existing.readAt ?? new Date(), resolvedAt: existing.resolvedAt ?? new Date() },
      where: { id: notificationId },
    });
    return toNotificationView(row);
  }

  public async publish(input: PublishInput): Promise<void> {
    await this.publishWithClient(this.prisma, input);
  }

  public async publishInTransaction(tx: Prisma.TransactionClient, input: PublishInput): Promise<void> {
    await this.publishWithClient(tx, input);
  }

  private async publishWithClient(client: NotificationDb, input: PublishInput): Promise<void> {
    const recipients = await this.resolveRecipients(input.recipientPermission, client);
    if (recipients.length === 0) return;
    const data = recipients.map((recipientUserId) => ({
      dedupeKey: input.dedupeKey,
      deepLink: input.deepLink,
      message: input.message,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      recipientUserId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      severity: input.severity,
      title: input.title,
      type: input.type,
    }));
    try {
      await client.notification.createMany({ data, skipDuplicates: true });
    } catch (error) {
      // A user can be archived/deleted between recipient resolution and insert.
      // Re-read valid ids and retry so notification reconciliation cannot fail
      // the surrounding request or transaction with a foreign-key error.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2003") throw error;
      const validUsers = await client.user.findMany({ select: { id: true }, where: { id: { in: [...recipients] } } });
      const validIds = new Set(validUsers.map((user) => user.id));
      const validData = data.filter((entry) => validIds.has(entry.recipientUserId));
      if (validData.length > 0) await client.notification.createMany({ data: validData, skipDuplicates: true });
    }
  }

  public async resolve(type: B18NotificationType, dedupeKey: string): Promise<void> {
    await this.prisma.notification.updateMany({ data: { resolvedAt: new Date() }, where: { dedupeKey, resolvedAt: null, type } });
  }

  public async publishUnpricedWorkType(workType: { readonly id: string; readonly name: string }): Promise<void> {
    await this.publish({
      dedupeKey: `work_type:${workType.id}:pricing_required`,
      deepLink: `/work-settings?workTypeId=${encodeURIComponent(workType.id)}`,
      message: `${workType.name} a fost adăugat în catalog și necesită configurarea prețului.`,
      recipientPermission: "manager",
      resourceId: workType.id,
      resourceType: "work_type",
      severity: "ACTION",
      title: B18_NOTIFICATION_LABELS_RO.NEW_UNPRICED_WORK_TYPE_REQUIRES_MANAGER_PRICING,
      type: B16_NOTIFICATION_EVENTS.newUnpricedWorkTypeRequiresManagerPricing,
    });
  }

  public async resolveUnpricedWorkType(workTypeId: string): Promise<void> {
    await this.resolve(B16_NOTIFICATION_EVENTS.newUnpricedWorkTypeRequiresManagerPricing, `work_type:${workTypeId}:pricing_required`);
  }

  public async publishNewWork(input: { readonly workOrderId: string; readonly code: string; readonly patientName: string; readonly clinicName?: string | null; readonly technicianAvailable?: boolean }): Promise<void> {
    await this.publish({ dedupeKey: `new-work:${input.workOrderId}`, deepLink: `/logistics?workId=${encodeURIComponent(input.workOrderId)}`, message: `${input.code} · ${input.patientName}${input.clinicName ? ` · ${input.clinicName}` : ""}`, recipientPermission: "logistics", resourceId: input.workOrderId, resourceType: "work_order", severity: "INFO", title: B18_NOTIFICATION_LABELS_RO.NEW_WORK, type: B17_LOGISTICS_NOTIFICATION_EVENTS.newWork });
    if (input.technicianAvailable !== false) await this.publish({ dedupeKey: `technician-new-work:${input.workOrderId}`, deepLink: `/works?workId=${encodeURIComponent(input.workOrderId)}`, message: `${input.code} · ${input.patientName}`, recipientPermission: "technician", resourceId: input.workOrderId, resourceType: "work_order", severity: "ACTION", title: B18_NOTIFICATION_LABELS_RO.NEW_WORK_AVAILABLE, type: "NEW_WORK_AVAILABLE" });
  }

  public async publishProbe(input: { readonly workOrderId: string; readonly probeCycleId: string; readonly code: string; readonly patientName: string; readonly sequence: number; readonly probeTypeName: string; readonly deadlineAt: string }): Promise<void> {
    await this.publish({ dedupeKey: `probe-ready:${input.workOrderId}:${input.probeCycleId}`, deepLink: `/logistics?workId=${encodeURIComponent(input.workOrderId)}`, message: `${input.code} · ${input.patientName} · Proba ${input.sequence} · ${input.probeTypeName} · termen ${input.deadlineAt}`, recipientPermission: "logistics", resourceId: input.workOrderId, resourceType: "probe_cycle", severity: "ACTION", title: B18_NOTIFICATION_LABELS_RO.PROBE_READY, type: B17_LOGISTICS_NOTIFICATION_EVENTS.probeReady });
  }

  public async publishFinal(input: { readonly workOrderId: string; readonly code: string; readonly patientName: string }): Promise<void> {
    await this.publish({ dedupeKey: `final-ready:${input.workOrderId}`, deepLink: `/logistics?workId=${encodeURIComponent(input.workOrderId)}`, message: `${input.code} · ${input.patientName}`, recipientPermission: "logistics", resourceId: input.workOrderId, resourceType: "work_order", severity: "ACTION", title: B18_NOTIFICATION_LABELS_RO.FINAL_WORK_READY, type: B17_LOGISTICS_NOTIFICATION_EVENTS.finalWorkReady });
  }

  public async publishDelivery(input: { readonly deliveryId: string; readonly workOrderId: string; readonly code: string; readonly patientName: string; readonly failed: boolean; readonly failureReason?: string | null }): Promise<void> {
    const type = input.failed ? B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryFailed : B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryCompleted;
    await this.publish({ dedupeKey: `${input.failed ? "delivery-failed" : "delivery-completed"}:${input.deliveryId}`, deepLink: input.failed ? `/logistics?workId=${encodeURIComponent(input.workOrderId)}` : `/deliveries?deliveryId=${encodeURIComponent(input.deliveryId)}`, message: `${input.code} · ${input.patientName}${input.failed && input.failureReason ? ` · ${input.failureReason}` : ""}`, ...(input.failed ? { metadata: { failureReason: input.failureReason ?? null } } : {}), recipientPermission: "logistics", resourceId: input.deliveryId, resourceType: "delivery", severity: input.failed ? "ERROR" : "SUCCESS", title: input.failed ? B18_NOTIFICATION_LABELS_RO.DELIVERY_FAILED : B18_NOTIFICATION_LABELS_RO.DELIVERY_COMPLETED, type });
  }

  public async publishDeliveryInTransaction(tx: Prisma.TransactionClient, input: { readonly deliveryId: string; readonly workOrderId: string; readonly code: string; readonly patientName: string; readonly failed: boolean; readonly failureReason?: string | null }): Promise<void> {
    const type = input.failed ? B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryFailed : B17_LOGISTICS_NOTIFICATION_EVENTS.deliveryCompleted;
    await this.publishInTransaction(tx, { dedupeKey: `${input.failed ? "delivery-failed" : "delivery-completed"}:${input.deliveryId}`, deepLink: input.failed ? `/logistics?workId=${encodeURIComponent(input.workOrderId)}` : `/deliveries?deliveryId=${encodeURIComponent(input.deliveryId)}`, message: `${input.code} · ${input.patientName}${input.failed && input.failureReason ? ` · ${input.failureReason}` : ""}`, ...(input.failed ? { metadata: { failureReason: input.failureReason ?? null } } : {}), recipientPermission: "logistics", resourceId: input.deliveryId, resourceType: "delivery", severity: input.failed ? "ERROR" : "SUCCESS", title: input.failed ? B18_NOTIFICATION_LABELS_RO.DELIVERY_FAILED : B18_NOTIFICATION_LABELS_RO.DELIVERY_COMPLETED, type });
  }

  public async publishProbeAvailable(input: { readonly workOrderId: string; readonly probeCycleId: string; readonly code: string; readonly patientName: string; readonly sequence: number; readonly probeTypeName: string; readonly deadlineAt: string }): Promise<void> {
      await this.publish({ dedupeKey: `technician-probe:${input.workOrderId}:${input.probeCycleId}`, deepLink: `/works?workId=${encodeURIComponent(input.workOrderId)}`, message: `${input.code} · ${input.patientName} · Proba ${input.sequence} · ${input.probeTypeName} · termen ${input.deadlineAt}`, recipientPermission: "technician", resourceId: input.workOrderId, resourceType: "probe_cycle", severity: "ACTION", title: B18_NOTIFICATION_LABELS_RO.NEW_PROBE_AVAILABLE, type: "NEW_PROBE_AVAILABLE" });
  }

  public async resolveAvailability(workOrderId: string): Promise<void> {
    await this.prisma.notification.updateMany({ data: { resolvedAt: new Date() }, where: { resolvedAt: null, OR: [{ dedupeKey: `technician-new-work:${workOrderId}` }, { dedupeKey: { startsWith: `technician-probe:${workOrderId}:` } }] } });
  }

  public async resolveLogisticsReadiness(workOrderId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      data: { resolvedAt: new Date() },
      where: { resolvedAt: null, OR: [{ dedupeKey: { startsWith: `probe-ready:${workOrderId}:` } }, { dedupeKey: `final-ready:${workOrderId}` }] },
    });
  }

  public async reconcileBilling(): Promise<void> {
    // PrismaPg with the pooled Neon connection must not receive concurrent
    // queries through the same adapter client. Sequential reads avoid the
    // pg@9 "client.query() while already executing" warning.
    const settings = await this.prisma.legalEntitySettings.findMany({ select: { currency: true, largeOutstandingThresholdMinor: true, legalEntityId: true } });
    const works = await this.prisma.workOrder.findMany({
      include: {
        activeCycle: { include: { billingLines: { include: { billingDocument: true } }, executionSnapshot: true } },
        clinic: true,
      },
      where: { technicalReadiness: "FINAL_READY" },
    });
    const invoices = await this.prisma.billingDocument.findMany({
      include: { payments: true },
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] }, type: "INVOICE", stornoOfDocumentId: null },
    });

    const settingsByEntity = new Map(settings.map((setting) => [setting.legalEntityId, setting]));
    for (const work of works) {
      const cycle = work.activeCycle;
      const snapshot = cycle?.executionSnapshot;
      const hasActiveInvoice = cycle?.billingLines.some((line) => line.billingDocument.status !== "CANCELLED" && line.billingDocument.type === "INVOICE" && line.billingDocument.stornoOfDocumentId === null) ?? false;
      if (!cycle || !snapshot || snapshot.status !== "LOCKED" || snapshot.pricingTotalMinor === null || snapshot.pricingUnitPriceMinor === null || hasActiveInvoice) continue;
      await this.publishBillingCandidate({ code: work.code, patientName: work.patientName, workOrderId: work.id });
    }

    const balances = new Map<string, { readonly clinicId: string; readonly clinicName: string; readonly currency: string; readonly legalEntityId: string; readonly totalMinor: number }>();
    for (const invoice of invoices) {
      if (!invoice.legalEntityId) continue;
      const paidMinor = invoice.payments.filter((payment) => payment.cancelledAt === null).reduce((total, payment) => total + payment.amountMinor, 0);
      const balanceMinor = Math.max(0, invoice.totalMinor - paidMinor);
      const key = `${invoice.legalEntityId}:${invoice.clinicId}:${invoice.currency}`;
      const current = balances.get(key);
      balances.set(key, { clinicId: invoice.clinicId, clinicName: invoice.clinicNameSnapshot, currency: invoice.currency, legalEntityId: invoice.legalEntityId, totalMinor: (current?.totalMinor ?? 0) + balanceMinor });
    }
    for (const balance of balances.values()) {
      const setting = settingsByEntity.get(balance.legalEntityId);
      const threshold = setting?.currency === balance.currency ? setting.largeOutstandingThresholdMinor : null;
      const keyPrefix = `billing-large-balance:${balance.legalEntityId}:${balance.clinicId}:${balance.currency}`;
      if (threshold !== null && threshold !== undefined && balance.totalMinor > threshold) {
        const existing = await this.prisma.notification.findFirst({ where: { type: "LARGE_OUTSTANDING_BALANCE", dedupeKey: { startsWith: keyPrefix }, resolvedAt: null } });
        if (!existing) {
          await this.publish({ dedupeKey: `${keyPrefix}:${new Date().toISOString().slice(0, 10)}`, deepLink: `/billing?tab=receivables&clinicId=${encodeURIComponent(balance.clinicId)}`, message: `${balance.clinicName} · ${balance.totalMinor} ${balance.currency} restante`, recipientPermission: "manager", resourceId: balance.clinicId, resourceType: "clinic", severity: "WARNING", title: B18_NOTIFICATION_LABELS_RO.LARGE_OUTSTANDING_BALANCE, type: "LARGE_OUTSTANDING_BALANCE" });
        }
      } else {
        await this.prisma.notification.updateMany({ data: { resolvedAt: new Date() }, where: { type: "LARGE_OUTSTANDING_BALANCE", dedupeKey: { startsWith: keyPrefix }, resolvedAt: null } });
      }
    }
  }

  private async publishBillingCandidate(input: { readonly workOrderId: string; readonly code: string; readonly patientName: string }): Promise<void> {
    const deepLink = `/billing?tab=uninvoiced&workId=${encodeURIComponent(input.workOrderId)}`;
    const base = { deepLink, message: `${input.code} · ${input.patientName}`, recipientPermission: "manager" as const, resourceId: input.workOrderId, resourceType: "work_order", severity: "ACTION" as const };
    await this.publish({ ...base, dedupeKey: `invoice-required:work:${input.workOrderId}`, title: B18_NOTIFICATION_LABELS_RO.INVOICE_REQUIRED, type: "INVOICE_REQUIRED" });
    await this.publish({ ...base, dedupeKey: `payment-note-required:work:${input.workOrderId}`, title: B18_NOTIFICATION_LABELS_RO.PAYMENT_NOTE_REQUIRED, type: "PAYMENT_NOTE_REQUIRED" });
  }

  public async reconcileUnpricedWorkTypes(): Promise<void> {
    const workTypes = await this.prisma.workType.findMany({ select: { id: true, name: true }, where: { basePriceMinor: null, isActive: true } });
    for (const workType of workTypes) await this.publishUnpricedWorkType(workType);
  }

  private async evaluateDeadlines(): Promise<void> {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const works = await this.prisma.workOrder.findMany({ select: { code: true, effectiveDueAt: true, id: true, patientName: true, status: true }, where: { effectiveDueAt: { not: null }, status: { not: "FINALIZATA" } } });
    for (const work of works) {
      if (!work.effectiveDueAt) continue;
      const key = `deadline:${work.id}:${work.effectiveDueAt.toISOString()}`;
      if (work.effectiveDueAt <= now) {
        await this.resolve("DEADLINE_APPROACHING", key);
        await this.publish({ dedupeKey: key, deepLink: `/logistics?workId=${encodeURIComponent(work.id)}`, message: `${work.code} · ${work.patientName}`, recipientPermission: "logistics", resourceId: work.id, resourceType: "work_order", severity: "ERROR", title: B18_NOTIFICATION_LABELS_RO.OVERDUE_WORK, type: "OVERDUE_WORK" });
      } else if (work.effectiveDueAt <= soon) {
        await this.publish({ dedupeKey: key, deepLink: `/logistics?workId=${encodeURIComponent(work.id)}`, message: `${work.code} · ${work.patientName} · termen ${work.effectiveDueAt.toISOString()}`, recipientPermission: "logistics", resourceId: work.id, resourceType: "work_order", severity: "WARNING", title: B18_NOTIFICATION_LABELS_RO.DEADLINE_APPROACHING, type: "DEADLINE_APPROACHING" });
      } else {
        await this.resolve("DEADLINE_APPROACHING", key);
        await this.resolve("OVERDUE_WORK", key);
      }
    }
  }

  private async evaluateDeadlinesSafely(): Promise<void> {
    await this.reconcileSafely("deadlines", () => this.evaluateDeadlines());
  }

  private async reconcileSafely(label: string, operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Notification reconciliation for ${label} skipped: ${message}`);
    }
  }

  private async resolveRecipients(kind: PublishInput["recipientPermission"], client: NotificationDb = this.prisma): Promise<readonly string[]> {
    const users = await client.user.findMany({ select: { id: true }, where: { isActive: true } });
    const checks = kind === "manager"
      ? (["finance.read", "invoice.create"] as const)
      : kind === "logistics"
        ? (["logistics.center.read"] as const)
        : (["technician.workbench.read", "works.claim.available.read", "works.claim.create"] as const);
    const recipientIds: string[] = [];
    for (const user of users) {
      for (const permission of checks) {
        const permissionResult = await this.authorizationService.hasPermission({ permission, userId: user.id });
        if (permissionResult.allowed) {
          recipientIds.push(user.id);
          break;
        }
      }
    }
    return recipientIds;
  }
}
