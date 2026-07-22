import type { Request } from "express";

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
}

export interface AuthenticatedSession {
  readonly id: string;
  readonly expiresAt: Date;
}

export interface AuthenticatedRequest extends Request {
  readonly auth?: {
    readonly session: AuthenticatedSession;
    readonly user: AuthenticatedUser;
  };
}

export interface RequestMetadata {
  readonly ipAddress?: string;
  readonly userAgent?: string;
}
