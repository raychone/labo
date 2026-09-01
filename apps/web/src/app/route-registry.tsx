import type { ReactNode } from "react";

export type PermissionMode = "all" | "any";

export interface AppRouteConfig {
  readonly icon: ReactNode;
  readonly label: string;
  readonly navigationGroup?: string;
  readonly path: string;
  readonly requiredPermissions: readonly string[];
  readonly permissionMode: PermissionMode;
  readonly showInNavigation: boolean;
}

export const workReadPermissions = ["works.read_all", "works.read_assigned"] as const;
export const operationalStatusReadPermissions = workReadPermissions;
export const scanPermissions = ["scan.use"] as const;
export const deliveryReadPermissions = ["delivery.read", "delivery.read_own"] as const;
const managerWorkspacePermissions = ["finance.read", "finance.read_reports", "invoice.read", "invoice.create", "pricing.read", "settings.read", "technician.earnings.read_all", "technician.rates.manage", "users.read"] as const;

function isManagerWorkspace(permissionKeys: readonly string[]): boolean {
  return managerWorkspacePermissions.some((permission) => permissionKeys.includes(permission));
}

export const appRoutes = [
  {
    icon: "LV",
    label: "Livrările mele",
    navigationGroup: "Logistică",
    path: "/deliveries",
    permissionMode: "any",
    requiredPermissions: deliveryReadPermissions,
    showInNavigation: false,
  },
  {
    icon: "DB",
    label: "Acasă",
    navigationGroup: "Operațional",
    path: "/dashboard",
    permissionMode: "any",
    requiredPermissions: [],
    showInNavigation: true,
  },
  {
    icon: "WO",
    label: "Lucrări",
    navigationGroup: "Operațional",
    path: "/works",
    permissionMode: "any",
    requiredPermissions: workReadPermissions,
    showInNavigation: true,
  },
  {
    icon: "OS",
    label: "Status",
    navigationGroup: "Operațional",
    path: "/status",
    permissionMode: "any",
    requiredPermissions: operationalStatusReadPermissions,
    showInNavigation: true,
  },
  {
    icon: "TS",
    label: "Test operațional",
    navigationGroup: "Operațional",
    path: "/test",
    permissionMode: "any",
    requiredPermissions: ["works.read_all", "logistics.center.read"],
    showInNavigation: false,
  },
  {
    icon: "OS",
    label: "Status TV",
    navigationGroup: "Operațional",
    path: "/status/tv",
    permissionMode: "any",
    requiredPermissions: operationalStatusReadPermissions,
    showInNavigation: false,
  },
  {
    icon: "QR",
    label: "Scanare",
    navigationGroup: "Operațional",
    path: "/scan",
    permissionMode: "any",
    requiredPermissions: scanPermissions,
    showInNavigation: true,
  },
  {
    icon: "AT",
    label: "Lucrările mele",
    navigationGroup: "Tehnician",
    path: "/workbench",
    permissionMode: "any",
    requiredPermissions: ["technician.workbench.read"],
    showInNavigation: true,
  },
  {
    icon: "CA",
    label: "Valoare",
    navigationGroup: "Tehnician",
    path: "/earnings",
    permissionMode: "any",
    requiredPermissions: ["technician.earnings.read_own"],
    showInNavigation: true,
  },
  {
    icon: "LO",
    label: "Centru operațional",
    navigationGroup: "Logistică",
    path: "/logistics",
    permissionMode: "any",
    requiredPermissions: ["logistics.center.read"],
    showInNavigation: true,
  },
  {
    icon: "TR",
    label: "Trasee",
    navigationGroup: "Logistică",
    path: "/routes",
    permissionMode: "any",
    requiredPermissions: ["routes.create", "routes.read", "logistics.center.read"],
    showInNavigation: true,
  },
  {
    icon: "TM",
    label: "Trasee",
    navigationGroup: "Curier",
    path: "/my-route",
    permissionMode: "any",
    requiredPermissions: ["routes.read"],
    showInNavigation: true,
  },
  {
    icon: "BI",
    label: "Facturare",
    navigationGroup: "FINANCIAR",
    path: "/billing",
    permissionMode: "any",
    requiredPermissions: ["finance.read", "invoice.read", "invoice.create"],
    showInNavigation: true,
  },
  {
    icon: "BI",
    label: "Note de plată",
    navigationGroup: "Management",
    path: "/billing/statements",
    permissionMode: "any",
    requiredPermissions: ["finance.read_reports"],
    showInNavigation: false,
  },
  {
    icon: "BI",
    label: "Arhivă facturare",
    navigationGroup: "FINANCIAR",
    path: "/billing/archive",
    permissionMode: "any",
    requiredPermissions: ["finance.read_reports"],
    showInNavigation: true,
  },
  {
    icon: "BI",
    label: "Arhiva Facturare",
    navigationGroup: "FINANCIAR",
    path: "/billing/month-registry/print",
    permissionMode: "any",
    requiredPermissions: ["finance.read_reports"],
    showInNavigation: false,
  },
  {
    icon: "SW",
    label: "Setări lucrări",
    navigationGroup: "Management",
    path: "/work-settings",
    permissionMode: "any",
    requiredPermissions: ["pricing.read"],
    showInNavigation: true,
  },
  {
    icon: "TE",
    label: "Tehnicieni",
    navigationGroup: "Management",
    path: "/technicians",
    permissionMode: "any",
    requiredPermissions: ["technician.earnings.read_all"],
    showInNavigation: true,
  },
  {
    icon: "PA",
    label: "Pacienți",
    navigationGroup: "Management",
    path: "/patients",
    permissionMode: "any",
    requiredPermissions: ["patients.read"],
    showInNavigation: true,
  },
  {
    icon: "CL",
    label: "Clinici și medici",
    navigationGroup: "Management",
    path: "/clinics",
    permissionMode: "any",
    requiredPermissions: ["clinics.read"],
    showInNavigation: true,
  },
  {
    icon: "US",
    label: "Utilizatori",
    navigationGroup: "Management",
    path: "/users",
    permissionMode: "any",
    requiredPermissions: ["users.read"],
    showInNavigation: true,
  },
  {
    icon: "ST",
    label: "Setări",
    navigationGroup: "Management",
    path: "/settings",
    permissionMode: "any",
    requiredPermissions: ["settings.read"],
    showInNavigation: true,
  },
  {
    icon: "AU",
    label: "Audit",
    navigationGroup: "Management",
    path: "/audit",
    permissionMode: "any",
    requiredPermissions: ["audit.read"],
    showInNavigation: true,
  },
] as const satisfies readonly AppRouteConfig[];

function shouldShowInNavigation(permissionKeys: readonly string[], route: AppRouteConfig): boolean {
  if (!hasRouteAccess(permissionKeys, route)) {
    return false;
  }

  // Curierii folosesc exclusiv fluxul de traseu. Nu afișa meniul operațional
  // comun (Acasă, Status, Scanare etc.) pentru un cont care are doar acces la
  // traseele proprii.
  if (permissionKeys.includes("routes.read") && !permissionKeys.includes("routes.create")) {
    return route.path === "/my-route";
  }

  if (isManagerWorkspace(permissionKeys)) {
    return route.path === "/dashboard"
      || route.path === "/status"
      || route.path === "/billing"
      || route.path === "/billing/archive"
      || route.path === "/work-settings"
      || route.path === "/technicians"
      || route.path === "/patients"
      || route.path === "/clinics"
      || route.path === "/users"
      || route.path === "/settings"
      || route.path === "/audit";
  }

  if (route.path === "/works") {
    return permissionKeys.includes("works.read_all");
  }

  if (route.path === "/logistics") {
    // The operational workspace at /status replaces the legacy logistics
    // center in the primary navigation. Keep /logistics addressable for
    // compatibility while the remaining legacy flows are retired.
    return false;
  }

  // CourierRoute is the courier workflow. Keep the legacy delivery page
  // addressable for history, but do not expose it as the primary navigation.
  if (route.path === "/deliveries") {
    return false;
  }

  if (route.path === "/routes") {
    return (permissionKeys.includes("routes.create") || permissionKeys.includes("logistics.manage_groups"))
      && !permissionKeys.includes("technician.workbench.read");
  }

  if (route.path === "/my-route") {
    return permissionKeys.includes("routes.read") && !permissionKeys.includes("routes.create");
  }

  if (route.path === "/clinics" || route.path === "/doctors") {
    return permissionKeys.includes("users.read");
  }

  return route.showInNavigation;
}

export function hasRouteAccess(
  permissionKeys: readonly string[],
  route: Pick<AppRouteConfig, "permissionMode" | "requiredPermissions">,
): boolean {
  if (route.requiredPermissions.length === 0) {
    return true;
  }

  return route.permissionMode === "all"
    ? route.requiredPermissions.every((permission) => permissionKeys.includes(permission))
    : route.requiredPermissions.some((permission) => permissionKeys.includes(permission));
}

export function getNavigationRoutes(permissionKeys: readonly string[]): readonly AppRouteConfig[] {
  return appRoutes.filter((route) => shouldShowInNavigation(permissionKeys, route));
}

export function getRouteByPath(pathname: string): AppRouteConfig | undefined {
  const normalizedPathname = pathname === "/" ? "/dashboard" : pathname;
  return appRoutes
    .filter((route) => normalizedPathname === route.path || normalizedPathname.startsWith(`${route.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0];
}

function isCourierPermissions(permissionKeys: readonly string[]): boolean {
  return permissionKeys.includes("routes.read") && !permissionKeys.includes("routes.create");
}

export function getDefaultAuthorizedRoute(permissionKeys: readonly string[] = []): string {
  return isCourierPermissions(permissionKeys) ? "/my-route" : "/dashboard";
}

export function getFirstAuthorizedRoute(permissionKeys: readonly string[]): string {
  return getNavigationRoutes(permissionKeys)[0]?.path ?? getDefaultAuthorizedRoute(permissionKeys);
}

export function getSafeNotificationTarget(target: string, permissionKeys: readonly string[]): string {
  if (!target.startsWith("/") || target.startsWith("//")) {
    return getFirstAuthorizedRoute(permissionKeys);
  }

  const pathname = target.split(/[?#]/, 1)[0] ?? target;
  const route = getRouteByPath(pathname);
  return route && hasRouteAccess(permissionKeys, route) ? target : getFirstAuthorizedRoute(permissionKeys);
}

export function getSafeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
