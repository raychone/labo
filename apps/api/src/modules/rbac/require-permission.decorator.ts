import { SetMetadata } from "@nestjs/common";

import { REQUIRED_PERMISSION_METADATA_KEY } from "./rbac.constants.js";
import type { PermissionKey, PermissionScope } from "./permission-registry.js";

export interface RequiredPermissionMetadata {
  readonly permission: PermissionKey;
  readonly requiredScope?: PermissionScope;
}

export function RequirePermission(
  permission: PermissionKey,
  requiredScope?: PermissionScope,
): ReturnType<typeof SetMetadata> {
  const metadata: RequiredPermissionMetadata = {
    permission,
    ...(requiredScope ? { requiredScope } : {}),
  };

  return SetMetadata(REQUIRED_PERMISSION_METADATA_KEY, metadata);
}
