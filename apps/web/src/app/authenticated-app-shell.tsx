import { Button, Drawer, ErrorState, LoadingState, useToast } from "@dental-lab/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { fetchCsrfToken, logout } from "../features/auth/auth-api.js";
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
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const canReadSettings = auth.permissionKeys.includes("settings.read");
  const settingsQuery = useSettings(canReadSettings);
  const laboratoryName = settingsQuery.data?.laboratoryName ?? fallbackLaboratoryName;
  const brandColor = getSafeBrandColor(settingsQuery.data?.primaryColor);
  const currentRoute = getRouteByPath(location.pathname);
  const pageTitle = currentRoute?.label ?? (location.pathname === "/forbidden" ? "Acces restrictionat" : "Pagina");
  const routes = useMemo(() => getNavigationRoutes(auth.permissionKeys), [auth.permissionKeys]);
  usePageTitle(pageTitle, laboratoryName);
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = await fetchCsrfToken();
      await logout(csrfToken);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        queryClient.clear();
        navigate("/login", { replace: true, state: { message: "Sesiunea a expirat. Autentifica-te din nou." } });
        return;
      }

      toast.showToast({
        message: error instanceof Error ? error.message : "Logout-ul a esuat.",
        title: "Logout esuat",
        variant: "error",
      });
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
      toast.showToast({ message: "Ai fost delogat.", variant: "success" });
    },
  });

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => addUnauthorizedListener(() => {
    queryClient.clear();
    navigate(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`, {
      replace: true,
      state: { message: "Sesiunea a expirat. Autentifica-te din nou." },
    });
  }), [location.pathname, location.search, navigate, queryClient]);

  return (
    <div className="app-shell" style={{ "--app-brand-primary": brandColor } as React.CSSProperties}>
      <a className="app-shell__skip-link" href="#main-content">Sari la continut</a>
      <AppSidebar
        currentPath={location.pathname}
        isLoggingOut={logoutMutation.isPending}
        laboratoryName={laboratoryName}
        onLogout={() => logoutMutation.mutate()}
        routes={routes}
        userEmail={auth.user?.email ?? ""}
        userName={auth.user?.displayName ?? ""}
      />
      <div className="app-shell__content">
        <header className="app-shell__topbar">
          <button
            aria-expanded={isMobileNavOpen}
            aria-label="Deschide navigatia"
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
          <UserSummary email={auth.user?.email ?? ""} name={auth.user?.displayName ?? ""} />
        </header>
        <AppHeader pageTitle={pageTitle} pathname={location.pathname} />
        {settingsQuery.isError && canReadSettings ? (
          <div className="app-shell__notice">
            <ErrorState title="Branding indisponibil" description="Setarile laboratorului nu au putut fi incarcate. Se foloseste fallback-ul." />
          </div>
        ) : null}
        {settingsQuery.isLoading && canReadSettings ? <div className="app-shell__notice"><LoadingState size="small" text="Incarc branding" /></div> : null}
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
        title="Navigatie"
      >
        <div className="app-shell__mobile-drawer">
          <BrandBlock laboratoryName={laboratoryName} />
          <NavigationList currentPath={location.pathname} routes={routes} />
          <div className="app-shell__drawer-user">
            <UserSummary email={auth.user?.email ?? ""} name={auth.user?.displayName ?? ""} />
            <Button fullWidth isLoading={logoutMutation.isPending} onClick={() => logoutMutation.mutate()} variant="secondary">Logout</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function AppSidebar({
  currentPath,
  isLoggingOut,
  laboratoryName,
  onLogout,
  routes,
  userEmail,
  userName,
}: {
  readonly currentPath: string;
  readonly isLoggingOut: boolean;
  readonly laboratoryName: string;
  readonly onLogout: () => void;
  readonly routes: readonly ReturnType<typeof getNavigationRoutes>[number][];
  readonly userEmail: string;
  readonly userName: string;
}): ReactNode {
  return (
    <aside className="app-shell__sidebar">
      <BrandBlock laboratoryName={laboratoryName} />
      <NavigationList currentPath={currentPath} routes={routes} />
      <div className="app-shell__sidebar-footer">
        <UserSummary email={userEmail} name={userName} />
        <Button fullWidth isLoading={isLoggingOut} onClick={onLogout} variant="secondary">Logout</Button>
      </div>
    </aside>
  );
}

function BrandBlock({ laboratoryName }: { readonly laboratoryName: string }): ReactNode {
  return (
    <Link className="app-shell__brand" to="/dashboard">
      <span className="app-brand-mark" aria-hidden="true">{getBrandInitials(laboratoryName)}</span>
      <span>
        <strong>{laboratoryName}</strong>
        <small>Dental Lab</small>
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
    <nav aria-label="Navigatie principala" className="app-shell__nav">
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

function UserSummary({ email, name }: { readonly email: string; readonly name: string }): ReactNode {
  return (
    <div className="app-shell__user">
      <span aria-hidden="true">{getBrandInitials(name || email)}</span>
      <div>
        <strong>{name}</strong>
        <small>{email}</small>
      </div>
    </div>
  );
}

function AppHeader({
  pageTitle,
  pathname,
}: {
  readonly pageTitle: string;
  readonly pathname: string;
}): ReactNode {
  return (
    <header className="app-shell__header">
      <Breadcrumbs pageTitle={pageTitle} pathname={pathname} />
    </header>
  );
}

function Breadcrumbs({ pageTitle, pathname }: { readonly pageTitle: string; readonly pathname: string }): ReactNode {
  const isDashboard = pathname === "/" || pathname === "/dashboard";

  return (
    <nav aria-label="Breadcrumb" className="app-shell__breadcrumbs">
      <ol>
        <li>
          {isDashboard ? <span>Dashboard</span> : <Link to="/dashboard">Dashboard</Link>}
        </li>
        {!isDashboard ? <li><span>{pageTitle}</span></li> : null}
      </ol>
    </nav>
  );
}
