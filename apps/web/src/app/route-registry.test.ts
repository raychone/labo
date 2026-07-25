import { describe, expect, it } from "vitest";

import { getNavigationRoutes, getSafeReturnTo, hasRouteAccess, workReadPermissions } from "./route-registry.js";

describe("route registry", () => {
  it("filters navigation by permission snapshot", () => {
    const labels = getNavigationRoutes(["works.read_all", "settings.read", "finance.read"]).map((route) => route.label);

    expect(labels).toContain("Panou principal");
    expect(labels).toContain("Lucrări");
    expect(labels).toContain("Scanare");
    expect(labels).toContain("Facturare");
    expect(labels).toContain("Setări");
    expect(labels).not.toContain("Utilizatori");
  });

  it("allows any-of permissions for work routes", () => {
    expect(hasRouteAccess(["works.read_assigned"], {
      permissionMode: "any",
      requiredPermissions: workReadPermissions,
    })).toBe(true);
  });

  it("rejects external return URLs", () => {
    expect(getSafeReturnTo("https://evil.example")).toBeNull();
    expect(getSafeReturnTo("//evil.example/works")).toBeNull();
    expect(getSafeReturnTo("/works?search=abc")).toBe("/works?search=abc");
  });
});
