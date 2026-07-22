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
  "workflow.read",
  "workflow.configure",
  "workflow.start_stage",
  "workflow.pause_stage",
  "workflow.complete_stage",
  "workflow.reopen_stage",
  "logistics.read",
  "logistics.plan",
  "logistics.assign",
  "logistics.prepare_delivery",
  "reception.receive",
  "reception.edit_intake",
  "reception.handover_to_logistics",
  "reception.handover_to_courier",
  "delivery.read_own",
  "delivery.create_route",
  "delivery.pickup",
  "delivery.deliver",
  "delivery.fail",
  "delivery.capture_signature",
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
    expect(ROLE_PERMISSION_MATRIX.CURIER["delivery.deliver"]).toBe("OWN_DELIVERY");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["clinics.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["doctors.read"]).toBe("ALL");
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["clinics.create"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.RECEPTIE["doctors.create"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MEDIC["audit.read"]).toBeNull();
    expect(ROLE_PERMISSION_MATRIX.MANAGER["audit.read"]).toBe("ALL");
  });
});
