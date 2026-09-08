import { describe, expect, it } from "vitest";

import { describeRealtimeMutation } from "./realtime-mutation-map.js";

describe("describeRealtimeMutation", () => {
  it("does not emit for reads", () => {
    expect(describeRealtimeMutation({ method: "GET", path: "/works" })).toBeNull();
  });

  it("maps work and logistics writes to their authoritative query domains", () => {
    expect(describeRealtimeMutation({ actorUserId: "tech-1", method: "POST", path: "/works/work-1/finalize" })).toMatchObject({
      topics: expect.arrayContaining(["works", "status", "technician-workbench", "logistics"]),
      type: "WORK_CHANGED",
    });
    expect(describeRealtimeMutation({ actorUserId: "courier-1", method: "POST", path: "/routes/route-1/stops/stop-1/outcome?source=mobile" })).toMatchObject({
      topics: expect.arrayContaining(["logistics", "deliveries", "works", "status", "billing"]),
      type: "LOGISTICS_CHANGED",
    });
  });

  it("maps the canonical cross-role mutation families without exposing payloads", () => {
    const scenarios = [
      { expectedType: "WORK_CHANGED", path: "/works", topics: ["works", "technician-workbench"] },
      { expectedType: "WORK_CHANGED", path: "/works/work-1/claim", topics: ["works", "technician-workbench"] },
      { expectedType: "WORK_CHANGED", path: "/works/work-1/status", topics: ["works", "status"] },
      { expectedType: "TECHNICIAN_CHANGED", path: "/technician-operations/performed", topics: ["technician-operations", "technician-workbench"] },
      { expectedType: "LOGISTICS_CHANGED", path: "/deliveries/delivery-1/complete", topics: ["logistics", "status"] },
      { expectedType: "BILLING_CHANGED", path: "/billing-documents/document-1/payments", topics: ["billing", "audit"] },
    ] as const;

    for (const scenario of scenarios) {
      expect(describeRealtimeMutation({ actorUserId: "actor-1", method: "POST", path: scenario.path })).toMatchObject({
        topics: expect.arrayContaining([...scenario.topics]),
        type: scenario.expectedType,
      });
    }
  });

  it("targets session-specific and access changes", () => {
    expect(describeRealtimeMutation({ actorUserId: "manager-1", method: "PATCH", path: "/users/user-2" })).toMatchObject({
      authTargetUserId: "user-2",
      topics: expect.arrayContaining(["users", "status", "technician-workbench", "logistics"]),
      type: "ACCESS_CHANGED",
    });
    expect(describeRealtimeMutation({ actorUserId: "tech-1", method: "PATCH", path: "/auth/me/profile" })).toMatchObject({
      authTargetUserId: "tech-1",
      topics: expect.arrayContaining(["auth", "users", "status", "technician-workbench"]),
      type: "REFERENCE_CHANGED",
    });
    expect(describeRealtimeMutation({ actorUserId: "manager-1", method: "PUT", path: "/organization-context" })).toMatchObject({
      audienceUserId: "manager-1",
      type: "SETTINGS_CHANGED",
    });
  });

  it("does not throw while classifying a malformed encoded user ID", () => {
    expect(() => describeRealtimeMutation({ actorUserId: "manager-1", method: "PATCH", path: "/users/%E0%A4%A" })).not.toThrow();
    expect(describeRealtimeMutation({ actorUserId: "manager-1", method: "PATCH", path: "/users/%E0%A4%A" })).not.toHaveProperty("authTargetUserId");
  });
});
