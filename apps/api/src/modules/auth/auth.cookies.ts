import type { CookieOptions, Response } from "express";

import type { ServerEnvironment } from "../../config/environment.js";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSessionCookieOptions(environment: ServerEnvironment): CookieOptions {
  return {
    httpOnly: true,
    maxAge: environment.sessionTtlSeconds * 1000,
    path: "/",
    sameSite: "lax",
    secure: isProduction(),
  };
}

export function getCsrfCookieOptions(environment: ServerEnvironment): CookieOptions {
  return {
    httpOnly: false,
    maxAge: environment.sessionTtlSeconds * 1000,
    path: "/",
    sameSite: "lax",
    secure: isProduction(),
  };
}

export function setSessionCookie(
  response: Response,
  environment: ServerEnvironment,
  token: string,
): void {
  response.cookie(environment.sessionCookieName, token, getSessionCookieOptions(environment));
}

export function setCsrfCookie(
  response: Response,
  environment: ServerEnvironment,
  token: string,
): void {
  response.cookie(environment.csrfCookieName, token, getCsrfCookieOptions(environment));
}

export function clearSessionCookie(response: Response, environment: ServerEnvironment): void {
  response.clearCookie(environment.sessionCookieName, {
    path: "/",
    sameSite: "lax",
    secure: isProduction(),
  });
}
