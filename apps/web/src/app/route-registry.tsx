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
const managerWorkspacePermissions = ["finance.read", "invoice.read", "invoice.create", "pricing.read", "settings.read", "users.read"] as const;

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
    showInNavigation: true,
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
    icon: "LO",
    label: "Centru operațional",
    navigationGroup: "Logistică",
    path: "/logistics",
    permissionMode: "any",
    requiredPermissions: ["logistics.center.read"],
    showInNavigation: true,
  },
  {
    icon: "BI",
    label: "Facturare",
    navigationGroup: "Management",
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
    icon: "PR",
    label: "Prețuri și termene",
    navigationGroup: "Management",
    path: "/pricing",
    permissionMode: "any",
    requiredPermissions: ["pricing.read"],
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
    icon: "WT",
    label: "Tipuri de lucrări",
    navigationGroup: "Management",
    path: "/work-types",
    permissionMode: "any",
    requiredPermissions: ["pricing.read"],
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
] as const satisfies readonly AppRouteConfig[];

function shouldShowInNavigation(permissionKeys: readonly string[], route: AppRouteConfig): boolean {
  if (!hasRouteAccess(permissionKeys, route)) {
    return false;
  }

  if (isManagerWorkspace(permissionKeys)) {
    return route.path === "/dashboard"
      || route.path === "/status"
      || route.path === "/billing"
      || route.path === "/pricing"
      || route.path === "/patients"
      || route.path === "/clinics"
      || route.path === "/work-types"
      || route.path === "/users"
      || route.path === "/settings";
  }

  if (route.path === "/works") {
    return permissionKeys.includes("works.read_all");
  }

  if (route.path === "/logistics") {
    return permissionKeys.includes("logistics.center.read")
      && !permissionKeys.includes("works.create")
      && !permissionKeys.includes("technician.workbench.read");
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
  return appRoutes.find((route) => normalizedPathname === route.path || normalizedPathname.startsWith(`${route.path}/`));
}

export function getDefaultAuthorizedRoute(): string {
  return "/dashboard";
}

export function getFirstAuthorizedRoute(permissionKeys: readonly string[]): string {
  return getNavigationRoutes(permissionKeys)[0]?.path ?? getDefaultAuthorizedRoute();
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
