import { describe, expect, it } from "vitest";

import {
  formatTimelineDate,
  getNextStage,
  getStageActionAvailability,
  getWorkflowExecutionStatusLabel,
  getWorkflowProgress,
  getWorkStageEventLabel,
  getWorkStageExecutionStatusLabel,
  type WorkStageExecutionView,
} from "./workflow-execution.js";

function stage(overrides: Partial<WorkStageExecutionView>): WorkStageExecutionView {
  return {
    allowedRoleCodes: ["TEHNICIAN"],
    allowedRoleLabels: ["Tehnician"],
    completedAt: null,
    completedBy: null,
    description: null,
    estimatedDurationMinutes: null,
    id: "stage_1",
    isCurrent: false,
    key: "model",
    name: "Model",
    sortOrder: 1,
    startedAt: null,
    startedBy: null,
    status: "PENDING",
    version: 1,
    ...overrides,
  };
}

describe("workflow execution helpers", () => {
  it("derives progress and next linear stage without mutating input", () => {
    const stages = [
      stage({ id: "stage_2", sortOrder: 2, status: "PENDING" }),
      stage({ id: "stage_1", sortOrder: 1, status: "COMPLETED" }),
    ];

    expect(getWorkflowProgress(stages)).toStrictEqual({ completed: 1, total: 2 });
    const currentStage = stages.find((item) => item.id === "stage_1");
    if (!currentStage) {
      throw new Error("Expected current stage.");
    }
    expect(getNextStage(stages, currentStage)?.id).toBe("stage_2");
    expect(stages.map((item) => item.id)).toStrictEqual(["stage_2", "stage_1"]);
  });

  it("returns Romanian labels for statuses and events", () => {
    expect(getWorkflowExecutionStatusLabel("ACTIVE")).toBe("Flux activ");
    expect(getWorkflowExecutionStatusLabel("COMPLETED")).toBe("Flux finalizat");
    expect(getWorkStageExecutionStatusLabel("IN_PROGRESS")).toBe("În lucru");
    expect(getWorkStageEventLabel("STAGE_COMPLETED")).toBe("Etapă finalizată");
  });

  it("exposes action availability for current stage state", () => {
    expect(getStageActionAvailability({ canExecuteCurrentStage: true, currentStage: stage({ status: "PENDING" }), status: "ACTIVE" }))
      .toStrictEqual({ canCompleteCurrentStage: false, canStartCurrentStage: true, reason: null });
    expect(getStageActionAvailability({ canExecuteCurrentStage: false, currentStage: stage({ status: "IN_PROGRESS" }), status: "ACTIVE" }).reason)
      .toBe("Rolul curent nu poate executa etapa.");
  });

  it("formats timeline dates and empty values", () => {
    expect(formatTimelineDate(null)).toBe("Nefinalizat");
    expect(formatTimelineDate("2026-07-26T10:00:00.000Z")).toContain("2026");
  });
});
