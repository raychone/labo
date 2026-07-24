export const WORK_FORM_TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type WorkFormTemplateStatus = (typeof WORK_FORM_TEMPLATE_STATUSES)[number];

export const WORK_FORM_FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "CHECKBOX",
  "RADIO",
  "SELECT",
  "MULTISELECT",
  "TOOTH",
  "SHADE",
] as const;
export type WorkFormFieldType = (typeof WORK_FORM_FIELD_TYPES)[number];

export interface WorkFormOption {
  readonly value: string;
  readonly label: string;
}

export interface WorkFormFieldValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly minDate?: string;
  readonly maxDate?: string;
}

export type WorkFormDefaultValue = boolean | number | readonly string[] | string | null;

export interface WorkFormFieldDefinition {
  readonly id?: string;
  readonly key: string;
  readonly label: string;
  readonly helpText: string | null;
  readonly type: WorkFormFieldType;
  readonly required: boolean;
  readonly sortOrder: number;
  readonly placeholder: string | null;
  readonly defaultValue: WorkFormDefaultValue;
  readonly options: readonly WorkFormOption[];
  readonly validation: WorkFormFieldValidation;
  readonly isActive: boolean;
}

export interface WorkFormWorkTypeSummary {
  readonly code: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface WorkFormTemplateSummary {
  readonly id: string;
  readonly workTypeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly version: number;
  readonly status: WorkFormTemplateStatus;
  readonly fieldCount: number;
  readonly activatedAt: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkFormTemplateDetail extends WorkFormTemplateSummary {
  readonly workType: WorkFormWorkTypeSummary;
  readonly fields: readonly WorkFormFieldDefinition[];
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly activatedByUserId: string | null;
  readonly archivedByUserId: string | null;
}

export interface WorkFormTemplateListResponse {
  readonly activeTemplateId: string | null;
  readonly templates: readonly WorkFormTemplateSummary[];
  readonly workType: WorkFormWorkTypeSummary;
}

export interface CreateWorkFormTemplateInput {
  readonly name: string;
  readonly description?: string | null;
  readonly cloneFromTemplateId?: string;
}

export interface UpdateWorkFormTemplateInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface ReplaceWorkFormFieldsInput {
  readonly fields: readonly WorkFormFieldDefinition[];
}

export interface WorkFormValidationResult {
  readonly errors: readonly string[];
  readonly ok: boolean;
}

export const WORK_FORM_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export const RESERVED_WORK_FORM_FIELD_KEYS = [
  "id",
  "code",
  "status",
  "work_order",
  "work_order_id",
  "work_type",
  "work_type_id",
  "created_at",
  "updated_at",
  "patient",
  "patient_name",
] as const;

export function isWorkFormFieldKey(value: string): boolean {
  return WORK_FORM_FIELD_KEY_PATTERN.test(value) && !RESERVED_WORK_FORM_FIELD_KEYS.includes(value as never);
}

function hasMarkup(value: string): boolean {
  return /[<>]/.test(value) || value.toLowerCase().includes("script");
}

export function validateWorkFormOptions(options: readonly WorkFormOption[], maximumOptions = 50): WorkFormValidationResult {
  const errors: string[] = [];
  const values = new Set<string>();

  if (options.length > maximumOptions) {
    errors.push(`Maximum ${maximumOptions} options are allowed.`);
  }

  for (const option of options) {
    const value = option.value.trim();
    const label = option.label.trim();

    if (value.length === 0 || value.length > 80 || hasMarkup(value)) {
      errors.push("Option values must be stable plain text between 1 and 80 characters.");
    }

    if (label.length === 0 || label.length > 160 || hasMarkup(label)) {
      errors.push("Option labels must be plain text between 1 and 160 characters.");
    }

    if (values.has(value)) {
      errors.push(`Duplicate option value: ${value}.`);
    }
    values.add(value);
  }

  return { errors, ok: errors.length === 0 };
}

export function normalizeWorkFormFieldsOrder<TField extends Pick<WorkFormFieldDefinition, "sortOrder">>(
  fields: readonly TField[],
): readonly TField[] {
  return fields.map((field, index) => ({ ...field, sortOrder: index + 1 }));
}

export function isOptionsFieldType(type: WorkFormFieldType): boolean {
  return type === "RADIO" || type === "SELECT" || type === "MULTISELECT" || type === "SHADE";
}

export function getAllowedValidationKeys(type: WorkFormFieldType): readonly (keyof WorkFormFieldValidation)[] {
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

export function isWorkFormDefaultCompatible(type: WorkFormFieldType, defaultValue: WorkFormDefaultValue): boolean {
  if (defaultValue === null) {
    return true;
  }

  if (type === "CHECKBOX") {
    return typeof defaultValue === "boolean";
  }

  if (type === "NUMBER") {
    return typeof defaultValue === "number" && Number.isFinite(defaultValue);
  }

  if (type === "MULTISELECT") {
    return Array.isArray(defaultValue) && defaultValue.every((value) => typeof value === "string");
  }

  return typeof defaultValue === "string";
}

export function validateWorkFormFieldCompatibility(field: WorkFormFieldDefinition): WorkFormValidationResult {
  const errors: string[] = [];
  const allowedValidationKeys = getAllowedValidationKeys(field.type);
  const validationKeys = Object.keys(field.validation) as (keyof WorkFormFieldValidation)[];

  if (!isWorkFormFieldKey(field.key)) {
    errors.push("Field key is invalid.");
  }

  if (isOptionsFieldType(field.type)) {
    const optionsResult = validateWorkFormOptions(field.options);
    errors.push(...optionsResult.errors);

    if (field.options.length === 0) {
      errors.push("Options are required for this field type.");
    }
  } else if (field.options.length > 0) {
    errors.push("Options are not compatible with this field type.");
  }

  for (const key of validationKeys) {
    if (!allowedValidationKeys.includes(key)) {
      errors.push(`Validation ${key} is not compatible with ${field.type}.`);
    }
  }

  if (!isWorkFormDefaultCompatible(field.type, field.defaultValue)) {
    errors.push("Default value is not compatible with field type.");
  }

  return { errors, ok: errors.length === 0 };
}
