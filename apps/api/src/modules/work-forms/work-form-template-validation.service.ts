import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma, WorkFormFieldType } from "@prisma/client";

import type { WorkFormFieldDefinitionDto, WorkFormOptionDto } from "./dto/work-form-templates.dto.js";
import {
  MAX_WORK_FORM_FIELDS,
  MAX_WORK_FORM_OPTIONS,
  RESERVED_WORK_FORM_FIELD_KEYS,
  WORK_FORM_FIELD_KEY_PATTERN,
} from "./work-forms.constants.js";

export interface NormalizedWorkFormField {
  readonly key: string;
  readonly label: string;
  readonly helpText: string | null;
  readonly type: WorkFormFieldType;
  readonly required: boolean;
  readonly sortOrder: number;
  readonly placeholder: string | null;
  readonly defaultValue: Prisma.InputJsonValue | undefined;
  readonly options: Prisma.InputJsonValue | undefined;
  readonly validation: Prisma.InputJsonValue | undefined;
}

type ValidationMap = Readonly<Record<string, number | string | undefined>>;
type JsonObject = Record<string, Prisma.InputJsonValue>;

function hasUnsafeText(value: string): boolean {
  return /[<>]/.test(value) || value.toLowerCase().includes("script");
}

function assertPlainText(value: string | null, fieldName: string): void {
  if (value !== null && hasUnsafeText(value)) {
    throw new BadRequestException(`${fieldName} must not contain HTML or script text.`);
  }
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function isOptionsType(type: WorkFormFieldType): boolean {
  return type === "RADIO" || type === "SELECT" || type === "MULTISELECT" || type === "SHADE";
}

function allowedValidationKeys(type: WorkFormFieldType): readonly string[] {
  if (type === "TEXT" || type === "TEXTAREA") {
    return ["minLength", "maxLength"];
  }

  if (type === "NUMBER") {
    return ["min", "max", "step"];
  }

  if (type === "DATE") {
    return ["minDate", "maxDate"];
  }

  return [];
}

@Injectable()
export class WorkFormTemplateValidationService {
  public normalizeFields(fields: readonly WorkFormFieldDefinitionDto[]): readonly NormalizedWorkFormField[] {
    if (fields.length > MAX_WORK_FORM_FIELDS) {
      throw new BadRequestException(`A template can contain at most ${MAX_WORK_FORM_FIELDS} fields.`);
    }

    const keys = new Set<string>();
    return fields.map((field, index) => {
      this.validateFieldKey(field.key);

      if (keys.has(field.key)) {
        throw new BadRequestException(`Duplicate field key: ${field.key}.`);
      }
      keys.add(field.key);

      assertPlainText(field.label, "label");
      assertPlainText(field.helpText ?? null, "helpText");
      assertPlainText(field.placeholder ?? null, "placeholder");

      const options = this.normalizeOptions(field.type, field.options ?? []);
      const validation = this.normalizeValidation(field.type, this.toValidationMap(field.validation));
      const defaultValue = this.normalizeDefaultValue(field.type, field.defaultValue, options);

      return {
        defaultValue,
        helpText: field.helpText ?? null,
        key: field.key,
        label: field.label,
        options: options.length > 0 ? options : undefined,
        placeholder: field.placeholder ?? null,
        required: field.required,
        sortOrder: index + 1,
        type: field.type,
        validation: Object.keys(validation).length > 0 ? validation : undefined,
      };
    });
  }

  public validateFieldKey(key: string): void {
    if (!WORK_FORM_FIELD_KEY_PATTERN.test(key) || RESERVED_WORK_FORM_FIELD_KEYS.has(key) || hasUnsafeText(key)) {
      throw new BadRequestException(`Invalid field key: ${key}.`);
    }
  }

  public ensureTemplateCanActivate(fields: readonly { readonly key: string }[]): void {
    if (fields.length === 0) {
      throw new BadRequestException("Template must contain at least one field before activation.");
    }
  }

  private normalizeOptions(type: WorkFormFieldType, options: readonly WorkFormOptionDto[]): Prisma.InputJsonArray {
    if (!isOptionsType(type)) {
      if (options.length > 0) {
        throw new BadRequestException(`Options are not compatible with ${type}.`);
      }

      return [];
    }

    if (options.length === 0) {
      throw new BadRequestException(`Options are required for ${type}.`);
    }

    if (options.length > MAX_WORK_FORM_OPTIONS) {
      throw new BadRequestException(`A field can contain at most ${MAX_WORK_FORM_OPTIONS} options.`);
    }

    const values = new Set<string>();
    for (const option of options) {
      assertPlainText(option.value, "option value");
      assertPlainText(option.label, "option label");

      if (values.has(option.value)) {
        throw new BadRequestException(`Duplicate option value: ${option.value}.`);
      }
      values.add(option.value);
    }

    return options.map((option) => ({ label: option.label, value: option.value }));
  }

  private normalizeValidation(type: WorkFormFieldType, validation: ValidationMap): JsonObject {
    const allowedKeys = allowedValidationKeys(type);
    const normalized: JsonObject = {};

    for (const [key, value] of Object.entries(validation)) {
      if (value === undefined) {
        continue;
      }

      if (!allowedKeys.includes(key)) {
        throw new BadRequestException(`Validation ${key} is not compatible with ${type}.`);
      }

      if ((key === "minDate" || key === "maxDate") && (typeof value !== "string" || !isDateOnly(value))) {
        throw new BadRequestException(`${key} must be a YYYY-MM-DD date.`);
      }

      if (key !== "minDate" && key !== "maxDate" && (typeof value !== "number" || !Number.isFinite(value))) {
        throw new BadRequestException(`${key} must be numeric.`);
      }

      normalized[key] = value;
    }

    if (
      typeof normalized.minLength === "number" &&
      typeof normalized.maxLength === "number" &&
      normalized.minLength > normalized.maxLength
    ) {
      throw new BadRequestException("minLength cannot be greater than maxLength.");
    }

    if (typeof normalized.min === "number" && typeof normalized.max === "number" && normalized.min > normalized.max) {
      throw new BadRequestException("min cannot be greater than max.");
    }

    if (typeof normalized.minDate === "string" && typeof normalized.maxDate === "string" && normalized.minDate > normalized.maxDate) {
      throw new BadRequestException("minDate cannot be after maxDate.");
    }

    return normalized;
  }

  private normalizeDefaultValue(
    type: WorkFormFieldType,
    defaultValue: unknown,
    options: Prisma.InputJsonArray,
  ): Prisma.InputJsonValue | undefined {
    if (defaultValue === undefined || defaultValue === null || defaultValue === "") {
      return undefined;
    }

    if (type === "CHECKBOX") {
      if (typeof defaultValue !== "boolean") {
        throw new BadRequestException("CHECKBOX defaultValue must be boolean.");
      }
      return defaultValue;
    }

    if (type === "NUMBER") {
      if (typeof defaultValue !== "number" || !Number.isFinite(defaultValue)) {
        throw new BadRequestException("NUMBER defaultValue must be numeric.");
      }
      return defaultValue;
    }

    if (type === "MULTISELECT") {
      if (!Array.isArray(defaultValue) || !defaultValue.every((value) => typeof value === "string")) {
        throw new BadRequestException("MULTISELECT defaultValue must be an array of option values.");
      }
      this.ensureValuesExist(defaultValue, options);
      return defaultValue;
    }

    if (typeof defaultValue !== "string" || hasUnsafeText(defaultValue)) {
      throw new BadRequestException(`${type} defaultValue must be safe plain text.`);
    }

    if (type === "DATE" && !isDateOnly(defaultValue)) {
      throw new BadRequestException("DATE defaultValue must be a YYYY-MM-DD date.");
    }

    if (isOptionsType(type)) {
      this.ensureValuesExist([defaultValue], options);
    }

    return defaultValue;
  }

  private ensureValuesExist(values: readonly string[], options: Prisma.InputJsonArray): void {
    const optionValues = new Set(options.map((option) => {
      if (typeof option !== "object" || option === null || Array.isArray(option)) {
        return "";
      }

      const value = (option as Record<string, unknown>).value;
      return typeof value === "string" ? value : "";
    }));
    for (const value of values) {
      if (!optionValues.has(value)) {
        throw new BadRequestException(`Default option value is not defined: ${value}.`);
      }
    }
  }

  private toValidationMap(validation: unknown): ValidationMap {
    if (typeof validation !== "object" || validation === null || Array.isArray(validation)) {
      return {};
    }

    const source = validation as {
      readonly max?: number;
      readonly maxDate?: string;
      readonly maxLength?: number;
      readonly min?: number;
      readonly minDate?: string;
      readonly minLength?: number;
      readonly step?: number;
    };

    return {
      max: source.max,
      maxDate: source.maxDate,
      maxLength: source.maxLength,
      min: source.min,
      minDate: source.minDate,
      minLength: source.minLength,
      step: source.step,
    };
  }
}
