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
import { WorkItemsService } from "./work-items.service.js";
import { LegacyCompatibilityService } from "./legacy-compatibility.service.js";
import { ToothConnectionsService } from "./tooth-connections.service.js";
import { ProbeTypesService } from "./probe-types.service.js";
import { ProbeCyclesService } from "./probe-cycles.service.js";

@Module({
  controllers: [WorksController],
  imports: [AuthModule, DatabaseModule, DeadlinesModule, OrganizationContextModule, PatientsModule, PricingModule, QrModule, RbacModule, WorkFormsModule, WorkflowExecutionModule],
  providers: [LegacyCompatibilityService, ProbeCyclesService, ProbeTypesService, ToothConnectionsService, WorkDeadlineService, WorkOrderCodeService, WorkItemsService, WorksService],
  exports: [WorksService],
})
export class WorksModule {}
