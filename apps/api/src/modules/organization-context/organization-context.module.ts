import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { LegalEntityContextGuard } from "./legal-entity-context.guard.js";
import { OrganizationContextController } from "./organization-context.controller.js";
import { OrganizationContextService } from "./organization-context.service.js";

@Module({
  controllers: [OrganizationContextController],
  exports: [LegalEntityContextGuard, OrganizationContextService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [LegalEntityContextGuard, OrganizationContextService],
})
export class OrganizationContextModule {}
