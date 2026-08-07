import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser, fetchPermissions, type AuthUser, type PermissionSnapshot } from "../features/auth/auth-api.js";

export const authQueryKeys = {
  all: ["auth"] as const,
  currentUser: ["auth", "me"] as const,
  permissions: ["auth", "permissions"] as const,
};

export type AuthStatus = "anonymous" | "authenticated" | "error" | "loading";

export interface AuthState {
  readonly error: Error | null;
  readonly permissionKeys: readonly string[];
  readonly permissions: PermissionSnapshot | undefined;
  readonly refetch: () => Promise<unknown>;
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
}

export function useAuthState(): AuthState {
  const currentUserQuery = useQuery({
    queryFn: fetchCurrentUser,
    queryKey: authQueryKeys.currentUser,
    retry: false,
  });
  const user = currentUserQuery.data?.user ?? null;
  const permissionsQuery = useQuery({
    enabled: user !== null,
    queryFn: fetchPermissions,
    queryKey: authQueryKeys.permissions,
    retry: false,
  });
  const permissions = permissionsQuery.data;
  const permissionKeys = permissions?.permissions.map((permission) => permission.key) ?? [];

  async function refetch(): Promise<unknown> {
    const currentUserResult = await currentUserQuery.refetch();
    if (currentUserResult.data?.user) {
      return permissionsQuery.refetch();
    }

    return currentUserResult;
  }

  if (currentUserQuery.isLoading || (user !== null && permissionsQuery.isLoading)) {
    return {
      error: null,
      permissionKeys,
      permissions,
      refetch,
      status: "loading",
      user,
    };
  }

  if (currentUserQuery.isError || permissionsQuery.isError) {
    return {
      error: currentUserQuery.error ?? permissionsQuery.error,
      permissionKeys,
      permissions,
      refetch,
      status: "error",
      user,
    };
  }

  return {
    error: null,
    permissionKeys,
    permissions,
    refetch,
    status: user ? "authenticated" : "anonymous",
    user,
  };
}
