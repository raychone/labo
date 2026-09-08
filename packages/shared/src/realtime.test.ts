import { describe, expect, it } from "vitest";

import { isRealtimeEventEnvelope } from "./realtime.js";

describe("isRealtimeEventEnvelope", () => {
  it("accepts the minimal safe event contract", () => {
    expect(isRealtimeEventEnvelope({
      id: "event-1",
      occurredAt: "2026-09-07T10:00:00.000Z",
      topics: ["works", "status"],
      type: "WORK_CHANGED",
    })).toBe(true);
  });

  it("rejects unknown event types and topics", () => {
    expect(isRealtimeEventEnvelope({
      id: "event-1",
      occurredAt: "2026-09-07T10:00:00.000Z",
      topics: ["private-financial-payload"],
      type: "WORK_CHANGED",
    })).toBe(false);
    expect(isRealtimeEventEnvelope({
      id: "event-1",
      occurredAt: "2026-09-07T10:00:00.000Z",
      topics: ["works"],
      type: "UNKNOWN",
    })).toBe(false);
  });
});
