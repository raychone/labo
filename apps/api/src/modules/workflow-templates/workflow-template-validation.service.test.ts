import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { WorkflowStageDefinitionDto } from "./dto/workflow-templates.dto.js";
import { WorkflowTemplateValidationService } from "./workflow-template-validation.service.js";

function stage(overrides: Partial<WorkflowStageDefinitionDto>): WorkflowStageDefinitionDto {
  return {
    allowedRoleCodes: ["TEHNICIAN"],
    estimatedDurationMinutes: 120,
    key: "cad",
    name: "CAD",
    sortOrder: 2,
    ...overrides,
  } as WorkflowStageDefinitionDto;
}

describe("WorkflowTemplateValidationService", () => {
  const service = new WorkflowTemplateValidationService();

  it("normalizes stage order and derives initial and final flags", () => {
    const stages = service.normalizeStages([
      stage({ allowedRoleCodes: ["TEHNICIAN"], key: "cad", name: "CAD", sortOrder: 10 }),
      stage({ allowedRoleCodes: ["RECEPTIE"], key: "receptie", name: "Recepție", sortOrder: 1 }),
      stage({ allowedRoleCodes: ["LOGISTICA"], key: "livrare", name: "Pregătire livrare", sortOrder: 20 }),
    ]);

    expect(stages.map((item) => item.key)).toStrictEqual(["receptie", "cad", "livrare"]);
    expect(stages.map((item) => item.sortOrder)).toStrictEqual([1, 2, 3]);
    expect(stages[0]?.isInitial).toBe(true);
    expect(stages[1]?.isInitial).toBe(false);
    expect(stages[2]?.isFinal).toBe(true);
  });

  it("rejects invalid keys, duplicate keys, unsafe text and duplicate roles", () => {
    expect(() => service.normalizeStages([stage({ key: "status" })])).toThrow(BadRequestException);
    expect(() => service.normalizeStages([stage({ key: "cad" }), stage({ key: "cad", sortOrder: 3 })])).toThrow(BadRequestException);
    expect(() => service.normalizeStages([stage({ name: "<script>" })])).toThrow(BadRequestException);
    expect(() => service.normalizeStages([stage({ allowedRoleCodes: ["TEHNICIAN", "TEHNICIAN"] })])).toThrow(BadRequestException);
  });

  it("rejects activation without at least two ordered stages", () => {
    const oneStage = service.normalizeStages([stage({ key: "receptie", sortOrder: 1 })]);

    expect(() => service.ensureTemplateCanActivate(oneStage)).toThrow(BadRequestException);
  });
});
