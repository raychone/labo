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
  fetchCurrentUser,
  fetchPermissions,
  demoLogin,
  login,
  type DemoLoginRole,
} from "./auth-api.js";
import type { LoginFormValues } from "./login-form.schema.js";
import { loginFormSchema } from "./login-form.schema.js";
import { authQueryKeys, useAuthState } from "../../app/auth-state.js";
import { getDefaultAuthorizedRoute, getFirstAuthorizedRoute, getSafeReturnTo } from "../../app/route-registry.js";
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

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

const demoRoles: readonly {
  readonly description: string;
  readonly label: string;
  readonly role: DemoLoginRole;
}[] = [
  { description: "Administrare, lucrări, facturare și setări", label: "Intră ca manager", role: "MANAGER" },
  { description: "Înregistrarea și consultarea lucrărilor", label: "Intră ca recepție", role: "RECEPTIE" },
  { description: "Accesul logistic va fi completat în etapele următoare", label: "Intră ca logistică", role: "LOGISTICA" },
  { description: "Acces la informațiile operaționale permise", label: "Intră ca tehnician", role: "TEHNICIAN" },
  { description: "Fluxul de livrare va fi completat ulterior", label: "Intră ca curier", role: "CURIER" },
  { description: "Acces demonstrativ limitat", label: "Intră ca medic", role: "MEDIC" },
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
  async function handleAuthenticated(): Promise<void> {
      toast.clearToasts();
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
      const currentUser = await queryClient.fetchQuery({
        queryFn: fetchCurrentUser,
        queryKey: authQueryKeys.currentUser,
      });
      const permissions = currentUser?.user
        ? await queryClient.fetchQuery({
          queryFn: fetchPermissions,
          queryKey: authQueryKeys.permissions,
        })
        : undefined;
      const permissionKeys = permissions?.permissions
        .filter((permission) => permission.scopes.includes("ALL"))
        .map((permission) => permission.key) ?? [];

      navigate(returnTo ?? getFirstAuthorizedRoute(permissionKeys), { replace: true });
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
          <p className="auth-page__eyebrow">Dental Lab Management</p>
          <h1 id="login-title">Autentificare</h1>
          <p>
            Acces securizat pentru echipa laboratorului.
          </p>
        </div>

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
                <TextInput
                  autoComplete="email"
                  error={form.formState.errors.email?.message}
                  id="email"
                  label="Email"
                  required
                  type="email"
                  {...form.register("email")}
                />
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
                {form.formState.errors.root?.message ? (
                  <ErrorState
                    title="Autentificare necesară"
                    description={form.formState.errors.root.message}
                  />
                ) : null}
                {loginMutation.isError ? (
                  <ErrorState
                    title="Autentificare eșuată"
                    description="Email sau parolă invalide."
                  />
                ) : null}
                <FormActions
                  className="auth-page__actions"
                  isSubmitting={isAuthenticating}
                  submitLabel="Autentificare"
                />
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
                Alege un profil demo. Parolele nu sunt expuse în browser.
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
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
