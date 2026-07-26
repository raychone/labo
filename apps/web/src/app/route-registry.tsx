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
export const scanPermissions = ["scan.use"] as const;
export const deliveryReadPermissions = ["delivery.read", "delivery.read_own"] as const;

export const appRoutes = [
  {
    icon: "LV",
    label: "Livrările mele",
    navigationGroup: "Operare",
    path: "/deliveries",
    permissionMode: "any",
    requiredPermissions: deliveryReadPermissions,
    showInNavigation: true,
  },
  {
    icon: "DB",
    label: "Panou principal",
    path: "/dashboard",
    permissionMode: "any",
    requiredPermissions: [],
    showInNavigation: true,
  },
  {
    icon: "WO",
    label: "Lucrări",
    navigationGroup: "Operare",
    path: "/works",
    permissionMode: "any",
    requiredPermissions: workReadPermissions,
    showInNavigation: true,
  },
  {
    icon: "QR",
    label: "Scanare",
    navigationGroup: "Operare",
    path: "/scan",
    permissionMode: "any",
    requiredPermissions: scanPermissions,
    showInNavigation: true,
  },
  {
    icon: "AT",
    label: "Lucrările mele",
    navigationGroup: "Operare",
    path: "/workbench",
    permissionMode: "any",
    requiredPermissions: ["technician.workbench.read"],
    showInNavigation: true,
  },
  {
    icon: "LO",
    label: "Centru operațional",
    navigationGroup: "Operare",
    path: "/logistics",
    permissionMode: "any",
    requiredPermissions: ["logistics.center.read"],
    showInNavigation: true,
  },
  {
    icon: "BI",
    label: "Facturare",
    navigationGroup: "Financiar",
    path: "/billing",
    permissionMode: "any",
    requiredPermissions: ["finance.read", "invoice.read", "invoice.create"],
    showInNavigation: true,
  },
  {
    icon: "CL",
    label: "Clinici și medici",
    navigationGroup: "Administrare",
    path: "/clinics",
    permissionMode: "any",
    requiredPermissions: ["clinics.read"],
    showInNavigation: true,
  },
  {
    icon: "WT",
    label: "Tipuri de lucrări",
    navigationGroup: "Administrare",
    path: "/work-types",
    permissionMode: "any",
    requiredPermissions: ["pricing.read"],
    showInNavigation: true,
  },
  {
    icon: "US",
    label: "Utilizatori",
    navigationGroup: "Administrare",
    path: "/users",
    permissionMode: "any",
    requiredPermissions: ["users.read"],
    showInNavigation: true,
  },
  {
    icon: "ST",
    label: "Setări",
    navigationGroup: "Administrare",
    path: "/settings",
    permissionMode: "any",
    requiredPermissions: ["settings.read"],
    showInNavigation: true,
  },
] as const satisfies readonly AppRouteConfig[];

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
  return appRoutes.filter((route) => route.showInNavigation && hasRouteAccess(permissionKeys, route));
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
