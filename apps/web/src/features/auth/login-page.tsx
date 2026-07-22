import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  StatusBadge,
  TextInput,
} from "@dental-lab/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";

import {
  fetchCsrfToken,
  fetchCurrentUser,
  fetchPermissions,
  login,
  logout,
} from "./auth-api.js";
import type { LoginFormValues } from "./login-form.schema.js";
import { loginFormSchema } from "./login-form.schema.js";
import "./login-page.css";

const defaultLoginValues: LoginFormValues = {
  email: "manager.dev@example.test",
  password: "ChangeMe-Dev-Only-12345",
};

export function LoginPage(): ReactNode {
  const queryClient = useQueryClient();
  const csrfQuery = useQuery({
    queryFn: fetchCsrfToken,
    queryKey: ["auth", "csrf"],
  });
  const currentUserQuery = useQuery({
    queryFn: fetchCurrentUser,
    queryKey: ["auth", "me"],
    retry: false,
  });
  const permissionsQuery = useQuery({
    enabled: currentUserQuery.data !== null && currentUserQuery.data !== undefined,
    queryFn: fetchPermissions,
    queryKey: ["auth", "permissions"],
    retry: false,
  });
  const form = useForm<LoginFormValues>({
    defaultValues: defaultLoginValues,
    resolver: zodResolver(loginFormSchema),
  });
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = csrfQuery.data ?? await fetchCsrfToken();

      await logout(csrfToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
  const user = currentUserQuery.data?.user;
  const visiblePermissions = permissionsQuery.data?.permissions.slice(0, 10) ?? [];

  return (
    <main className="auth-page">
      <section className="dl-container auth-page__layout" aria-labelledby="login-title">
        <div className="auth-page__intro">
          <p className="auth-page__eyebrow">Dental Lab Management</p>
          <h1 id="login-title">Autentificare</h1>
          <p>
            Acces securizat pentru verificarea sesiunii backend, cookie-ului httpOnly,
            CSRF si permisiunilor curente.
          </p>
        </div>

        <Card className="auth-page__panel">
          <CardHeader>
            <CardTitle>{user ? "Sesiune activa" : "Login local"}</CardTitle>
            <CardDescription>
              {user ? "Contul autentificat in browserul curent." : "Foloseste credentialele demo generate prin seed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentUserQuery.isLoading ? (
              <LoadingState text="Verific sesiunea" />
            ) : user ? (
              <div className="auth-page__session">
                <div className="auth-page__user">
                  <StatusBadge label="Autentificat" variant="approved" />
                  <strong>{user.displayName}</strong>
                  <span>{user.email}</span>
                </div>

                {permissionsQuery.isLoading ? (
                  <LoadingState size="small" text="Incarc permisiunile" />
                ) : (
                  <div className="auth-page__permissions">
                    <div className="auth-page__permissions-header">
                      <strong>Permisiuni efective</strong>
                      <span>{permissionsQuery.data?.permissions.length ?? 0}</span>
                    </div>
                    <ul>
                      {visiblePermissions.map((permission) => (
                        <li key={permission.key}>
                          <code>{permission.key}</code>
                          <span>{permission.scopes.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  fullWidth
                  isLoading={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  variant="secondary"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <form
                className="auth-page__form"
                onSubmit={(event) => {
                  void form.handleSubmit((values) => loginMutation.mutate(values))(event);
                }}
              >
                <TextInput
                  autoComplete="email"
                  error={form.formState.errors.email?.message}
                  label="Email"
                  type="email"
                  {...form.register("email")}
                />
                <TextInput
                  autoComplete="current-password"
                  error={form.formState.errors.password?.message}
                  label="Parola"
                  type="password"
                  {...form.register("password")}
                />
                {csrfQuery.isError ? (
                  <ErrorState
                    title="CSRF indisponibil"
                    description="Verifica daca API-ul ruleaza si CORS permite frontend-ul."
                  />
                ) : null}
                {loginMutation.isError ? (
                  <ErrorState
                    title="Login esuat"
                    description={loginMutation.error.message}
                  />
                ) : null}
                <Button
                  disabled={csrfQuery.isLoading}
                  fullWidth
                  isLoading={loginMutation.isPending}
                  type="submit"
                >
                  Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
