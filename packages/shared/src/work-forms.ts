export const WORK_FORM_TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type WorkFormTemplateStatus = (typeof WORK_FORM_TEMPLATE_STATUSES)[number];

export const WORK_FORM_TEMPLATE_KINDS = ["GENERIC", "REAL_LAB_SHEET"] as const;
export type WorkFormTemplateKind = (typeof WORK_FORM_TEMPLATE_KINDS)[number];

export const WORK_FORM_FIELD_ROLE_OWNERS = ["RECEPTION", "TECHNICIAN", "SHARED", "SYSTEM"] as const;
export type WorkFormFieldRoleOwner = (typeof WORK_FORM_FIELD_ROLE_OWNERS)[number];

export const WORK_FORM_FIELD_EDITABLE_UNTIL = ["CYCLE_FINALIZED", "NEVER"] as const;
export type WorkFormFieldEditableUntil = (typeof WORK_FORM_FIELD_EDITABLE_UNTIL)[number];

export const WORK_FORM_FIELD_CYCLE_SCOPES = ["WORK", "CYCLE"] as const;
export type WorkFormFieldCycleScope = (typeof WORK_FORM_FIELD_CYCLE_SCOPES)[number];

export const WORK_FORM_COPY_TO_NEXT_CYCLE_POLICIES = ["NEVER", "SYSTEM_DERIVED", "CONFIRM_ONLY"] as const;
export type WorkFormCopyToNextCyclePolicy = (typeof WORK_FORM_COPY_TO_NEXT_CYCLE_POLICIES)[number];

export const WORK_FORM_FIELD_SOURCE_KINDS = ["USER_ENTERED", "REGISTRY_DERIVED", "SYSTEM_DERIVED"] as const;
export type WorkFormFieldSourceKind = (typeof WORK_FORM_FIELD_SOURCE_KINDS)[number];

export const REAL_LAB_SHEET_OPERATIONAL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "FINALIZED"] as const;
export type RealLabSheetOperationalStatus = (typeof REAL_LAB_SHEET_OPERATIONAL_STATUSES)[number];

export const REAL_LAB_SHEET_SAVE_MODES = ["DRAFT", "COMPLETE"] as const;
export type RealLabSheetSaveMode = (typeof REAL_LAB_SHEET_SAVE_MODES)[number];

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
  readonly sectionKey?: string | null;
  readonly sectionLabel?: string | null;
  readonly roleOwner?: WorkFormFieldRoleOwner;
  readonly editableUntil?: WorkFormFieldEditableUntil;
  readonly cycleScope?: WorkFormFieldCycleScope;
  readonly copyToNextCyclePolicy?: WorkFormCopyToNextCyclePolicy;
  readonly printable?: boolean;
  readonly sourceKind?: WorkFormFieldSourceKind;
  readonly isActive: boolean;
}

export type WorkFormValue = boolean | number | readonly string[] | string | null;
export type WorkFormValues = Readonly<Record<string, WorkFormValue>>;

export interface WorkFormSnapshotField {
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
  readonly sectionKey?: string | null;
  readonly sectionLabel?: string | null;
  readonly roleOwner?: WorkFormFieldRoleOwner;
  readonly editableUntil?: WorkFormFieldEditableUntil;
  readonly cycleScope?: WorkFormFieldCycleScope;
  readonly copyToNextCyclePolicy?: WorkFormCopyToNextCyclePolicy;
  readonly printable?: boolean;
  readonly sourceKind?: WorkFormFieldSourceKind;
}

export interface WorkFormSchemaSnapshot {
  readonly fields: readonly WorkFormSnapshotField[];
}

export interface CreateWorkFormSubmissionInput {
  readonly templateId: string;
  readonly templateVersion: number;
  readonly values: WorkFormValues;
}

export interface UpsertRealLabSheetInput {
  readonly expectedRevision?: number;
  readonly saveMode?: RealLabSheetSaveMode;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly values: WorkFormValues;
}

export interface FinalizeRealLabSheetInput {
  readonly expectedRevision?: number;
}

export type UpdateWorkFormValuesInput = WorkFormValues;

export interface WorkFormSubmissionView {
  readonly fields: readonly WorkFormSnapshotField[];
  readonly submittedAt: string;
  readonly templateId: string | null;
  readonly templateKind?: WorkFormTemplateKind;
  readonly templateName: string;
  readonly templateVersion: number;
  readonly updatedAt: string;
  readonly values: WorkFormValues;
}

export interface RealLabSheetView extends WorkFormSubmissionView {
  readonly canEdit: boolean;
  readonly canFinalize: boolean;
  readonly canMarkComplete: boolean;
  readonly cycleNumber: number;
  readonly finalizedAt: string | null;
  readonly finalizedBy: { readonly displayName: string; readonly publicId: string } | null;
  readonly isFinalized: boolean;
  readonly isReadOnly: boolean;
  readonly lastModifiedAt: string | null;
  readonly lastModifiedBy: { readonly displayName: string; readonly publicId: string } | null;
  readonly revision: number;
  readonly status: RealLabSheetOperationalStatus;
  readonly workCycleId: string;
  readonly workOrderId: string;
}

export interface WorkFormDisplayValue {
  readonly fieldKey: string;
  readonly label: string;
  readonly value: string;
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
  readonly kind: WorkFormTemplateKind;
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
  readonly kind?: WorkFormTemplateKind;
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

export const FORBIDDEN_WORK_FORM_VALUE_KEYS = ["__proto__", "constructor", "prototype"] as const;

export const FDI_TOOTH_CODES = [
  "11", "12", "13", "14", "15", "16", "17", "18",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "31", "32", "33", "34", "35", "36", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48",
  "51", "52", "53", "54", "55",
  "61", "62", "63", "64", "65",
  "71", "72", "73", "74", "75",
  "81", "82", "83", "84", "85",
] as const;

export function isWorkFormFieldKey(value: string): boolean {
  return WORK_FORM_FIELD_KEY_PATTERN.test(value) && !RESERVED_WORK_FORM_FIELD_KEYS.includes(value as never);
}

export function isForbiddenWorkFormValueKey(key: string): boolean {
  return FORBIDDEN_WORK_FORM_VALUE_KEYS.includes(key as never);
}

export function isFdiToothCode(value: string): boolean {
  return FDI_TOOTH_CODES.includes(value as never);
}

export function isDateOnlyString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getChangedWorkFormValueKeys(before: WorkFormValues, after: WorkFormValues): readonly string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
}

export function formatWorkFormValue(field: WorkFormSnapshotField, value: WorkFormValue, locale = "ro-RO"): string {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return "";
  }

  if (field.type === "CHECKBOX") {
    return value === true ? "Da" : "Nu";
  }

  if (field.type === "DATE" && typeof value === "string" && isDateOnlyString(value)) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
  }

  if (field.type === "NUMBER" && typeof value === "number") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value);
  }

  if (Array.isArray(value)) {
    const labels = new Map(field.options.map((option) => [option.value, option.label]));
    return value.map((item) => labels.get(item) ?? item).join(", ");
  }

  if (typeof value === "string") {
    const option = field.options.find((item) => item.value === value);
    return option?.label ?? value;
  }

  return String(value);
}

export function toWorkFormDisplayValues(
  fields: readonly WorkFormSnapshotField[],
  values: WorkFormValues,
  locale = "ro-RO",
): readonly WorkFormDisplayValue[] {
  return fields
    .map((field) => ({
      fieldKey: field.key,
      label: field.label,
      value: formatWorkFormValue(field, values[field.key] ?? null, locale),
    }))
    .filter((item) => item.value.length > 0);
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
