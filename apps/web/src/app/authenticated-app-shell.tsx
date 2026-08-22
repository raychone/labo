import { Button, ConfirmActionModal, Drawer, ErrorState, LoadingState, useToast } from "@dental-lab/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { fetchCsrfToken, logout } from "../features/auth/auth-api.js";
import { OrganizationContextSwitch } from "../features/organization-context/organization-context-switch.js";
import { useSettings } from "../features/settings/settings-api.js";
import { addUnauthorizedListener, isUnauthorizedError } from "../lib/api-client.js";
import { useAuthState } from "./auth-state.js";
import { ShellErrorBoundary } from "./error-boundary.js";
import { getNavigationRoutes, getRouteByPath } from "./route-registry.js";
import { usePageTitle } from "./use-page-title.js";
import "./app-shell.css";

const fallbackLaboratoryName = "Dental Lab Management";

function getBrandInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("ro-RO") ?? "")
    .join("") || "DL";
}

function getSafeBrandColor(value: string | undefined): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0f766e";
}

export function AuthenticatedAppShell(): ReactNode {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const previousUserIdRef = useRef<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const canReadSettings = auth.permissionKeys.includes("settings.read");
  const canReadOrganizationContext = auth.permissionKeys.includes("organization_context.read");
  const canSwitchOrganizationContext = auth.permissionKeys.includes("organization_context.switch");
  const settingsQuery = useSettings(canReadSettings);
  const laboratoryName = settingsQuery.data?.laboratoryName ?? fallbackLaboratoryName;
  const brandColor = getSafeBrandColor(settingsQuery.data?.primaryColor);
  const roleLabel = useMemo(() => getRoleLabel(auth.permissionKeys), [auth.permissionKeys]);
  const currentRoute = getRouteByPath(location.pathname);
  const pageTitle = currentRoute?.label ?? (location.pathname === "/forbidden" ? "Acces restricționat" : "Pagina");
  const routes = useMemo(() => getNavigationRoutes(auth.permissionKeys), [auth.permissionKeys]);
  const courierOnly = routes.length === 1 && routes[0]?.path === "/my-route";
  usePageTitle(pageTitle, laboratoryName);
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = await fetchCsrfToken();
      await logout(csrfToken);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast.clearToasts();
        queryClient.clear();
        navigate("/login", { replace: true, state: { message: "Sesiunea a expirat. Autentifică-te din nou." } });
        return;
      }

      toast.showToast({
        message: error instanceof Error ? error.message : "Deconectarea a eșuat.",
        title: "Deconectare eșuată",
        variant: "error",
      });
    },
    onSuccess: () => {
      toast.clearToasts();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  useEffect(() => {
    const currentUserId = auth.user?.id ?? null;
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      toast.clearToasts();
    }
    previousUserIdRef.current = currentUserId;
  }, [auth.user?.id, toast]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => addUnauthorizedListener(() => {
    toast.clearToasts();
    queryClient.clear();
    navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`, {
      replace: true,
      state: { message: "Sesiunea a expirat. Autentifică-te din nou." },
    });
  }), [location.pathname, location.search, navigate, queryClient, toast]);

  return (
    <div className="app-shell" style={{ "--app-brand-primary": brandColor } as React.CSSProperties}>
      <a className="app-shell__skip-link" href="#main-content">Sari la conținut</a>
      <AppSidebar
        currentPath={location.pathname}
        isLoggingOut={logoutMutation.isPending}
        laboratoryName={laboratoryName}
        canReadOrganizationContext={canReadOrganizationContext}
        canSwitchOrganizationContext={canSwitchOrganizationContext}
        onLogout={() => setIsLogoutConfirmOpen(true)}
        routes={routes}
        userEmail={auth.user?.email ?? ""}
        userName={auth.user?.displayName ?? ""}
        userRole={roleLabel}
      />
      <div className="app-shell__content">
        <header className="app-shell__topbar">
          <button
            aria-expanded={isMobileNavOpen}
            aria-label="Deschide navigația"
            className="app-shell__menu-button"
            onClick={() => setIsMobileNavOpen(true)}
            ref={menuButtonRef}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="app-shell__topbar-title">
            <span>{pageTitle}</span>
            <small>{laboratoryName}</small>
          </div>
        </header>
        <AppHeader courierOnly={courierOnly} pageTitle={pageTitle} pathname={location.pathname} />
        {settingsQuery.isError && canReadSettings ? (
          <div className="app-shell__notice">
            <ErrorState title="Branding indisponibil" description="Setările laboratorului nu au putut fi încărcate. Se folosește fallback-ul." />
          </div>
        ) : null}
        {settingsQuery.isLoading && canReadSettings ? <div className="app-shell__notice"><LoadingState size="small" text="Se încarcă brandingul" /></div> : null}
        <main className="app-shell__main" id="main-content" tabIndex={-1}>
          <ShellErrorBoundary>
            <Outlet />
          </ShellErrorBoundary>
        </main>
      </div>
      <Drawer
        isOpen={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
        position="right"
        title="Navigație"
        >
        <div className="app-shell__mobile-drawer">
          <BrandBlock courierOnly={courierOnly} laboratoryName={laboratoryName} />
          {canSwitchOrganizationContext ? <OrganizationContextSwitch canRead={canReadOrganizationContext} canSwitch compact /> : null}
          <NavigationList currentPath={location.pathname} routes={routes} />
          <div className="app-shell__drawer-user">
            <UserSummary email={auth.user?.email ?? ""} name={auth.user?.displayName ?? ""} roleLabel={roleLabel} />
            <Button fullWidth isLoading={logoutMutation.isPending} onClick={() => setIsLogoutConfirmOpen(true)} variant="secondary">Deconectare</Button>
          </div>
        </div>
      </Drawer>
      <ConfirmActionModal
        className="logout-confirm-modal"
        confirmLabel="Deconectează-te"
        description="Veți ieși din aplicație și va trebui să vă autentificați din nou pentru a continua."
        isLoading={logoutMutation.isPending}
        isOpen={isLogoutConfirmOpen}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          logoutMutation.mutate();
        }}
        title="Confirmă deconectarea"
      />
    </div>
  );
}

function AppSidebar({
  currentPath,
  canReadOrganizationContext,
  canSwitchOrganizationContext,
  isLoggingOut,
  laboratoryName,
  onLogout,
  routes,
  userEmail,
  userName,
  userRole,
}: {
  readonly currentPath: string;
  readonly canReadOrganizationContext: boolean;
  readonly canSwitchOrganizationContext: boolean;
  readonly isLoggingOut: boolean;
  readonly laboratoryName: string;
  readonly onLogout: () => void;
  readonly routes: readonly ReturnType<typeof getNavigationRoutes>[number][];
  readonly userEmail: string;
  readonly userName: string;
  readonly userRole: string;
}): ReactNode {
  return (
    <aside className="app-shell__sidebar">
      <BrandBlock courierOnly={routes.length === 1 && routes[0]?.path === "/my-route"} laboratoryName={laboratoryName} />
      {canSwitchOrganizationContext ? <OrganizationContextSwitch canRead={canReadOrganizationContext} canSwitch /> : null}
      <NavigationList currentPath={currentPath} routes={routes} />
      <div className="app-shell__sidebar-footer">
        <UserSummary email={userEmail} name={userName} roleLabel={userRole} />
        <Button fullWidth isLoading={isLoggingOut} onClick={onLogout} variant="secondary">Deconectare</Button>
      </div>
    </aside>
  );
}

function BrandBlock({ courierOnly, laboratoryName }: { readonly courierOnly: boolean; readonly laboratoryName: string }): ReactNode {
  return (
    <Link className="app-shell__brand" to={courierOnly ? "/my-route" : "/dashboard"}>
      <span className="app-brand-mark" aria-hidden="true">{getBrandInitials(laboratoryName)}</span>
      <span>
        <strong>{laboratoryName}</strong>
        <small>Laborator dentar</small>
      </span>
    </Link>
  );
}

function NavigationList({
  currentPath,
  routes,
}: {
  readonly currentPath: string;
  readonly routes: readonly ReturnType<typeof getNavigationRoutes>[number][];
}): ReactNode {
  let currentGroup = "";

  return (
    <nav aria-label="Navigație principală" className="app-shell__nav">
      {routes.map((route) => {
        const shouldRenderGroup = route.navigationGroup !== undefined && route.navigationGroup !== currentGroup;
        currentGroup = route.navigationGroup ?? currentGroup;

        return (
          <div className="app-shell__nav-item-wrap" key={route.path}>
            {shouldRenderGroup ? <p className="app-shell__nav-group">{route.navigationGroup}</p> : null}
            <NavLink
              aria-current={currentPath === route.path || currentPath.startsWith(`${route.path}/`) ? "page" : undefined}
              className={({ isActive }) => `app-shell__nav-link${isActive || currentPath.startsWith(`${route.path}/`) ? " app-shell__nav-link--active" : ""}`}
              to={route.path}
            >
              <span className="app-shell__nav-icon" aria-hidden="true">{route.icon}</span>
              <span>{route.label}</span>
            </NavLink>
          </div>
        );
      })}
    </nav>
  );
}

function UserSummary({ email, name, roleLabel }: { readonly email: string; readonly name: string; readonly roleLabel: string }): ReactNode {
  return (
    <div className="app-shell__user">
      <span aria-hidden="true">{getBrandInitials(name || email)}</span>
      <div>
        <strong>{name}</strong>
        <small>{roleLabel}</small>
        <small>{email}</small>
      </div>
    </div>
  );
}

function getRoleLabel(permissionKeys: readonly string[]): string {
  if (
    permissionKeys.includes("finance.read")
    || permissionKeys.includes("finance.read_reports")
    || permissionKeys.includes("invoice.create")
    || permissionKeys.includes("invoice.read")
    || permissionKeys.includes("pricing.read")
    || permissionKeys.includes("settings.read")
    || permissionKeys.includes("users.read")
  ) {
    return "Manager";
  }

  if (permissionKeys.includes("technician.workbench.read")) {
    return "Tehnician";
  }

  if (permissionKeys.includes("scan.use") || permissionKeys.includes("works.create") || permissionKeys.includes("works.read_assigned")) {
    return "Recepție";
  }

  if (permissionKeys.includes("logistics.center.read") || permissionKeys.includes("delivery.read") || permissionKeys.includes("delivery.read_own")) {
    return "Logistică";
  }

  return "Utilizator";
}

function AppHeader({
  courierOnly,
  pageTitle,
  pathname,
}: {
  readonly courierOnly: boolean;
  readonly pageTitle: string;
  readonly pathname: string;
}): ReactNode {
  return (
    <header className="app-shell__header">
      <Breadcrumbs courierOnly={courierOnly} pageTitle={pageTitle} pathname={pathname} />
    </header>
  );
}

function Breadcrumbs({ courierOnly, pageTitle, pathname }: { readonly courierOnly: boolean; readonly pageTitle: string; readonly pathname: string }): ReactNode {
  const isDashboard = pathname === "/" || pathname === "/dashboard";

  return (
    <nav aria-label="Breadcrumb" className="app-shell__breadcrumbs">
      <ol>
        <li>
          {courierOnly ? <span>Trasee</span> : isDashboard ? <span>Panou principal</span> : <Link to="/dashboard">Panou principal</Link>}
        </li>
        {!isDashboard ? <li><span>{pageTitle}</span></li> : null}
      </ol>
    </nav>
  );
}
