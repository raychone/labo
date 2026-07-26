import { describe, expect, it } from "vitest";

import {
  deriveQueueCategories,
  getAssignmentStatusLabel,
  getTechnicianQueueCategoryLabel,
  isDueToday,
  isOverdue,
} from "./technician-assignments.js";

describe("technician assignment helpers", () => {
  it("derives queue categories from status, priority and due date", () => {
    const now = new Date("2026-07-26T10:00:00.000Z");

    expect(deriveQueueCategories({ dueDate: "2026-07-25T12:00:00.000Z", priority: "URGENT", status: "IN_PROGRESS" }, now))
      .toStrictEqual(["ALL", "IN_PROGRESS", "URGENT", "OVERDUE"]);
    expect(deriveQueueCategories({ dueDate: "2026-07-26T12:00:00.000Z", priority: "NORMAL", status: "PENDING" }, now))
      .toStrictEqual(["ALL", "UNSTARTED", "DUE_TODAY"]);
  });

  it("labels queues and assignment status in Romanian", () => {
    expect(getTechnicianQueueCategoryLabel("UNSTARTED")).toBe("De început");
    expect(getAssignmentStatusLabel({ assignedAt: null, assignedBy: null, assignedUser: null })).toBe("Neasignată");
    expect(getAssignmentStatusLabel({
      assignedAt: "2026-07-26T10:00:00.000Z",
      assignedBy: null,
      assignedUser: { displayName: "Demo Tehnician", email: "tech@demo.local", id: "user_1" },
    })).toBe("Responsabil: Demo Tehnician");
  });

  it("detects today and overdue dates using UTC day boundaries", () => {
    const now = new Date("2026-07-26T22:00:00.000Z");

    expect(isDueToday("2026-07-26T01:00:00.000Z", now)).toBe(true);
    expect(isOverdue("2026-07-25T23:00:00.000Z", now)).toBe(true);
  });
});
