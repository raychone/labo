export const AUTH_AUDIT_ACTIONS = {
  csrfIssued: "auth.csrf_issued",
  loginFailed: "auth.login_failed",
  loginSucceeded: "auth.login_succeeded",
  demoLoginFailed: "auth.demo_login_failed",
  demoLoginSucceeded: "auth.demo_login_success",
  logoutSucceeded: "auth.logout_succeeded",
  profileUpdated: "auth.profile_updated",
} as const;

export const AUTH_RESOURCE_TYPES = {
  auth: "auth",
  session: "session",
  user: "user",
} as const;

export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
