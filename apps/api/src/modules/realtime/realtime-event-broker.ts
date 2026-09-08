import { Injectable, Logger } from "@nestjs/common";
import type { RealtimeEventEnvelope } from "@dental-lab/shared";

export interface InternalRealtimeEvent extends RealtimeEventEnvelope {
  readonly actorUserId?: string;
  /** Restricts the whole event to one user, for session-scoped mutations. */
  readonly audienceUserId?: string;
  /** Makes only the `auth` topic visible to the affected user. */
  readonly authTargetUserId?: string;
}

export type RealtimeEventListener = (event: InternalRealtimeEvent) => void;

/**
 * Broker boundary for the current single API instance. A Redis/Postgres pub/sub
 * adapter can replace this implementation without changing controllers or the
 * browser contract.
 */
export abstract class RealtimeEventBroker {
  public abstract publish(event: InternalRealtimeEvent): void;
  public abstract subscribe(listener: RealtimeEventListener): () => void;
}

@Injectable()
export class InMemoryRealtimeEventBroker extends RealtimeEventBroker {
  private readonly listeners = new Set<RealtimeEventListener>();
  private readonly logger = new Logger(InMemoryRealtimeEventBroker.name);

  public publish(event: InternalRealtimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error("A realtime subscriber rejected an event.", error instanceof Error ? error.stack : String(error));
      }
    }
  }

  public subscribe(listener: RealtimeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
