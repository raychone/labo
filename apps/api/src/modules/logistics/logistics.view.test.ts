import { describe, expect, it } from "vitest";

import { createLogisticsSummary, resolveEffectiveLogisticsStatus, type LogisticsCenterItem } from "./logistics.view.js";

function item(input: Pick<LogisticsCenterItem, "dueState" | "logistics" | "billing" | "workflow" | "priority">): LogisticsCenterItem {
  return input as LogisticsCenterItem;
}

describe("createLogisticsSummary", () => {
  it("returns final logistics shortcut counters", () => {
    const summary = createLogisticsSummary([
      item({
        billing: { documentId: null, documentNumber: null, documentStatus: null, label: "Nefacturat", paymentStatus: null },
        dueState: "OVERDUE",
        logistics: { status: "RECEIVED" } as LogisticsCenterItem["logistics"],
        priority: "NORMAL",
        workflow: { assignedUserName: "Tech", completedAt: null, currentStageName: null, progressCompleted: 0, progressTotal: 0, status: "ACTIVE" },
      }),
      item({
        billing: { documentId: "inv_1", documentNumber: "CD 260001", documentStatus: "ISSUED", label: "Facturat", paymentStatus: "UNPAID" },
        dueState: "ON_TRACK",
        logistics: { status: "BLOCKED" } as LogisticsCenterItem["logistics"],
        priority: "URGENT",
        workflow: { assignedUserName: null, completedAt: null, currentStageName: null, progressCompleted: 0, progressTotal: 0, status: "ACTIVE" },
      }),
    ], 3);

    expect(summary.all).toBe(2);
    expect(summary.overdue).toBe(1);
    expect(summary.waiting).toBe(1);
    expect(summary.toDeliver).toBe(0);
    expect(summary.toPickup).toBe(3);
  });
});

describe("resolveEffectiveLogisticsStatus", () => {
  it("does not derive a packing state for finalized work", () => {
    expect(resolveEffectiveLogisticsStatus("FINALIZATA", "IN_PRODUCTION", "ACTIVE")).toBe("IN_PRODUCTION");
    expect(resolveEffectiveLogisticsStatus("FINALIZATA", null, "ACTIVE")).toBe("IN_PRODUCTION");
  });

  it("preserves downstream logistics states", () => {
    expect(resolveEffectiveLogisticsStatus("FINALIZATA", "READY_FOR_DELIVERY", "ACTIVE")).toBe("RECEIVED");
    expect(resolveEffectiveLogisticsStatus("FINALIZATA", "BLOCKED", "ACTIVE")).toBe("BLOCKED");
  });
});
