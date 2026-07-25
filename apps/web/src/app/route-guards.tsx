import { Button, ErrorState } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router";

import { useAuthState } from "./auth-state.js";
import { getDefaultAuthorizedRoute, getFirstAuthorizedRoute, getRouteByPath, getSafeReturnTo, hasRouteAccess, type PermissionMode } from "./route-registry.js";
import { GlobalAuthLoading } from "./route-loading.js";

function getLoginPath(pathname: string, search: string): string {
  const returnTo = `${pathname}${search}`;
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function AuthenticatedRoute({ children }: { readonly children: ReactNode }): ReactNode {
  const auth = useAuthState();
  const location = useLocation();

  if (auth.status === "loading") {
    return <GlobalAuthLoading />;
  }

  if (auth.status === "error") {
    return (
      <main className="global-auth-loading">
        <ErrorState
          title="Sesiunea nu a putut fi verificată"
          description="Verifică conexiunea la API și încearcă din nou."
          retryAction={<Button onClick={() => void auth.refetch()}>Reîncearcă</Button>}
        />
      </main>
    );
  }

  if (auth.status === "anonymous") {
    return <Navigate replace to={getLoginPath(location.pathname, location.search)} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { readonly children: ReactNode }): ReactNode {
  const auth = useAuthState();
  const [searchParams] = useSearchParams();

  if (auth.status === "loading") {
    return <GlobalAuthLoading />;
  }

  if (auth.status === "authenticated") {
    const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
    const target = returnTo && returnTo !== "/login"
      ? returnTo
      : getDefaultAuthorizedRoute();

    return <Navigate replace to={hasRouteTargetAccess(target, auth.permissionKeys) ? target : getFirstAuthorizedRoute(auth.permissionKeys)} />;
  }

  return children;
}

export function PermissionRoute({
  children,
  mode = "any",
  requiredPermissions,
}: {
  readonly children: ReactNode;
  readonly mode?: PermissionMode;
  readonly requiredPermissions: readonly string[];
}): ReactNode {
  const auth = useAuthState();
  const location = useLocation();

  if (auth.status === "loading") {
    return <GlobalAuthLoading />;
  }

  if (auth.status === "anonymous") {
    return <Navigate replace to={getLoginPath(location.pathname, location.search)} />;
  }

  if (auth.status === "error") {
    return (
      <ErrorState
        title="Accesul nu poate fi verificat"
        description="Permisiunile nu au putut fi încărcate."
        retryAction={<Button onClick={() => void auth.refetch()}>Reîncearcă</Button>}
      />
    );
  }

  const canAccess = hasRouteAccess(auth.permissionKeys, {
    permissionMode: mode,
    requiredPermissions,
  });

  return canAccess ? children : <Navigate replace to="/forbidden" />;
}

function hasRouteTargetAccess(target: string, permissionKeys: readonly string[]): boolean {
  if (target === "/" || target === "/dashboard") {
    return true;
  }

  const targetRoute = getRouteByPath(target);

  if (!targetRoute) {
    return true;
  }

  return hasRouteAccess(permissionKeys, targetRoute);
}
