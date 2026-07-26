import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { BillingModule } from "./billing/billing.module.js";
import { ClinicsModule } from "./clinics/clinics.module.js";
import { HealthModule } from "./health/health.module.js";
import { LogisticsModule } from "./logistics/logistics.module.js";
import { QrModule } from "./qr/qr.module.js";
import { RbacModule } from "./rbac/rbac.module.js";
import { ScanModule } from "./scan/scan.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { TechnicianAssignmentsModule } from "./technician-assignments/technician-assignments.module.js";
import { UsersModule } from "./users/users.module.js";
import { WorkTypesModule } from "./work-types/work-types.module.js";
import { WorkFormsModule } from "./work-forms/work-forms.module.js";
import { WorkflowTemplatesModule } from "./workflow-templates/workflow-templates.module.js";
import { WorksModule } from "./works/works.module.js";

@Module({
  imports: [AuthModule, BillingModule, ClinicsModule, HealthModule, LogisticsModule, QrModule, RbacModule, ScanModule, SettingsModule, TechnicianAssignmentsModule, UsersModule, WorkTypesModule, WorkFormsModule, WorkflowTemplatesModule, WorksModule],
})
export class AppModule {}
