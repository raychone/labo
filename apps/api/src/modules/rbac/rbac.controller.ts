import { Controller, Get, Inject, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { RequirePermission } from "./require-permission.decorator.js";
import { RbacReadService, type PermissionListResponse, type RoleListResponse } from "./rbac-read.service.js";

@Controller("rbac")
@UseGuards(AuthGuard, PermissionsGuard)
export class RbacController {
  public constructor(@Inject(RbacReadService) private readonly rbacReadService: RbacReadService) {}

  @Get("roles")
  @RequirePermission("roles.read", "ALL")
  public async listRoles(): Promise<RoleListResponse> {
    return this.rbacReadService.listRoles();
  }

  @Get("permissions")
  @RequirePermission("permissions.read", "ALL")
  public async listPermissions(): Promise<PermissionListResponse> {
    return this.rbacReadService.listPermissions();
  }
}
