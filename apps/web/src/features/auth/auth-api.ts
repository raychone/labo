import { apiFetch, ApiError, parseApiResponse } from "../../lib/api-client.js";

export interface AuthUser {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
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

export interface CsrfResponse {
  readonly csrfToken: string;
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await apiFetch("/auth/csrf");
  const body = await parseApiResponse<CsrfResponse>(response);

  return body.csrfToken;
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

export async function logout(csrfToken: string): Promise<void> {
  const response = await apiFetch("/auth/logout", {
    headers: {
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new ApiError("Logout-ul a esuat.", response.status);
  }
}
