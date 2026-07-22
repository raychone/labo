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

interface CsrfResponse {
  readonly csrfToken: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Email sau parola invalide." : "Request-ul a esuat.");
  }

  return response.json() as Promise<TResponse>;
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    credentials: "include",
  });
  const body = await parseJsonResponse<CsrfResponse>(response);

  return body.csrfToken;
}

export async function login(credentials: LoginCredentials): Promise<AuthUserResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    body: JSON.stringify(credentials),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseJsonResponse<AuthUserResponse>(response);
}

export async function fetchCurrentUser(): Promise<AuthUserResponse | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  return parseJsonResponse<AuthUserResponse>(response);
}

export async function fetchPermissions(): Promise<PermissionSnapshot> {
  const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
    credentials: "include",
  });

  return parseJsonResponse<PermissionSnapshot>(response);
}

export async function logout(csrfToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    credentials: "include",
    headers: {
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Logout-ul a esuat.");
  }
}
