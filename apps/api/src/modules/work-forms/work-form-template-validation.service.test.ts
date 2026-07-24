import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { WorkFormTemplateValidationService } from "./work-form-template-validation.service.js";
import type { WorkFormFieldDefinitionDto } from "./dto/work-form-templates.dto.js";

function dto(overrides: Partial<WorkFormFieldDefinitionDto>): WorkFormFieldDefinitionDto {
  return {
    key: "shade",
    label: "Nuanta",
    required: true,
    sortOrder: 1,
    type: "TEXT",
    ...overrides,
  } as WorkFormFieldDefinitionDto;
}

describe("WorkFormTemplateValidationService", () => {
  const service = new WorkFormTemplateValidationService();

  it("normalizes ordering and plain compatible fields", () => {
    const fields = service.normalizeFields([
      dto({ key: "implant_system", label: "Sistem implant", sortOrder: 7 }),
      dto({
        key: "shade",
        label: "Nuanta",
        options: [{ label: "A1", value: "a1" }],
        sortOrder: 2,
        type: "SELECT",
      }),
    ]);

    expect(fields.map((field) => field.sortOrder)).toStrictEqual([1, 2]);
    expect(fields[1]?.options).toStrictEqual([{ label: "A1", value: "a1" }]);
  });

  it("rejects duplicate keys and unsafe text", () => {
    expect(() => service.normalizeFields([dto({ key: "shade" }), dto({ key: "shade" })])).toThrow(BadRequestException);
    expect(() => service.normalizeFields([dto({ label: "<script>" })])).toThrow(BadRequestException);
  });

  it("rejects incompatible options, validation and default values", () => {
    expect(() => service.normalizeFields([dto({ options: [{ label: "A", value: "a" }], type: "NUMBER" })])).toThrow(BadRequestException);
    expect(() => service.normalizeFields([dto({ type: "SELECT" })])).toThrow(BadRequestException);
    expect(() => service.normalizeFields([dto({ defaultValue: "abc", type: "NUMBER" })])).toThrow(BadRequestException);
    expect(() => service.normalizeFields([dto({ type: "DATE", validation: { min: 1 } })])).toThrow(BadRequestException);
  });
});
