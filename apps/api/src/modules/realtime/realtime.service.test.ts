import type { MessageEvent } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionService } from "../auth/session.service.js";
import type { AuthorizationService } from "../rbac/authorization.service.js";
import { RealtimeAudienceService } from "./realtime-audience.service.js";
import { RealtimeEventBroker, type InternalRealtimeEvent, type RealtimeEventListener } from "./realtime-event-broker.js";
import { RealtimeService } from "./realtime.service.js";

class BrokerStub extends RealtimeEventBroker {
  private readonly listeners = new Set<RealtimeEventListener>();

  public publish(event: InternalRealtimeEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  public subscribe(listener: RealtimeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

function createService(input: { readonly active?: boolean; readonly permissions?: readonly string[] } = {}) {
  const broker = new BrokerStub();
  const authorization = {
    getEffectivePermissions: vi.fn().mockResolvedValue({
      permissions: (input.permissions ?? ["works.read_assigned"]).map((key) => ({ key, scopes: ["ASSIGNED"] })),
    }),
  } as unknown as AuthorizationService;
  const session = {
    isSessionActive: vi.fn().mockResolvedValue(input.active ?? true),
  } as unknown as SessionService;
  return {
    broker,
    service: new RealtimeService(authorization, new RealtimeAudienceService(), broker, session),
    session,
  };
}

describe("RealtimeService", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("forwards only the authorized subset of an event", async () => {
    const { broker, service } = createService({ permissions: ["works.read_assigned"] });
    const messages: MessageEvent[] = [];
    const subscription = service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-1", userId: "tech-1" }).subscribe((message) => messages.push(message));
    await vi.waitFor(() => expect(messages.some((message) => message.type === "ready")).toBe(true));

    broker.publish({
      id: "event-1",
      occurredAt: "2026-09-07T10:00:00.000Z",
      topics: ["audit", "works"],
      type: "WORK_CHANGED",
    });

    const domainMessage = messages.find((message) => message.type === "domain");
    expect(domainMessage?.data).toMatchObject({ id: "event-1", topics: ["works"] });
    subscription.unsubscribe();
  });

  it("expires a stream when its server-side session is no longer valid", async () => {
    vi.useFakeTimers();
    vi.stubEnv("REALTIME_SESSION_RECHECK_SECONDS", "5");
    const { service, session } = createService({ active: false });
    const messages: MessageEvent[] = [];
    let completed = false;
    service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-1", userId: "user-1" }).subscribe({
      complete: () => { completed = true; },
      next: (message) => messages.push(message),
    });
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(session.isSessionActive).toHaveBeenCalledWith("session-1", "user-1");
    expect(messages.some((message) => message.type === "session-expired")).toBe(true);
    expect(completed).toBe(true);
  });

  it("closes active streams cleanly during application shutdown", async () => {
    const { service } = createService();
    const messages: MessageEvent[] = [];
    let completed = false;
    service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-1", userId: "user-1" }).subscribe({
      complete: () => { completed = true; },
      next: (message) => messages.push(message),
    });
    await vi.waitFor(() => expect(messages.some((message) => message.type === "ready")).toBe(true));

    service.onApplicationShutdown();

    expect(messages.some((message) => message.type === "service-unavailable")).toBe(true);
    expect(completed).toBe(true);
  });

  it("closes the affected user's streams immediately after an access change", async () => {
    const { service } = createService({ permissions: ["works.read_assigned"] });
    const messages: MessageEvent[] = [];
    let completed = false;
    service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-1", userId: "user-1" }).subscribe({
      complete: () => { completed = true; },
      next: (message) => messages.push(message),
    });
    await vi.waitFor(() => expect(messages.some((message) => message.type === "ready")).toBe(true));

    service.publishMutation({ authTargetUserId: "user-1", topics: ["auth", "users"], type: "ACCESS_CHANGED" }, { actorUserId: "manager-1" });

    expect(messages.some((message) => message.type === "access-changed")).toBe(true);
    expect(completed).toBe(true);
  });

  it("refreshes a targeted profile without treating it as an access revocation", async () => {
    const { service } = createService({ permissions: ["works.read_assigned"] });
    const messages: MessageEvent[] = [];
    let completed = false;
    const subscription = service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-1", userId: "user-1" }).subscribe({
      complete: () => { completed = true; },
      next: (message) => messages.push(message),
    });
    await vi.waitFor(() => expect(messages.some((message) => message.type === "ready")).toBe(true));

    service.publishMutation({ authTargetUserId: "user-1", topics: ["auth", "works"], type: "REFERENCE_CHANGED" }, { actorUserId: "user-1" });

    expect(messages.find((message) => message.type === "domain")?.data).toMatchObject({ topics: ["auth", "works"] });
    expect(completed).toBe(false);
    subscription.unsubscribe();
  });

  it("enforces and releases the per-user connection cap", async () => {
    vi.stubEnv("REALTIME_MAX_CONNECTIONS_PER_USER", "1");
    const { service } = createService();
    const first = service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-1", userId: "user-1" }).subscribe();

    expect(() => service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-2", userId: "user-1" })).toThrow("Prea multe conexiuni de sincronizare active.");

    first.unsubscribe();
    const replacement = service.createEventStream({ expiresAt: new Date(Date.now() + 60_000), sessionId: "session-3", userId: "user-1" }).subscribe();
    replacement.unsubscribe();
  });
});
