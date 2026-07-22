import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { AuditService } from "../auth/audit.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { SessionService } from "../auth/session.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { RbacController } from "./rbac.controller.js";
import { RbacManagementService } from "./rbac-management.service.js";
import { RbacReadService } from "./rbac-read.service.js";

@Module({
  controllers: [RbacController],
  exports: [AuthorizationService, PermissionsGuard, RbacManagementService],
  imports: [DatabaseModule],
  providers: [
    AuditService,
    AuthGuard,
    AuthorizationService,
    PermissionsGuard,
    RbacManagementService,
    RbacReadService,
    SessionService,
  ],
})
export class RbacModule {}
