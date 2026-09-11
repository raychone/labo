import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  FormActions,
  FormErrorSummary,
  FormLayout,
  LoadingState,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";

import {
  fetchPermissions,
  demoLogin,
  login,
  type AuthUserResponse,
  type DemoLoginRole,
} from "./auth-api.js";
import type { LoginFormValues } from "./login-form.schema.js";
import { loginFormSchema } from "./login-form.schema.js";
import { authQueryKeys, useAuthState } from "../../app/auth-state.js";
import { getDefaultAuthorizedRoute, getSafeReturnTo } from "../../app/route-registry.js";
import { usePageTitle } from "../../app/use-page-title.js";
import { getFormErrorSummaryItems, useErrorSummaryFocus } from "../../lib/form-utils.js";
import "./login-page.css";

const defaultLoginValues: LoginFormValues = {
  email: "",
  password: "",
};

const loginFieldLabels: Record<keyof LoginFormValues, string> = {
  email: "Email",
  password: "Parola",
};

const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true";

const demoRoles: readonly {
  readonly label: string;
  readonly role: DemoLoginRole;
}[] = [
  { label: "Manager", role: "MANAGER" },
  { label: "Recepție", role: "RECEPTIE" },
  { label: "Logistică", role: "LOGISTICA" },
  { label: "Tehnician", role: "TEHNICIAN" },
  { label: "Curier", role: "CURIER" },
];

export function LoginPage(): ReactNode {
  const queryClient = useQueryClient();
  const auth = useAuthState();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const locationState = location.state as { readonly message?: string } | null;
  const form = useForm<LoginFormValues>({
    defaultValues: defaultLoginValues,
    resolver: zodResolver(loginFormSchema),
  });
  async function handleAuthenticated(authenticatedUser: AuthUserResponse): Promise<void> {
    toast.clearToasts();

    // Login already returned the authenticated user. Reusing that payload avoids
    // an immediate duplicate /auth/me request before loading permissions.
    queryClient.setQueryData(authQueryKeys.currentUser, authenticatedUser);
    queryClient.removeQueries({ queryKey: authQueryKeys.permissions });
    const permissions = await queryClient.fetchQuery({
      queryFn: fetchPermissions,
      queryKey: authQueryKeys.permissions,
    });
    const permissionKeys = permissions.permissions.map((permission) => permission.key);

    // A normal successful login always resumes the operational workspace. A
    // safe deep link remains intact, except for the forbidden error page
    // itself, which must never become a post-login destination.
    navigate(returnTo && returnTo !== "/forbidden" ? returnTo : getDefaultAuthorizedRoute(permissionKeys), { replace: true });
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onError: () => {
      form.setValue("password", "");
      passwordRef.current?.focus();
    },
    onSuccess: handleAuthenticated,
  });
  const demoLoginMutation = useMutation({
    mutationFn: demoLogin,
    onError: (error) => {
      form.setError("root", { message: error instanceof Error ? error.message : "Autentificarea demo a eșuat." });
    },
    onSuccess: handleAuthenticated,
  });
  const isAuthenticating = loginMutation.isPending || demoLoginMutation.isPending;
  const passwordRegistration = form.register("password");
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, loginFieldLabels)
    : [];
  usePageTitle("Autentificare", "Dental Lab Management");

  useEffect(() => {
    if (locationState?.message) {
      form.setError("root", { message: locationState.message });
    }
  }, [form, locationState?.message]);

  useEffect(() => {
    if (auth.status === "anonymous") {
      toast.clearToasts();
    }
  }, [auth.status, toast]);

  if (auth.status === "authenticated") {
    return <Navigate replace to={getDefaultAuthorizedRoute()} />;
  }

  return (
    <main className="auth-page">
      <section className="dl-container auth-page__layout" aria-labelledby="login-title">
        <div className="auth-page__intro">
          <div className="auth-page__brand" aria-label="Dental Lab Management">
            <span aria-hidden="true" className="auth-page__brand-mark">DL</span>
            <div>
              <p className="auth-page__eyebrow">Dental Lab Management</p>
              <span>Platformă operațională pentru laborator</span>
            </div>
          </div>
          <h1 id="login-title">Autentificare</h1>
          <p>
            Acces securizat pentru echipa laboratorului.
          </p>
        </div>

        <div className="auth-page__access">
          <Card className="auth-page__panel">
            <CardHeader>
              <CardTitle>Intră în aplicație</CardTitle>
              <CardDescription>
                Folosește contul intern primit de la administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auth.status === "loading" ? (
                <LoadingState text="Se verifică sesiunea" />
              ) : (
                <FormLayout
                  className="auth-page__form"
                  onSubmit={(event) => {
                    void form.handleSubmit((values) => loginMutation.mutate(values))(event);
                  }}
                >
                  <FormErrorSummary errors={summaryItems} ref={summaryRef} />
                  <TextInput autoComplete="email" error={form.formState.errors.email?.message} id="email" label="Email" required type="email" {...form.register("email")} />
                  <TextInput
                    autoComplete="current-password"
                    error={form.formState.errors.password?.message}
                    id="password"
                    label="Parola"
                    required
                    type="password"
                    {...passwordRegistration}
                    ref={(element) => {
                      passwordRegistration.ref(element);
                      passwordRef.current = element;
                    }}
                  />
                  {form.formState.errors.root?.message ? <ErrorState title="Autentificare necesară" description={form.formState.errors.root.message} /> : null}
                  {loginMutation.isError ? <ErrorState title="Autentificare eșuată" description="Email sau parolă invalide." /> : null}
                  <FormActions className="auth-page__actions" isSubmitting={isAuthenticating} submitLabel="Autentificare" />
                </FormLayout>
              )}
            </CardContent>
          </Card>
          {isDemoMode ? (
            <Card className="auth-page__panel auth-page__demo">
              <CardHeader>
                <CardTitle>Acces rapid pentru demonstrație</CardTitle>
                <CardDescription>
                  <span className="auth-page__demo-badge">Mod demonstrație</span>
                  Alege rolul pe care vrei să îl previzualizezi. Parolele nu sunt expuse în browser.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="auth-page__demo-grid">
                  {demoRoles.map((item) => (
                    <Button
                      className="auth-page__demo-button"
                      disabled={isAuthenticating}
                      key={item.role}
                      onClick={() => {
                        toast.clearToasts();
                        demoLoginMutation.mutate(item.role);
                      }}
                      type="button"
                      variant="outline"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
