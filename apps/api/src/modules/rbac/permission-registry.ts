export const PERMISSION_SCOPES = ["ALL", "ASSIGNED", "OWN_CLINIC", "OWN_DELIVERY", "OWN_STAGE"] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const RBAC_ROLE_KEYS = ["MANAGER", "LOGISTICA", "RECEPTIE", "TEHNICIAN", "CURIER", "MEDIC"] as const;

export type RbacRoleKey = (typeof RBAC_ROLE_KEYS)[number];

export interface PermissionDefinition {
  readonly action: string;
  readonly allowedScopes: readonly PermissionScope[];
  readonly description: string;
  readonly key: PermissionKey;
  readonly resource: string;
}

export type PermissionKey =
  | "users.create"
  | "users.read"
  | "users.update"
  | "users.disable"
  | "users.assign_roles"
  | "roles.read"
  | "permissions.read"
  | "organization_context.read"
  | "organization_context.switch"
  | "patients.read"
  | "patients.create"
  | "patients.update"
  | "patients.archive"
  | "patients.documents.read"
  | "clinics.create"
  | "clinics.read"
  | "clinics.update"
  | "clinics.archive"
  | "doctors.create"
  | "doctors.read"
  | "doctors.update"
  | "doctors.archive"
  | "works.create"
  | "works.read_all"
  | "works.read_assigned"
  | "works.update"
  | "works.urgency.update"
  | "works.deadline.current.update"
  | "works.assign"
  | "works.change_status"
  | "works.archive"
  | "works.deadline.preview"
  | "works.deadline.read"
  | "works.deadline.recalculate"
  | "works.deadline.set_manual"
  | "works.deadline.override_lock"
  | "works.technical_details.read"
  | "works.technical_details.update"
  | "works.production.finalize"
  | "works.production.probe_ready"
  | "works.claim.available.read"
  | "works.claim.own.read"
  | "works.claim.create"
  | "works.claim.release_own"
  | "works.claim.release_any"
  | "works.claim.assign"
  | "works.claim.reassign"
  | "works.claim.history.read"
  | "works.execution_snapshot.read"
  | "works.execution_snapshot.read_pricing"
  | "works.execution_snapshot.read_deadline"
  | "works.execution_snapshot.history.read"
  | "works.execution_snapshot.create"
  | "works.item.create"
  | "works.item.update"
  | "works.item.remove"
  | "works.scope.update"
  | "works.connections.manage"
  | "works.custom_type.use"
  | "works.custom_platform.use"
  | "works.custom_type.save_to_catalog"
  | "works.custom_platform.save_to_catalog"
  | "cycles.read"
  | "cycles.history.read"
  | "cycles.create_next"
  | "cycles.probe_type.select"
  | "cycles.mark_received"
  | "probe_types.read"
  | "probe_types.manage"
  | "scan.use"
  | "scan.resolve"
  | "workflow.read"
  | "workflow.configure"
  | "workflow.create"
  | "workflow.update"
  | "workflow.archive"
  | "workflow.assign_stage"
  | "workflow.start_stage"
  | "workflow.pause_stage"
  | "workflow.complete_stage"
  | "workflow.reassign_stage"
  | "workflow.reopen_stage"
  | "technician.workbench.read"
  | "technician.workload.read"
  | "technician.operations.read"
  | "technician.operations.manage_own"
  | "technician.operations.scope.select"
  | "technician.operations.configure"
  | "technician.rates.read"
  | "technician.rates.manage"
  | "technician.earnings.read_own"
  | "technician.earnings.read_all"
  | "technician.payments.read_own"
  | "technician.payments.read_all"
  | "technician.payments.create"
  | "notifications.read_own"
  | "notifications.mark_read_own"
  | "notifications.dismiss_own"
  | "logistics.read"
  | "logistics.plan"
  | "logistics.assign"
  | "logistics.prepare_delivery"
  | "logistics.center.read"
  | "logistics.update_location"
  | "logistics.block_work"
  | "logistics.unblock_work"
  | "logistics.prepare_work"
  | "logistics.manage_groups"
  | "logistics.alerts.update"
  | "logistics.delivery_marker.update"
  | "pickup.create"
  | "pickup.read"
  | "pickup.update"
  | "pickup.cancel"
  | "routes.create"
  | "routes.read"
  | "routes.assign"
  | "routes.update"
  | "routes.cancel"
  | "routes.execute_own"
  | "routes.correct_outcome"
  | "reception.receive"
  | "reception.edit_intake"
  | "reception.handover_to_logistics"
  | "reception.handover_to_courier"
  | "delivery.read_own"
  | "delivery.read"
  | "delivery.create"
  | "delivery.assign"
  | "delivery.create_route"
  | "delivery.pickup"
  | "delivery.start_transit"
  | "delivery.complete"
  | "delivery.deliver"
  | "delivery.fail"
  | "delivery.reschedule"
  | "delivery.cancel"
  | "delivery.capture_signature"
  | "delivery.signature.capture"
  | "delivery.signature.read"
  | "delivery.signature.override"
  | "delivery.proof.print"
  | "quality.read"
  | "quality.approve"
  | "quality.reject"
  | "quality.rework"
  | "finance.read"
  | "finance.record_payment"
  | "finance.refund"
  | "finance.read_reports"
  | "invoice.create"
  | "invoice.read"
  | "invoice.download"
  | "invoice.cancel"
  | "invoice.configure_series"
  | "invoice.storno.create"
  | "invoice.storno.read"
  | "discounts.read"
  | "discounts.manage"
  | "pricing.read"
  | "pricing.create"
  | "pricing.update"
  | "pricing.archive"
  | "pricing.resolve_preview"
  | "pricing.agreements.read"
  | "pricing.agreements.manage"
  | "forms.read"
  | "forms.create"
  | "forms.update"
  | "forms.archive"
  | "work_forms.real.read"
  | "work_forms.real.update"
  | "work_forms.real.finalize"
  | "work_forms.real.history.read"
  | "work_forms.real.manage_templates"
  | "reports.operational"
  | "reports.financial"
  | "reports.productivity"
  | "settings.read"
  | "settings.update"
  | "audit.read"
  | "files.upload"
  | "files.read"
  | "files.delete"
  | "comments.create"
  | "comments.read_internal"
  | "comments.read_external";

function definePermission(key: PermissionKey, description: string): PermissionDefinition {
  const [resource, action] = key.split(".") as [string, string];

  return {
    action,
    allowedScopes: PERMISSION_SCOPES,
    description,
    key,
    resource,
  };
}

export const PERMISSION_REGISTRY = [
  definePermission("users.create", "Create users."),
  definePermission("users.read", "Read users."),
  definePermission("users.update", "Update users."),
  definePermission("users.disable", "Disable users."),
  definePermission("users.assign_roles", "Assign roles to users."),
  definePermission("roles.read", "Read roles."),
  definePermission("permissions.read", "Read permissions."),
  definePermission("organization_context.read", "Read active organization context."),
  definePermission("organization_context.switch", "Switch active organization context."),
  definePermission("patients.read", "Read patient registry and patient work records."),
  definePermission("patients.create", "Create patient records."),
  definePermission("patients.update", "Update current patient identity fields."),
  definePermission("patients.archive", "Archive and restore patient records."),
  definePermission("patients.documents.read", "Read patient document references."),
  definePermission("clinics.create", "Create dental clinics."),
  definePermission("clinics.read", "Read dental clinics."),
  definePermission("clinics.update", "Update dental clinics."),
  definePermission("clinics.archive", "Archive dental clinics."),
  definePermission("doctors.create", "Create external doctors."),
  definePermission("doctors.read", "Read external doctors."),
  definePermission("doctors.update", "Update external doctors."),
  definePermission("doctors.archive", "Archive external doctors."),
  definePermission("works.create", "Create work orders."),
  definePermission("works.read_all", "Read all work orders."),
  definePermission("works.read_assigned", "Read assigned work orders."),
  definePermission("works.update", "Update work orders."),
  definePermission("works.urgency.update", "Set and change canonical work urgency."),
  definePermission("works.deadline.current.update", "Set the current active probe deadline."),
  definePermission("works.assign", "Assign work orders."),
  definePermission("works.change_status", "Change work order status."),
  definePermission("works.archive", "Archive work orders."),
  definePermission("works.deadline.preview", "Preview work order deadlines without financial fields."),
  definePermission("works.deadline.read", "Read work order deadline snapshots."),
  definePermission("works.deadline.recalculate", "Recalculate work order deadline snapshots."),
  definePermission("works.deadline.set_manual", "Set manual work order deadlines."),
  definePermission("works.deadline.override_lock", "Override locked work order deadlines."),
  definePermission("works.technical_details.read", "Read technician-editable work technical details."),
  definePermission("works.technical_details.update", "Update technician-editable work technical details."),
  definePermission("works.production.finalize", "Mark technical production as finalized."),
  definePermission("works.production.probe_ready", "Mark the active technical probe as Probă gata."),
  definePermission("works.claim.available.read", "Read work orders available for technician claim."),
  definePermission("works.claim.own.read", "Read own claimed work orders."),
  definePermission("works.claim.create", "Claim an available work order."),
  definePermission("works.claim.release_own", "Release own claimed work order."),
  definePermission("works.claim.release_any", "Release any claimed work order."),
  definePermission("works.claim.assign", "Assign an unclaimed work order to a technician."),
  definePermission("works.claim.reassign", "Reassign a claimed work order to another technician."),
  definePermission("works.claim.history.read", "Read work assignment history."),
  definePermission("works.execution_snapshot.read", "Read fixed execution context snapshots."),
  definePermission("works.execution_snapshot.read_pricing", "Read financial execution snapshot fields."),
  definePermission("works.execution_snapshot.read_deadline", "Read execution snapshot deadline fields."),
  definePermission("works.execution_snapshot.history.read", "Read execution snapshot references in assignment history."),
  definePermission("works.execution_snapshot.create", "Create execution snapshots through claim or manager assignment."),
  definePermission("works.item.create", "Add a technical component to a work order."),
  definePermission("works.item.update", "Edit a current technical component of a work order."),
  definePermission("works.item.remove", "Remove a current unused technical component from a work order."),
  definePermission("works.scope.update", "Edit the anatomical scope of a current work component."),
  definePermission("works.connections.manage", "Manage persisted adjacent-tooth connections in the authorized case context."),
  definePermission("works.custom_type.use", "Use a one-off custom work type without catalog persistence."),
  definePermission("works.custom_platform.use", "Use a one-off custom implant platform without catalog persistence."),
  definePermission("works.custom_type.save_to_catalog", "Save a custom work type to the reusable catalog; final role remains unresolved."),
  definePermission("works.custom_platform.save_to_catalog", "Save a custom implant platform to the reusable catalog; final role remains unresolved."),
  definePermission("cycles.read", "Read current work cycle state."),
  definePermission("cycles.history.read", "Read work cycle history."),
  definePermission("cycles.create_next", "Register a returned work and create the next work cycle."),
  definePermission("cycles.probe_type.select", "Select the current or next data-driven probe type."),
  definePermission("cycles.mark_received", "Register a returned case as Recepționată."),
  definePermission("probe_types.read", "Read the global laboratory ProbeType catalog."),
  definePermission("probe_types.manage", "Manage the global laboratory ProbeType catalog."),
  definePermission("scan.use", "Use operational QR scanner."),
  definePermission("scan.resolve", "Resolve operational QR scan context."),
  definePermission("workflow.read", "Read workflows."),
  definePermission("workflow.configure", "Configure workflows."),
  definePermission("workflow.create", "Create workflow templates."),
  definePermission("workflow.update", "Update workflow templates."),
  definePermission("workflow.archive", "Archive workflow templates."),
  definePermission("workflow.assign_stage", "Assign workflow stages."),
  definePermission("workflow.start_stage", "Start workflow stages."),
  definePermission("workflow.pause_stage", "Pause workflow stages."),
  definePermission("workflow.complete_stage", "Complete workflow stages."),
  definePermission("workflow.reassign_stage", "Reassign workflow stages."),
  definePermission("workflow.reopen_stage", "Reopen workflow stages."),
  definePermission("technician.workbench.read", "Read technician workbench."),
  definePermission("technician.workload.read", "Read technician workload."),
  definePermission("technician.operations.read", "Read technician operation catalog and performed operations."),
  definePermission("technician.operations.manage_own", "Manage own performed technician operations."),
  definePermission("technician.operations.scope.select", "Select the authorized scope of an own performed maneuver."),
  definePermission("technician.operations.configure", "Configure technician maneuver definitions, rates, and pricing units."),
  definePermission("technician.rates.read", "Read technician operation rates."),
  definePermission("technician.rates.manage", "Manage technician operation rates."),
  definePermission("technician.earnings.read_own", "Read own technician earnings."),
  definePermission("technician.earnings.read_all", "Read all technician earnings."),
  definePermission("technician.payments.read_own", "Read own technician payments and balance."),
  definePermission("technician.payments.read_all", "Read all technician payments and balances."),
  definePermission("technician.payments.create", "Record a technician payment."),
  definePermission("notifications.read_own", "Read own notifications."),
  definePermission("notifications.mark_read_own", "Mark own notifications as read."),
  definePermission("notifications.dismiss_own", "Dismiss own notifications."),
  definePermission("logistics.read", "Read logistics."),
  definePermission("logistics.plan", "Plan logistics."),
  definePermission("logistics.assign", "Assign logistics work."),
  definePermission("logistics.prepare_delivery", "Prepare deliveries."),
  definePermission("logistics.center.read", "Read the operational logistics center."),
  definePermission("logistics.update_location", "Update work physical location."),
  definePermission("logistics.block_work", "Block work for operational reasons."),
  definePermission("logistics.unblock_work", "Unblock work after issue resolution."),
  definePermission("logistics.prepare_work", "Confirm packing readiness and packing transitions."),
  definePermission("logistics.manage_groups", "Manage internal delivery preparation groups."),
  definePermission("logistics.alerts.update", "Update logistics alert color markers."),
  definePermission("logistics.delivery_marker.update", "Update delivery or pickup route-preparation markers."),
  definePermission("pickup.create", "Create pickup requests."),
  definePermission("pickup.read", "Read pickup requests."),
  definePermission("pickup.update", "Update pickup requests."),
  definePermission("pickup.cancel", "Cancel pickup requests."),
  definePermission("routes.create", "Create courier routes."),
  definePermission("routes.read", "Read courier routes."),
  definePermission("routes.assign", "Assign couriers to routes."),
  definePermission("routes.update", "Update courier routes and ordered stops."),
  definePermission("routes.cancel", "Cancel courier routes."),
  definePermission("routes.execute_own", "Record outcomes on own assigned route stops."),
  definePermission("routes.correct_outcome", "Correct route stop outcomes."),
  definePermission("reception.receive", "Receive work orders."),
  definePermission("reception.edit_intake", "Edit intake."),
  definePermission("reception.handover_to_logistics", "Hand over to logistics."),
  definePermission("reception.handover_to_courier", "Hand over to courier."),
  definePermission("delivery.read_own", "Read own deliveries."),
  definePermission("delivery.read", "Read deliveries."),
  definePermission("delivery.create", "Create deliveries from ready preparation groups."),
  definePermission("delivery.assign", "Assign couriers to deliveries."),
  definePermission("delivery.create_route", "Create delivery routes."),
  definePermission("delivery.pickup", "Confirm pickup."),
  definePermission("delivery.start_transit", "Start delivery transit."),
  definePermission("delivery.complete", "Complete delivery."),
  definePermission("delivery.deliver", "Confirm delivery."),
  definePermission("delivery.fail", "Mark delivery failed."),
  definePermission("delivery.reschedule", "Reschedule failed deliveries."),
  definePermission("delivery.cancel", "Cancel deliveries before execution."),
  definePermission("delivery.capture_signature", "Capture delivery signatures."),
  definePermission("delivery.signature.capture", "Capture internal delivery handover signatures."),
  definePermission("delivery.signature.read", "Read internal delivery handover proof."),
  definePermission("delivery.signature.override", "Complete delivery without recipient signature through explicit override."),
  definePermission("delivery.proof.print", "Print internal delivery handover proof."),
  definePermission("quality.read", "Read quality control."),
  definePermission("quality.approve", "Approve quality checks."),
  definePermission("quality.reject", "Reject quality checks."),
  definePermission("quality.rework", "Create quality rework."),
  definePermission("finance.read", "Read finance."),
  definePermission("finance.record_payment", "Record payments."),
  definePermission("finance.refund", "Record refunds."),
  definePermission("finance.read_reports", "Read finance reports."),
  definePermission("invoice.create", "Create invoices."),
  definePermission("invoice.read", "Read invoices."),
  definePermission("invoice.download", "Download invoices."),
  definePermission("invoice.cancel", "Cancel invoices."),
  definePermission("invoice.configure_series", "Configure invoice series."),
  definePermission("invoice.storno.create", "Create invoice storno documents."),
  definePermission("invoice.storno.read", "Read invoice storno documents."),
  definePermission("discounts.read", "Read patient and invoice discounts."),
  definePermission("discounts.manage", "Manage patient and invoice discounts."),
  definePermission("pricing.read", "Read pricing."),
  definePermission("pricing.create", "Create pricing entries."),
  definePermission("pricing.update", "Update pricing entries."),
  definePermission("pricing.archive", "Archive pricing entries."),
  definePermission("pricing.resolve_preview", "Preview resolved pricing."),
  definePermission("pricing.agreements.read", "Read pricing agreements."),
  definePermission("pricing.agreements.manage", "Manage pricing agreements."),
  definePermission("forms.read", "Read work form templates."),
  definePermission("forms.create", "Create work form templates."),
  definePermission("forms.update", "Update work form templates."),
  definePermission("forms.archive", "Archive work form templates."),
  definePermission("work_forms.real.read", "Read real laboratory cycle sheets."),
  definePermission("work_forms.real.update", "Update active real laboratory cycle sheets."),
  definePermission("work_forms.real.finalize", "Finalize active real laboratory cycle sheets."),
  definePermission("work_forms.real.history.read", "Read historical real laboratory cycle sheets."),
  definePermission("work_forms.real.manage_templates", "Manage real laboratory sheet templates."),
  definePermission("reports.operational", "Read operational reports."),
  definePermission("reports.financial", "Read financial reports."),
  definePermission("reports.productivity", "Read productivity reports."),
  definePermission("settings.read", "Read settings."),
  definePermission("settings.update", "Update settings."),
  definePermission("audit.read", "Read audit."),
  definePermission("files.upload", "Upload files."),
  definePermission("files.read", "Read files."),
  definePermission("files.delete", "Delete files."),
  definePermission("comments.create", "Create comments."),
  definePermission("comments.read_internal", "Read internal comments."),
  definePermission("comments.read_external", "Read external comments."),
] as const satisfies readonly PermissionDefinition[];

export const ROLE_DEFINITIONS = {
  CURIER: {
    description: "Courier role for own pickup and delivery flows.",
    name: "Curier",
  },
  LOGISTICA: {
    description: "Logistics role for operational planning.",
    name: "Logistica",
  },
  MANAGER: {
    description: "Manager role with seeded MVP permissions.",
    name: "Manager",
  },
  MEDIC: {
    description: "Doctor or clinic portal role.",
    name: "Medic",
  },
  RECEPTIE: {
    description: "Reception role for intake and handover.",
    name: "Receptie",
  },
  TEHNICIAN: {
    description: "Technician role for assigned production stages.",
    name: "Tehnician",
  },
} as const satisfies Record<RbacRoleKey, { readonly description: string; readonly name: string }>;

export type PermissionGrantMatrix = Readonly<Record<RbacRoleKey, Readonly<Record<PermissionKey, PermissionScope | null>>>>;

function emptyRoleGrants(): Record<PermissionKey, PermissionScope | null> {
  return Object.fromEntries(PERMISSION_REGISTRY.map((permission) => [permission.key, null])) as Record<PermissionKey, PermissionScope | null>;
}

function grants(entries: Partial<Record<PermissionKey, PermissionScope>>): Readonly<Record<PermissionKey, PermissionScope | null>> {
  return {
    ...emptyRoleGrants(),
    ...entries,
  };
}

export const ROLE_PERMISSION_MATRIX = {
  CURIER: grants({
    "comments.create": "ALL",
    "comments.read_external": "ALL",
    "organization_context.read": "ALL",
    "notifications.dismiss_own": "ALL",
    "notifications.mark_read_own": "ALL",
    "notifications.read_own": "ALL",
    "cycles.read": "OWN_DELIVERY",
    "delivery.capture_signature": "OWN_DELIVERY",
    "delivery.complete": "OWN_DELIVERY",
    "delivery.deliver": "OWN_DELIVERY",
    "delivery.fail": "OWN_DELIVERY",
    "delivery.pickup": "OWN_DELIVERY",
    "delivery.read": "OWN_DELIVERY",
    "delivery.read_own": "OWN_DELIVERY",
    "delivery.signature.capture": "OWN_DELIVERY",
    "delivery.signature.read": "OWN_DELIVERY",
    "delivery.start_transit": "OWN_DELIVERY",
    "files.read": "OWN_DELIVERY",
    "pickup.read": "OWN_DELIVERY",
    "routes.execute_own": "OWN_DELIVERY",
    "routes.read": "OWN_DELIVERY",
    "scan.resolve": "ASSIGNED",
    "scan.use": "ASSIGNED",
    "works.change_status": "OWN_DELIVERY",
    "works.deadline.read": "OWN_DELIVERY",
    "works.read_assigned": "OWN_DELIVERY",
  }),
  LOGISTICA: grants({
    "comments.create": "ALL",
    "comments.read_external": "ALL",
    "comments.read_internal": "ALL",
    "clinics.read": "ALL",
    "organization_context.read": "ALL",
    "notifications.dismiss_own": "ALL",
    "notifications.mark_read_own": "ALL",
    "notifications.read_own": "ALL",
    "cycles.history.read": "ALL",
    "cycles.read": "ALL",
    "delivery.assign": "ALL",
    "delivery.cancel": "ALL",
    "delivery.create": "ALL",
    "delivery.create_route": "ALL",
    "delivery.read": "ALL",
    "delivery.proof.print": "ALL",
    "delivery.reschedule": "ALL",
    "delivery.signature.read": "ALL",
    "doctors.read": "ALL",
    "files.read": "ALL",
    "files.upload": "ALL",
    "work_forms.real.history.read": "ALL",
    "work_forms.real.read": "ALL",
    "logistics.assign": "ALL",
    "logistics.block_work": "ALL",
    "logistics.center.read": "ALL",
    "logistics.manage_groups": "ALL",
    "logistics.plan": "ALL",
    "logistics.prepare_work": "ALL",
    "logistics.prepare_delivery": "ALL",
    "logistics.read": "ALL",
    "logistics.unblock_work": "ALL",
    "logistics.update_location": "ALL",
    "patients.read": "ASSIGNED",
    "pickup.cancel": "ALL",
    "pickup.create": "ALL",
    "pickup.read": "ALL",
    "pickup.update": "ALL",
    "quality.read": "ALL",
    "quality.rework": "ALL",
    "reception.handover_to_courier": "ALL",
    "reports.operational": "ALL",
    "reports.productivity": "ALL",
    "routes.assign": "ALL",
    "routes.cancel": "ALL",
    "routes.correct_outcome": "ALL",
    "routes.create": "ALL",
    "routes.read": "ALL",
    "routes.update": "ALL",
    "scan.resolve": "ALL",
    "scan.use": "ALL",
    "workflow.complete_stage": "OWN_STAGE",
    "workflow.read": "ALL",
    "workflow.start_stage": "OWN_STAGE",
    "works.assign": "ALL",
    "works.change_status": "ALL",
    "works.claim.history.read": "ALL",
    "works.create": "ALL",
    "works.deadline.read": "ALL",
    "works.execution_snapshot.read": "ALL",
    "works.execution_snapshot.read_deadline": "ALL",
    "works.execution_snapshot.history.read": "ALL",
    "works.read_all": "ALL",
    "works.read_assigned": "ASSIGNED",
    "works.technical_details.read": "ALL",
    "works.update": "ALL",
    "works.urgency.update": "ALL",
    "works.deadline.current.update": "ALL",
    "logistics.alerts.update": "ALL",
    "logistics.delivery_marker.update": "ALL",
  }),
  MANAGER: grants(Object.fromEntries(PERMISSION_REGISTRY.map((permission) => [permission.key, "ALL"])) as Record<PermissionKey, PermissionScope>),
  MEDIC: grants({
    "comments.create": "ALL",
    "comments.read_external": "ALL",
    "organization_context.read": "ALL",
    "notifications.dismiss_own": "OWN_CLINIC",
    "notifications.mark_read_own": "OWN_CLINIC",
    "notifications.read_own": "OWN_CLINIC",
    "files.read": "OWN_CLINIC",
    "works.read_assigned": "OWN_CLINIC",
    "works.deadline.read": "OWN_CLINIC",
    "works.execution_snapshot.read": "OWN_CLINIC",
    "works.execution_snapshot.read_deadline": "OWN_CLINIC",
  }),
  RECEPTIE: grants({
    "clinics.read": "ALL",
    "comments.create": "ALL",
    "comments.read_external": "ALL",
    "comments.read_internal": "ALL",
    "organization_context.read": "ALL",
    "cycles.mark_received": "ALL",
    "cycles.create_next": "ALL",
    "cycles.history.read": "ALL",
    "cycles.read": "ALL",
    "cycles.probe_type.select": "ALL",
    "probe_types.read": "ALL",
    "delivery.read": "ALL",
    "delivery.proof.print": "ALL",
    "delivery.signature.read": "ALL",
    "doctors.read": "ALL",
    "forms.read": "ALL",
    "work_forms.real.finalize": "ALL",
    "work_forms.real.history.read": "ALL",
    "work_forms.real.read": "ALL",
    "work_forms.real.update": "ALL",
    "files.read": "ALL",
    "logistics.block_work": "ALL",
    "logistics.center.read": "ALL",
    "logistics.prepare_delivery": "ALL",
    "logistics.read": "ALL",
    "logistics.update_location": "ALL",
    "patients.create": "ALL",
    "patients.read": "ALL",
    "patients.update": "ALL",
    "patients.documents.read": "ALL",
    "reception.edit_intake": "ALL",
    "reception.handover_to_courier": "ALL",
    "reception.handover_to_logistics": "ALL",
    "reception.receive": "ALL",
    "works.connections.manage": "ALL",
    "works.custom_platform.use": "ALL",
    "works.custom_type.use": "ALL",
    "works.item.create": "ALL",
    "works.item.remove": "ALL",
    "works.item.update": "ALL",
    "works.scope.update": "ALL",
    "notifications.dismiss_own": "ALL",
    "notifications.mark_read_own": "ALL",
    "notifications.read_own": "ALL",
    "scan.resolve": "ALL",
    "scan.use": "ALL",
    "workflow.complete_stage": "OWN_STAGE",
    "workflow.read": "ALL",
    "workflow.start_stage": "OWN_STAGE",
    "works.change_status": "ALL",
    "works.claim.history.read": "ALL",
    "works.create": "ALL",
    "works.deadline.preview": "ALL",
    "works.deadline.read": "ALL",
    "works.execution_snapshot.read": "ALL",
    "works.execution_snapshot.read_deadline": "ALL",
    "works.execution_snapshot.history.read": "ALL",
    "works.read_all": "ALL",
    "works.read_assigned": "ASSIGNED",
    "works.update": "ALL",
    "works.urgency.update": "ALL",
    "works.deadline.current.update": "ALL",
  }),
  TEHNICIAN: grants({
    "comments.create": "ALL",
    "comments.read_external": "ALL",
    "comments.read_internal": "ALL",
    "organization_context.read": "ALL",
    "notifications.dismiss_own": "ASSIGNED",
    "notifications.mark_read_own": "ASSIGNED",
    "notifications.read_own": "ASSIGNED",
    "cycles.history.read": "ASSIGNED",
    "cycles.read": "ASSIGNED",
    "cycles.probe_type.select": "ASSIGNED",
    "probe_types.read": "ASSIGNED",
    "files.read": "ASSIGNED",
    "forms.read": "ALL",
    "work_forms.real.finalize": "ASSIGNED",
    "work_forms.real.history.read": "ASSIGNED",
    "work_forms.real.read": "ASSIGNED",
    "work_forms.real.update": "ASSIGNED",
    "logistics.center.read": "ASSIGNED",
    "patients.read": "ASSIGNED",
    "quality.read": "OWN_STAGE",
    "scan.resolve": "ASSIGNED",
    "scan.use": "ASSIGNED",
    "technician.workbench.read": "ASSIGNED",
    "technician.earnings.read_own": "ASSIGNED",
    "technician.payments.read_own": "ASSIGNED",
    "technician.operations.manage_own": "ASSIGNED",
    "technician.operations.read": "ALL",
    "technician.operations.scope.select": "ASSIGNED",
    "workflow.complete_stage": "OWN_STAGE",
    "workflow.pause_stage": "OWN_STAGE",
    "workflow.read": "ASSIGNED",
    "workflow.start_stage": "OWN_STAGE",
    "works.claim.available.read": "ALL",
    "works.claim.create": "ASSIGNED",
    "works.claim.history.read": "ASSIGNED",
    "works.claim.own.read": "ASSIGNED",
    "works.claim.release_own": "ASSIGNED",
    "works.change_status": "OWN_STAGE",
    "works.deadline.read": "OWN_STAGE",
    "works.execution_snapshot.create": "ASSIGNED",
    "works.execution_snapshot.read": "ASSIGNED",
    "works.execution_snapshot.read_deadline": "ASSIGNED",
    "works.execution_snapshot.history.read": "ASSIGNED",
    "works.production.finalize": "ASSIGNED",
    "works.production.probe_ready": "ASSIGNED",
    "works.read_assigned": "OWN_STAGE",
    "works.technical_details.read": "ASSIGNED",
    "works.technical_details.update": "ASSIGNED",
  }),
} as const satisfies PermissionGrantMatrix;

export const OVERRIDE_ELIGIBLE_PERMISSION_KEYS = [
  "audit.read",
  "clinics.archive",
  "clinics.create",
  "clinics.read",
  "clinics.update",
  "delivery.capture_signature",
  "delivery.proof.print",
  "delivery.assign",
  "delivery.cancel",
  "delivery.complete",
  "delivery.create",
  "delivery.create_route",
  "delivery.deliver",
  "delivery.fail",
  "delivery.pickup",
  "delivery.read",
  "delivery.read_own",
  "delivery.reschedule",
  "delivery.signature.capture",
  "delivery.signature.override",
  "delivery.signature.read",
  "delivery.start_transit",
  "doctors.archive",
  "doctors.create",
  "doctors.read",
  "doctors.update",
  "discounts.manage",
  "discounts.read",
  "cycles.create_next",
  "cycles.history.read",
  "cycles.read",
  "files.delete",
  "files.read",
  "forms.archive",
  "forms.create",
  "forms.read",
  "forms.update",
  "work_forms.real.finalize",
  "work_forms.real.history.read",
  "work_forms.real.manage_templates",
  "work_forms.real.read",
  "work_forms.real.update",
  "finance.read",
  "invoice.download",
  "invoice.read",
  "invoice.storno.create",
  "invoice.storno.read",
  "logistics.alerts.update",
  "logistics.block_work",
  "logistics.center.read",
  "logistics.delivery_marker.update",
  "logistics.manage_groups",
  "logistics.prepare_work",
  "logistics.unblock_work",
  "logistics.update_location",
  "patients.archive",
  "patients.create",
  "patients.documents.read",
  "patients.read",
  "patients.update",
  "pickup.cancel",
  "pickup.create",
  "pickup.read",
  "pickup.update",
  "pricing.agreements.manage",
  "pricing.agreements.read",
  "pricing.archive",
  "pricing.create",
  "pricing.read",
  "pricing.resolve_preview",
  "pricing.update",
  "quality.approve",
  "quality.read",
  "quality.reject",
  "quality.rework",
  "reception.edit_intake",
  "reception.handover_to_logistics",
  "reception.receive",
  "reports.operational",
  "reports.productivity",
  "routes.assign",
  "routes.cancel",
  "routes.correct_outcome",
  "routes.create",
  "routes.execute_own",
  "routes.read",
  "routes.update",
  "scan.resolve",
  "scan.use",
  "settings.read",
  "technician.earnings.read_all",
  "technician.earnings.read_own",
  "technician.payments.read_all",
  "technician.payments.read_own",
  "technician.payments.create",
  "technician.operations.manage_own",
  "technician.operations.read",
  "technician.rates.manage",
  "technician.rates.read",
  "technician.workbench.read",
  "technician.workload.read",
  "workflow.archive",
  "workflow.assign_stage",
  "workflow.complete_stage",
  "workflow.configure",
  "workflow.create",
  "workflow.pause_stage",
  "workflow.reopen_stage",
  "workflow.reassign_stage",
  "workflow.start_stage",
  "workflow.update",
  "works.create",
  "works.claim.assign",
  "works.claim.available.read",
  "works.claim.create",
  "works.claim.history.read",
  "works.claim.own.read",
  "works.claim.reassign",
  "works.claim.release_any",
  "works.claim.release_own",
  "works.deadline.override_lock",
  "works.deadline.preview",
  "works.deadline.recalculate",
  "works.deadline.read",
  "works.deadline.set_manual",
  "works.production.finalize",
  "works.execution_snapshot.create",
  "works.execution_snapshot.history.read",
  "works.execution_snapshot.read",
  "works.execution_snapshot.read_deadline",
  "works.execution_snapshot.read_pricing",
  "works.technical_details.read",
  "works.technical_details.update",
  "works.update",
] as const satisfies readonly PermissionKey[];

export function isPermissionScope(value: string): value is PermissionScope {
  return PERMISSION_SCOPES.includes(value as PermissionScope);
}
