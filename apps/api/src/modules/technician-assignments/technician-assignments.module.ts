import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { TechnicianAssignmentsController } from "./technician-assignments.controller.js";
import { TechnicianAssignmentsService } from "./technician-assignments.service.js";
import { TechnicianWorkbenchService } from "./technician-workbench.service.js";

@Module({
  controllers: [TechnicianAssignmentsController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [TechnicianAssignmentsService, TechnicianWorkbenchService],
})
export class TechnicianAssignmentsModule {}
