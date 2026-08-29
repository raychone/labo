import { describe, expect, it } from "vitest";

import { getNavigationRoutes, getRouteByPath, getSafeNotificationTarget, getSafeReturnTo, hasRouteAccess, operationalStatusReadPermissions, scanPermissions, workReadPermissions } from "./route-registry.js";

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
      "technician.earnings.read_all",
      "patients.read",
      "clinics.read",
      "work_types.read",
      "users.read",
      "audit.read",
    ]).map((route) => route.label);

    expect(labels).toContain("Acasă");
    expect(labels).toContain("Status");
    expect(labels).toContain("Facturare");
    expect(labels).toContain("Arhivă facturare");
    expect(labels).toContain("Setări lucrări");
    expect(labels).not.toContain("Prețuri și termene");
    expect(labels).not.toContain("Tipuri de lucrări");
    expect(labels).toContain("Tehnicieni");
    expect(labels).toContain("Pacienți");
    expect(labels).toContain("Clinici și medici");
    expect(labels).toContain("Utilizatori");
    expect(labels).toContain("Setări");
    expect(labels).toContain("Audit");
    expect(labels).not.toContain("Lucrări");
    expect(labels).not.toContain("Scanare");
    expect(labels).not.toContain("Centru operațional");
    expect(labels).not.toContain("Livrările mele");
    expect(labels).not.toContain("Status TV");
    expect(labels).not.toContain("Arhiva Facturare");
  });

  it("keeps technician work routes out of navigation when access is scoped", () => {
    const labels = getNavigationRoutes(["works.read_assigned", "technician.workbench.read", "technician.earnings.read_own", "logistics.center.read"]).map((route) => route.label);

    expect(labels).toContain("Lucrările mele");
    expect(labels).toContain("Valoare");
    expect(labels).not.toContain("Lucrări");
    expect(labels).not.toContain("Centru operațional");
  });

  it("keeps final role navigation aligned with the operational model", () => {
    const reception = getNavigationRoutes([
      "works.create", "works.read_all", "scan.use", "patients.read", "status.read",
      "delivery.read", "logistics.center.read", "workflow.read", "cycles.read",
    ]).map((route) => route.label);
    expect(reception).toEqual(expect.arrayContaining(["Acasă", "Lucrări", "Status", "Scanare", "Pacienți"]));
    expect(reception).not.toContain("Facturare");
    expect(reception).not.toContain("Tehnicieni");
    expect(reception).not.toContain("Traseu");
    expect(reception).not.toContain("Livrările mele");

    const logistics = getNavigationRoutes([
      "works.create", "works.read_all", "scan.use", "logistics.center.read", "logistics.plan", "routes.create", "routes.read", "pickup.create", "pickup.read", "delivery.read",
    ]).map((route) => route.label);
    expect(logistics).toEqual(expect.arrayContaining(["Acasă", "Status", "Scanare", "Centru operațional", "Trasee"]));
    expect(logistics).not.toContain("Livrările mele");
    expect(logistics).not.toContain("Traseul meu");

    const technician = getNavigationRoutes([
      "works.read_assigned", "scan.use", "technician.workbench.read", "technician.earnings.read_own", "patients.read",
    ]).map((route) => route.label);
    expect(technician).toEqual(expect.arrayContaining(["Acasă", "Status", "Scanare", "Lucrările mele", "Valoare", "Pacienți"]));
    expect(technician).not.toContain("Traseu");
    expect(technician).not.toContain("Facturare");

    const courier = getNavigationRoutes(["routes.read", "delivery.read", "delivery.read_own", "scan.use", "works.read_assigned"]).map((route) => route.label);
    expect(courier).toEqual(["Trasee"]);
    expect(courier).not.toContain("Acasă");
    expect(courier).not.toContain("Status");
    expect(courier).not.toContain("Scanare");
    expect(courier).not.toContain("Livrările mele");
    expect(courier).not.toContain("Traseu");
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

  it("does not send a notification to a route outside the user's permissions", () => {
    expect(getSafeNotificationTarget("/billing?tab=uninvoiced&workId=work_1", ["works.read_all"])).toBe("/dashboard");
    expect(getSafeNotificationTarget("/billing?tab=uninvoiced&workId=work_1", ["invoice.create"])).toBe("/billing?tab=uninvoiced&workId=work_1");
    expect(getSafeNotificationTarget("/pagina-care-nu-exista", ["works.read_all"])).toBe("/dashboard");
  });

  it("resolves the dedicated TV status route without shadowing /status", () => {
    expect(getRouteByPath("/status/tv")?.path).toBe("/status/tv");
    expect(getRouteByPath("/status")?.path).toBe("/status");
  });

  it("resolves the dedicated month registry print route", () => {
    expect(getRouteByPath("/billing/month-registry/print")?.path).toBe("/billing/month-registry/print");
  });
});
