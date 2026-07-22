import type { User } from "@prisma/client";
import type { AuthenticatedUser } from "./auth.types.js";

export interface AuthUserResponse {
  readonly user: {
    readonly displayName: string;
    readonly email: string;
    readonly id: string;
  };
}

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    isActive: user.isActive,
  };
}

export function toAuthUserResponse(user: AuthenticatedUser): AuthUserResponse {
  return {
    user: {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
    },
  };
}
