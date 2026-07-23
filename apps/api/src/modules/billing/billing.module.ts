import { Module } from "@nestjs/common";

import { AuditService } from "../auth/audit.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { BillingController } from "./billing.controller.js";
import { BillingService } from "./billing.service.js";

@Module({
  controllers: [BillingController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [AuditService, BillingService],
})
export class BillingModule {}
