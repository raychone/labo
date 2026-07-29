import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { DeadlinesModule } from "../deadlines/deadlines.module.js";
import { OrganizationContextModule } from "../organization-context/organization-context.module.js";
import { PatientsModule } from "../patients/patients.module.js";
import { PricingModule } from "../pricing/pricing.module.js";
import { QrModule } from "../qr/qr.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorkFormsModule } from "../work-forms/work-forms.module.js";
import { WorkflowExecutionModule } from "../workflow-execution/workflow-execution.module.js";
import { WorkOrderCodeService } from "./work-order-code.service.js";
import { WorkDeadlineService } from "./work-deadline.service.js";
import { WorksController } from "./works.controller.js";
import { WorksService } from "./works.service.js";

@Module({
  controllers: [WorksController],
  imports: [AuthModule, DatabaseModule, DeadlinesModule, OrganizationContextModule, PatientsModule, PricingModule, QrModule, RbacModule, WorkFormsModule, WorkflowExecutionModule],
  providers: [WorkDeadlineService, WorkOrderCodeService, WorksService],
})
export class WorksModule {}
