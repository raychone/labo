import type { User } from "@prisma/client";
import type { AuthenticatedUser } from "./auth.types.js";

export interface AuthUserResponse {
  readonly user: {
    readonly displayName: string;
    readonly email: string;
    readonly id: string;
    readonly mustChangePassword: boolean;
  };
}

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export function toAuthUserResponse(user: AuthenticatedUser): AuthUserResponse {
  return {
    user: {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      mustChangePassword: user.mustChangePassword,
    },
  };
}
