import { describe, expect, it } from "vitest";

import { getNavigationRoutes, getRouteByPath, getSafeReturnTo, hasRouteAccess, operationalStatusReadPermissions, scanPermissions, workReadPermissions } from "./route-registry.js";

describe("route registry", () => {
  it("filters navigation by permission snapshot", () => {
    const labels = getNavigationRoutes([
      "works.read_all",
      "scan.use",
      "logistics.center.read",
      "settings.read",
      "finance.read",
      "finance.read_reports",
      "pricing.read",
      "patients.read",
      "clinics.read",
      "work_types.read",
      "users.read",
    ]).map((route) => route.label);

    expect(labels).toContain("Acasă");
    expect(labels).toContain("Status");
    expect(labels).toContain("Facturare");
    expect(labels).toContain("Arhivă facturare");
    expect(labels).toContain("Prețuri și termene");
    expect(labels).toContain("Pacienți");
    expect(labels).toContain("Clinici și medici");
    expect(labels).toContain("Tipuri de lucrări");
    expect(labels).toContain("Utilizatori");
    expect(labels).toContain("Setări");
    expect(labels).not.toContain("Lucrări");
    expect(labels).not.toContain("Scanare");
    expect(labels).not.toContain("Centru operațional");
    expect(labels).not.toContain("Livrările mele");
    expect(labels).not.toContain("Status TV");
    expect(labels).not.toContain("Arhiva Facturare");
  });

  it("keeps technician work routes out of navigation when access is scoped", () => {
    const labels = getNavigationRoutes(["works.read_assigned", "technician.workbench.read", "logistics.center.read"]).map((route) => route.label);

    expect(labels).toContain("Lucrările mele");
    expect(labels).not.toContain("Lucrări");
    expect(labels).not.toContain("Centru operațional");
  });

  it("allows any-of permissions for work routes", () => {
    expect(hasRouteAccess(["works.read_assigned"], {
      permissionMode: "any",
      requiredPermissions: workReadPermissions,
    })).toBe(true);
    expect(hasRouteAccess(["works.read_assigned"], {
      permissionMode: "any",
      requiredPermissions: operationalStatusReadPermissions,
    })).toBe(true);
    expect(hasRouteAccess(["scan.use"], {
      permissionMode: "any",
      requiredPermissions: scanPermissions,
    })).toBe(true);
  });

  it("rejects external return URLs", () => {
    expect(getSafeReturnTo("https://evil.example")).toBeNull();
    expect(getSafeReturnTo("//evil.example/works")).toBeNull();
    expect(getSafeReturnTo("/works?search=abc")).toBe("/works?search=abc");
  });

  it("resolves the dedicated TV status route without shadowing /status", () => {
    expect(getRouteByPath("/status/tv")?.path).toBe("/status/tv");
    expect(getRouteByPath("/status")?.path).toBe("/status");
  });

  it("resolves the dedicated month registry print route", () => {
    expect(getRouteByPath("/billing/month-registry/print")?.path).toBe("/billing/month-registry/print");
  });
});
