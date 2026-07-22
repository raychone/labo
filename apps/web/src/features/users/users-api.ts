import { fetchCsrfToken, type PermissionSnapshot } from "../auth/auth-api.js";

export interface RoleOption {
  readonly description: string;
  readonly isActive: boolean;
  readonly isSystem: boolean;
  readonly key: string;
  readonly name: string;
}

export interface UserRole {
  readonly key: string;
  readonly name: string;
}

export interface UserSummary {
  readonly createdAt: string;
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
  readonly roles: readonly UserRole[];
  readonly updatedAt: string;
}

export interface UserDetail extends UserSummary {
  readonly activeSessionCount: number;
  readonly passwordChangedAt: string;
  readonly permissionOverrides: readonly {
    readonly effect: "ALLOW" | "DENY";
    readonly permissionKey: string;
    readonly reason: string | null;
    readonly scope: string;
  }[];
  readonly version: number;
}

export interface UsersListResponse {
  readonly items: readonly UserSummary[];
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface UsersListParams {
  readonly isActive: boolean | undefined;
  readonly page: number;
  readonly pageSize: number;
  readonly roleKey: string | undefined;
  readonly search: string | undefined;
  readonly sortBy: "createdAt" | "displayName" | "email" | "updatedAt";
  readonly sortDirection: "asc" | "desc";
}

export interface CreateUserInput {
  readonly displayName: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleKeys: readonly string[];
  readonly temporaryPassword: string;
}

export interface UpdateUserInput {
  readonly displayName: string;
  readonly email: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { readonly message?: string } | undefined;
    throw new Error(body?.message ?? "Request-ul a esuat.");
  }

  return response.json() as Promise<TResponse>;
}

function toQueryString(params: UsersListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.isActive !== undefined) {
    query.set("isActive", String(params.isActive));
  }

  if (params.roleKey) {
    query.set("roleKey", params.roleKey);
  }

  return query.toString();
}

async function sendJson<TResponse>(path: string, method: "PATCH" | "POST" | "PUT", body?: unknown): Promise<TResponse> {
  const csrfToken = await fetchCsrfToken();
  const init: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);

  return parseJsonResponse<TResponse>(response);
}

export async function fetchUsers(params: UsersListParams): Promise<UsersListResponse> {
  const response = await fetch(`${API_BASE_URL}/users?${toQueryString(params)}`, {
    credentials: "include",
  });

  return parseJsonResponse<UsersListResponse>(response);
}

export async function fetchUser(userId: string): Promise<UserDetail> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    credentials: "include",
  });

  return parseJsonResponse<UserDetail>(response);
}

export async function fetchRoles(): Promise<readonly RoleOption[]> {
  const response = await fetch(`${API_BASE_URL}/rbac/roles`, {
    credentials: "include",
  });
  const body = await parseJsonResponse<{ readonly roles: readonly RoleOption[] }>(response);

  return body.roles.filter((role) => role.isActive);
}

export async function createUser(input: CreateUserInput): Promise<UserDetail> {
  return sendJson<UserDetail>("/users", "POST", input);
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<UserDetail> {
  return sendJson<UserDetail>(`/users/${userId}`, "PATCH", input);
}

export async function replaceUserRoles(userId: string, roleKeys: readonly string[]): Promise<UserDetail> {
  return sendJson<UserDetail>(`/users/${userId}/roles`, "PUT", { roleKeys });
}

export async function disableUser(userId: string): Promise<UserDetail> {
  return sendJson<UserDetail>(`/users/${userId}/disable`, "POST");
}

export async function enableUser(userId: string): Promise<UserDetail> {
  return sendJson<UserDetail>(`/users/${userId}/enable`, "POST");
}

export async function resetUserPassword(userId: string, temporaryPassword: string): Promise<UserDetail> {
  return sendJson<UserDetail>(`/users/${userId}/reset-password`, "POST", { temporaryPassword });
}

export function hasPermission(snapshot: PermissionSnapshot | undefined, permissionKey: string): boolean {
  return snapshot?.permissions.some((permission) => permission.key === permissionKey && permission.scopes.includes("ALL")) ?? false;
}
