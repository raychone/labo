import { describe, expect, it } from "vitest";

import { RealtimeAudienceService } from "./realtime-audience.service.js";
import type { InternalRealtimeEvent } from "./realtime-event-broker.js";

function event(overrides: Partial<InternalRealtimeEvent> = {}): InternalRealtimeEvent {
  return {
    id: "event-1",
    occurredAt: "2026-09-07T10:00:00.000Z",
    topics: ["billing", "works"],
    type: "BILLING_CHANGED",
    ...overrides,
  };
}

describe("RealtimeAudienceService", () => {
  const service = new RealtimeAudienceService();

  it("does not expose even financial event metadata to a technician", () => {
    expect(service.allowedTopics(event(), {
      permissionKeys: new Set(["technician.workbench.read", "works.read_assigned"]),
      userId: "tech-1",
    })).toStrictEqual([]);
  });

  it("does not expose financial event metadata through a generic notification permission", () => {
    expect(service.allowedTopics(event({ topics: ["notifications"] }), {
      permissionKeys: new Set(["notifications.read_own"]),
      userId: "reception-1",
    })).toStrictEqual([]);
  });

  it("allows financial invalidation only to a financially authorized user", () => {
    expect(service.allowedTopics(event(), {
      permissionKeys: new Set(["finance.read", "works.read_all"]),
      userId: "manager-1",
    })).toStrictEqual(["billing", "works"]);
  });

  it("enforces user-targeted events and own earnings", () => {
    const targeted = event({ actorUserId: "manager-1", audienceUserId: "tech-1", technicianSubjectUserId: "tech-1", topics: ["technician-earnings"], type: "TECHNICIAN_CHANGED" });
    expect(service.allowedTopics(targeted, {
      permissionKeys: new Set(["technician.earnings.read_own"]),
      userId: "tech-1",
    })).toStrictEqual(["technician-earnings"]);
    expect(service.allowedTopics(targeted, {
      permissionKeys: new Set(["technician.earnings.read_all"]),
      userId: "manager-1",
    })).toStrictEqual([]);
  });

  it("updates the affected technician and authorized managers after a manager records payment", () => {
    const payment = event({
      actorUserId: "manager-1",
      technicianSubjectUserId: "tech-1",
      topics: ["technician-earnings"],
      type: "TECHNICIAN_CHANGED",
    });

    expect(service.allowedTopics(payment, {
      permissionKeys: new Set(["technician.earnings.read_own"]),
      userId: "tech-1",
    })).toStrictEqual(["technician-earnings"]);
    expect(service.allowedTopics(payment, {
      permissionKeys: new Set(["technician.earnings.read_all"]),
      userId: "manager-2",
    })).toStrictEqual(["technician-earnings"]);
    expect(service.allowedTopics(payment, {
      permissionKeys: new Set(["technician.earnings.read_own"]),
      userId: "tech-2",
    })).toStrictEqual([]);
  });
});
