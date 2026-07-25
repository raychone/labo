import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { WorkFormSubmissionValidationService } from "./work-form-submission-validation.service.js";

const activeTemplate = {
  fields: [
    {
      createdAt: new Date("2026-07-26T00:00:00.000Z"),
      defaultValue: null,
      helpText: null,
      id: "field_teeth",
      isActive: true,
      key: "teeth",
      label: "Dinți",
      options: null,
      placeholder: null,
      required: true,
      sortOrder: 1,
      templateId: "template_1",
      type: "TOOTH",
      updatedAt: new Date("2026-07-26T00:00:00.000Z"),
      validation: null,
    },
    {
      createdAt: new Date("2026-07-26T00:00:00.000Z"),
      defaultValue: null,
      helpText: null,
      id: "field_shade",
      isActive: true,
      key: "shade",
      label: "Nuanță",
      options: [{ label: "A2", value: "A2" }],
      placeholder: null,
      required: true,
      sortOrder: 2,
      templateId: "template_1",
      type: "SHADE",
      updatedAt: new Date("2026-07-26T00:00:00.000Z"),
      validation: null,
    },
  ],
  id: "template_1",
  name: "Formular test",
  version: 1,
  workTypeId: "work_type_1",
};

function client(template = activeTemplate) {
  return {
    workFormTemplate: {
      findFirst: vi.fn().mockResolvedValue(template),
    },
  };
}

describe("WorkFormSubmissionValidationService", () => {
  it("builds a backend-owned snapshot and normalized values", async () => {
    const service = new WorkFormSubmissionValidationService();
    const prepared = await service.prepareCreate(client(), {
      actorUserId: "user_1",
      submission: {
        templateId: "template_1",
        templateVersion: 1,
        values: {
          shade: "A2",
          teeth: ["11", "12"],
        },
      },
      workCode: "WO-2026-000001",
      workTypeId: "work_type_1",
    });

    expect(prepared?.data.templateNameSnapshot).toBe("Formular test");
    expect(prepared?.data.schemaSnapshot).toMatchObject({
      fields: [
        { key: "teeth", label: "Dinți" },
        { key: "shade", label: "Nuanță" },
      ],
    });
    expect(prepared?.data.values).toEqual({ shade: "A2", teeth: ["11", "12"] });
  });

  it("rejects stale template submissions", async () => {
    const service = new WorkFormSubmissionValidationService();

    await expect(service.prepareCreate(client(), {
      actorUserId: "user_1",
      submission: {
        templateId: "template_old",
        templateVersion: 1,
        values: { shade: "A2", teeth: ["11"] },
      },
      workCode: "WO-2026-000001",
      workTypeId: "work_type_1",
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects missing required fields", async () => {
    const service = new WorkFormSubmissionValidationService();

    await expect(service.prepareCreate(client(), {
      actorUserId: "user_1",
      submission: {
        templateId: "template_1",
        templateVersion: 1,
        values: { shade: "A2" },
      },
      workCode: "WO-2026-000001",
      workTypeId: "work_type_1",
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
