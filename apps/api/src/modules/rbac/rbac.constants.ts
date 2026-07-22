export const RBAC_AUDIT_ACTIONS = {
  permissionOverrideCreated: "rbac.permission_override_created",
  permissionOverrideRemoved: "rbac.permission_override_removed",
  permissionOverrideUpdated: "rbac.permission_override_updated",
  roleAssigned: "rbac.role_assigned",
  roleRemoved: "rbac.role_removed",
} as const;

export const RBAC_RESOURCE_TYPES = {
  permissionOverride: "user_permission_override",
  role: "role",
  userRole: "user_role",
} as const;

export const REQUIRED_PERMISSION_METADATA_KEY = Symbol("required_permission");
