import { HttpException, HttpStatus, Inject, Injectable, Logger, type MessageEvent, type OnApplicationShutdown } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Observable, type Subscriber } from "rxjs";
import type { RealtimeEventEnvelope } from "@dental-lab/shared";

import { loadServerEnvironment } from "../../config/environment.js";
import { SessionService } from "../auth/session.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { RealtimeAudienceService } from "./realtime-audience.service.js";
import { RealtimeEventBroker, type InternalRealtimeEvent } from "./realtime-event-broker.js";
import type { RealtimeMutationDescriptor } from "./realtime-mutation-map.js";

interface RealtimeConnection {
  readonly id: string;
  readonly sessionId: string;
  readonly userId: string;
  permissionKeys: ReadonlySet<string>;
  readonly subscriber: Subscriber<MessageEvent>;
}

@Injectable()
export class RealtimeService implements OnApplicationShutdown {
  private readonly connections = new Map<string, RealtimeConnection>();
  private readonly logger = new Logger(RealtimeService.name);
  private readonly reservedByUser = new Map<string, number>();
  private reservedTotal = 0;

  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(RealtimeAudienceService) private readonly audienceService: RealtimeAudienceService,
    @Inject(RealtimeEventBroker) private readonly broker: RealtimeEventBroker,
    @Inject(SessionService) private readonly sessionService: SessionService,
  ) {}

  public createEventStream(input: { readonly expiresAt: Date; readonly sessionId: string; readonly userId: string }): Observable<MessageEvent> {
    this.reserveConnection(input.userId);

    return new Observable<MessageEvent>((subscriber) => {
      const connectionId = randomUUID();
      let isClosed = false;
      let isCheckingSession = false;
      let unsubscribeBroker: (() => void) | undefined;
      let heartbeatTimer: NodeJS.Timeout | undefined;
      let sessionTimer: NodeJS.Timeout | undefined;

      const close = (): void => {
        if (isClosed) return;
        isClosed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (sessionTimer) clearInterval(sessionTimer);
        unsubscribeBroker?.();
        this.connections.delete(connectionId);
        this.releaseConnection(input.userId);
      };

      const initialize = async (): Promise<void> => {
        try {
          const snapshot = await this.authorizationService.getEffectivePermissions(input.userId);
          if (isClosed) return;

          const connection: RealtimeConnection = {
            id: connectionId,
            permissionKeys: new Set(snapshot.permissions.map((permission) => permission.key)),
            sessionId: input.sessionId,
            subscriber,
            userId: input.userId,
          };
          this.connections.set(connectionId, connection);
          unsubscribeBroker = this.broker.subscribe((event) => this.forwardEvent(connection, event));

          const environment = loadServerEnvironment();
          heartbeatTimer = setInterval(() => {
            subscriber.next({ data: { occurredAt: new Date().toISOString() }, type: "heartbeat" });
          }, environment.realtimeHeartbeatSeconds * 1_000);
          heartbeatTimer.unref?.();

          sessionTimer = setInterval(() => {
            if (isCheckingSession) return;
            isCheckingSession = true;
            void this.verifyConnectionSession(connection, input.expiresAt)
              .catch((error: unknown) => {
                this.logger.error(`Realtime session validation failed for connection ${connection.id}.`, error instanceof Error ? error.stack : String(error));
              })
              .finally(() => {
                isCheckingSession = false;
              });
          }, environment.realtimeSessionRecheckSeconds * 1_000);
          sessionTimer.unref?.();

          subscriber.next({
            data: { connectedAt: new Date().toISOString() },
            retry: 3_000,
            type: "ready",
          });
        } catch (error) {
          this.logger.error("Realtime connection initialization failed.", error instanceof Error ? error.stack : String(error));
          subscriber.error(error);
        }
      };

      void initialize();

      return close;
    });
  }

  public publishMutation(
    descriptor: RealtimeMutationDescriptor,
    context: { readonly actorUserId?: string },
  ): void {
    if (descriptor.type === "ACCESS_CHANGED" && descriptor.authTargetUserId) {
      this.signalAuthorizationChanged(descriptor.authTargetUserId);
    }

    this.broker.publish({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      topics: descriptor.topics,
      type: descriptor.type,
      ...(context.actorUserId ? { actorUserId: context.actorUserId } : {}),
      ...(descriptor.audienceUserId ? { audienceUserId: descriptor.audienceUserId } : {}),
      ...(descriptor.authTargetUserId ? { authTargetUserId: descriptor.authTargetUserId } : {}),
      ...(descriptor.technicianSubjectUserId ? { technicianSubjectUserId: descriptor.technicianSubjectUserId } : {}),
    });
  }

  public onApplicationShutdown(): void {
    for (const connection of [...this.connections.values()]) {
      connection.subscriber.next({
        data: { disconnectedAt: new Date().toISOString() },
        type: "service-unavailable",
      });
      connection.subscriber.complete();
    }
  }

  private forwardEvent(connection: RealtimeConnection, event: InternalRealtimeEvent): void {
    const topics = this.audienceService.allowedTopics(event, {
      permissionKeys: connection.permissionKeys,
      userId: connection.userId,
    });
    if (topics.length === 0) return;

    const envelope: RealtimeEventEnvelope = {
      id: event.id,
      occurredAt: event.occurredAt,
      topics,
      type: event.type,
    };
    connection.subscriber.next({ data: envelope, id: event.id, type: "domain" });
  }

  private signalAuthorizationChanged(userId: string): void {
    for (const connection of this.connections.values()) {
      if (connection.userId !== userId) continue;
      connection.subscriber.next({ data: { changedAt: new Date().toISOString() }, type: "access-changed" });
      connection.subscriber.complete();
    }
  }

  private async verifyConnectionSession(connection: RealtimeConnection, knownExpiry: Date): Promise<void> {
    const usable = knownExpiry.getTime() > Date.now()
      && await this.sessionService.isSessionActive(connection.sessionId, connection.userId);
    if (usable) return;

    connection.subscriber.next({ data: { expiredAt: new Date().toISOString() }, type: "session-expired" });
    connection.subscriber.complete();
  }

  private reserveConnection(userId: string): void {
    const environment = loadServerEnvironment();
    const userConnections = this.reservedByUser.get(userId) ?? 0;
    if (this.reservedTotal >= environment.realtimeMaxConnections || userConnections >= environment.realtimeMaxConnectionsPerUser) {
      throw new HttpException("Prea multe conexiuni de sincronizare active.", HttpStatus.TOO_MANY_REQUESTS);
    }
    this.reservedTotal += 1;
    this.reservedByUser.set(userId, userConnections + 1);
  }

  private releaseConnection(userId: string): void {
    this.reservedTotal = Math.max(0, this.reservedTotal - 1);
    const userConnections = Math.max(0, (this.reservedByUser.get(userId) ?? 1) - 1);
    if (userConnections === 0) this.reservedByUser.delete(userId);
    else this.reservedByUser.set(userId, userConnections);
  }
}
