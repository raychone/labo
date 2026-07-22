export const AUTH_AUDIT_ACTIONS = {
  csrfIssued: "auth.csrf_issued",
  loginFailed: "auth.login_failed",
  loginSucceeded: "auth.login_succeeded",
  logoutSucceeded: "auth.logout_succeeded",
} as const;

export const AUTH_RESOURCE_TYPES = {
  auth: "auth",
  session: "session",
  user: "user",
} as const;

export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
