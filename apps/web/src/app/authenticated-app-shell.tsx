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
import { useDismissAllNotifications, useDismissNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, type NotificationView } from "../features/notifications/notifications-api.js";
import { ShellErrorBoundary } from "./error-boundary.js";
import { getNavigationRoutes, getRouteByPath, getSafeNotificationTarget } from "./route-registry.js";
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [incomingNotification, setIncomingNotification] = useState<NotificationView | null>(null);
  const seenNotificationIdsRef = useRef<Set<string> | null>(null);
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
  const canReadNotifications = auth.permissionKeys.includes("notifications.read_own");
  const notificationsQuery = useNotifications(canReadNotifications);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const dismissMutation = useDismissNotification();
  const dismissAllMutation = useDismissAllNotifications();
  const notificationItems = notificationsQuery.data?.items ?? [];
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

  useEffect(() => {
    if (!canReadNotifications || notificationsQuery.isLoading) return;
    const currentIds = new Set(notificationItems.map((notification) => notification.id));
    if (seenNotificationIdsRef.current === null) {
      seenNotificationIdsRef.current = currentIds;
      return;
    }
    const newNotification = notificationItems.find((notification) => !seenNotificationIdsRef.current?.has(notification.id));
    seenNotificationIdsRef.current = currentIds;
    if (newNotification) setIncomingNotification(newNotification);
  }, [canReadNotifications, notificationItems, notificationsQuery.isLoading]);

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
          {canReadNotifications ? <button aria-label="Deschide centrul de notificări" className={`app-shell__notification-button${(notificationsQuery.data?.unreadCount ?? 0) > 0 ? " app-shell__notification-button--attention" : ""}`} onClick={() => setIsNotificationsOpen(true)} type="button"><span aria-hidden="true">🔔</span>{(notificationsQuery.data?.unreadCount ?? 0) > 0 ? <span aria-label={`${notificationsQuery.data?.unreadCount ?? 0} notificări necitite`} className="app-shell__notification-badge">{notificationsQuery.data?.unreadCount}</span> : null}</button> : null}
        </header>
        {incomingNotification ? <div aria-live="assertive" className="app-shell__notification-alert" role="alert"><button className="app-shell__notification-alert-content" onClick={() => { if (!incomingNotification.readAt) markReadMutation.mutate(incomingNotification.id); setIncomingNotification(null); navigate(getSafeNotificationTarget(incomingNotification.deepLink, auth.permissionKeys)); }} type="button"><span aria-hidden="true">🔔</span><span><strong>{incomingNotification.title}</strong><small>{incomingNotification.message}</small><em>Deschide lucrarea</em></span></button><button aria-label="Închide alerta" className="app-shell__notification-alert-close" onClick={() => setIncomingNotification(null)} type="button">×</button></div> : null}
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
      <Drawer isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} position="right" title="Notificări">
        <div className="app-shell__notifications">
          <div className="app-shell__notifications-actions"><span>{notificationsQuery.data?.unreadCount ?? 0} necitite</span><Button isLoading={markAllReadMutation.isPending} onClick={() => markAllReadMutation.mutate()} variant="secondary">Marchează citite</Button><Button disabled={(notificationsQuery.data?.items.length ?? 0) === 0} isLoading={dismissAllMutation.isPending} onClick={() => dismissAllMutation.mutate()} variant="secondary">Șterge toate</Button></div>
          {notificationsQuery.isLoading ? <LoadingState text="Se încarcă notificările" /> : null}
          {notificationsQuery.error ? <ErrorState title="Notificările nu au putut fi încărcate" description="Încearcă din nou." /> : null}
          {!notificationsQuery.isLoading && !notificationsQuery.error && (notificationsQuery.data?.items.length ?? 0) === 0 ? <p className="app-shell__notifications-empty">Nu ai notificări.</p> : null}
          {notificationItems.map((notification) => <div className="app-shell__notification-row" key={notification.id}><button className={`app-shell__notification-item${notification.readAt ? "" : " app-shell__notification-item--unread"}`} onClick={() => { if (!notification.readAt) markReadMutation.mutate(notification.id); setIsNotificationsOpen(false); navigate(getSafeNotificationTarget(notification.deepLink, auth.permissionKeys)); }} type="button"><span className={`app-shell__notification-severity app-shell__notification-severity--${notification.severity.toLowerCase()}`} /><span><strong>{notification.title}</strong><small>{notification.message}</small><time dateTime={notification.createdAt}>{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</time></span></button><Button isLoading={dismissMutation.isPending && dismissMutation.variables === notification.id} onClick={() => dismissMutation.mutate(notification.id)} variant="secondary">Șterge</Button></div>)}
        </div>
      </Drawer>
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
              <span className="app-shell__nav-icon" aria-hidden="true"><NavigationIcon icon={route.icon} /></span>
              <span>{route.label}</span>
            </NavLink>
          </div>
        );
      })}
    </nav>
  );
}

function NavigationIcon({ icon }: { readonly icon: ReactNode }): ReactNode {
  const key = typeof icon === "string" ? icon : "";
  const paths: Record<string, string> = {
    AT: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
    BI: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h4",
    CA: "M7 7h10M5 11h14M8 15h8M12 3v18",
    CL: "M4 21V5h16v16M8 9h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2",
    DB: "M3 11.5 12 4l9 7.5V21H3zM9 21v-6h6v6",
    LO: "m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10",
    LV: "M4 7h16v12H4zM8 7V5h8v2M8 12h8",
    OS: "M4 18h4v-6h4v4h4V7h4",
    PA: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
    QR: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zm4 0h2v6h-6v-2h4z",
    SW: "M4 5h16M4 12h16M4 19h16M8 5v3m8 4v3m-5 4v3",
    TE: "M5 20a7 7 0 0 1 14 0M8 8a4 4 0 1 0 8 0M17 11h4m-2-2v4",
    TM: "M4 5h16v14H4zM8 9h8M8 13h5M8 17h3",
    TR: "M5 5h4v4H5zM15 15h4v4h-4zM9 7h6v10M15 7h4v4h-4z",
    US: "M5 20a7 7 0 0 1 14 0M8 8a4 4 0 1 0 8 0M4 12h4m8 0h4",
    WO: "M4 7h16v14H4zM8 7V4h8v3M8 12h8",
  };
  return <svg data-icon={key} className="app-shell__nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d={paths[key] ?? "M5 12h14M12 5v14"} /></svg>;
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
