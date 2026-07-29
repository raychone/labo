import { describe, expect, it } from "vitest";

import {
  OVERRIDE_ELIGIBLE_PERMISSION_KEYS,
  PERMISSION_REGISTRY,
  PERMISSION_SCOPES,
  RBAC_ROLE_KEYS,
  ROLE_PERMISSION_MATRIX,
} from "./permission-registry.js";

const expectedPermissionKeys = [
  "users.create",
  "users.read",
  "users.update",
  "users.disable",
  "users.assign_roles",
  "roles.read",
  "permissions.read",
  "organization_context.read",
  "organization_context.switch",
  "patients.read",
  "patients.create",
  "patients.update",
  "patients.archive",
  "patients.documents.read",
  "clinics.create",
  "clinics.read",
  "clinics.update",
  "clinics.archive",
  "doctors.create",
  "doctors.read",
  "doctors.update",
  "doctors.archive",
  "works.create",
  "works.read_all",
  "works.read_assigned",
  "works.update",
  "works.assign",
  "works.change_status",
  "works.archive",
  "scan.use",
  "scan.resolve",
  "workflow.read",
  "workflow.configure",
  "workflow.create",
  "workflow.update",
  "workflow.archive",
  "workflow.assign_stage",
  "workflow.start_stage",
  "workflow.pause_stage",
  "workflow.complete_stage",
  "workflow.reassign_stage",
  "workflow.reopen_stage",
  "technician.workbench.read",
  "technician.workload.read",
  "logistics.read",
  "logistics.plan",
  "logistics.assign",
  "logistics.prepare_delivery",
  "logistics.center.read",
  "logistics.update_location",
  "logistics.block_work",
  "logistics.unblock_work",
  "logistics.prepare_work",
  "logistics.manage_groups",
  "reception.receive",
  "reception.edit_intake",
  "reception.handover_to_logistics",
  "reception.handover_to_courier",
  "delivery.read_own",
  "delivery.read",
  "delivery.create",
  "delivery.assign",
  "delivery.create_route",
  "delivery.pickup",
  "delivery.start_transit",
  "delivery.complete",
  "delivery.deliver",
  "delivery.fail",
  "delivery.reschedule",
  "delivery.cancel",
  "delivery.capture_signature",
  "delivery.signature.capture",
  "delivery.signature.read",
  "delivery.signature.override",
  "delivery.proof.print",
  "quality.read",
  "quality.approve",
  "quality.reject",
  "quality.rework",
  "finance.read",
  "finance.record_payment",
  "finance.refund",
  "finance.read_reports",
  "invoice.create",
  "invoice.read",
  "invoice.download",
  "invoice.cancel",
  "invoice.configure_series",
  "pricing.read",
  "pricing.create",
  "pricing.update",
  "forms.read",
  "forms.create",
  "forms.update",
  "forms.archive",
  "reports.operational",
  "reports.financial",
  "reports.productivity",
  "settings.read",
  "settings.update",
  "audit.read",
  "files.upload",
  "files.read",
  "files.delete",
  "comments.create",
  "comments.read_internal",
  "comments.read_external",
] as const;

describe("PERMISSION_REGISTRY", () => {
  it("contains every MVP matrix permission exactly once", () => {
    const keys = PERMISSION_REGISTRY.map((permission) => permission.key);

    expect(keys).toHaveLength(expectedPermissionKeys.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toStrictEqual([...expectedPermissionKeys].sort());
  });

  it("defines resource, action, description, and valid allowed scopes", () => {
    for (const permission of PERMISSION_REGISTRY) {
      expect(permission.resource).toBeTruthy();
      expect(permission.action).toBeTruthy();
      expect(permission.description).toBeTruthy();
      expect(permission.allowedScopes.every((scope) => PERMISSION_SCOPES.includes(scope))).toBe(true);
    }
  });

  it("maps all seeded role grants to valid permission scopes", () => {
    for (const roleKey of RBAC_ROLE_KEYS) {
      const matrix = ROLE_PERMISSION_MATRIX[roleKey];

      for (const permission of PERMISSION_REGISTRY) {
        const grant = matrix[permission.key];

        expect(grant === null || PERMISSION_SCOPES.includes(grant)).toBe(true);
      }
    }
  });

  it("does not grant override-only permissions implicitly for selected matrix O cells", () => {
    expect(ROLE_PERMISSION_MATRIX.LOGISTICA["invoice.create"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["finance.read"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["works.update"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MEDIC["audit.read"]).toBeNull();
    expect(OVERRIDE_ELIGIBLE_PERMISSION_KEYS).toContain("works.update");
  });

  it("keeps representative matrix permissions with expected scopes", () => {
    expect(ROLE_PERMISSION_MATRIX.MANAGER["users.create"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.LOGISTICA["works.read_all"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["workflow.complete_stage"]).toBe("OWN_STAGE");
    expect(ROLE_PERMISSION_MATRIX.CURIER["delivery.complete"]).toBe("OWN_DELIVERY");
    expect(ROLE_PERMISSION_MATRIX.CURIER["delivery.start_transit"]).toBe("OWN_DELIVERY");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["clinics.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["doctors.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["clinics.create"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["doctors.create"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MANAGER["pricing.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.LOGISTICA["pricing.read"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["pricing.read"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MANAGER["forms.update"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["forms.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["forms.update"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["forms.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["forms.archive"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["technician.workbench.read"]).toBe("ASSIGNED");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["scan.use"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["scan.resolve"]).toBe("ASSIGNED");
    expect(ROLE_PERMISSION_MATRIX.MEDIC["scan.use"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MANAGER["technician.workload.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.MANAGER["workflow.assign_stage"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.MEDIC["audit.read"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MANAGER["audit.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.MANAGER["organization_context.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.MANAGER["organization_context.switch"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["organization_context.switch"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.TEHNICIAN["organization_context.switch"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.LOGISTICA["organization_context.switch"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.CURIER["organization_context.switch"]).toBeNull();
  });
});
