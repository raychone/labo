import { Module } from "@nestjs/common";

import { AuditService } from "../auth/audit.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationContextModule } from "../organization-context/organization-context.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { BillingController } from "./billing.controller.js";
import { BillingExportService } from "./billing-export.service.js";
import { BillingPdfExportService } from "./billing-pdf-export.service.js";
import { BillingPrintService } from "./billing-print.service.js";
import { BillingService } from "./billing.service.js";
import { BillingStatementService } from "./billing-statement.service.js";

@Module({
  controllers: [BillingController],
  imports: [AuthModule, DatabaseModule, OrganizationContextModule, RbacModule],
  providers: [AuditService, BillingExportService, BillingPdfExportService, BillingPrintService, BillingService, BillingStatementService],
})
export class BillingModule {}
