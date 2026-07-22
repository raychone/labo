export const CLINIC_RESOURCE_TYPE = "clinic";
export const DOCTOR_RESOURCE_TYPE = "doctor";

export const CLINICS_AUDIT_ACTIONS = {
  archived: "clinics.archived",
  created: "clinics.created",
  restored: "clinics.restored",
  updated: "clinics.updated",
} as const;

export const DOCTORS_AUDIT_ACTIONS = {
  archived: "doctors.archived",
  created: "doctors.created",
  restored: "doctors.restored",
  updated: "doctors.updated",
} as const;

export const CLINIC_SORT_FIELDS = ["createdAt", "name", "code", "city", "updatedAt"] as const;
export const DOCTOR_SORT_FIELDS = ["createdAt", "lastName", "displayName", "updatedAt"] as const;
export const SORT_DIRECTIONS = ["asc", "desc"] as const;
