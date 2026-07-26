import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorkflowExecutionController } from "./workflow-execution.controller.js";
import { WorkflowExecutionService } from "./workflow-execution.service.js";

@Module({
  controllers: [WorkflowExecutionController],
  exports: [WorkflowExecutionService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [WorkflowExecutionService],
})
export class WorkflowExecutionModule {}
