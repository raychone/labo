export const PATIENT_RESOURCE_TYPE = "patient";

export const PATIENT_AUDIT_ACTIONS = {
  archived: "patient.archived",
  created: "patient.created",
  restored: "patient.restored",
  updated: "patient.updated",
} as const;

export const PATIENT_SORT_FIELDS = ["createdAt", "firstName", "lastName", "lastWorkDate", "totalWorks"] as const;
export const PATIENT_SEX_VALUES = ["FEMALE", "MALE", "UNSPECIFIED"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export const ACTIVE_WORK_STATUSES = ["REGISTERED"] as const;
