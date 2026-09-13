import { apiFetch, ApiError, parseApiResponse } from "../../lib/api-client.js";

export interface AuthUser {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly preferredColor: string | null;
}

export interface AuthUserResponse {
  readonly user: AuthUser;
}

export interface PermissionSnapshot {
  readonly permissions: readonly {
    readonly key: string;
    readonly scopes: readonly string[];
  }[];
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export type DemoLoginRole = "CURIER" | "LOGISTICA" | "MANAGER" | "MEDIC" | "RECEPTIE" | "TEHNICIAN";

export interface CsrfResponse {
  readonly csrfToken: string;
}

let csrfTokenRequest: Promise<string> | null = null;

export async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenRequest) {
    return csrfTokenRequest;
  }

  csrfTokenRequest = (async () => {
    const response = await apiFetch("/auth/csrf", { cache: "no-store" });
    const body = await parseApiResponse<CsrfResponse>(response);

    return body.csrfToken;
  })();

  try {
    return await csrfTokenRequest;
  } finally {
    csrfTokenRequest = null;
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthUserResponse> {
  const response = await apiFetch("/auth/login", {
    body: JSON.stringify(credentials),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new ApiError("Email sau parola invalide.", 401);
  }

  return parseApiResponse<AuthUserResponse>(response);
}

export async function demoLogin(role: DemoLoginRole): Promise<AuthUserResponse> {
  let response = await postDemoLogin(role, await fetchCsrfToken());

  // A stale browser cookie can survive a deploy or a restored browser
  // session. Refresh only for the explicit CSRF failure; all other 403s keep
  // their original API behavior.
  if (response.status === 403 && await isInvalidCsrfResponse(response)) {
    response = await postDemoLogin(role, await fetchCsrfToken());
  }

  return parseApiResponse<AuthUserResponse>(response);
}

async function postDemoLogin(role: DemoLoginRole, csrfToken: string): Promise<Response> {
  return apiFetch("/auth/demo-login", {
    body: JSON.stringify({ role }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });
}

async function isInvalidCsrfResponse(response: Response): Promise<boolean> {
  try {
    const body = await response.clone().json() as { readonly message?: unknown };
    return body.message === "Invalid CSRF token.";
  } catch {
    return false;
  }
}

export async function fetchCurrentUser(): Promise<AuthUserResponse | null> {
  const response = await apiFetch("/auth/me");

  if (response.status === 401) {
    return null;
  }

  return parseApiResponse<AuthUserResponse>(response);
}

export async function fetchPermissions(): Promise<PermissionSnapshot> {
  const response = await apiFetch("/auth/permissions");

  return parseApiResponse<PermissionSnapshot>(response);
}

export async function updateCurrentUserProfile(input: { readonly preferredColor: string }): Promise<AuthUserResponse> {
  const csrfToken = await fetchCsrfToken();
  const response = await apiFetch("/auth/me/profile", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PATCH",
  });

  return parseApiResponse<AuthUserResponse>(response);
}

export async function logout(csrfToken: string): Promise<void> {
  const response = await apiFetch("/auth/logout", {
    headers: {
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new ApiError("Logout-ul a eșuat.", response.status);
  }
}
