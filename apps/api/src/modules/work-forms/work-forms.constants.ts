export const WORK_FORMS_RESOURCE_TYPE = "work_form_template";

export const WORK_FORMS_AUDIT_ACTIONS = {
  fieldsReplaced: "work_forms.fields_replaced",
  templateActivated: "work_forms.template_activated",
  templateArchived: "work_forms.template_archived",
  templateCloned: "work_forms.template_cloned",
  templateCreated: "work_forms.template_created",
  templateUpdated: "work_forms.template_updated",
} as const;

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

export const WORK_FORM_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export const RESERVED_WORK_FORM_FIELD_KEYS = new Set([
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
]);

export const MAX_WORK_FORM_FIELDS = 100;
export const MAX_WORK_FORM_OPTIONS = 50;
