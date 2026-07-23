import { zodResolver } from "@hookform/resolvers/zod";
import {
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
} from "@dental-lab/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";

import {
  fetchCurrentUser,
  fetchPermissions,
  login,
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

export function LoginPage(): ReactNode {
  const queryClient = useQueryClient();
  const auth = useAuthState();
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
  const loginMutation = useMutation({
    mutationFn: login,
    onError: () => {
      form.setValue("password", "");
      passwordRef.current?.focus();
    },
    onSuccess: async () => {
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
    },
  });
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
            <CardTitle>Intra in aplicatie</CardTitle>
            <CardDescription>
              Foloseste contul intern primit de la administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auth.status === "loading" ? (
              <LoadingState text="Verific sesiunea" />
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
                    title="Autentificare necesara"
                    description={form.formState.errors.root.message}
                  />
                ) : null}
                {loginMutation.isError ? (
                  <ErrorState
                    title="Login esuat"
                    description="Email sau parola invalide."
                  />
                ) : null}
                <FormActions
                  className="auth-page__actions"
                  isSubmitting={loginMutation.isPending}
                  submitLabel="Login"
                />
              </FormLayout>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
