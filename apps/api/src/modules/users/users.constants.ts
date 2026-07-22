import type { PermissionCheckInput } from "../rbac/authorization.service.js";

export const USERS_AUDIT_ACTIONS = {
  created: "users.created",
  disabled: "users.disabled",
  enabled: "users.enabled",
  passwordReset: "users.password_reset",
  rolesUpdated: "users.roles_updated",
  sessionsRevoked: "users.sessions_revoked",
  updated: "users.updated",
} as const;

export const USER_RESOURCE_TYPE = "user";

export const ADMIN_CAPABILITY_CHECKS = [
  { permission: "users.create", requiredScope: "ALL" },
  { permission: "users.update", requiredScope: "ALL" },
  { permission: "users.disable", requiredScope: "ALL" },
  { permission: "users.assign_roles", requiredScope: "ALL" },
] as const satisfies readonly Omit<PermissionCheckInput, "userId">[];
