export const TECHNICIAN_ASSIGNMENT_RESOURCE_TYPE = "work_stage_assignment";

export const TECHNICIAN_ASSIGNMENT_AUDIT_ACTIONS = {
  assigned: "technician.stage_assigned",
  reassigned: "technician.stage_reassigned",
  unassigned: "technician.stage_unassigned",
} as const;

export const TECHNICIAN_ASSIGNMENT_CONFLICT_MESSAGE = "Asignarea sau starea etapei s-a modificat. Reîncarcă lucrarea și încearcă din nou.";

export const TECHNICIAN_SCAN_AUDIT_ACTIONS = {
  assigned: "scan.stage_assigned",
} as const;
