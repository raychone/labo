import type { User } from "@prisma/client";
import type { AuthenticatedUser } from "./auth.types.js";

export interface AuthUserResponse {
  readonly user: {
    readonly displayName: string;
    readonly email: string;
    readonly id: string;
    readonly mustChangePassword: boolean;
    readonly preferredColor: string | null;
  };
}

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    preferredColor: user.preferredColor ?? null,
  };
}

export function toAuthUserResponse(user: AuthenticatedUser): AuthUserResponse {
  return {
    user: {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      mustChangePassword: user.mustChangePassword,
      preferredColor: user.preferredColor ?? null,
    },
  };
}
