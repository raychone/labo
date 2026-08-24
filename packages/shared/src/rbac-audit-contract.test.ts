import { describe, expect, it } from "vitest";

import {
  POSTMEETING_AUDIT_ACTIONS,
  POSTMEETING_UNRESOLVED_AUTHORIZATION_GATES,
  formatPostmeetingAuditMessage,
} from "./rbac-audit-contract.js";

describe("RBAC-AUDIT-001 shared audit contract", () => {
  it("uses stable technical actions with Romanian presentation", () => {
    expect(POSTMEETING_AUDIT_ACTIONS.workOrderItemAdded).toBe("work_order.item_added");
    expect(formatPostmeetingAuditMessage(POSTMEETING_AUDIT_ACTIONS.caseReceived)).toBe("Lucrarea a fost recepționată.");
    expect(formatPostmeetingAuditMessage(POSTMEETING_AUDIT_ACTIONS.probeReady)).toBe("Tehnicianul a marcat lucrarea ca Probă gata.");
  });

  it("uses display metadata only and never requires opaque identifiers", () => {
    expect(formatPostmeetingAuditMessage(POSTMEETING_AUDIT_ACTIONS.toothConnectionAdded, { toothNumbers: [11, 21] }))
      .toBe("Au fost conectați dinții 11, 21.");
    expect(formatPostmeetingAuditMessage(POSTMEETING_AUDIT_ACTIONS.performedManeuverAdded, {
      componentDescription: "Ceramică",
      toothNumbers: [11, 12, 21],
    })).toBe("Manopera Ceramică a fost adăugată pentru dinții 11, 12, 21.");
    expect(formatPostmeetingAuditMessage(POSTMEETING_AUDIT_ACTIONS.toothConnectionAdded)).toBe("Au fost conectați dinții indicați.");
  });

  it("keeps unresolved decisions as authorization gates", () => {
    expect(POSTMEETING_UNRESOLVED_AUTHORIZATION_GATES.saveToCatalogRole).toBe("DECISION_E");
    expect(POSTMEETING_UNRESOLVED_AUTHORIZATION_GATES.performedManeuverCorrection).toBe("DECISION_F");
  });
});
